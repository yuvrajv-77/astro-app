---
title: "JSON Lines, NDJSON, and JSON Text Sequences Explained"
description: "Understand the difference between ordinary JSON arrays, JSON Lines, NDJSON, and RFC 7464 JSON text sequences for logs and streaming data."
pubDate: 2026-06-11
author: "DevJSON Sandbox Editor"
tags: ["JSON", "Streaming", "Logs", "RFC"]
---

Plain JSON is great for a single document. It becomes awkward when you need to stream thousands of independent records, append logs forever, or process data one event at a time.

That is where line-delimited JSON formats come in.

---

## The Problem With One Huge JSON Array

A normal JSON export often looks like this:

```json
[
  { "event": "login", "userId": "u1" },
  { "event": "purchase", "userId": "u1" },
  { "event": "logout", "userId": "u1" }
]
```

This is valid JSON, but it has drawbacks for large or never-ending data:

* The receiver may need to wait for the closing `]`.
* Appending new records requires careful comma handling.
* A truncated file can invalidate the whole document.
* Processing may require loading more data than necessary.

For logs, analytics, and event streams, individual records are easier to handle.

---

## JSON Lines and NDJSON

JSON Lines and NDJSON use one valid JSON value per line:

```json
{"event":"login","userId":"u1"}
{"event":"purchase","userId":"u1"}
{"event":"logout","userId":"u1"}
```

Each line can be parsed independently. This makes the format convenient for command-line tools, logging systems, queues, and batch processing jobs.

Common conventions:

* File extensions: `.jsonl` or `.ndjson`
* One JSON value per newline
* UTF-8 encoding
* No wrapping array
* No commas between lines

These formats are widely used, even though many projects treat them as conventions rather than a single universal standard.

---

## JSON Text Sequences

RFC 7464 defines **JSON Text Sequences** with the media type `application/json-seq`. Instead of relying only on newlines, each JSON text is prefixed with the ASCII Record Separator character `0x1E` and followed by a line feed.

The RFC design helps parsers recover when one record is truncated or invalid. That matters for long-running streams and logs where partial writes can happen.

---

## Which Format Should You Use?

Use ordinary JSON when you have a complete document with one root value.

Use JSON Lines or NDJSON when you control both producer and consumer and want simple appendable records.

Use `application/json-seq` when you want a standards-track streaming format with explicit record separators and recovery behavior.

For public APIs, document the exact format. Saying "JSON stream" is not enough.

---

## Sources

* [RFC 7464: JSON Text Sequences](https://www.rfc-editor.org/rfc/rfc7464.html)
* [IANA registration for application/json-seq](https://www.iana.org/assignments/media-types/application/json-seq)
