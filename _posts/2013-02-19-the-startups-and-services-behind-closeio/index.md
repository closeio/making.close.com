---
layout: post
title: 'The startups and services behind Close.io'
date: 2013-02-19
permalink: /posts/the-startups-and-services-behind-closeio
author: Phil Freo
thumbnail: ''
metaDescription: ''
tags: [Startups, Engineering]
---

In creating [Close software for salespeople](https://close.com/), we rely on a number of other startups and services to do what we do. While there are alternatives to using each of the following, we have chosen them for specific reasons because we think they’re the best.

The common theme is that these services allow us to move faster and have better insight into our business. We could live without any of them, but it would mean slower iteration and less innovation.

### Powers our app

[Plivo](http://plivo.com/) - Powers the backend telephony behind Close. We chose them over others like Twilio because of their low level sip telephony support, as well as their commitment to call quality.

[AWS](https://aws.amazon.com/) (EC2, ELB, S3, CloudFront) - Let the big guys handle our server infrastructure. Best AWS decision we’ve made is to host out of Oregon instead of the east coast, since almost all of the significant downtime AWS has had in the last year has been in Virginia.

[Heroku](http://heroku.com/) - Used to host our static Close homepage because there’s really no simpler way to get a Flask/Python app deployed.

### Technical insight & debugging

[New Relic](https://newrelic.com/) - Great way to monitor app server performance and server health. Expensive but worth it.

[Errorception](http://errorception.com/) - JavaScript error reporting. It’s not fancy, but JS error collection/reporting is an art and they know what’s up.

[HockeyApp](http://hockeyapp.net/) - Mac app crash reporting

### User analytics & retention

[Customer.io](http://customer.io/) - Used for automatic drip marketing emails. By plugging in our Google SMTP credentials to send from, our marketing emails automatically get logged into Close so we can see all emails sent/received to our contacts.

[Mixpanel](http://mixpanel.com/) - Used for user + event tracking within our app

[Google Analytics](http://www.google.com/analytics/) - Used for overall traffic analysis

Tip: best decision here was to use [Analytics.js](https://github.com/segmentio/analytics.js) which allows us to easily try out different analytics services with only a single line of code changed.

### Development

[GitHub](https://github.com/) - Best UI out there for code reviewing. Also heavily use GitHub Issues. Check out our [open source contributions](https://github.com/elasticsales).

[CircleCI](https://circleci.com/) - Upon every code push to GitHub, Circle automatically runs all our Python and JavaScript unit tests. If something fails, our engineering chat room is pinged. If tests pass in master, the latest code is automatically deployed to our production servers. Circle definitely beats running your own Jenkins CI server.

### Communication

[Campfire](http://campfirenow.com/) - Used for both internal team communication (and integrated with GitHub, New Relic, CircleCI, Close, etc.) as well as the “Live Help Chat” link from within our app where we provide technical support and get feedback from customers. While it’s been neglected, we like using the [Propane](http://propaneapp.com/) app compared to the web client.

[Olark](http://www.olark.com/) - Used for “Live Help” on the Close homepage. Pops up in the team’s IM client when someone needs help.

[Google Apps](http://www.google.com/enterprise/apps/business/) - Easiest way to get a team going with email, calendar, etc.

### Money

[Stripe](http://stripe.com/) - A modern API for credit card processing.

### Integrations

[Zapier](https://zapier.com/) - We can’t integrate Close with every possible service, so we’ve created a [Close Zapier App](https://zapier.com/zapbook/closeio/) that allows our customers (and ourselves) to integrate with other services across the web.

### Sales (& Telephony)

Last but not least, we eat our own dogfood by using [Close](https://close.com/) for our sales process of keeping track of all customers and prospect data, and calls / emails with them.

### What’s Needed?

The section that I think is missing from other similar blog posts as this is “what’s missing?”. Here are some areas that I think need more startup effort.

*   _Better user analytics_. Mixpanel (and others we’ve tried) are good for some simple analytics but just don’t allow us to easily answer many of the higher-level questions we’d like to answer about usage (“which users fit X usage patterns”, “how many people fit Y criteria over time”, etc.). The data could be there, but the backend intelligence isn’t. Improvements in this space could really help both the sales process as well as product development processes.
*   _Better web integrations_. We’d love to plugin a service that helps us help our users get their existing data into Close from many of the existing services out there.
*   _Better financial software._ Stripe is great, but it’s pretty low level. For anything slightly complicated you still have to build your own system of database+code to manage subscriptions and invoices. Perhaps a combination of an open source library + an accounting/reporting service is needed.
*   _A non-Google email/calendar solution._ There seems to be a lack of great alternatives for startups.

Any other great services we should be using? Tweet us at @closeio

\- Phil Freo ([@philfreo](http://twitter.com/philfreo))