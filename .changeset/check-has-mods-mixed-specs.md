---
"@pontx/spec": patch
---

Fix `PontxSpec.checkHasMods` so a spec whose alphabetically-first Endpoint is
untagged but that still contains tagged `tag/operationId` keys is reported as
having Controllers. Previously only the first API key was inspected, which
broke generated SDK controllers for mixed tagged/untagged specs such as the
OpenAI API.
