import type { PontxJsonSchema } from "./schema.js";

/** A normalized subset of AsyncAPI 3.x required by Pontx's streaming tooling. */
export type PontxAsyncApiInfo = {
  title?: string;
  version?: string;
  description?: string;
};

export type PontxAsyncApiServer = {
  name: string;
  protocol: string;
  host?: string;
  pathname?: string;
  url?: string;
  description?: string;
  security?: Array<Record<string, string[]>>;
};

export type PontxAsyncApiMessage = {
  name: string;
  title?: string;
  summary?: string;
  description?: string;
  contentType?: string;
  payload?: PontxJsonSchema;
  headers?: PontxJsonSchema;
  examples?: unknown[];
};

export type PontxAsyncApiChannel = {
  name: string;
  address: string;
  title?: string;
  summary?: string;
  description?: string;
  messages: string[];
};

export type PontxAsyncApiOperation = {
  name: string;
  action: "send" | "receive";
  channel: string;
  title?: string;
  summary?: string;
  description?: string;
  messages: string[];
  security?: Array<Record<string, string[]>>;
};

export type PontxAsyncApiSpec = {
  version: string;
  info: PontxAsyncApiInfo;
  servers: Record<string, PontxAsyncApiServer>;
  channels: Record<string, PontxAsyncApiChannel>;
  operations: Record<string, PontxAsyncApiOperation>;
  messages: Record<string, PontxAsyncApiMessage>;
  components: {
    schemas: Record<string, PontxJsonSchema>;
    securitySchemes?: Record<string, unknown>;
  };
};
