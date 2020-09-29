---
title: 'Introducing useInfiniteScroll: a simple React hook for infinite scroll experience'
date: 2020-03-31
permalink: /posts/introducting-use-infinite-scroll-react-hook
author: Vitor Buzinaro
thumbnail: ''
metaDescription: ''
tags: [engineering]
---

**Project link:** [https://github.com/closeio/use-infinite-scroll](https://github.com/closeio/use-infinite-scroll)

We’re excited to introduce the newest addition to our frontend-related open source projects. `useInfiniteScroll` is a super simple React hook for creating an infinite scroll experience based on the `IntersectionObserver` API.

[Check the live DEMO](https://closeio.github.io/use-infinite-scroll/).

We are taking advantage of this tiny library in our [Pipeline View](https://close.com/pipeline/) feature (Trello-like board), where there are multiple columns, each scrollable separately. In the Pipeline View, we also use another library that we open sourced called [react-custom-scroller](https://github.com/closeio/react-custom-scroller), which allows use to have cross-browser and cross-device scrollbars.

## Summary

- Extremely lightweight (less than 1KB minzipped).
- It uses the `IntersectionObserver` API, so it doesn't need to listen to `scroll` events, which are known to cause performance issues.
- No other 3rd-party dependencies.

## Installation

```
yarn add @closeio/use-infinite-scroll
```

## API

The API of `useInfiniteScroll` hook is pretty straightforward.

It takes an `options` object:

```ts
type UseInfiniteScrollOptions = {
  // The observer will disconnect when there are no more items to load.
  hasMore: boolean;

  // Pass true when you're re-fetching the list and want to resets the scroller
  // to page 0.
  // Defaults to `false`.
  reset?: string;

  // When scrolling, the distance in pixels from the bottom to switch the page.
  // Defaults to `250` (in px).
  distance?: number;
};
```

And it returns a tuple:

```ts
type UseInfiniteScrollResult = [
  number, // The current page (starting at 0)
  RefObject<T>, // React ref to a loader (spinner) element
  RefObject<T> // React ref to the scroll container element
];
```

## Example

```jsx
import React from 'react';
import useInfiniteScroll from '@closeio/use-infinite-scroll';

export default function MyComponent() {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, loaderRef, scrollerRef] = useInfiniteScroll({ hasMore });

  useEffect(async () => {
    const data = await myApiCall({ page });
    setHasMore(data.hasMore);
    setItems((prev) => [...prev, data.items]);
  }, [page]);

  return (
    <div ref={scrollerRef}>
      {items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
      {hasMore && <div ref={loaderRef}>Loading…</div>}
    </div>
  );
}
```

## What it looks like

![`useInfiniteScroll` in practice](./use-infinite-scroll-demo.gif)
