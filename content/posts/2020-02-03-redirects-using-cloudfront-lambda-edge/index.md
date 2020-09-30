---
title: Using Lambda@Edge to setup server-side redirects on a Cloudfront+S3 static site
author: Phil Freo
thumbnail: ''
metaDescription: ''
tags: [engineering]
---

We host our main marketing website, [close.com](https://close.com/), as a static site (in our case, generated via [Lektor](https://www.getlektor.com/)) served by AWS.
We store all the staticly generated files in S3 and have a Cloudfront distribution in front as our CDN.

Occasionally, we'll need to setup a redirect, to point an old URL to a new URL, for example when combining two pages.

In S3 hosted static websites like ours, there were basically two main ways to accomplish redirects.

## Approach 1: HTML meta tag redirects

The first is to do HTML meta redirects, by putting this tag on the page to redirect away from:

```html
<meta http-equiv="refresh" content="0; url=http://close.com/new-url-here" />
```

Whether your hand-code each redirect in this way, or use your static site generator to help (e.g. [Lektor's support for Redirects](https://www.getlektor.com/docs/guides/redirects/)), the result is the same – redirects that happen fully client-side.

While this approach is convenient since everything is 100% static, it can be difficult to maintain in a large website and has real downsides for both performance and SEO compared to server-side redirects.

## Approach 2: S3 Static Website Hosting Redirects

S3 does have some [support for server-side redirects](https://docs.aws.amazon.com/AmazonS3/latest/dev/how-to-page-redirect.html), which we were using in addition to meta tags previously described.

These redirects do solve the performance and SEO concerns compared to meta redirect tags.

Here's an example of that XML format (configured in AWS Console under your S3 bucket > Properties > Static website hosting > Redirection Rules):

```xml
<RoutingRules>
  <RoutingRule>
    <Condition>
      <KeyPrefixEquals>home</KeyPrefixEquals>
    </Condition>
    <Redirect>
      <Protocol>https</Protocol>
      <HostName>close.com</HostName>
      <ReplaceKeyWith/>
      <HttpRedirectCode>301</HttpRedirectCode>
    </Redirect>
  </RoutingRule>
  <RoutingRule>
    <Condition>
      <KeyPrefixEquals>old-page</KeyPrefixEquals>
    </Condition>
    <Redirect>
      <Protocol>https</Protocol>
      <HostName>close.com</HostName>
      <ReplaceKeyWith/>
      <HttpRedirectCode>302</HttpRedirectCode>
    </Redirect>
  </RoutingRule>
  ...
</RoutingRules>
```

Problems with this approach included:

- Their XML syntax is verbose
- Difficulty redirecting to URLs that contain querystrings ([details](https://tusharghate.com/amazon-s3-bucket-redirect-with-query-params))
- Desire for our marketing team to be able to setup webpage redirects without AWS access

So, it was time for a new approach.

## Approach 3: Using Lambda@Edge and Cloudfront to do server-side redirects

[Lambda@Edge](https://aws.amazon.com/lambda/edge/) is a feature of Cloudfront that allows you to run serverless functions to tweak the HTTP requests or responses between Cloudfront and your Origin or visitor.

We had recently deployed an [extremely simple Lambda@Edge function](https://gist.github.com/philfreo/3497afb69c3fe737c523fe347d8a4309) on our close.com Cloudfront distribution in order to force visitors to the HTTPS version of our site by adding the [HSTS header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security) to all responses.

We could then build upon this to create a user-friendly system for managing redirects.

### Goal

I envisioned a very simple system like the following:

- Keep a `redirects.json` file in the same GitHub repository as rest of our website, which our marketing team could easily maintain (with some instructions nearby).
- Have a Lambda@Edge function attached to our Cloudfront distribution do server-side redirects based on this file.
- Setup our CI/CD pipeline (in CircleCI) so that changes to redirects.json would get deployed automatically.

Here's the redirects.json format I went with:

```json
{
  "/jobs": { "to": "https://jobs.close.com/", "statusCode": 301 },
  "/resources/the-follow-up-formula": { "to": "/resources/followup", "statusCode": 301 },
  ... etc. ...
}
```

(Just be careful that your last entry does not contain a trailing comma.)

### Setting up the Lambda@Edge function

Here's the cheatsheet for creating the function properly:

1. From the [Lambda section of the AWS console](https://console.aws.amazon.com/lambda/home?region=us-east-1#/create/function), create a new Lambda function and give it a name like `cloudfront-site-redirects`.

2. Choose the Node.js 10.x runtime, because that's currently the latest that Lambda@Edge supports (despite regular Lambda functions supporting Node.js 12.x).

3. Under "Permissions", choose “Create a new role from AWS policy templates” and search for “Basic Lambda@Edge permissions (for Cloudfront trigger)”, which will setup a good IAM role for you (do _not_ choose "Create a new role with basic Lambda permissions" which is insufficient).

Then...

#### Add code for the Lambda function

Ours ended up looking something like this:

```js
const REDIRECTS_DATA_REGION = 'us-east-1';
const REDIRECTS_DATA_BUCKET = 'example.com';
const REDIRECTS_DATA_OBJECT = 'config/redirects.json';

const AWS = require('aws-sdk');

const s3 = new AWS.S3({ region: REDIRECTS_DATA_REGION });

async function readFile(bucketName, filename) {
  const params = { Bucket: bucketName, Key: filename };

  const response = await s3
    .getObject(params, function (err, data) {
      if (err) {
        console.error('s3.getObject error: ' + err);
      }
    })
    .promise();

  return response.Body.toString();
}

async function getRedirectsData() {
  const txt = await readFile(REDIRECTS_DATA_BUCKET, REDIRECTS_DATA_OBJECT);
  let data;
  try {
    data = JSON.parse(txt);
  } catch (e) {
    console.error('getRedirectsData parse failed', txt, e);
    data = {};
  }
  return data;
}

const supportedStatusCodes = {
  301: 'Moved Permanently',
  302: 'Found',
  307: 'Temporary Redirect',
};

exports.handler = async (event, context) => {
  // Get the incoming request and the initial response from S3
  // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
  const { request, response } = event.Records[0].cf;

  // Enable HSTS
  response.headers['strict-transport-security'] = [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  ];

  // request.uri is just the URL path without hostname or querystring
  let path = request.uri;

  // Cut off trailing slash to normalize it
  if (path.slice(-1) === '/') {
    path = path.slice(0, -1);
  }

  const redirectsData = await getRedirectsData();
  const redirectData = redirectsData[path];

  // See if a redirect exists & sanity check that the redirect object is what we expect
  const shouldRedirect = !!(
    redirectData &&
    redirectData.to &&
    supportedStatusCodes[redirectData.statusCode]
  );

  if (shouldRedirect) {
    // Note: We can't completely create a new set of headers even for a redirect
    // because Cloudfront fails painfully if you set (or clear) a "read-only" header.
    // For Origin Response triggers, that includes leaving "Transfer-Encoding" alone.
    // https://github.com/awsdocs/amazon-cloudfront-developer-guide/blob/master/doc_source/lambda-requirements-limits.md#read-only-headers
    response.headers['location'] = [
      {
        key: 'Location',
        value: redirectData.to,
      },
    ];

    return {
      status: redirectData.statusCode,
      statusDescription: supportedStatusCodes[redirectData.statusCode],
      headers: response.headers,
    };
  }

  return response;
};
```

#### Give the IAM role access to your S3 bucket

On the Lambda page, scroll down to find "Execution role" which gives you a link to the IAM role that was auto-generated for you. Now we are going to expand this role by attaching an additional Policy so it also has permission to access the S3 bucket containing our `redirects.json` file.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:getObject"],
      "Resource": ["arn:aws:s3:::example.com", "arn:aws:s3:::example.com/*"]
    }
  ]
}
```

If your S3 bucket isn't public, you may need to change its policy too.

#### Publish

From your Lambda function's page:

- Click "Save"
- Go to Actions > Deploy to Lambda@Edge
- Choose the Cloudfront distribution to attach this to, and set it up using **Origin response** as the trigger.

We choose "Origin Response" because this allows Cloudfront to cache the redirect itself similar to how it would cache any other response from the Origin.

Then, head to your Cloudfront distribution in AWS. You'll notice its status is "InProgress" as the changes are propagated. You'll need to wait for this, and you'll also need to create an Invalidation (probably for `/*`) and wait for that too. (This process can take several minutes or more. [Ugh](https://twitter.com/philfreo/status/1207070622628634624).)

Finally, if everything is working properly, you can test out your new server-side redirects!

```bash
$ curl -I https://close.com/resources/the-follow-up-formula
HTTP/2 301
location: /resources/followup
...
```

#### Continuous deployment

Finally, just make sure that your regular deployment process uploads `redirects.json` to your S3 bucket (if it's not already) and that a Cloudfront invalidatoin is created. For us that meant having a few lines in our deployment script like:

```bash
aws s3 cp config/redirects.json s3://example.com/config/
aws configure set preview.cloudfront true
aws cloudfront create-invalidation --distribution-id THE_ID_HERE --paths '/*'
```

Doing so has allowed our marketing team to have simple control over server-side redirects on our site.

#### Troubleshooting and other learnings

- As mentioned above, troubleshooting on real deployments can be a time-consuming process. Therefore, you can use a “Test Event” to simulate your code way faster than deploying and waiting for invalidation each time.
- To see if a Cloudfront distribution is using Lambda@Edge, go to the distribution > Behaviors > Edit and at the very bottom you’ll see the ARN with function name & version listed.
- When publishing a new Lambda version, you can leave the Name blank and it will autoincrement a version number.
- From your Lambda function, you can find a link to get to the CloudWatch Logs, which can be very helpful for debugging.
- In Cloudfront Logs: Look at latest Log Groups for both “LambdaEdge” as well as name of your function.
- You can only have 1 Lambda function deployed per trigger (e.g. for Origin Response) per distribution, meaning that the lambda function name should probably be specific to that distribution. (At first I thought I could add a second independent function on top of the existing HSTS one. That doesn't work, however they do have a "Layers" feature I didn't explore).
- Lambda functions can use `async`/`await` in Node 10.x, so it's nice to use those despite most online examples using callbacks.

Feel free to hit me up at [@philfreo](https://twitter.com/philfreo) with any comments or questions!

– Phil Freo
