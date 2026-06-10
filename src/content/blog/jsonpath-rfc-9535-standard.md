---
title: "JSONPath Is Now an IETF Standard: What Developers Should Know"
description: "JSONPath was standardized as RFC 9535 in February 2024. Learn what changed, why it matters, and how JSONPath differs from ad hoc query syntaxes."
pubDate: 2026-06-11
author: "DevJSON Sandbox Editor"
tags: ["JSON", "JSONPath", "RFC", "News"]
---

JSONPath is a query language for selecting values inside a JSON document. For years, developers used JSONPath through library-specific behavior, which meant the same expression could sometimes produce different results in different runtimes.

That changed when the IETF published **RFC 9535: JSONPath: Query Expressions for JSON** in **February 2024**. The standard gives JSONPath a formal syntax, semantics, and media type registration for `application/jsonpath`.

---

## What JSONPath Does

JSONPath lets you query nested JSON without writing manual loops. Given this payload:

```json
{
  "store": {
    "books": [
      { "title": "Clean APIs", "price": 29 },
      { "title": "JSON Patterns", "price": 19 }
    ]
  }
}
```

A JSONPath expression can select all book titles:

```text
$.store.books[*].title
```

That expression starts at the root `$`, enters `store`, enters `books`, selects every array element with `[*]`, and returns each `title`.

---

## Why the Standard Matters

Before RFC 9535, JSONPath was popular but not fully portable. Some implementations supported script expressions, some delegated parts of evaluation to JavaScript, and some disagreed on filter behavior.

The standard matters because it gives:

* Library authors a common target.
* API designers a stable way to document JSON selection.
* Security reviewers a clearer model for evaluating untrusted queries.
* Tool builders a shared language for inspectors, validators, and test assertions.

For teams that use JSONPath in contract testing or monitoring, portability is the biggest win.

---

## JSONPath Is Not JSON Pointer

JSONPath and JSON Pointer are related, but they solve different problems.

JSON Pointer identifies one exact location:

```text
/store/books/0/title
```

JSONPath can select one or many values:

```text
$.store.books[*].title
```

Use JSON Pointer when you need a precise address, such as a validation error path. Use JSONPath when you need a query.

---

## Be Careful With User-Supplied Queries

JSONPath can be powerful enough to consume CPU on large documents if expressions are expensive or applied without limits. If your product accepts user-written JSONPath, apply guardrails:

* Limit input JSON size.
* Limit query length.
* Use a standards-aligned library.
* Set execution timeouts.
* Avoid libraries that evaluate arbitrary host-language code.

Treat JSONPath expressions like any other user input.

---

## Sources

* [RFC 9535: JSONPath](https://www.rfc-editor.org/rfc/rfc9535.html)
* [IANA registration for application/jsonpath](https://www.iana.org/assignments/media-types/application/jsonpath)
