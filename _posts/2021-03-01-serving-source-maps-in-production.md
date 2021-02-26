---
layout: post
title: 'Serving source maps in the production'
date: 2021-03-01
permalink: /posts/serving-source-maps-in-production
author: Bart Gryszko
thumbnail: ''
metaDescription: ''
tags: [Engineering, Dev-Env]
---

We, developers, obviously write bug-free code. At least most of the time. 
But if there is a bug in the web client's code, source maps are an extremely helpful debugging tool.

At Close, we applied different rules for different environments, depending on where they are served.

### Development  Environment for the Frontend Team
- **Precision**: We want to be certain of a line number where the error has occurred
- **Build time**: They can take some time to build when starting but the rebuild is fast
- **Visibility**: Obviously, they can be visible to anyone that has access to the environment

Thus, our Webpack's `devtool` setting of choice for the Frontend folks is `cheap-module-eval-source-map`. 
Source maps are generated along with the bundle and served from the same place as the source.

### Development  Environment for the Backend Team
- **Precision**: The higher precision the better.
- **Build time**:  The build can take more time and we don't care about the rebuilds because the frontend application is prebuilt in the CI.
- **Visibility**:  Similarly as for the Frontend, visible in the environment.

Most of the time our Backend team doesn't need to make changes to the Frontend code. 
To speed up their environment spin-up process, we are pre-building a production-like version of the frontend app. 
Specifically, we use Webpack's `source-map` setting to create source maps. 
After that, we pack everything into a docker container that uses Nginx to serve both source maps and the bundle itself.

### Production  Environment
- **Precision**: The higher precision the better.
- **Build time**:  The build can take more time — it happens once during  CI/CD process.
- **Visibility**:  Visible only to Close employees.
- While the process of generating source maps is the same as in the "Development  Environment for the Backend Team", 
we don't want the source code to be exposed publicly.

Our first approach was to only upload source maps to Rollbar (Frontend errors monitoring tool of our choice). 
Rollbar [provides an API](https://docs.rollbar.com/docs/source-maps#3-upload-your-source-map-files) that allows you to do that. 
We found it very handy when discovering frontend issues our Customers might experience. 

When trying to reproduce a production error it was still cumbersome to find the right occurrence in Rollbar or to read from a transpiled source code.

**The solution**: Serve source maps behind the VPN.

Since we already have an Nginx container with both source maps and the build, 
we can use that to serve source maps only for Close employees. 

To do it, we need to have fine-grain control over how Webpack builds source maps. 
[SourceMapDevToolPlugin](https://webpack.js.org/plugins/source-map-dev-tool-plugin/) allows you to configure what exactly should be appended to each minified frontend asset. 
In our case, it's as simple as:

```js
const webpackConfig = {
  ...
  plugins: [
    ...
    new SourceMapDevToolPlugin({
      append: '\n//# sourceMappingURL=https://sourcemaps.close.com/[url]',
      filename: '[name].[chunkhash].js.map',
    }),
  ]
}
```

This way when an asset is served from `https://cdn.close.com/main.js`, its mapping points to `https://sourcemaps.close.com/main.js.map`. 
The latter address is only accessed by Close employees so the code that is not minified will be only visible to them.
