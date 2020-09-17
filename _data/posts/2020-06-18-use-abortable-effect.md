---
layout: post
title: 'Introducing useAbortableEffect: a simple React hook for running abortable effects'
date: 2020-06-18
permalink: /posts/introducting-use-abortable-effect-react-hook
author: Lukáš Mladý
thumbnail: ''
metaDescription: ''
---

**Project link:** [https://github.com/closeio/use-abortable-effect](https://github.com/closeio/use-abortable-effect)

We’re excited to introduce the newest addition to our frontend-related open source projects. `useAbortableEffect` is a super simple React hook for running abortable effects based on the [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) API.

[Check the live DEMO](https://closeio.github.io/use-abortable-effect/).

We are taking advantage of this tiny library mainly in our [Pipeline View](https://close.com/pipeline/) and [Reporting](https://close.com/reporting/) features (and numerous other features), where there are multiple ways to filter and view the data. Using `useAbortableEffect`, we can safely fetch all the necessary data with support of aborting previous unfinished requests and also aborting whenever the user navigates away from the page. No more memory leaks with `setState` happening after component unmount!

## Summary

- Extremely lightweight (less than 500B minzipped).
- It uses the [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) API and it is compatible with the [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API.
- If a browser does not support the [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) API then the hook behaves exactly like a regular [`useEffect`](https://reactjs.org/docs/hooks-effect.html) hook. See [Can I Use](https://caniuse.com/#search=abortcontroller) for browser support overview.
- No other 3rd-party dependencies.

## Installation

    yarn add @closeio/use-abortable-effect

## API

The API of `useAbortableEffect` hook is pretty straightforward.

It takes an effect function and it returns a React ref to an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) instance.

- API is compatible with [`useEffect`](https://reactjs.org/docs/hooks-effect.html), where the effect function you pass-in accepts an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) instance as a param and you can return a cleanup function that accepts an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) instance.
- Supports abortable [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) requests.
- Supports running custom operations/computations that can be easily aborted.
- Auto-aborts effects on re-run (or component unmount), unless you provide
  a custom cleanup function.

```jsx
// Regular React effect hook.
useEffect(() => {
  // do something
  return () => {
    /* cleanup */
  }
}, [deps])

// An abortable effect hook.
const abortControllerRef = useAbortableEffect(
  (abortSignal) => {
    // do something
    return (abortController) => {
      /* do cleanup, you should probably abort */
    }
  },
  [deps],
)
```

## Examples

### Abortable [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) requests

```jsx
import React from 'react'
import useAbortableEffect from '@closeio/use-abortable-effect'

export default function MyAbortableFetchComponent() {
  const abortControllerRef = useAbortableEffect((abortSignal) =>
    fetch(url, { signal: abortSignal })
      .then(/* … */)
      .catch((rejection) => {
        if (rejection.name !== 'AbortError') {
          // Re-throw or handle non-abort rejection in another way.
          return Promise.reject(rejection)
        }
      }),
  )

  const handleManualAbort = () => abortControllerRef.current.abort()
  // …
}
```

### Arbitrary computation that can be aborted

```jsx
import React from 'react';
import useAbortableEffect from '@closeio/use-abortable-effect';

export default function MyAbortableComputationComponent() {
  const abortControllerRef = useAbortableEffect(abortSignal => {
    new Promise((resolve, reject) => {
      // Should be a DOMException per spec.
      const abortRejection = new DOMException(
        'Calculation aborted by the user',
        'AbortError',
      );
      // Handle when abort was requested before starting the computation.
      if (abortSignal.aborted) {
        return reject(abortRejection);
      }
      // This simulates an expensive computation.
      const timeout = setTimeout(() => resolve(1), 5000);
      // Listen for abort request.
      abortSignal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(abortRejection);
      });
    })
      .then(/* … */)
      .catch(rejection => {
        if (rejection.name !== 'AbortError') {
          // Re-throw or handle non-abort rejection in another way.
          return Promise.reject(rejection);
        }
      }),
  });

  const handleManualAbort = () => abortControllerRef.current.abort();
  // …
}
```

### Custom cleanup function

```jsx
import React from 'react'
import useAbortableEffect from '@closeio/use-abortable-effect'

export default function MyCustomCleanupComponent() {
  const [gotAborted, setGotAborted] = useState(false)
  const abortControllerRef = useAbortableEffect((abortSignal) => {
    fetch(url, { signal: abortSignal })
      .then(/* … */)
      .catch((rejection) => {
        if (rejection.name !== 'AbortError') {
          // Re-throw or handle non-abort rejection in another way.
          return Promise.reject(rejection)
        }
      })
    // Just return a function like in `useEffect`, with the difference that you
    // get the abort controller (not a ref) as a param.
    return (controller) => {
      controller.abort()
      setGotAborted(true)
    }
  })

  const handleManualAbort = () => abortControllerRef.current.abort()
  // …
}
```
