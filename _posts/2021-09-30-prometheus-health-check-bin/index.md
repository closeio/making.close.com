---
layout: post
title: 'Incorporating Metrics into Health Checks with Rust'
date: 2021-09-30
permalink: /posts/prometheus-health-check-bin/
author: Vyacheslav Tverskoy
thumbnail: ''
metaDescription: ''
tags: [Engineering, Monitoring, Open Source]
---

## The blocking process

One of the recent issues we had in production was a process that appeared to just randomly stop doing what it’s supposed to do. These kind of problems are often hard to debug interactively, since it happens rare enough so you can’t just catch it before it happens, and next to impossible to reproduce in an isolated environment.

While the team is busy trying to determine the root cause, we need to keep the system running despite the occasional hold-ups. At Close, being a lean team, we build extensive automated alerting to make our lives easier. But how can you detect automatically that a process has stopped doing its primary function?

At first, when we were just learning about the issue, the alerts were only about a consequence - the queue of the items that need processing was growing beyond a set threshold. The main downside of this type of alert is that queue size fluctuates during the day and sometimes has short spikes due to customer actions, which is a perfectly normal situation. But that means we can’t make the alert too sensitive (very low threshold or reacting to short spikes) as we would get a lot of false positives, and an insensitive or slow alert means we take a corrective action of restarting the stuck process too late - and customers do notice the delays sometimes.

We also would not want to rely on the process to self-report any issues. If it’s blocked by something, there’s a good chance that an attempt to self-report from within would also be blocked.

## Reporting regular progress

The main indication of a process being stuck is actually *absence* of normal work instead of some active action. We changed the process to report a timestamp of when it last processed an item. This way, we can detect a stuck process much earlier - by last reported timestamp staying the same as real time goes forward.

Here's how such a metric looks like in prometheus client output.

```
# HELP closeio_last_iteration_ts Time of last processing iteration
# TYPE closeio_last_iteration_ts gauge
closeio_last_iteration_ts 1633021679.8027766
```

This is a huge improvement as we can precisely tell the difference between queues’ size growing due to customer action versus not processing the items from the queue. However, if the issue occurs, it still requires someone on the team to take a manual action to restore the system to a completely working state. The issue is not very frequent and we already had prepared steps to follow, but it still can be annoying when it happens and you get paged outside of your working hours.

Now it’s time to make the system self-heal.

## Health checks

Most of the compute workloads we run at Close are orchestrated with Kubernetes. It’s useful not only for deploying our app multiple times a day as we ship new features and improve internals, but also adds a lot of resiliency when operating in a cloud-based environment. It can restart a process or a container when it exits abnormally or appears non-functional.

In our case, the process did look somewhat functional since it responded to a basic health check and was able to report current metric values, despite not doing any useful work. The next task is to actually utilize the metrics to recognize that a specific stale timestamp metric means that process is not healthy anymore and we need it restarted.

As part of the existing health check, we already had a simple shell script that used an existing metric. Here it is in its entirety:

```bash
#!/bin/sh
curl -s http://127.0.0.1:$1/metrics/ | grep 'cio_service_state 1.0'
```

All it does is query the metrics endpoint via http and grep for a predefined string. It works fine for the most part, but it’s not as easy to extend this to check *freshness* of some different metric. To do that in a shell script, you’d hold onto the metrics output, grep it multiple times and do arithmetic on timestamps. With shell scripts, any kind of logic or control flow beyond simple linear command chains becomes hard to maintain, and correctly dealing with all the ways things could go wrong is even harder.

As our product’s backend is built in Python, the next best option was writing up a quick python script. The implementation would be simple thanks to a lot of awesome libraries available. But when we tried to deploy a replacement, we discovered that the health check itself became a bottleneck of the entire system. Starting up Python interpreter and loading a lot of library code takes a significant amount of time - and we need to do it over and over again, very frequently for thousands of processes. The runtime of a single health check call went from ~30ms real time to ~100ms, and CPU usage also increased significantly. That version had to be reverted.

## Can we do better?

We try to keep the amount of different tools as little as reasonably possible and are very careful about introducing a new technology. But in cases where a new tool can be reasonably separate from the rest of the system during initial deployment, we’re not afraid to use something less standard, as long as it brings significant benefits. One of the older, existing examples is [ciso8601](https://pypi.org/project/ciso8601/) - a C-based library that parses ISO 8601-formatted datetimes, which we use *a lot*.

In this case, having a pre-compiled, native binary that can perform a health check quickly without a significant overhead would be very desirable, and we don’t have to change anything else.

In 2021, there are quite a few options for developing native binary programs that offer significantly better developer ergonomics and less footguns than C. For this project we chose Rust. It provides somewhat automatic and safe memory management (which is useful for dealing with variable output from metrics endpoints) while not having non-determinism typical to GC-based runtimes.

## Health check binary

We’ve developed [Prometheus Health Checker](https://github.com/closeio/prometheus-health-checker/) - a simple and very focused tool that does just what we need - fetching and evaluating metrics, and nothing more.
Rust has a great ecosystem, and we’ve used `nom` for parsing metrics data, `ureq` for a simple blocking http client as well as `clap` for a command line interface.

The resulting binary program starts up and runs significantly faster than the simple bash `curl | grep` script we’ve started with. The run time of a single check went from ~30ms to ~10ms, dominated mostly by the response time of the metrics endpoint. That’s a great 3x improvement - on top of having the extra feature of checking a freshness metric. Deployment went great and without issues. We’re running it hundreds of times per second right now at Close.

Of course, there are downsides to this approach too. Even though Rust is gaining popularity, not everyone on our team knows it. Getting started with Rust can also be a challenge when your background is mostly imperative style programming in dynamic language. A strict, static type system, functional programming idioms, as well as borrow checker - all can be significant obstacles before being productive in a new language.

That said, the approach we took makes it a worthwhile tradeoff. The tool is mostly complete and using it from the operations perspective doesn’t require knowing the language itself, so we don’t have to train the entire team to get better health checks.

## Conclusion

We’ve successfully tried a new technology and deployed it in production, got significant benefits from it with very little risk.

