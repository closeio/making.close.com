---
layout: post
title: MongoDB Network Compression
date: 2020-09-22
permalink: posts/mongodb-network-compression
author: João Sampaio
---

Here at Close, we are heavy users of MongoDB: we store a big chunk of our data in MongoDB instances and use its capabilities extensively.

One of such capabilities that we have started to use recently is network compression: all network communication between clients and instances can be compressed so you need to send fewer bits over the wire.

The impact on network usage we detected in our MongoDB instances was impressive: from about 140 Mbps to about 65 Mbps, as you can see in the chart below.

[![MongoDB Network Compression Chart](/assets/mongodb-network-compression/mongodb-network-compression-chart.png)](/assets/mongodb-network-compression/mongodb-network-compression-chart.png)

If you are using AWS, like ourselves, or some other IaaS, this can translate into some serious savings in the Engineering budget. Our motivation was to reduce AWS Inter-AZ data transfer costs. At $0.01 per GB in each direction ("in" and "out", which translates into $0.02 per GB of data transferred to another AZ), we are happy with the potential savings from such a simple configuration change. Price may vary with any discounts your company may have negotiated with AWS.

## How can you enable network compression in MongoDB?

First, you need to be using compression-capable versions of MongoDB and of your client library. If you want to use the `snappy` compression, that is MongoDB 3.4 and, if you are using Python and PyMongo, that is PyMongo 3.7. With these, you can enable the `snappy` compression as follows:

1. Create your MongoDB instances with `--networkMessageCompressors snappy`
2. Pass `compressors='snappy'` into PyMongo's `MongoClient` (look up how to enable snappy in your specific client library if you are not using PyMongo)

Depending on your library, you might also need to install dependencies for it to support the compression algorithm you chose. For PyMongo to support the snappy compression, you'll have to install [`python-snappy`](https://pypi.org/project/python-snappy/), which in turn depends on the `libsnappy` development headers being available to compile its modules.

Even if you are not yet ready to enable compression between clients and instances, you can still enable compression just in communication between instances (if they are part of a replica set or a sharded cluster) by doing step 1 from above. That will already have an impact on your bottom line depending on how heavy the traffic between those instances is. MongoDB will not compress traffic if the client does not support or accept it.

Compression is enabled by default for MongoDB 3.6+.

There are also other compression algorithms available, and you can find more information in the [MongoDB official docs](https://docs.mongodb.com/manual/reference/program/mongod/#cmdoption-mongod-networkmessagecompressors).
