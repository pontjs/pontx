import type { PontxAPI, PontxSseEvent } from "../../api.js";
import type { PontxSpec } from "../../spec.js";
import { indentation } from "../utils.js";
import { generateSchemaCode } from "./schema.js";

function quote(value: string) {
  return JSON.stringify(value);
}

function streamApis(spec: PontxSpec): Array<[string, PontxAPI]> {
  return Object.entries(spec.apis || {}).filter(([, api]) => Boolean(api.sse));
}

function hasEventSchemas(spec: PontxSpec) {
  return streamApis(spec).some(([, api]) =>
    Object.values(api.sse?.events || {}).some((event) => Boolean(event.schema))
  );
}

function knownEventType(eventName: string, event: PontxSseEvent) {
  const data = event.dataFormat === "json"
    ? generateSchemaCode(event.schema, "schemas.")
    : "string";
  return `{ event: ${quote(eventName)}; data: ${data}; id?: string; retry?: number;${
    event.terminal ? " terminal: true;" : ""
  } }`;
}

function streamEventType(api: PontxAPI) {
  const known = Object.entries(api.sse?.events || {}).map(([eventName, event]) =>
    knownEventType(eventName, event)
  );
  const unknown = "{ event: string; data: string; id?: string; retry?: number; unknown: true }";
  return [...known, unknown].join(" | ");
}

function parserName(endpoint: string) {
  return `parse${endpoint.replace(/[^a-zA-Z0-9_$]+(.)?/g, (_, next: string | undefined) =>
    next ? next.toUpperCase() : ""
  ).replace(/^[^a-zA-Z_$]+/, "Endpoint")}SseEvent`;
}

function parseKnownEvent(eventName: string, event: PontxSseEvent) {
  const data = event.dataFormat === "json"
    ? `JSON.parse(event.data) as ${generateSchemaCode(event.schema, "schemas.")}`
    : "event.data";
  const properties = [
    "...event",
    `event: ${quote(eventName)} as const`,
    `data: ${data}`,
    ...(event.terminal ? ["terminal: true"] : []),
  ].join(",\n");
  return `case ${quote(eventName)}:
${indentation(2)(`return {
${indentation(2)(properties)}
};`)}`;
}

/**
 * Generates explicit typed parsers for HTTP Server-Sent Events Endpoints.
 * Unknown vendor events remain raw text instead of being discarded or cast to a
 * known type; this is required for forward-compatible streaming contracts.
 */
export function generateSseTypes(spec: PontxSpec) {
  const apis = streamApis(spec);
  if (!apis.length) return "";

  const schemaImport = hasEventSchemas(spec)
    ? 'import type * as schemas from "./schemas";\n\n'
    : "";
  const streamTypes = apis.map(([endpoint, api]) =>
    `${quote(endpoint)}: ${streamEventType(api)};`
  ).join("\n\n");
  const parsers = apis.map(([endpoint, api]) => {
    const events = Object.entries(api.sse?.events || {});
    const switchCases = events.map(([eventName, definition]) =>
      parseKnownEvent(eventName, definition)
    ).join("\n");
    return `export function ${parserName(endpoint)}(event: SseEvent<string>): SseStreams[${quote(endpoint)}] {
${indentation(2)(`switch (event.event) {
${indentation(2)(switchCases)}
${indentation(2)(`default:
${indentation(2)(`return { ...event, data: event.data, unknown: true };`)}`)}
}`)}
}`;
  }).join("\n\n");
  const parserMap = apis.map(([endpoint]) =>
    `${quote(endpoint)}: ${parserName(endpoint)}`
  ).join(",\n");

  return `${schemaImport}import type { SseEvent } from "@pontx/sdk";

export type SseStreams = {
${indentation(2)(streamTypes)}
};

${parsers}

export const sseParsers = {
${indentation(2)(parserMap)}
} as const;
`;
}
