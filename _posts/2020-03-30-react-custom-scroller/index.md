---
title: 'Introducing react-custom-scroller: a simple React component for creating custom scrollbars'
date: 2020-03-30
permalink: /posts/introducting-react-custom-scroller-component
author: Lukáš Mladý
thumbnail: ''
metaDescription: ''
tags: [engineering, react, scroll]
---

**Project link:** [https://github.com/closeio/react-custom-scroller](https://github.com/closeio/react-custom-scroller)

We’re excited to introduce the newest addition to our frontend-related open source projects. `react-custom-scroller` is a super simple React component for creating a custom scrollbar cross-browser and cross-devices.

[Check the live DEMO](https://closeio.github.io/react-custom-scroller/).

We are taking advantage of this tiny library in our [Pipeline View](https://close.com/pipeline/) feature (Trello-like board), where there are multiple columns, each scrollable separately. In the Pipeline View, we also use another library that we open sourced called [use-infinite-scroll](https://github.com/closeio/use-infinite-scroll), which allows us to employ a smooth content-viewing experience.

## Summary

- Extremely lightweight (less than 2KB minzipped).
- It uses the native scroll events, so all the events work and are smooth (mouse wheel, space, page down, page up, arrows etc).
- No other 3rd-party dependencies.
- Excellent performance!

## Installation

    yarn add react-custom-scroller

## API

The props of `react-custom-scroller` component are pretty straightforward:

```js
CustomScroller.propTypes = {
  scrollDisabled: PropTypes.bool,
  innerClassName: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
```

## Example

```jsx
import React from 'react';
import CustomScroller from 'react-custom-scroller';

export default function Example() {
  return (
    <CustomScroller className="Scroller" innerClassName="ScrollerContent">
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
        commodo consequat.
      </p>
    </CustomScroller>
  );
}
```
