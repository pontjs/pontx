import type { CreateSseStreamOptions, SseEvent } from "./types";

type SseFrameState = {
  event: string;
  data: string[];
  id?: string;
  retry?: number;
};

function emptyFrame(lastEventId?: string): SseFrameState {
  return { event: "", data: [], ...(lastEventId === undefined ? {} : { id: lastEventId }) };
}

function errorMessage(response: Response, body: string) {
  const statusText = response.statusText ? ` ${response.statusText}` : "";
  return `SSE request failed with HTTP ${response.status}${statusText}${body ? `: ${body}` : ""}`;
}

/**
 * Opens a one-way Server-Sent Events response as an async iterable.
 *
 * It implements the SSE field framing rules (including comments, multi-line
 * data, CRLF input, ids, retries, and a final unterminated frame). It never
 * reconnects or logs URLs, headers, or event data: providers differ on retry
 * and credential policy, so those decisions remain with the caller.
 */
export async function createSseStream<TEvent = SseEvent<string>>(
  options: CreateSseStreamOptions<TEvent>
): Promise<AsyncIterable<TEvent>> {
  const fetchImpl = options.fetch || globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("SSE requires a fetch implementation. Pass options.fetch in this runtime.");
  }

  const response = await fetchImpl(options.url, options.init);
  if (!response.ok) {
    throw new Error(errorMessage(response, await response.text()));
  }

  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "text/event-stream") {
    throw new Error(
      `Expected text/event-stream response but received ${contentType || "no content-type"}.`
    );
  }
  if (!response.body) {
    throw new Error("SSE response did not include a readable body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  async function* events(): AsyncGenerator<TEvent> {
    let buffer = "";
    let lastEventId: string | undefined;
    let frame = emptyFrame(lastEventId);
    let completed = false;

    const dispatch = (): TEvent | undefined => {
      if (frame.data.length === 0) {
        frame = emptyFrame(lastEventId);
        return undefined;
      }
      const raw: SseEvent<string> = {
        event: frame.event || "message",
        data: frame.data.join("\n"),
        ...(frame.id === undefined ? {} : { id: frame.id }),
        ...(frame.retry === undefined ? {} : { retry: frame.retry }),
      };
      frame = emptyFrame(lastEventId);
      return options.parse ? options.parse(raw) : raw as TEvent;
    };

    const consumeLine = (line: string): TEvent | undefined => {
      if (line === "") return dispatch();
      if (line.startsWith(":")) return undefined;

      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);

      switch (field) {
        case "event":
          frame.event = value;
          return undefined;
        case "data":
          frame.data.push(value);
          return undefined;
        case "id":
          if (!value.includes("\0")) {
            lastEventId = value;
            frame.id = value;
          }
          return undefined;
        case "retry":
          if (/^\d+$/.test(value)) frame.retry = Number(value);
          return undefined;
        default:
          return undefined;
      }
    };

    const consumeCompleteLines = function* (): Generator<TEvent> {
      while (true) {
        const newline = buffer.indexOf("\n");
        if (newline === -1) return;
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        const event = consumeLine(line);
        if (event !== undefined) yield event;
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          completed = true;
          buffer += decoder.decode();
          if (buffer.length > 0) {
            const event = consumeLine(buffer.replace(/\r$/, ""));
            if (event !== undefined) yield event;
          }
          const finalEvent = dispatch();
          if (finalEvent !== undefined) yield finalEvent;
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        yield* consumeCompleteLines();
      }
    } finally {
      if (!completed) await reader.cancel();
      reader.releaseLock();
    }
  }

  return events();
}
