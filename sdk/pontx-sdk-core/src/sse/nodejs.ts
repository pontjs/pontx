import { handleResponse } from "../helper";
import { EventStreamResponse, OctetStreamResponse, SseEvent } from "./type";

const webStreams = require("web-streams-nodejs");
const decoder = new global.TextDecoder("utf-8");

export const precessEventStreamResponse = async <Response>(
  response: Response,
): Promise<EventStreamResponse<Response>> => {
  let reader = null;

  async function read(): Promise<{ done: boolean; events: SseEvent<Response>[]; value: SseEvent<Response> }> {
    if (!reader) {
      reader = webStreams.toWebReadableStream((response as any).body).getReader();
    }

    const { done, value } = await reader.read();
    const decodeValue = decoder.decode(value);

    if (decodeValue) {
      const lines = (decodeValue?.split("\n") || []).filter((id) => id);

      const events = [] as SseEvent<Response>[];
      let event = {} as SseEvent<Response>;

      const assignEvent = (key, value) => {
        if (event[key]) {
          // 已经存在的 key，说明是新的 event
          events.push(event);
          event = {} as SseEvent<Response>;
          event[key] = value;
        } else {
          event[key] = value;
        }
      };

      lines.forEach((line) => {
        if (line.includes(":")) {
          const sepIndex = line.indexOf(":");
          const key = line.slice(0, sepIndex);
          const value = line.slice(sepIndex + 1);

          if (key === "data") {
            try {
              assignEvent(key, JSON.parse(value));
            } catch (e) {}
          } else if (key) {
            assignEvent(key, value);
          }
        }
      });
      if (Object.keys(event).length) {
        events.push(event);
      }

      return {
        done,
        events,
        value: events?.[0],
      };
    }

    return {
      done,
      events: [],
      value: null as any,
    };
  }

  const newResponse = response as EventStreamResponse<Response>;
  newResponse.read = read;
  newResponse.getReader = () => {
    if (!reader) {
      reader = webStreams.toWebReadableStream((response as any).body).getReader();
    }

    return reader;
  };

  return newResponse;
};

export const processOctetStreamResponse = async <Response>(
  response: Response,
): Promise<OctetStreamResponse<Response>> => {
  let responseContent = "";
  let reader;

  async function readLines(): Promise<{ done: boolean; lines: Response[] }> {
    if (!reader) {
      reader = webStreams.toWebReadableStream((response as any).body).getReader();
    }

    const { done, value } = await reader.read();
    const decodeValue = decoder.decode(value);

    if (decodeValue) {
      const lines = decodeValue?.split("\n");

      const parsedLines = lines
        // Remove the "data: " prefix
        .map((line) => line.replace(/^data: /, "").trim())
        // Remove empty lines and "[DONE]"
        .filter((line) => line !== "" && line !== "[DONE]")
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (e) {
            console.log("line is not json", line);
            // throw new Error("line is not json");
          }
        });

      return {
        done,
        lines: parsedLines,
      };
    }

    return {
      done,
      lines: [],
    };
  }

  async function readContent() {
    const { done, lines } = await readLines();

    let readedContent = "";
    for (const parsedLine of lines) {
      const { choices, error } = parsedLine as any;
      if (error) {
        throw new Error(error?.message);
      }
      const content = choices?.[0]?.delta?.content;

      if (content) {
        readedContent = readedContent + content;
      }
    }
    responseContent += readedContent;

    return {
      done,
      /** 本次读取的新增文本 */
      value: readedContent,
      /** 截止本次读取的总文本 */
      responseValue: responseContent,
    };
  }

  const newResponse = response as OctetStreamResponse<Response>;

  newResponse.getReader = () => {
    if (!reader) {
      reader = webStreams.toWebReadableStream((response as any).body).getReader();
    }

    return reader;
  };
  newResponse.readContent = readContent;
  (newResponse as any).read = readContent;
  newResponse.readLines = readLines;

  return newResponse;
};

export const handleSseResponse = (response: any, responseContentType): Promise<any> => {
  if (responseContentType === "application/octet-stream") {
    return processOctetStreamResponse(response);
  } else if (responseContentType === "text/event-stream") {
    return precessEventStreamResponse(response);
  }
  return handleResponse(response, responseContentType);
};
