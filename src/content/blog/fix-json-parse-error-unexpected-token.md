---
title: "How to Fix JSON Parse Error: Unexpected Token in JavaScript"
description: "A practical debugging guide for fixing JSON.parse unexpected token errors, invalid API responses, trailing commas, HTML error pages, and escaped string issues."
pubDate: 2026-06-11
updatedDate: 2026-06-11
author: "DevJSON Sandbox Editor"
tags: ["JSON", "JavaScript", "Debugging", "API"]
---

The JavaScript error **JSON.parse: unexpected token** usually means the value you are trying to parse is not valid JSON at the exact character where the parser stopped. The message can look slightly different across browsers and runtimes, but the cause is almost always one of a small set of problems: malformed JSON, the wrong response body, an empty response, or a string that was encoded twice.

This guide walks through the quickest way to identify the problem and fix it without guessing.

---

## Start With the Exact Input

Before changing application code, inspect the exact string passed into `JSON.parse()`. Logging the JavaScript object is not enough because objects are shown after parsing. You need the raw text.

```js
const rawText = await response.text();
console.log(rawText);
const data = JSON.parse(rawText);
```

If the error came from `response.json()`, temporarily replace it with `response.text()` so you can see what the server actually returned.

---

## Common Cause 1: The API Returned HTML Instead of JSON

One of the most common unexpected token messages starts with a `<` character. That usually means your code expected JSON, but the server returned an HTML page.

Typical reasons include:

* The API route is wrong and returned a 404 page.
* The request was redirected to a login page.
* The server returned an HTML error page for a 500 response.
* A proxy or deployment platform served a fallback page.

Check the status code and content type before parsing:

```js
const response = await fetch("/api/users");
const contentType = response.headers.get("content-type") || "";

if (!response.ok) {
  throw new Error(`Request failed with ${response.status}`);
}

if (!contentType.includes("application/json")) {
  throw new Error(`Expected JSON, received ${contentType}`);
}

const data = await response.json();
```

This protects the parser from receiving a document that was never meant to be JSON.

---

## Common Cause 2: The JSON Contains a Trailing Comma

JavaScript object literals allow trailing commas, but JSON does not. This fails:

```json
{
  "id": 42,
  "name": "Ada",
}
```

The fixed version removes the final comma:

```json
{
  "id": 42,
  "name": "Ada"
}
```

Trailing commas are easy to miss in long configuration files, especially after copying from a JavaScript or TypeScript object.

---

## Common Cause 3: Keys or Strings Use Single Quotes

JSON requires double quotes around all object keys and string values. This is not valid JSON:

```json
{'active': true, 'role': 'admin'}
```

The valid version is:

```json
{
  "active": true,
  "role": "admin"
}
```

Do not fix this by blindly replacing every single quote. A string value may contain apostrophes, and a global replace can corrupt real data.

---

## Common Cause 4: The Response Is Empty

An empty response body is not valid JSON. This often happens with `204 No Content`, failed requests, or endpoints that only return headers.

Handle empty bodies explicitly:

```js
const text = await response.text();
const data = text ? JSON.parse(text) : null;
```

If the endpoint should always return JSON, fix the server so it returns a valid JSON value such as `{}` or `null` with the correct `content-type` header.

---

## Common Cause 5: JSON Was Encoded Twice

Sometimes an API returns JSON as a string inside JSON. You may see something like this:

```json
"{\"id\":42,\"name\":\"Ada\"}"
```

That is valid JSON, but it parses into a string, not an object. If you control the API, return the object directly:

```json
{
  "id": 42,
  "name": "Ada"
}
```

Only parse twice if you are forced to consume a legacy API and you have verified that the first parse returns a JSON string.

---

## Common Cause 6: Invalid Control Characters

Line breaks inside JSON strings must be escaped. This is invalid:

```json
{
  "message": "first line
second line"
}
```

Use escaped newline characters instead:

```json
{
  "message": "first line\nsecond line"
}
```

The same rule applies to tabs and other control characters inside string values.

---

## A Reliable Debugging Checklist

When `JSON.parse()` fails, use this order:

1. Log the raw text, not the parsed object.
2. Check whether the first character is `{`, `[`, `"`, a number, `t`, `f`, or `n`.
3. Confirm the response status code is successful.
4. Confirm the `content-type` includes `application/json`.
5. Validate the raw JSON with a JSON validator.
6. Look near the line and column reported by the parser.
7. Check for trailing commas, single quotes, unquoted keys, and empty responses.

This process usually finds the issue in a minute or two.

---

## Final Rule

Treat `JSON.parse()` errors as input problems first. The parser is strict by design. Once you inspect the raw input and confirm the server is returning valid JSON, the fix is usually small: remove invalid syntax, handle an empty body, or stop parsing content that is not JSON.
