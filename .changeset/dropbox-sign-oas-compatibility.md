---
"@pontx/spec": patch
"pontx": patch
---

Preserve every declared OAS 3 request media type, tolerate non-string tag descriptions from unresolved external documentation references, and keep binary HTTP responses as `ArrayBuffer` data instead of corrupting PDF or ZIP payloads through text decoding.
