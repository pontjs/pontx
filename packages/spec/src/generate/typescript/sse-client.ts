/** Generates the explicit runtime binding for typed HTTP SSE streams. */
export function generateSseClient() {
  return `import { createSseStream } from "@pontx/sdk";
import type { CreateSseStreamOptions, SseEvent } from "@pontx/sdk";
import { sseParsers } from "./sse";
import type { SseStreams } from "./sse";

/**
 * Opens an already-authorized Server-Sent Events request. Callers provide the
 * full URL and request headers at runtime; this SDK never persists credentials,
 * reconnects automatically, or discards unknown provider events.
 */
export async function openSseStream<TEndpoint extends keyof SseStreams>(
  endpoint: TEndpoint,
  options: Omit<CreateSseStreamOptions<SseStreams[TEndpoint]>, "parse">
): Promise<AsyncIterable<SseStreams[TEndpoint]>> {
  const parse = sseParsers[endpoint] as unknown as (
    event: SseEvent<string>
  ) => SseStreams[TEndpoint];
  return createSseStream<SseStreams[TEndpoint]>({ ...options, parse });
}
`;
}
