---
title: Exciting Title
date: 2021-12-23
permalink: /posts/exciting-title
author: João Sampaio
thumbnail: ''
metaDescription: ''
tags: [Engineering, Databases]
---

- [ ] Update date and title in the folder name
- [ ] Update title, date and permalink in the `.md` file
- [ ] Should I add any other tags?
- [ ] `TCP_USER_TIMEOUT` in connection attempt

We have recently tweaked some configuration in our application that we hope will make our services more resilient when facing failures of our backing data stores. Those should also help us when we need to do a proactive failover of data stores for example in order to upgrade software.

The big takeaway from this investigation is that we need to think about three points when handling connections to external resources:

- How long do we wait for a connection to be successfully established?
- How long do we wait for a request to be acknowledged or replied to?
- How long can a connection go idle for without us checking its health status?

The answer to each of these questions vary depending on the data store and on how the application talks to that data store. In this post, we will share some configuration knobs specific to some data stores and stacks.

We would like to share what we learned with all this, both as a service to the community, and as documentation for ourselves.

## The problem

We had noticed that, sometimes, after a failover of a backing data store, some of our processes would hang for a long time before recovering. The hanging could go on for as long as 15 minutes, at times! In the context of most web applications, including ours, 15 minutes is an unacceptably long time to sit while doing nothing. These processes would hang even after the backing data store that failed over had already recovered. This made recovery take longer than it needed to on several occasions.

If this happened upon a reactive failover, we figured it could potentially also happen on a proactive failover, and sometimes those need to happen, for example when we want to execute a planned software upgrade.

## The configuration options

