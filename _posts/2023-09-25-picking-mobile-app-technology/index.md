---
title: 'How we Picked a Platform for our Mobile App'
date: 2023-09-25
permalink: /posts/picking-a-mobile-app-platform
author: Trey Cucco
thumbnail: ''
metaDescription: ''
tags: [Engineering, Mobile App]
---

In 2023 we released the first version of our mobile app. When we set out on the
road to build our mobile app we were quickly faced with an important question:
what platform should we build on? There are many options, all with pros and
cons, and (most interestingly) with implications reaching beyond the merely
technical.

Since there are so many options, and since we didn't have a strong preference
for a particular technology, we first had to come up with a framework for
evaluating our options. In this post I'm going to describe the framework we
used, and the results of applying that framework to our research.

## Native App vs Progressive Web App (PWA)

The first decision we had to make was: do we build a mobile app at all? We
already have a great web product with tons of functionality that our users love.
Could we do more to make our app great on mobile phones? Could we _just_
implement more PWA functionality? This would be wonderful if so, because all the
efforts we put into our mobile project would directly benefit our web app.

This path was very intriguing, and we want to add more PWA features anyway.
However, for several reasons we decided this was not the right path forward:

1. Our customers and potential customers expect us to have an app on the Apple
   App Store and the Google Play Store. Having presence on the app stores is a
   hard requirement and we can't do that with a PWA.
2. Calling is an integral part of our web app and it had to be part of our
   mobile app too. While web-based outbound calling was very feasible on a PWA,
   there are real limitations for receiving inbound calls. We did create a proof
   of concept of this, and the calling experience just wasn't great on mobile
   web.
3. We want to implement push notifications. Web push notifications were not yet
   generally supported when we got started, and we had no clear timeline on when
   that functionality would be available. (Push did arrive on iOS Safari 16.4,
   which shipped a few months after we started work on our mobile app.)

For these 3 reasons we decided that, yes, we would have to put _something_ on
the app stores. With that question settled, we had to decide on what technology
to use. The first big question for that was...

## Platform-Specific or Cross-Platform?

Would we build a native iOS app in Swift _and_ a native Android app in Kotlin?
Or would we pick one of the many cross-platform technologies that would allow us
to build one app that we could deploy to both stores?

This was actually a very easy question for us to answer: we're a small team and
we didn't have any engineers with deep experience developing platform-specific
apps for iOS or Android. Using a cross-platform technology was an obvious choice
for us.

If you read around the internet you'll find many strong opinions on this
question, and lots of stories of companies who started with one approach and
then migrated to the other and swear by it. However, some of our engineers have
experience with building and maintaining a cross-platform app with React Native,
so we felt confident we could get the experience and performance we wanted with
this approach.

## Technologies Considered

With that settled, we started doing research to try and pick the cross-platform
technology we wanted to use. We researched many options, including:

- [Flutter](https://flutter.dev/)
- [React Native](https://reactnative.dev/)
- [Expo (React Native Ecosystem)](https://expo.dev/)
- [Cordova](https://cordova.apache.org/)
- [Ionic](https://ionic.io/)
- [Xamarin](https://dotnet.microsoft.com/en-us/apps/xamarin)
- [NativeScript](https://nativescript.org/)

We then had to decide how to evaluate each of these options. For that we
developed a framework, or general questions to ask of each technology

## The Framework

Our framework consisted of five qualities that we'd rate each technology on.
We'd rank each technology on each of these axes and hope the results pointed to
a clear winner. These qualities were:

**Popularity** Popularity is not a good metric by itself: just because something
is popular does not imply that it is good. However, used a proxy measurement it
can shed light on:

- the size of the community
- the availability and maturity of 3rd party libraries
- the ease of hiring engineers with experience working with the technology
- the availability of resources and help

If something is popular then we're less likely to run into problems unique to
us, and more likely to find resources, information, and libraries that help
speed up our development process.

**Desirability** How desirable do engineers find the technology to work on?
Again, this isn't a good metric by itself, but it can tell us some useful
things:

- If engineers like working with a technology it's more likely that the pros
  outweigh the cons
- engineers are more likely to write libraries and resources (tutorials, blog
  posts, etc.) for things that are fun to work with
- when we're hiring engineers, will our use of this technology be viewed as a
  pro or a con for joining Close?

**Production App Examples** Is anyone building serious apps with this
technology? There are some really interesting looking technologies out there,
but if nobody has shipped a major production app that's a red flag. We like to
innovate and blaze trails, but we didn't want to unnecessarily be the test case
for an unproven technology for a critical piece of our product offering.

**Performance** Does the technology have a reputation for good performance? Can
it be made to perform well? Are there examples of production apps that have good
performance? Will the technology perform well for our particular use case?

**Language / Developer Experience (DX)** Will our engineers have to learn a new
language or framework? Will it be familiar to things we've already worked on, or
would it be like trying to teach Haskell to a life-long COBOL coder? Will the
learning curve set us back on our hopes of getting something out to our
customers within the year? Are our engineers excited about learning the
language?

## Results

As we did our research two particular technologies came out early as potential
winners: React Native, and Flutter. Here's how they fared on the criteria we
set:

**Popularity**: React Native has historically been more popular, but Flutter has
been growing rapidly and at the time of our research had a slight edge over
React Native. React Native's historic edge in popularity meant it tended to have
more resources and more mature third-party libraries, but we can reasonably
expect this to change in the near future.

**Desirability**: React Native has a
[slightly higher "desirability" rating](https://insights.stackoverflow.com/survey/2021#most-loved-dreaded-and-wanted-misc-tech-want),
while Flutter had a
[considerably larger degree of "developer satisfaction"](https://insights.stackoverflow.com/survey/2021#most-loved-dreaded-and-wanted-misc-tech-love-dread).

**Production App Examples**:
[React Native's showcase](https://reactnative.dev/showcase) had many more apps
that the team was familiar with than [Flutter](https://flutter.dev/showcase)
does.

**Performance**: Flutter is going to be more performant as it is compiled, while
React Native relies on the JavaScript bridge for communication between native
and JavaScript. However, in our research we determined that for our use case the
performance difference wasn't likely to be a big differentiator.

**Language**: Flutter uses Dart, which is reputed to be a great language,
although its only large-scale usage is Flutter. React Native apps are written
primarily in TypeScript and React.

## Our Decision

After looking at these results, we believed there was not a wrong choice: we
could deliver a great app with either technology. However, we ultimately decided
to proceed with React Native for these reasons:

1. Given the historical popularity of React Native there are many resources for
   learning, debugging, and working with React Native; and there is a huge
   existing ecosystem of third party libraries.
2. As an older and more mature technology, it felt like the "safer" choice with
   fewer unknowns.
3. We believed the lower performance of React Native would not be an issue for
   our app.
4. We have a team full of engineers who understand TypeScript, React, and npm,
   as well as several engineers who have experience working with React Native.
   Because of this we believed we'd be able to get off the ground and deliver
   something much quicker with React Native than we could with Flutter, as we'd
   have to get comfortable with both Dart and Flutter.

While React, JavaScript, and npm all have many "rough edges", our team those
issues well and has learned how to work with, and around them.

## Onward

With our technology decision made, we now had to decide on an approach: should
we build up the functionality in our app from scratch, or should we use WebViews
to leverage the all the functionality we already have in our web app?

In a future post I'll discuss how we went about exploring that question, what we
decided to do, and how we "proved the concept" to check that we were on the
right track.
