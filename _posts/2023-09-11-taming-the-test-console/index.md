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
try to write high value tests. Over the years our frontend test suite has grown
to ~500 test files with ~6000 tests.

However, there's one big problem: due to various warnings and their associated
stack traces that print out during a test run, our full test suite's output is
over 100,000 lines.

All of that output makes it hard to pin down what went wrong when one test
fails. Or if we want to fix one particular type of warning it can be difficult
to figure out which tests are problems.

In this post I'm going to talk about the problems we were experiencing with our
testing system, the path we chose to take to solve those problems, and the tools
and processes we developed to do so. If you want to go straight to the code,
check out
[this `npm` package](https://www.npmjs.com/package/@closeio/test-console) we
created as part of our solution.

## How we got here

As we've built out our test suite over the years we have changed testing
frameworks and testing libraries. During some of those migrations we've picked
up new warnings in our output that didn't actually cause our tests to fail. It
was easy to ignore these since we're a small team and our customers don't care
how many lines of output our tests have.

However, we found over time that because of all the output it was easy to miss
when new warnings were added. While these warnings don't always point to a
problem we need to solve, they often point to issues that we should resolve to
make sure our test system is as robust as possible.

## What we wanted

We wanted to quiet down our test output, but we didn't want to just add the
`--silent` flag to jest. We didn't want to ignore the problem, we just wanted a
way to get the right information in the right context, and have a way to take a
systematic approach to dealing with the warnings.

## Approach

We already had a pattern of patching the console logging methods in tests to
ignore some of the debugging messages that our support team uses when working
with customers to resolve issues. We decided to take that approach to the next
level: we'd create a system where we can identify any line that gets written to
the console during a test and give it an importance level, and then from the
command line determine which level of messages are written out.

Then, we'd go through our test system, find logs, add them to a list with a
level, and continue to do this until our system printed nothing.

It like this:

```javascript
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
```

We then take that list of `matchers` and pass them to a method patcher that
checks every `console.(debug|info|log|warn|error)` call and decides what to do
with them.

We can control the output like this:

`TEST_CONSOLE_LEVEL=ERROR yarn test`

That lets the test system pick up the "threshold" level for logs. To make this
more convenient we added a few lines to the `scripts` block in `package.json`:

    "test:run:quiet": "TEST_CONSOLE_LEVEL=CRITICAL yarn test:run",
    "test:run:verbose": "TEST_CONSOLE_LEVEL=INFO yarn test:run",

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
