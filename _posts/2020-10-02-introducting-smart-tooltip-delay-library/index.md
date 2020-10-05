---
title: Introducing SmartTooltipDelay library
date: 2020-10-02
permalink: /posts/introducing-smart-tooltip-delay-library
author: Lukáš Mladý
thumbnail: ''
metaDescription: ''
tags: [Engineering, Tooltip, Open Source]
---

Project link: [https://github.com/closeio/smart-tooltip-delay](https://github.com/closeio/smart-tooltip-delay)

We’re excited to introduce the newest addition to our frontend-related open source projects. `SmartTooltipDelay` is a tiny library that can help you create a tooltip experience where the first one is shown with a delay and any subsequent ones are shown immediately or with a different delay.

![Smart Tooltip Delay in action](./smart-tooltip-delay-example.gif)

We are taking advantage of this tiny library throughout our app. We still have some old tooltips implemented via Bootstrap Tooltip, and all the new tooltips are purely in React (based on Tippy.js for React). The library allows us to share the same smart delay behaviour across both, leading to a consistent user experience.

## Installation

```bash
yarn add @closeio/smart-tooltip-delay
```

## Summary

- Extremely lightweight (less than 400B minzipped).
- Library-agnostic approach — you can combine multiple tooltip libraries and have the smart delay working for each.
- No other 3rd-party dependencies.

## API

When instantiating `SmartTooltipDelay`, you can provide an object with 3 options:

1. `delay` – default delay for each tooltip
1. `noDelay` – delay set for each subsequently shown tooltip (going from `delay` to `noDelay`)
1. `resetAfterTime` – time in milliseconds after which the default delay is restored (going from `noDelay` to `delay`)

## Usage

To integrate with a tooltip library, follow these steps:

1. `const instance = new SmartTooltipDelay({ delay: 600, noDelay: 0, resetAfterTime: 2500 })`
1. Set your tooltip library's delay dynamically using
   `instance.getCurrentDelay()` whenever the user attempts to show a tooltip
1. Whenever a tooltip is shown, call `instance.show()`
1. Whenever a tooltip is hidden, call `instance.hide()`
1. Enjoy a smart tooltip experience

You can create a single `SmartTooltipDelay` instance for the entire app or you can create instances for each button toolbar.

### Example using Tippy.js

This example uses a single shared smart delay and a tooltip library called Tippy.js.

#### `sharedDelay.js`

```jsx
import SmartTooltipDelay from '@closeio/smart-tooltip-delay';

export default new SmartTooltipDelay({
  delay: 600,
  noDelay: 0,
  resetAfterTime: 2500,
});
```

#### `MyTooltip.js`

```jsx
import sharedSmartDelay from './sharedDelay.js';

export default function MyTooltip({ content /** … more props … */ }) {
  // Show with a smart delay, hide immediately
  const delayArrayRef = useRef([sharedSmartDelay.getCurrentDelay(), 0]);

  // Update Tippy's delay when we try to interact with it.
  const handleOnTrigger = useCallback(() => {
    delayArrayRef.current[0] = sharedSmartDelay.getCurrentDelay();
  }, []);

  // Tell the smart delay that the tooltip has been shown.
  const handleOnShow = useCallback(() => {
    sharedSmartDelay.show();
  }, []);

  // Tell the smart delay that the tooltip has been hidden.
  const handleOnHide = useCallback(() => {
    sharedSmartDelay.hide();
  }, []);

  return (
    <Tippy
      delay={delayArrayRef.current}
      onTrigger={handleOnTrigger}
      onShow={handleOnShow}
      onHide={handleOnHide}
      // … more props
    >
      {content}
    </Tippy>
  );
}
```

### Example using Bootstrap v2.3.2 Tooltips

This example uses a single shared smart delay and a tooltips from the Bootstrap framework.

#### `sharedDelay.js`

```jsx
import SmartTooltipDelay from '@closeio/smart-tooltip-delay';

export default new SmartTooltipDelay({
  delay: 600,
  noDelay: 0,
  resetAfterTime: 2500,
});
```

#### `applySmartDelay.js`

```jsx
import $ from 'jquery';
import sharedSmartDelay from './sharedDelay.js';

/**
 * Extends Bootstrap Tooltip v2.3.2 with smart delay.
 */
export default function applySmartDelay() {
  // Do "Smart" tooltip delay by default.
  $.fn.tooltip.defaults.delay = { show: sharedSmartDelay.getCurrentDelay() };

  // Override Tooltip's `enter` method to sneak in a different "show" delay.
  const Tooltip = $.fn.tooltip.Constructor;
  const _enter = Tooltip.prototype.enter;
  Tooltip.prototype.enter = function (e) {
    const self = $(e.currentTarget).data(this.type);

    if (self && self.options && self.options.hasSmartDelay) {
      self.options.delay = { show: sharedSmartDelay.getCurrentDelay() };
    }

    _enter.call(this, e);
  };

  // Set the "Smart" behaviour without overriding potential custom per-tooltip delay.
  const _getOptions = Tooltip.prototype.getOptions;
  Tooltip.prototype.getOptions = function (initialOptions) {
    const options = _getOptions.call(this, initialOptions);
    // If delay wasn't set, and it is not 0, use smart delay
    options.hasSmartDelay = !initialOptions.delay && initialOptions.delay !== 0;
    return options;
  };

  $(document).on({
    'show.bs.tooltip': sharedSmartDelay.show,
    'hide.bs.tooltip': sharedSmartDelay.hide,
  });
}
```
