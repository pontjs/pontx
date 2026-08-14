---
"@pontx/spec": patch
"@pontx/sdk": patch
"pontx": patch
---

Preserve every declared OAS 3 request media type, tolerate non-string tag descriptions from unresolved external documentation references, generate `Blob` types for binary schemas, let the fetch runtime supply multipart boundaries, and keep binary HTTP responses as `ArrayBuffer` data instead of corrupting PDF or ZIP payloads through text decoding.
