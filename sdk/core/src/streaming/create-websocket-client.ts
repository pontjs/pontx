import type {
  CreateWebSocketClientOptions,
  StreamClientState,
  StreamCloseInfo,
  WebSocketEventName,
  WebSocketLike,
  WebSocketStreamClient,
} from "./types";

function subscribe(
  socket: WebSocketLike,
  event: WebSocketEventName,
  listener: (event: unknown) => void
) {
  if (socket.addEventListener) {
    socket.addEventListener(event, listener);
    return () => socket.removeEventListener?.(event, listener);
  }

  if (socket.on) {
    socket.on(event, listener);
    return () => {
      if (socket.off) {
        socket.off(event, listener);
      } else {
        socket.removeListener?.(event, listener);
      }
    };
  }

  throw new Error("WebSocket implementation must expose addEventListener() or on().");
}

function eventData(event: unknown): unknown {
  if (event && typeof event === "object" && "data" in event) {
    return (event as { data?: unknown }).data;
  }

  return event;
}

function closeInfo(event: unknown): StreamCloseInfo {
  if (!event || typeof event !== "object") return {};
  const closeEvent = event as { code?: unknown; reason?: unknown };

  return {
    ...(typeof closeEvent.code === "number" ? { code: closeEvent.code } : {}),
    ...(typeof closeEvent.reason === "string"
      ? { reason: closeEvent.reason }
      : {}),
  };
}

function toError(event: unknown, fallback: string): Error {
  return event instanceof Error ? event : new Error(fallback);
}

/**
 * Creates a small, typed WebSocket client used by generated streaming SDKs.
 *
 * The client deliberately does not reconnect, persist credentials, or log
 * URLs/messages. Those policies belong to the generated SDK or application,
 * where the provider's quota and credential rules are known.
 */
export function createWebSocketClient<TSentMessage, TReceivedMessage>(
  options: CreateWebSocketClientOptions<TSentMessage, TReceivedMessage>
): WebSocketStreamClient<TSentMessage, TReceivedMessage> {
  const serialize = options.serialize || JSON.stringify;
  const parse = options.parse || ((payload: unknown) => JSON.parse(String(payload)) as TReceivedMessage);
  const messageListeners = new Set<(message: TReceivedMessage) => void>();
  const errorListeners = new Set<(error: Error) => void>();
  const closeListeners = new Set<(info: StreamCloseInfo) => void>();
  let state: StreamClientState = "idle";
  let socket: WebSocketLike | undefined;
  let unsubscribeSocketEvents: Array<() => void> = [];
  let pendingConnect: Promise<void> | undefined;
  let rejectPendingConnect: ((reason?: unknown) => void) | undefined;

  const clearSocketEvents = () => {
    unsubscribeSocketEvents.forEach((unsubscribe) => unsubscribe());
    unsubscribeSocketEvents = [];
  };

  const client: WebSocketStreamClient<TSentMessage, TReceivedMessage> = {
    get state() {
      return state;
    },

    connect() {
      if (state === "open") return Promise.resolve();
      if (pendingConnect) return pendingConnect;

      state = "connecting";
      pendingConnect = new Promise<void>((resolve, reject) => {
        rejectPendingConnect = reject;
        try {
          socket = options.createSocket(options.url);
          unsubscribeSocketEvents = [
            subscribe(socket, "open", () => {
              state = "open";
              pendingConnect = undefined;
              rejectPendingConnect = undefined;
              resolve();
            }),
            subscribe(socket, "message", (event) => {
              try {
                const message = parse(eventData(event));
                messageListeners.forEach((listener) => listener(message));
              } catch (error) {
                errorListeners.forEach((listener) =>
                  listener(toError(error, "WebSocket message parsing failed."))
                );
              }
            }),
            subscribe(socket, "close", (event) => {
              const info = closeInfo(event);
              if (state === "connecting") {
                rejectPendingConnect?.(
                  new Error(
                    info.reason || "WebSocket closed before the connection opened."
                  )
                );
              }
              state = "closed";
              pendingConnect = undefined;
              rejectPendingConnect = undefined;
              closeListeners.forEach((listener) => listener(info));
              clearSocketEvents();
              socket = undefined;
            }),
            subscribe(socket, "error", (event) => {
              const error = toError(event, "WebSocket connection failed.");
              errorListeners.forEach((listener) => listener(error));
              if (state === "connecting") {
                state = "errored";
                pendingConnect = undefined;
                rejectPendingConnect = undefined;
                clearSocketEvents();
                socket = undefined;
                reject(error);
              }
            }),
          ];
        } catch (error) {
          state = "errored";
          pendingConnect = undefined;
          rejectPendingConnect = undefined;
          reject(error);
        }
      });

      return pendingConnect;
    },

    send(message) {
      if (state !== "open" || !socket) {
        throw new Error("WebSocket is not connected. Call connect() and await it before send().");
      }

      socket.send(serialize(message));
    },

    onMessage(listener) {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },

    onError(listener) {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },

    onClose(listener) {
      closeListeners.add(listener);
      return () => closeListeners.delete(listener);
    },

    close(code, reason) {
      if (!socket || state === "closed" || state === "idle") return;
      socket.close(code, reason);
    },
  };

  return client;
}
