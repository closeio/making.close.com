---
layout: post
title: 'Event Log at Close'
date: 2022-01-07
permalink: /posts/event-log/
author: Vyacheslav Tverskoy
thumbnail: ''
metaDescription: ''
tags: [Engineering, Event Log, Redis, Kafka]
---

This is a look back at five years of evolution of Event Log, a feature at Close that lets you see what’s changed in your Close account, in great detail, as a log that is preserved for a month.

Conceptually, Event Log is a stream of Events. Each event represents a fact that something happened to an object in Close. A few examples of Events are: a Lead was created, a Note was updated, an Email was sent. Each Event has a snapshot of data that represents the object at the time of the event.

We expose Event Log in two ways to our customers: Event Log API and Webhooks. We’re also using the same Event Log internally for search and indexing implementation.

# Event Log API

Event Log API is a REST API that lets you retrieve events that happened within past 30 days.

Historical events are stored in a MongoDB cluster that has a [TTL](https://docs.mongodb.com/manual/core/index-ttl/) set on events collection. Once you have all the events in a database, serving them with a typical [REST API](https://developer.close.com/resources/event-log/list-of-events/) is very straightforward. What’s not so straightforward is getting them *into* said database.

For quite a while, we used Redis as an intermediate queue between the application emitting events and the service that exposes them. In our main application code, we’d serialize an event to a JSON string, then push the new event into a Redis list which worked as a queue. On Events Service side, there are “collector” processes that take a batch of events from Redis and save them into MongoDB database after some light preprocessing.

Our application tends to emit quite a few events when users interact with the interface. An important consideration in the design was event consolidation to reduce storage costs and the amount of redundant data we send to integration partners via webhooks. For example, when a salesperson types a note while on a call, we auto-save the note contents frequently. However in context of Event Log for audit and automation purposes, the exact history of a person typing individual words is not that important. We use that to our advantage and combine multiple events for the same object into just one event if they occur within a few seconds. Based on monitoring data, we’re able consolidate away between 10% and 25% of all events, which translates to non-trivial savings in terms of storage.

To ensure that receiving side of the queue is able to scale and tolerate failures, we used multiple Redis lists, numbered from 0 to 1023, and put an event in one of them based on a hash of an ID of the object the event corresponds to. Collector processes would then coordinate using [Hash Ring](https://github.com/closeio/redis-hashring), conveniently using the same Redis instance under the hood, to assign which Collector process is responsible for which list out of 1024 lists.

# Webhooks

From the very beginning, we offered webhook functionality to help others develop integrations with us. However it was very limited as we only had Lead object change notification, and lacked context what has actually changed.

After introducing Event Log, we immediately saw its potential as a realtime notification mechanism. We implemented [webhooks 2.0](https://developer.close.com/resources/webhook-subscriptions/) by sending event contents as a webhook payload. When an integration subscribes for notifications, it provides a URL to send webhooks to, object types, event actions (is the object created, updated, or deleted), and optional custom filters that allow checking any combination of fields within an event for a condition. Using the same events in both historical REST API and in webhook payloads allows customers to replay the stream using data from API in case something goes wrong on their side and webhooks were lost.

For an implementation, every time an event is received by Events Service, it checks if it matches any of the stored subscriptions by type, action, and evaluates custom filters. If we need to send an event as a webhook, we do it in an asynchronous [TaskTiger](https://github.com/closeio/tasktiger) task. This way we can retry if external services fail without blocking internal operations.

Shortly after, we followed up with a number of resiliency improvements, including an ability to automatically pause a subscription should the target endpoint be down for an extended period of time.

# Kafka

Using Redis as an intermediate queue worked pretty well for us for quite some time. However as our customer base, number of events, and reliance on Event Log for production-critical systems grew, we started hitting limits of this architecture. Here are a few concerns we had:

- During normal operation, the lists that work as a queue are near-empty. But if receiving side goes down for any reason and stops removing events from lists, the queue starts growing. Redis, being an in-memory storage, can only hold so much data. Our estimates were that we would only have a few hours worth of space before we would need to drop events if the receiving side had a prolonged outage.
- The Redis instance serving the queue is itself a single point of failure. While we’re using ElastiCache that offers failover support, it is not entirely seamless and still has potential to lose some events that were written to primary but did not propagate to a secondary instance in a failure event.
- This architecture does not make it easy to have multiple independent consumers. For instance, when we wanted our new indexing pipeline to use these same events, we had to add another Redis instance and send all events to both instances.
- Implementing a robust retry strategy was a challenge. Since we pop an item from a list for processing, we’ll have to re-insert it somewhere else to make another attempt at processing it later in case of a failure.

About a year ago, we moved Event Log queue to [Kafka](https://kafka.apache.org) instead of Redis. Kafka actually stores all events as an append-only log for a set amount of time, and consumers are represented as pointers or positions within the log. This makes it a lot easier to scale, support multiple consumers from the same Kafka topic, and handle failures. As a bonus, we gained an ability to replay event stream from some point in the past in an unlikely case if something goes really wrong with any consumer.

We made a zero-downtime switch from Redis to Kafka by first improving consumers to handle duplicate events correctly and process them in idempotent way. Then we started processing events from both queues at the same time while closely monitoring metrics of both queues. After we ensured correct operation of the Kafka-based queue, we stopped sending events to Redis, and followed up with removing Redis-based code.

Kafka is not all around perfect though. It’s a much more complex system than Redis, and requires additional services like zookeeper, which we had to add to our development environments. Interacting with Kafka is also tricky due to its asynchronous nature. It can be hard to write reliable automated unit tests as writes to a Kafka topic may not be immediately visible to consumers. Still, even with the downsides it’s a much better system for production use.

Thanks to log-like architecture, Kafka allows running multiple independent consumer types that read from exact same event log. However, sometimes we need more granular control over which consumer processes which event and how. For example, sometimes we need to run a migration that modifies a lot of objects. We want internal consumers like indexing processes to receive the change and keep search indexes in sync. At the same time, we don't want to send a lot of unexpected updates to customers. To provide control over consumer behavior when emitting events, we added an optional "internal_metadata" dictionary to events. Every consumer inspects this metadata and adjusts behavior as necessary. A few metadata options we've added are: a flag to mark events as "customer-invisible" to avoid exposing the event in API and webhooks, a list of specific consumer names that will ignore the event, a high/low priority marker, and some consumer-specific tweaks. Here's an example:

```json
{
    "object_id": "obj_abc",
    "action": "updated",
    // the rest of the event
    "data": {},
    "internal_metadata": {
        "processing_options": {
            // A simple flag example
            "customer_visible": false,
            // More complicated data example
            "indexing_options": {"use_secondary": true},
        },
    },
}
```

# Event format

Here’s what a typical event looks like:

```json
{
    "action": "updated",
    "changed_fields": ["note"],
    "data": {
        "_type": "Note",
        "created_by": "user_KIZUpNp8AsMwrh79jq7KIkGMyjtabG32ivOaG30F3sF",
        "created_by_name": "Gob Bluth",
        "date_created": "2016-10-19T12:22:10.433000+00:00",
        "date_updated": "2016-10-20T10:00:00.000000+00:00",
        "id": "acti_4LNDQk2uhg7t8fGUWPyHX7cpCVH9PJtCyCssXFcao3e",
        "lead_id": "lead_sHR5sxie4dKOBkODA2flGciHen2c91YEpvTPt8x1NU0",
        "note": "My note.",
        "organization_id": "orga_bwwWG475zqWiQGur0thQshwVXo8rIYecQHDWFanqhen",
        "updated_by": "user_KIZUpNp8AsMwrh79jq7KIkGMyjtabG32ivOaG30F3sF",
        "updated_by_name": "Gob Bluth",
        "user_id": "user_KIZUpNp8AsMwrh79jq7KIkGMyjtabG32ivOaG30F3sF",
        "user_name": "Gob Bluth"
    },
    "previous_data": {
        "note": "Previous note contents.",
        "date_updated": "2016-10-19T12:22:10.433000+00:00"
    },
    "date_created": "2016-10-20T10:00:00.000000",
    "date_updated": "2016-10-20T10:00:00.000000",
    "id": "ev_17VaZdcdnsMNyWY9ZJnjph",
    "lead_id": "lead_sHR5sxie4dKOBkODA2flGciHen2c91YEpvTPt8x1NU0",
    "meta": {
        "request_method": "PUT",
        "request_path": "/api/v1/activity/note/"
    },
    "object_id": "acti_4LNDQk2uhg7t8fGUWPyHX7cpCVH9PJtCyCssXFcao3e",
    "object_type": "note",
    "organization_id": "orga_bwwWG475zqWiQGur0thQshwVXo8rIYecQHDWFanqhen",
    "request_id": "req_2skaL7v81TflDfovw8A1CC",
    "user_id": "user_KIZUpNp8AsMwrh79jq7KIkGMyjtabG32ivOaG30F3sF",
}
```

Note how for update events, you receive both the current state of the object (in `data`) as well as its previous state (`previous_data`, only attributes that have changed). We made it this way specifically to make integrations easier. A lot of actions in integrations are triggered when some state is changed. For example, when a lead moves into a different status, an opportunity is won, or a phone number is added to a contact. If we didn’t provide what’s changed, the receiving side of an integration would be forced to store a mirror state of what’s in Close to compare incoming events against. This proved very valuable for our [Zapier integration](https://close.com/integrations/zapier/).

From a more technical perspective, there are multiple ways to create events. An early approach we’ve taken to bootstrap event log is to monkey-patch MongoEngine document classes to report previous (received from a `findAndModify` [mongo operation](https://docs.mongodb.com/manual/reference/command/findAndModify/)) and new data, and format that to an event using [MongoRest](https://github.com/closeio/flask-mongorest) resources. This allowed us to add events to almost all object types essentially for free, reusing existing API-compatible code we already had. Providing events in a shape that matches existing API was a really good way to ensure consistency.

However as the system grew in complexity, emitting events implicitly on every database operation proved to be tricky. We started using PostgreSQL models more in the app, as well as developed quite a few internal processes that do not need to emit events. Additional IO operations could be unexpectedly hidden as some resources fetch related data to compose a full event.

Lately we’ve been in the process of transitioning to a more explicit approach of calling event emitting functions directly. We gained more control and better testability. The explicit approach scales better to other storage types and works correctly in presence of transaction rollback.

```python
def update_pipeline(pipeline, ...):
    previous_data = serialize_pipeline_event(pipeline)

    # ... actual business logic of updating pipeline

    log_event(
        pipeline,
        Action.Updated,
        previous_data=previous_data,
        data=serialize_pipeline_event(pipeline),
    )
    return pipeline
```

# Conclusion

Making integrations with Close easy was always a priority for our Engineering team. On top of providing [world-class REST API support](https://developer.close.com), Event Log and Webhooks are indispensable tools for building integrations that react to user activity in Close app. We’re looking forward to integrating with more tools in the ecosystem.

