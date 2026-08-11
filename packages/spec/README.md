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
