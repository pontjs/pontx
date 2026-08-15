# @pontx/spec

## 1.0.0-beta.5

### Minor Changes

- 9a29cbc: Make PontxSpec the canonical protocol boundary with explicit style-aware validation, locale structural checks, and lossless OAS2/OAS3 import. RESTFul specs require HTTP method/path while RPC and GraphQL specs remain loadable and indexable without an HTTP executor.

## 1.0.0-beta.4

### Patch Changes

- 9294ed5: Keep OpenAPI Endpoints without explicit operation tags at the generated client root. Do not synthesize `common` or `default` Controllers, including for mixed tagged and untagged APIs.

## 1.0.0-beta.3

### Minor Changes

- d6c3619: Add PontxSpec static metadata quality scoring and Pontx CLI dynamic Agent evaluation with isolated request fixtures, machine-readable reports, and report-only CI semantics. Normalize OAS 3 examples, nullable unions, exclusive bounds, enum descriptions, response references, composition schemas, operation IDs, and coherent request examples so quality results reflect the consumable PontxSpec contract. Reserve four static points for Endpoint-level request examples and validate required inputs, unresolved sources, success responses, approved servers, and credential safety.

  Reject generic placeholder leaf examples such as `example`, `string`, and `test` while preserving meaningful URL/email examples and values explicitly admitted by `enum` or `const`.

### Patch Changes

- 0d853d7: Preserve every declared OAS 3 request media type, tolerate non-string tag descriptions from unresolved external documentation references, generate `Blob` types for binary schemas, let fetch runtimes supply multipart boundaries, and decode binary HTTP responses without corrupting PDF or ZIP payloads through text or JSON parsing. Protect CLI mutations with short-lived request-bound confirmations, redact credentials from request previews, and require binary output to be written as bytes to a file. Prevent invalid generic leaf examples from receiving a quality-score presence reward over safely omitted examples.
- 71474ae: Align public package metadata, repository links, and Agent Skill discovery terms with the canonical Pontx API site at pontx.dev.

## 1.0.0-beta.2

### Patch Changes

- Support successful non-200 2xx response schemas and add cURL output for API calls.

## 1.0.0-beta.1

### Patch Changes

- 新增 resolveRef 函数，支持解析 JSON Schema 中的 $ref 引用，正确处理 JSON 指针路径和转义字符

## 1.0.0-beta.0

### Major Changes

- Release 1.0.0 beta version with breaking changes

## 0.1.15

### Patch Changes

- support pontx call command

## 0.1.14

### Patch Changes

- support pontx check

## 0.1.13

### Patch Changes

- fix build dir

## 0.1.12

### Patch Changes

- fix: fix oas parser

## 0.1.11

### Patch Changes

- fix: fix spec genenrate bug

## 0.1.10

### Patch Changes

- upgrade spec

## 0.1.9

### Patch Changes

- upgrade spec

## 0.1.8

### Patch Changes

- fix generic resolver

## 0.1.7

### Patch Changes

- add originalRef in generic resolver

## 0.1.6

### Patch Changes

- export generic

## 0.1.5

### Patch Changes

- fix generic schema resolver to skip maximum stack

## 0.1.4

### Patch Changes

- add generic schema resolver

## 0.1.3

### Patch Changes

- fix spec parse with tags not defined in root but defined in api

## 0.1.2

### Patch Changes

- fix comment generate

## 0.1.1

### Patch Changes

- init
- Updated dependencies
  - oas-spec-ts@0.6.4
