---
title: 'Taming the Test Console'
date: 2023-09-11
permalink: /posts/taming-the-test-console
author: Trey Cucco
thumbnail: ''
metaDescription: ''
tags: [Engineering, Testing, Open Source]
---

At Close we believe that, when done well, tests make code more understandable,
safer, and speed up development. We don't aim for 100% test coverage, but we do
try to write high value tests. We use Jest to test our front end, and over the
years our frontend test suite has grown to ~500 test files with ~6000 tests.

However, there's one big problem: due to various warnings and their associated
stack traces that print out during a test run, our full test suite's output is
over 100,000 lines.

All of that output makes it hard to pin down what went wrong when one test
fails. Or if we want to fix one particular type of warning it can be difficult
to figure out where exactly those warnings are coming from.

In this post I'm going to talk about how this became a problem, the path we took
to solve it, and the tools and processes we developed to aid us in doing so. If
you want to go straight to the code, check out
[@closeio/test-console](https://www.npmjs.com/package/@closeio/test-console):
the open source package we created as part of our solution.

## How we got here

Our app was originally written in Backbone, and a few years ago we decided to
migrate to React. Our codebase was much to big to take a "big rewrite" approach.
Instead we have taken a gradual approach where Backbone and React live
side-by-side as we gradually migrate. If that sounds interesting to you, check
out our blog post on
["Reactizing" a Complex Backbone View](https://github.com/closeio/backbone-testing-library)
and take a look at
[@closeio/backbone-testing-library](https://github.com/closeio/backbone-testing-library):
our open source testing library that is helping us through this framework
transition.

Our testing output has built up a number of warnings due to this architectural
shift. These warnings do not actually impact the validity of our tests, and many
of these will go away as we transition more and more parts of our app to React.
Since our customers don't care how many lines of output our tests have, and
since it doesn't impact the validity or value of our tests, we've decided _not_
to spend time and energy fixing all of them.

However, we found that due to all the output it was easy to miss warnings that
we want to resolve (such as `testing-library` `act` warnings). While these
warnings don't always impact the validity of our tests, they often point to
issues that we should resolve to make sure our test system is as robust as
possible.

## What we wanted

We wanted to quiet down our test output, but we didn't want to just add the
`--silent` flag to Jest. We didn't want to ignore the problem, we wanted a way
to get the right information in the right context, and have a way to take a
systematic approach to dealing with the warnings.

## Our approach

We occasionally log messages to the console to enable our support team to help
customers debug issues, and we already had a pattern of muting these in tests.
We decided to take that approach to the next level: we'd create a system where
we can identify any line that gets written to the console during a test and give
it an importance level. Then we'd pass a threshold to our test suite to
determine which level of messages get printed out.

With that in place, we ran our test suite and added log messages to our matching
list. We continued to do so until the test run printed out nothing, indicating
that we'd captured and tagged all of the log messages.

The log matching and method patching looks like this:

```javascript
import { patchConsoleMethods } from '@closeio/test-console';

const match = (matcher, level) => ({ matcher, level });

const TESTS = [
  ...
  match('React.createFactory() is deprecated', DEBUG),
  match('Warning: Failed prop type:', WARNING),
  match(
    'Warning: Each child in a list should have a unique "key" prop.',
    ERROR,
  ),
  match(/Warning: An update to .* inside a test was not wrapped in act/, ERROR),
  ...
];

const threshold = process.env.TEST_CONSOLE_LEVEL || ERROR;

patchConsoleMethods(['debug', 'info', 'log', 'warn', 'error'], TESTS, {
  filenameRegex: /\.test\.[jt]sx?/,
  getTestName: () => expect.getState().currentTestName,
  threshold,
});
```

Now we can control the output like this:

```shell
TEST_CONSOLE_LEVEL=ERROR yarn test
```

That lets the test system pick up the threshold level for logs. To make this
more convenient we added a few lines to the `scripts` block in `package.json`:

```json
  "scripts": {
    ...
    "test:run:quiet": "TEST_CONSOLE_LEVEL=CRITICAL yarn test:run",
    "test:run:verbose": "TEST_CONSOLE_LEVEL=INFO yarn test:run",
    "test:watch": "TEST_CONSOLE_LEVEL=WARNING jest --watch",
```

With this tooling in hand we were able to reduce the test output on our CI
system to just 500 lines, but get all the logs in development mode so we can
make sure we're not adding any new logs to new tests. We can also set a `match`
to `CRITICAL` when we want to fix all tests that generate an output, and run
`test:run:quiet` until we get no unexpected output.

## Next steps

We liked our approach so much that we decided to take this code and turn it into
a package that others can use.

We're proud to announce the availability of
[@closeio/test-console](https://www.npmjs.com/package/@closeio/test-console)

You can install it for yourself and start wrangling your test output today.

Check out the project for examples of how to add it to your system.
