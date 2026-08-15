import { describe, expect, it, vi } from "vitest";
import { createSseStream } from "../src/streaming";

function streamFromChunks(chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

describe("createSseStream", () => {
  it("parses split CRLF frames, comments, multiline data, ids and a final unterminated event", async () => {
    const fetch = vi.fn(async () => new Response(streamFromChunks([
      ": heartbeat\r\n",
      "id: first\r\nevent: delta\r\ndata: {\"part\":\"a\"}\r\ndata: {\"part\":\"b\"}\r\n\r\n",
      "event: done\ndata: [DONE]",
    ]), { headers: { "content-type": "text/event-stream; charset=utf-8" } }));

    const stream = await createSseStream({ url: "https://stream.example.test", fetch });
    const events = [] as Array<{ event: string; data: string; id?: string }>;
    for await (const event of stream) events.push(event);

    expect(events).toEqual([
      { event: "delta", data: "{\"part\":\"a\"}\n{\"part\":\"b\"}", id: "first" },
      { event: "done", data: "[DONE]", id: "first" },
    ]);
    expect(fetch).toHaveBeenCalledWith("https://stream.example.test", undefined);
  });

  it("delegates typed event parsing while preserving the raw framing boundary", async () => {
    const stream = await createSseStream<{ event: string; value: number }>({
      url: "https://stream.example.test",
      fetch: async () => new Response(streamFromChunks(["event: number\ndata: 42\n\n"]), {
        headers: { "content-type": "text/event-stream" },
      }),
      parse: (event) => ({ event: event.event, value: Number(event.data) }),
    });

    const events = [] as Array<{ event: string; value: number }>;
    for await (const event of stream) events.push(event);
    expect(events).toEqual([{ event: "number", value: 42 }]);
  });

  it("rejects non-SSE and failed HTTP responses before exposing an iterable", async () => {
    await expect(createSseStream({
      url: "https://stream.example.test",
      fetch: async () => new Response("no", { headers: { "content-type": "application/json" } }),
    })).rejects.toThrow("Expected text/event-stream");
    await expect(createSseStream({
      url: "https://stream.example.test",
      fetch: async () => new Response("denied", { status: 401, statusText: "Unauthorized" }),
    })).rejects.toThrow("HTTP 401 Unauthorized: denied");
  });
});