Most of the investigation around this issue happened as it applies to our SQL stack: [SQLAlchemy](https://www.sqlalchemy.org/), [psycopg2](https://www.psycopg.org/), and [libpq](https://www.postgresql.org/docs/14/libpq.html), since a failure of our PostgreSQL database is what caused one of our processes to hang for 15 minutes. What we learned can be applied to other data stores and stacks with varying degrees of difficulty.

SQLAlchemy communicates with the backing data store via an "engine". The engine manages the connections via a pool, and uses the underlying stack to create new connections. In our case, the library used to create connections is psycopg2, which provides a `connect` function that, in turn, utilizes some libpq functions to talk to the backing SQL database. When creating a SQLAlchemy engine with `create_engine`, you can pass the `connect_args` argument, which is a dictionary of strings mapping to values. This argument is passed down to psycopg2's `connect` function, which in turn reads that dictionary and passes some key-value pairs down to libpq. We can use this to pass some options to libpq, which will configure how it handles connections or how the underlying TCP socket behaves.

This is an example of what `connect_args` can be:

```python
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql+psycopg2://user:password@hostname/database_name",
    connect_args={
        "connect_timeout": 10,
        "tcp_user_timeout": 10_000,
        "keepalives": 1,
        "keepalives_idle": 5,
        "keepalives_count": 5,
        "keepalives_interval": 1,
    },
)
```

This is what each one of them does:

- `connect_timeout`: This is how long, in seconds, libpq should wait for a connection to be successfully established to PostgreSQL. This includes both the TCP connection, and the PostgreSQL connection, which exists on top of the TCP connection. In the configuration above, 10 seconds.
- `tcp_user_timeout`: This is a TCP-level configuration and is a Linux-only feature (look for `TCP_USER_TIMEOUT` in [the tcp manpage](https://man7.org/linux/man-pages/man7/tcp.7.html)). It controls how long the TCP socket will wait for an SYN packet or a data packet to be acknowledged by the other side of the connection, or how long data can sit in the send buffer without being sent, in milliseconds. In the configuration above, 10 seconds.
- TCP keepalive options:
  - `keepalives`: This just enables TCP keepalives.
  - `keepalives_idle`: This is how long a connection can be idle for, in seconds, before we start probing its health. In the configuration above, 5 seconds.
  - `keepalives_count`: Once the connection has been idle for too long, how many probes to send before giving up on that connection. In the configuration above, five probes will be sent.
  - `keepalives_interval`: How long to wait before sending each keepalive probe, and how long before the last probe times out and we give up on that connection, in seconds. In the configuration above, we will wait for one second between each probe. There's a catch for the last probe's timeout, though. Read below.
    - If `TCP_USER_TIMEOUT` is in effect, that will be used to determine when the last probe expires, instead of `keepalives_interval`. The time interval between each probe will still be `keepalives_interval`. In the configuration above, the last probe will expire after 10 seconds.

With the configuration above, for example, our application should never hang for more than 10 seconds when waiting for a connection to be established. It would also never wait for more than 10 seconds for a packet to be acknowledged by the SQL database. And if we won't use a connection for more than five seconds, it would start probing that connection every second until it acknowledged the probes, for up to five times, and would give up on the connection 10 seconds after the last probe was sent.

You may think that those numbers are pretty aggressive, but if you have all your application and SQL nodes in the same VPC in some cloud provider, for example, you can expect most connections to be established and most ACKs to come back in a fraction of a second.

But now that we fixed it, why did we have the problem in the first place?

## Some lower-level details

### A gevent detour

Before detecting the problem and starting this investigation, one thing we had already gotten right was `connect_timeout`: we already had it set to 10 seconds. So we would never wait for more than 10 seconds for a connection to be established... Or would we?

Read on.

The main concurrency engine we use in Close is [gevent](http://www.gevent.org/) (for now, but we plan to get rid of it). gevent is a user-space threads library. Those threads are also commonly called "green threads", "greenlets", "coroutines", among other terms, depending on what library you are using. In opposition to kernel-space threads, which are managed by the kernel, can be spread among several CPU cores, and can actually run in parallel, user-space threads are threads managed by the application itself, and the kernel is completely ignorant of their existence. As a consequence, they can't run truly in parallel because they are scheduled to run in the context of the process that they exist in.

The point of using user-space threads is that they cooperate more seamlessly among themselves than kernel-space threads: they always yield when they can't proceed. Because of that, they are not preempted in favor of other threads at arbitrary times, and, because of that, they also don't need to worry about races as often. If you are accessing some shared data, but you won't be doing any operation that yields to other threads (for example, network I/O), you don't need to lock resources because you know you won't be preempted.

gevent achieves that objective by patching the Python standard library with code that is cooperative. For example, standard I/O operations like reading from and writing to files and the network always yield to other greenlets instead of blocking. The original greenlet is queued to run again once the operation returns. This is how concurrency is achieved.

But gevent only knows about the Python standard library. It won't patch code that performs blocking operations via other means, like C extensions. Every library that you use with gevent must be able to cooperate with the other greenlets, either via the Python standard library, or its own code must be aware of gevent, otherwise it might block the only kernel-space thread that exists and all user-space threads will also be blocked.

psycopg2 uses a C extension to be able to use libpq under the hood, and connections to the SQL store are made via that C extensions. This means that every network I/O operation performed by psycopg2 is invisible to gevent and will block the entire process. To fix that, we must patch psycopg2 in a way that makes it cooperate with gevent, and that's where [psycogreen](https://github.com/psycopg/psycogreen) comes into the scene. psycogreen patches psycopg2 and makes it cooperate with gevent.

This is an attempt to illustrate how our SQL stack is organized:

![Our SQLAlchemy stack](sqla-stack.png)

This is where our connection problem comes in. To make a non-blocking network I/O, psycogreen uses a different function than what psycopg2 initially used. psycopg2 uses `PQconnectdb` to connect to PostgreSQL, but psycogreen uses two different functions: `PQconnectStart` and `PQconnectPoll`. While `PQconnectdb` supports `connect_timeout`, the `PQconnectStart`-`PQconnectPoll` combo doesn't. When `connect_timeout` is not in effect, libpq documentation states that it will wait forever until the connection is established.

This means that, for processes that are not patched by gevent, `connect_timeout` applies cleanly and, indeed, those processes will wait for just 10 seconds when attempting a connection. But for processes that are patched by gevent, libpq will wait forever.

Well, libpq will. The TCP stack won't. In Linux, the TCP stack will start retransmitting the SYN packet with an exponential backoff up to a number of tries, and then give up. How many tries depends on what your specific Linux system has defined as its default value for `net.ipv4.tcp_syn_retries`. For our production Linux systems, that value is six, which makes connection attempts time out after 127 seconds. (In practice, that translates into a little more since there are jitter and processing delays.)

![A failure to establish a TCP connection](tcp-conn-failed.png)

This is fixed by `TCP_USER_TIMEOUT`: if the connection takes more than that many seconds to be established, the TCP stack will give up and notify the application. That's for the TCP connection.

![A TCP connection failure cut short by `TCP_USER_TIMEOUT`](tcp-conn-failed-tcp-user-timeout.png)

If the TCP connection succeeds, but the PostgreSQL connection fails to be established, then libpq will still wait forever. We couldn't find a way to fix this with just configuration. libpq's documentation suggests that the application should implement a waiting method.

### Waiting for a response from a dead server

We covered establishing a connection to the SQL store. But what about waiting for a reply from the server? If we had to fix it, there must have been a problem. Indeed, there was. We mentioned that some processes would hang for as much as 15 minutes, but a connection attempt would time out after only 127 seconds, as we showed above.

The thing is: the TCP stack, by default, on most Linux systems, will wait for up to 15 minutes for a data packet to be acknowledged by the other side. To be more precise, 924.6 seconds. What happens here is that the TCP stack will retransmit the package for a number of times, defined by `net.ipv4.tcp_retries2`, and it defaults to 15 in most Linux systems. That translates into 924.6 seconds of waiting, and again an exponential backoff applies. You can read more details about how that happens [in this blog post](https://pracucci.com/linux-tcp-rto-min-max-and-tcp-retries2.html). This happens when the server on the other side of the connection suddenly dies, doesn't have time to send a FIN or RST packet, and so the client is left with the connection open to nowhere. Sending packets into that connection will yield no response.

The problem also manifests itself when a server goes away for some time, for whatever reason, and then comes back. If the TCP stack is late in the retransmit phase, it might wait for a long time, for up to two minutes, before retransmitting again, which would also be undesirable.

We fix that situation with `TCP_USER_TIMEOUT`: a TCP socket with that setting will wait for that many seconds for a data packet to be acknowledged by the other side before giving up on the connection and letting the application know that the attempt to communicate failed and the connection is not good anymore.

### Idle connections need to be inspected

If we have applied all the above measures, then our process should never wait for more than 10 seconds after an attempt to establish a connection or otherwise communicate. But if a connection can go idle for a long time, and the other side dies while the connection is idle, the application will need to wait for 10 seconds after trying to use the connection, to finally learn the connection is dead.

Could we do something to make the TCP stack aware that the connection is dead before the application attempts ot use it, so that when it does, the TCP stack can immediately let the application know the connection is not good, instead of waiting for those 10 seconds? Yes, we can. That's where TCP keepalives come into the play.

With TCP keepalives, we can tell the TCP stack: if this connection goes idle for that many seconds, probe the connection that many times. If the probes are not acknowledged, the TCP stack will declare the connection dead, and let the application know it immediately when it tries to use the connection.

### An important note

It's important to note that every proposed solution here wasn't about avoiding an exception or even fixing the connection. The application will still raise an exception that needs to be handled correctly to tell the user what to do next, or avoid losing and corrupting data. This was all to not have processes hang for a long time doing nothing. This will allow web workers and asynchronous task workers to detect a dead connection quickly and return a HTTP 500 error, or retry a task, or pick up the next job in the queue, etc.

If you want to recover without an exception, you need to implement this logic. Your stack may or may not offer something. For example, SQLAlchemy offers what they call ["pessimistic" connection handling](https://docs.sqlalchemy.org/en/14/core/pooling.html#disconnect-handling-pessimistic), which is a way to detect a dead connection when checking it out from the pool, and reestablishing the connection before handing it to client code completely transparently, so the client code will never know it would have gotten a broken connection in the first place. This plays nicely with TCP keepalives, since if a connection was idle in the pool for a long time, the pool will immediately learn the connection is dead and reestablish the connection without any delays upon checkout.

## Other data stores

The same principles applied above can also be applied for other data stores:

- **MongoDB:** If you are using pymongo, you probably already have a reasonable default behavior. pymongo will time out after 20 seconds of waiting for a connection to be established. It uses an application-level heartbeat to verify that the server is alive, sends it every 10 seconds, and it times out after 10 seconds, even while waiting for a response to a query. Those options are `connectTimeoutMS` and `heartbeatFrequencyMS`.
- **Redis:** If you are using redis-py, it offers a few options:
  - `socket_connect_timeout`: How long, in seconds, to wait for a connection to be established.
  - `socket_timeout`: How long, in seconds, to wait for a response from the Redis server. Note that this is similar, but not the same as `TCP_USER_TIMEOUT`. The Linux feature is waiting for a TCP ACK packet. The Redis one is waiting for a Python-level socket operation to return, like the `send*` functions and the `recv*` functions.
  - `socket_keepalive`: A boolean value for whether TCP keepalives should be enabled.
  - `socket_keepalive_options`: A dictionary mapping TCP keepalive options (`socket.TCP_KEEPIDLE`, `socket.TCP_KEEPCNT`, and `socket.TCP_KEEPINTVL`) to their values. These options are analogous to the one we saw above.

Other stacks may not make life so easy.

There's also other matters that need to be taken into consideration when thinking about this kind of problem, like SQL proxies, MongoDB routers, etc. They all can affect, positively or negatively, how connection failures are handled by your application. How they work and how they affect your application depends on what technology we are talking about and needs to be considered independently.

## What if your application-level technology lacks configuration options?

A last resort can be to configure the OS-level TCP stack options. For Linux, this can be made at the host-level via the `sysctl` command, or, if you are using Docker, can be configured at the container-level (effectively making these options available per process).

The options that matter to us in this context are these:

- `net.ipv4.tcp_syn_retries`: How many times to retransmit a SYN packet before giving up on establishing the connection.
- `net.ipv4.tcp_retries2`: How many times to retransmit a data packet before giving up on the communication attempt and the connection.
- `net.ipv4.tcp_keepalive_time`: How long a connection needs to be idle for before we start to probing its health with TCP keepalive probes.
- `net.ipv4.tcp_keepalive_probes`: How many probes to send for an idle connection.
- `net.ipv4.tcp_keepalive_intvl`: How long between each probe and how long until the last one times out and the connection is declared dead.

The waits, timeouts and algorithm used for the retries are not configurable, as they are hardcoded in the kernel code. See [this blog post](https://pracucci.com/linux-tcp-rto-min-max-and-tcp-retries2.html) for more detail.

You can find more information about those options, and generally the Linux TCP stack, [here](https://man7.org/linux/man-pages/man7/tcp.7.html).
