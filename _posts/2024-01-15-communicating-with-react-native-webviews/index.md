---
title: 'Communicating with React Native Web Views'
date: 2024-01-15
permalink: /posts/react-native-webviews
author: Trey Cucco
thumbnail: ''
metaDescription: ''
tags: [Engineering, React, Mobile App]
---

At Close, the frontend team has been lucky in that, for 10 years we've been
maintaining a single web application and codebase. We do have an electron-based
desktop application, but that primarily uses our web app code, with a very small
amount of electron-specific changes.

But then we released our mobile app. We decided to build our app with React
Native[^1], and to reuse our web app as much as possible via `WebView`s.
However, we also wanted to apply native mobile patterns and capabilities where
it made sense, things like: navigation, calling, and push notifications.

With that came new challenges around communicating and coordinating between web
app code and React Native code.

[^1]:
    If you'd like to read more about how we made that decision, check out our
    blog post on
    [Picking a Mobile App Platform](https://making.close.com/posts/picking-a-mobile-app-platform).

In this post I'm going to talk through the communication primitives provided by
[React Native WebView](https://github.com/react-native-webview/react-native-webview)
(the webview library we picked), some of the potential
[developer footguns](https://en.wiktionary.org/wiki/footgun) we noticed, and the
patterns we developed to make sure our native app and web app could evolve
independently without breaking.

## Communication Patterns

As
[outlined in their docs](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md#communicating-between-js-and-native),
React Native WebView provides several ways of communicating between native and
web. web. If you want a full description, the project provides a
[dedicated section of the docs](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md#communicating-between-js-and-native)
for that. We're going to focus on two of the options: `injectJavaScript` to
communicate to web from native, and the `postMessage` / `onMessage` pair, which
allows communication to Native from Web.

### Receiving Communications in Native

To send information from the web app to the native app, you first attach a
handler to the
[`onMessage prop`](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md#onmessage)
of the `WebView`. This handler receives an event with a string data prop. The
`WebView` fires this event whenever the web app calls a global function provided
by the `WebView`: `window.ReactNativeWebView.postMessage`.

So in React Native you'd create a web view component like this:

```jsx
<WebView
  onMessage={(event) => {
    console.log(event.data);
  }}
  {...otherProps}
/>
```

And in your web app JavaScript you can do something like this:

```TypeScript
const sendMessageToNative = (message: string) => {
  window.ReactNativeWebView.postMessage(message);
}

sendMessageToNative("Hello, React Native!");
```

Then, back in React Native, you'd see "Hello, React Native!" logged out whenever
the web app was run.

### Receiving Communications in Web

Things are not as straightforward when communicating to the web app from the
native app. Rather than exposing an event-based system, React Native WebView
allows you to inject arbitrary JavaScript code into the `WebView` at any time.
This means that you can do almost _anything_ at _any time_.

Like this:

```JSX
const webViewRef = useRef<WebView>();

const sayHiFromReactNative = (code: string) => {
  webViewRef.current.injectJavaScript('window.alert("Hello, from React Native!");');
}

// ... other code

return (
  <>
    <WebView
      ref={webViewRef}
      {...otherProps}
    />
    <TouchableOpacity onPress={sayHiFromReactNative}>
      <Text>Say Hi</Text>
    </TouchableOpacity>
  </>
);
```

If that sounds scary or overwhelming to you, you're not alone. We immediately
recognized several big problems:

- If the native app is directly running code in the web app, we have to make
  sure we don't change things that the native app depends on.
- If we do have a hard dependency between the native app and the web app, how
  will we coordinate deployments between the two?
- What do we do about users not upgrading their mobile app and the old mobile
  app loading up the new web app?
- The injected JavaScript is just a string, so we don't get any nice developer
  tools like code highlighting, linting, type safety, etc.
- What if we want to do something that isn't exposed in the global scope? Do we
  have to have some way of registering things globally so we can work with it
  from native?

## The Message Bridge

These, and many other questions, led us to build a "message bridge" between the
the native app and the web app. We decided that:

- All communications between the two must happen by message passing.
- All messages must conform to a standard shape.
- Messages must be strongly typed.

The pattern provided to receive data in React Native was a good start: the web
app sends strings to the native app which triggers an event handler. However, we
wanted to have predictably structured data rather than just "any string".

So we decided that all messages would be objects with a certain shape, and we
would `JSON.stringify` the object before posting on the bridge. We settled on:

```TypeScript
type Message = { action: string; payload: any };

const sendMessageToRN = (message: Message) => {
  window.ReactNativeWebView.postMessage(JSON.stringify(message);
}
```

Then, on the native side, we'd deserialize the method before handling it:

```TypeScript
const handleMessage = useCallback((event: WebViewMessageEvent) => {
  const { action, payload } = JSON.parse(event.data);
  // take appropriate action
}, []);
```

This made receiving data from the web app very structured. Now, we wanted to do
the same thing on the web app side.

While our final solution ended up being a bit more involved than what I'll show
here (for instance, there's a lot of data checking, error handling, and helpers
for debugging), this is the outline of what we came up with:

```TypeScript
import EventEmitter from 'events';
import { useEffect } from 'react';

const RNEvents = new EventEmitter();

export const registerRNHandler = (
  action: string,
  callback: (payload: any) => void,
) => {
  RNEvents.on(action, callback);
  return () => RNEvents.off(action, callback);
}

export const useRNHandler = (
  action: string,
  callback: (payload: any) => void,
) => {
  useEffect(() => {
    const deregister = registerRNHandler(action, callback);
    return () => deregister();
  }, [action, callback]);
}

const onMessageFromRN = (message: string) => {
  const { action, payload } = JSON.parse(message);
  RNEvents.emit(action, payload);
}

// Attach the handler to `window` so we can access it from
// scripts injected by React Native WebView.
window.onMessageFromRN = onMessageFromRN;
```

With this, we can allow individual React components to register and respond to
messages from React Native when they are mounted, or attach global handlers via
`registerRNHandler`.

Next, on the React Native side, we added a method to wrap `injectJavaScript`
that will take the action and payload, put them in the correct format, and
serialize it all into valid JavaScript code to be injected:

```TypeScript
const buildMessageJavaScript = (action: string, payload: any) => {
  const message = JSON.stringify({ action, payload });
  // Stringify the message a second time to escape quotes etc.
  const safeString = JSON.stringify(message);

  return `window.onMessageFromRN(${safeString});`;
};

const postMessageToWebApp = (
  webViewRef: MutableRefObject<WebView>,
  action: string,
  payload: any,
) => {
  webViewRef.current.injectJavaScript(
    buildMessageJavaScript(action, payload),
  );
}
```

With that in place, we now had the basis for a two-way message bridge to send
structured messages between the native app and the web app.

### Strongly Typed Messages

After a few weeks of developing with this messaging system, the lack of type
safety on our messages became a real pain: it was easy to misspell an action
name, or to give the wrong data in the payload. So we decided to strongly type
our messages and make sure that on both sides, whenever we send a message, the
action string belonged to the pre-identified set of actions, and the payload
attached to it conformed to the expected shape for that action.

Again, I won't go into all the details on what that looks like, but we ended up
with a types file that looks like this:

```TypeScript
// Defines the actions and payloads that the web app can send to the native app
export type FromWebActions = {
  callInitiated: {
    leadId: string;
    contactId: string;
    phoneNumber: string;
  };
  organizationChanged: {
    organizationId: string;
  };
  appReady: {
    organizationId: string;
  }
  // many more actions
};

export type FromWebActionName = keyof FromWebActions;

// Defines the actions and payloads that the native app can send to the web app
export type FromNativeActions = {
  profilePopoverToggled: null;
  routeChanged: {
    pathname: string;
    options: { replace?: boolean; };
  };
  searchHidden: null;
  // many more actions
};

export type FromNativeActionName = keyof FromNativeActions;
```

And we updated our message handling methods like this:

```TypeScript
export const postMessageToRN = <T extends FromWebActionName>(
  action: T,
  payload: FromWebActions[T],
) => {
  // same implementation as above
}

export const registerRNHandler = <T extends FromNativeActionName>(
  action: T,
  callback: (payload: FromNativeActions[T]) => void,
) => {
  // same implementation as above
}
```

With that (and something similar on the native side) we now had type-safe
message passing between the two systems! If we try to give an action name that
wasn't recognized, or if we gave a payload with the wrong shape or data,
TypeScript warns us.

This _greatly_ improved the DX of sending messages between the two systems, and
caught silly bugs quickly.

### Sharing the type definitions

We set up the type definitions so they could be used as-is between the two
systems, but we still needed to figure out how to share those type definitions.
Ultimately, we decided to just manually synchronize the file between the two
codebases.

Since making changes to it on one side almost always involves making changes on
the other side (e.g. adding new handlers, or adding new message posters) this is
adequate for now.

## Limiting Knowledge Between Systems

We want to keep the two systems as decoupled as possible. Being able to
independently deploy the web app and native app was a hard requirement for us.

The advantage of a message-based communication API is that the web app doesn't
have to care _how_ the native app will do something (like initiate a phone call)
it just has to tell it "the user pressed a button to start a call" and the
native app will receive that message and Do The Right Thing.

This even means that the implementation can change on one side and the other app
doesn't have to be updated or re-deployed.

## Coordinating Behavior Between Releases

However, there's still one more problem we ran in to that wasn't solved by the
message passing system alone: when we add new features to the native app, and it
expects new messages from the web app, how do we coordinate that? Take calling
as an example.

When we implemented native calling, we needed the web app to send a message to
the native app saying "the user wants to initiate a call with this information".
Before this, however, the web app would simply pop up a modal saying "calling is
not supported on this device".

We couldn't just update the web app to always send the message, because we
couldn't be sure that the user had a version of the native app that was ready to
receive and respond to the "start a call" message. So our web app needed to know
which action to take, depending on which version of the native app it was loaded
in: send the message or show a modal?

We decided to use a feature flagging system where the native app could let the
web app know what to do. We again use React Native WebView's JavaScript
injection capabilities, but this time we use it to set global variables that the
web app can check.

It looks something like this:

```JSX
const preScript = `
window.ReactNativeWebView.IS_CALLING_ENABLED = ${featureEnabled('calling')};
window.ReactNativeWebView.IS_SEARCH_ENABLED = ${featureEnabled('search')};
// ... etc
`;

return (
  <WebView
    injectedJavaScriptBeforeContentLoaded={preScript}
    {...otherProps}
  />
);
```

This then sets global variables that our web app can check whenever certain
actions come up, so it might:

```TypeScript
const makeCall = (
  leadId: string,
  contactId: string,
  phoneNumber: string
) => {
  if (window.ReactNativeWebView?.IS_CALLING_ENABLED) {
    postMessageToRN(
      'callInitiated',
       {
        leadId,
        contactId,
        phoneNumber,
      },
    );
  } else {
    // Show calling not available modal
  }
}
```

We then deploy our updated web app with the flag check, and then only native
apps that are ready to handle calls will receive the `callInitiated` method.

## Closing Thoughts

Having a loosely coupled, strongly typed message passing system between our
native app and web app took some consideration and work, but in the end it has
turned out to be a robust and pleasant way to implement new features and evolve
our native app and web app without bringing any of our systems down.

If you're using a web view to in your native app, consider setting up something
similar. While some things are harder to do with message passing instead of
direct manipulation, the developer experience gains are well worth the trouble
in those edge cases.
