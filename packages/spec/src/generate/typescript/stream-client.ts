import type { PontxAsyncApiSpec } from "../../asyncapi.js";

/**
 * Generates the runtime binding for an AsyncAPI SDK.  A caller must pass a
 * fully-resolved URL and a socket factory at runtime; generated source never
 * serializes credentials or opens a connection on import.
 */
export function generateAsyncApiClient(_asyncapi: PontxAsyncApiSpec) {
  return `import { createWebSocketClient } from "@pontx/sdk";
import type {
  CreateWebSocketClientOptions,
  WebSocketStreamClient,
} from "@pontx/sdk";
import type { StreamReceivedMessage, StreamSendMessage } from "./streams";

export type StreamClientOptions = CreateWebSocketClientOptions<
  StreamSendMessage,
  StreamReceivedMessage
>;

/**
 * Creates the generated stream client. Pass the URL and socket factory at
 * runtime; do not embed credentials in generated source or logs.
 */
export function createStreamClient(
  options: StreamClientOptions
): WebSocketStreamClient<StreamSendMessage, StreamReceivedMessage> {
  return createWebSocketClient(options);
}
`;
}
