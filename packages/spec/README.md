# pontx-spec

spec for [pontx](https://github.com/pontjs/pontx)

## Metadata quality

`@pontx/spec` exports a dependency-free static evaluator:

```ts
import { evaluatePontxQuality } from "@pontx/spec";

const report = evaluatePontxQuality({
  spec,
  defaultLocale: "zh-CN",
  locales: { "en-US": englishSpec },
});

console.log(report.staticScore); // 0..50
```

The report includes dimension coverage, PontxSpec paths, affected APIs, critical findings, remediation, and a provisional 100-point projection until dynamic CLI evaluation is run.

The 50-point static score includes 4 points for coherent Endpoint-level request
examples. `parseOAS3` maps the operation extension
`x-pontx-request-examples` to `PontxAPI.requestExamples`; the evaluator checks
declared inputs, required-input coverage, unresolved dynamic sources, declared
2xx status codes, server allowlisting, and credential safety.

## Server-Sent Events

An HTTP Endpoint that returns `text/event-stream` declares a typed `sse`
contract in canonical PontxSpec. It keeps the real HTTP `path` and `method`;
SSE is not rewritten as a fake REST or WebSocket Endpoint.

```json
{
  "sse": {
    "events": {
      "delta": { "dataFormat": "json", "schema": { "type": "object" } },
      "done": { "dataFormat": "text", "terminal": true }
    },
    "unknownEventPolicy": "preserve"
  }
}
```

`parseOAS3` and `parseOAS2` infer a conservative literal `message` event when
the upstream document only says `text/event-stream`. Complete product metadata
must replace that fallback with documented provider event definitions before it
is admitted. `x-pontx-sse` round-trips this contract through OpenAPI.
