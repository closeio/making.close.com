---
layout: post
title: "Analytics and React's useReducer"
date: 2019-11-06
permalink: /posts/analytics-and-react-usereducer
author: Alex Prokop
thumbnail: ''
metaDescription: ''
---

Having detailed analytics in any app is obviously super important, both from a marketing and sales point of view, but also to help gain insights into how people use a product. This is totally true at Close where we log user actions from potential leads interacting with our marketing site and blog, right the way through to signups and (hopefully) fully paid up customers. Ultimately this data helps us make our product better.

## The problem

From a development point of view, actually implementing the code to handle tracking can often be given the least amount of love, especially when concentrating on trying to deliver the next new kick ass feature. Tracking calls can easily become spattered throughout components, messing up your beautiful clean code without proper separation of concerns and making them hard to maintain. Accessing all the data you need for the tracking call may also be difficult, if not impossible.

A couple of common examples:

### User interaction

One option is to track as the result of a user interaction, say a button click. This gives you information about exactly what the user is doing:

```jsx
const handleClick = (e) => {
  analytics.track('Button clicked');
  // ...whatever happens next
};

// in your JSX
<Button onClick={handleClick} />;
```

The problem with this (apart from that you probably don't want it in your UI code) is you really have no idea what state changes occur as the result of that button click.

### State changes

To find out about state changes, you might want to do something like the below. You might even add an object diff lib to give you more granular details about what actually changed:

```jsx
// usePrevious tracks previous values - https://usehooks.com/usePrevious/
const prevState = usePrevious(someState);

useEffect(() => {
  if (prevState && prevState !== someState) {
    analytics.track('State changed', diff(prevState, someState));
  }
}, [someState, prevState]);
```

This has the reverse problem in that you have no idea what user interaction actually triggered your state change and with any non-trivial state it's unlikely you can reverse engineer it from the diff itself.

It's not uncommon to end up doing both of the above things in order to get all the tracking details you want. This messes up your UI code even more!

## Our solution

While building out our new Pipelines feature, we'd already decided to use [this nice state pattern](https://medium.com/simply/state-management-with-react-hooks-and-context-api-at-10-lines-of-code-baf6be8302c) (TLDR: you put the return value of `useReducer` into the `value` of a `Context.Provider`) to handle our domain specific state, so we already knew all the data we wanted to track and the actions that triggered the state changes were accessible in our reducer. This is great, but we didn't want to add tracking code to our reducer either.

One of the great benefits of Redux ([which `useReducer` is modelled after](https://reactjs.org/docs/hooks-reference.html#usereducer)) is all the great tooling which grew up around the ability to add in custom middleware. Seeing as analytics is basically a "side effect", middleware was always a great place to handle it. The [Redux docs](https://redux.js.org/advanced/middleware) even use "logging" as an example of what you might write a custom middleware for. But Redux is pretty boilerplate-y (not to mention unfashionable these days 😱) and we wanted to stick with hooks.

### `createReducer` to the rescue

There's a great third-party repo containing a bunch of custom hooks at [react-use](https://github.com/streamich/react-use). Arguably some of these are anti-patterns (I'm looking at you `useLifecycles`, `useMount` and `useUnmount`), so be cautious what you use, but there's a great hook in there called [`createReducer`](https://github.com/streamich/react-use/blob/master/docs/createReducer.md), which describes itself as:

> Factory for reducer hooks with custom middleware with an identical API as React’s `useReducer`. Compatible with Redux middleware.

Compatibility with Redux middleware is pretty cool in itself and I'd be intrigued to experiment with trying it out with something like [`redux-saga`](https://github.com/redux-saga/redux-saga), but really we just wanted to have the ability to write a custom middleware, which we did:

```jsx
// `store` is an object that gives access to the state via `store.getState()`
// `next` is either the next middleware in the chain or the `dispatch` function
// `action` is the action object that `dispatch` has been called with in your React code
const customMiddleware = (store) => (next) => (action) => {
  // the state before the reducer is run
  const prevState = store.getState();
  // call `next` which will result in the `reducer` being run and the state updated
  const result = next(action);
  // you can now access the new state
  const state = store.getState();

  // you now know your state change AND the action that triggered it in a single place!
  // we use a switch in here to give nicer messaging and different data depending on the action
  const stateDiff = diff(state, prevState);
  analytics.track(`Something changed because of ${action.type}`, stateDiff);

  return result;
};
```

Using this was then as simple as updating our context to the following:

```jsx
import React, { createContext, useContext } from 'react';
import { createReducer } from 'react-use';

import { reducer, initialState } from './ducks';
import analyticsMiddleware from './ducks/analyticsMiddleware';

// swap out `useReducer` for our analytics middleware-powered reducer
const usePipelineReducer = createReducer(analyticsMiddleware);

const PipelineContext = createContext();

const PipelineProvider = ({ children }) => (
  <PipelineContext.Provider value={usePipelineReducer(reducer, initialState)}>
    {children}
  </PipelineContext.Provider>
);

const usePipelineContext = () => useContext(PipelineContext);

export { PipelineProvider, usePipelineContext };
```

We’ve been super happy with this implementation so far. Maintaining it is straightforward and it’s easy to add additional event tracking whenever new functionality is added to the feature. Everything’s in a single place and it doesn’t require deep domain knowledge for anyone on the team to add or update if necessary (even if they’ve not worked on this part of the codebase before).

One of the best things about Redux is the amount of great tooling and third party libraries that were developed by the community. It’s awesome to see that same growth happening (and fast!) for hooks.
