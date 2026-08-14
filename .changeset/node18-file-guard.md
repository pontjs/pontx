---
"@pontx/sdk": patch
---

Guard browser-only `File` and `Blob` globals while serializing multipart requests so generated SDKs work on Node.js 18.
