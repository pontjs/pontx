export type OctetStreamResponse<APIResponse> = Response & {
  getReader: () => ReadableStreamDefaultReader<Uint8Array>;
  readContent: () => Promise<{
    done: boolean;
    /** 本次读取的新增文本 */
    value: string;
    /** 截止本次读取的总文本 */
    responseValue: string;
  }>;
  readLines: () => Promise<{ done: boolean; lines: APIResponse[] }>;
};

export type SseEvent<Data> = {
  id: any;
  data: Data;
  event: string;
};

export type EventStreamResponse<APIResponse> = Response & {
  getReader: () => ReadableStreamDefaultReader<Uint8Array>;
  read: () => Promise<{
    done: boolean;
    events: SseEvent<APIResponse>[];
    /** @deprecated */
    value?: SseEvent<APIResponse>;
  }>;
  body: ReadableStream;
};
