import { describe, expect, it } from "vitest";
import ts from "typescript";
import {
  generateSseClient,
  generateSseTypes,
  loadPontxSpec,
  parseOAS2,
  parseOAS3,
  parsePontSpec2OAS2,
  parsePontSpec2OAS3,
} from "../src/index";

function sseDocument() {
  return {
    openapi: "3.1.0",
    info: { title: "Streaming example", version: "1.0.0" },
    servers: [{ url: "https://api.example.test" }],
    tags: [{ name: "responses" }],
    paths: {
      "/responses": {
        post: {
          operationId: "createResponse",
          tags: ["responses"],
          responses: {
            200: {
              description: "A stream of response events.",
              content: {
                "text/event-stream": { schema: { type: "string" } },
              },
            },
          },
          "x-pontx-sse": {
            events: {
              delta: {
                description: "A JSON delta.",
                dataFormat: "json",
                schema: {
                  type: "object",
                  required: ["text"],
                  properties: { text: { type: "string" } },
                },
              },
              done: { dataFormat: "text", terminal: true },
            },
            unknownEventPolicy: "preserve",
          },
        },
      },
    },
    components: { schemas: {} },
  } as any;
}

describe("Server-Sent Events contracts", () => {
  it("imports a typed SSE extension, preserves all response media, and round-trips it", () => {
    const source = sseDocument();
    const spec = parseOAS3(source, "streaming-example");
    const api = spec.apis["responses/createResponse"];

    expect(api.produces).toEqual(["text/event-stream"]);
    expect(api.sse).toEqual(source.paths["/responses"].post["x-pontx-sse"]);
    expect(api.ext).toBeUndefined();
    expect(parsePontSpec2OAS3(spec).paths["/responses"].POST["x-pontx-sse"])
      .toEqual(source.paths["/responses"].post["x-pontx-sse"]);
  });

  it("uses a conservative literal message event when OAS only declares the SSE media type", () => {
    const source = sseDocument();
    delete source.paths["/responses"].post["x-pontx-sse"];
    const api = parseOAS3(source, "streaming-example").apis["responses/createResponse"];

    expect(api.sse).toEqual({
      events: { message: { dataFormat: "text" } },
      unknownEventPolicy: "preserve",
    });
  });

  it("does the same conservative import for Swagger 2 produces", () => {
    const spec = parseOAS2({
      swagger: "2.0",
      info: { title: "Legacy stream", version: "1" },
      paths: {
        "/events": {
          get: {
            operationId: "listEvents",
            produces: ["text/event-stream"],
            responses: { 200: { description: "stream" } },
          },
        },
      },
      definitions: {},
    } as any, "legacy-stream");

    expect(spec.apis.listEvents.sse).toEqual({
      events: { message: { dataFormat: "text" } },
      unknownEventPolicy: "preserve",
    });
    const roundTrip = parsePontSpec2OAS2(spec) as any;
    expect(roundTrip.paths["/events"].GET.produces).toEqual(["text/event-stream"]);
    expect(roundTrip.paths["/events"].GET["x-pontx-sse"])
      .toEqual(spec.apis.listEvents.sse);
  });

  it("requires an explicit, forward-compatible SSE event contract", () => {
    const spec = parseOAS3(sseDocument(), "streaming-example");
    const broken = structuredClone(spec);
    broken.apis["responses/createResponse"].sse = {
      events: {}, unknownEventPolicy: "drop",
    } as any;

    expect(() => loadPontxSpec(broken)).toThrow(/sse/);
  });

  it("generates typed known events, literal unknown events, and an explicit opener", () => {
    const spec = parseOAS3(sseDocument(), "streaming-example");
    const source = `${generateSseTypes(spec)}\n${generateSseClient()}`;

    expect(source).toContain('event: "delta" as const');
    expect(source).toContain("JSON.parse(event.data)");
    expect(source).toContain("unknown: true");
    expect(source).toContain("openSseStream");
    expect(source).not.toContain("api.example.test");
    const diagnostics = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
      reportDiagnostics: true,
    }).diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    expect(diagnostics).toEqual([]);
  });
});
