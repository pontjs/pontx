---
"@pontx/spec": patch
"pontx": patch
"@pontx/sdk": patch
---

Generate references inside `schemas.ts` as local type names so dynamic object
maps compile instead of referring to a non-existent `schemas` namespace.
