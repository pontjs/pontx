import { describe, expect, it } from "vitest";
import { createWebSocketClient, type WebSocketEventName, type WebSocketLike } from "../src/streaming";

class FakeSocket implements WebSocketLike {
  readonly sent: string[] = [];
  readonly listeners = new Map<WebSocketEventName, Set<(event: unknown) => void>>();
  closeCalls: Array<{ code?: number; reason?: string }> = [];

  addEventListener(event: WebSocketEventName, listener: (event: unknown) => void) {
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  removeEventListener(event: WebSocketEventName, listener: (event: unknown) => void) {
    this.listeners.get(event)?.delete(listener);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code?: number, reason?: string) {
    this.closeCalls.push({ code, reason });
  }

  emit(event: WebSocketEventName, payload?: unknown) {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}

describe("createWebSocketClient", () => {
  it("waits for open, serializes sends, and parses incoming messages", async () => {
    const socket = new FakeSocket();
    const client = createWebSocketClient<{ action: string }, { event: string }>({
      url: "wss://stream.example.test/v1",
      createSocket: () => socket,
    });
    const received: Array<{ event: string }> = [];
    client.onMessage((message) => received.push(message));

    const connected = client.connect();
    expect(client.state).toBe("connecting");
    expect(() => client.send({ action: "subscribe" })).toThrow("not connected");

    socket.emit("open");
    await connected;
    expect(client.state).toBe("open");

    client.send({ action: "subscribe" });
    socket.emit("message", { data: '{"event":"price"}' });

    expect(socket.sent).toEqual(['{"action":"subscribe"}']);
    expect(received).toEqual([{ event: "price" }]);
  });

  it("reports close information and detaches socket listeners", async () => {
    const socket = new FakeSocket();
    const client = createWebSocketClient<{ action: string }, { event: string }>({
      url: "wss://stream.example.test/v1",
      createSocket: () => socket,
    });
    const closed: Array<{ code?: number; reason?: string }> = [];
    client.onClose((info) => closed.push(info));

    const connected = client.connect();
    socket.emit("open");
    await connected;

    client.close(1000, "done");
    expect(socket.closeCalls).toEqual([{ code: 1000, reason: "done" }]);

    socket.emit("close", { code: 1000, reason: "done" });
    expect(client.state).toBe("closed");
    expect(closed).toEqual([{ code: 1000, reason: "done" }]);
    expect(socket.listeners.get("message")?.size || 0).toBe(0);
  });

  it("rejects a connection closed before open and reports malformed messages", async () => {
    const socket = new FakeSocket();
    const client = createWebSocketClient<{ action: string }, { event: string }>({
      url: "wss://stream.example.test/v1",
      createSocket: () => socket,
    });

    const errors: string[] = [];
    client.onError((error) => errors.push(error.message));
    const connected = client.connect();
    socket.emit("close", { code: 1006, reason: "network unavailable" });
    await expect(connected).rejects.toThrow("network unavailable");
    expect(client.state).toBe("closed");

    const reconnectingSocket = new FakeSocket();
    const reconnectedClient = createWebSocketClient<{ action: string }, { event: string }>({
      url: "wss://stream.example.test/v1",
      createSocket: () => reconnectingSocket,
    });
    const parseErrors: string[] = [];
    reconnectedClient.onError((error) => parseErrors.push(error.message));
    const reconnect = reconnectedClient.connect();
    reconnectingSocket.emit("open");
    await reconnect;
    reconnectingSocket.emit("message", { data: "not json" });

    expect(errors).toEqual([]);
    expect(parseErrors).toHaveLength(1);
    expect(parseErrors[0]).toContain("Unexpected token");
  });
});
