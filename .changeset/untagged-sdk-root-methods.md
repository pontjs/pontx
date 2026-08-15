---
"@pontx/spec": patch
"@pontx/sdk": patch
"@pontx/nodejs-sdk": patch
"pontx": patch
---

Keep OpenAPI Endpoints without explicit operation tags at the generated client root. Do not synthesize `common` or `default` Controllers, including for mixed tagged and untagged APIs.
