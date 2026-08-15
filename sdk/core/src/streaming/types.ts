/**
 * Transport-neutral surface required by the generated streaming SDK.  It is
 * intentionally smaller than the browser `WebSocket` type so Node.js users
 * can provide an adapter without adding a browser-only dependency.
 */
export type WebSocketEventName = "open" | "close" | "error" | "message";

export type WebSocketMessageEvent = {
  data?: unknown;
};

export type WebSocketCloseEvent = {
  code?: number;
  reason?: string;
};

export interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener?: (
    event: WebSocketEventName,
    listener: (event: unknown) => void
  ) => void;
  removeEventListener?: (
    event: WebSocketEventName,
    listener: (event: unknown) => void
  ) => void;
  on?: (event: WebSocketEventName, listener: (event: unknown) => void) => void;
  off?: (event: WebSocketEventName, listener: (event: unknown) => void) => void;
  removeListener?: (
    event: WebSocketEventName,
    listener: (event: unknown) => void
  ) => void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

export type StreamClientState =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "errored";

export type StreamCloseInfo = {
  code?: number;
  reason?: string;
};

export type CreateWebSocketClientOptions<TSentMessage, TReceivedMessage> = {
  /** The complete WebSocket URL. Keep credentials out of logs and source. */
  url: string;
  /**
   * Creates a WebSocket implementation. Browsers can pass
   * `url => new WebSocket(url)`; Node.js callers can inject an adapter.
   */
  createSocket: WebSocketFactory;
  /** Serializes outgoing protocol messages. Defaults to JSON.stringify. */
  serialize?: (message: TSentMessage) => string;
  /** Parses incoming protocol messages. Defaults to JSON.parse. */
  parse?: (payload: unknown) => TReceivedMessage;
};

export type WebSocketStreamClient<TSentMessage, TReceivedMessage> = {
  readonly state: StreamClientState;
  connect(): Promise<void>;
  send(message: TSentMessage): void;
  onMessage(listener: (message: TReceivedMessage) => void): () => void;
  onError(listener: (error: Error) => void): () => void;
  onClose(listener: (info: StreamCloseInfo) => void): () => void;
  close(code?: number, reason?: string): void;
};
