import type {
  PontxAsyncApiChannel,
  PontxAsyncApiMessage,
  PontxAsyncApiOperation,
  PontxAsyncApiServer,
  PontxAsyncApiSpec,
} from "../asyncapi.js";
import { PontxSpec, PontxStyle } from "../spec.js";
import type { PontxJsonSchema } from "../schema.js";

type JsonRecord = Record<string, any>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function refName(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.$ref !== "string") return undefined;
  const parts = value.$ref.split("/");
  return parts.at(-1);
}

function resolveRef(value: unknown, source: JsonRecord): JsonRecord | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.$ref !== "string") return value;
  if (!value.$ref.startsWith("#/")) return undefined;

  const resolved = value.$ref
    .slice(2)
    .split("/")
    .reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), source);
  return isRecord(resolved) ? resolved : undefined;
}

function normalizeSchema(value: unknown): PontxJsonSchema | undefined {
  if (!isRecord(value)) return undefined;
  const normalized: JsonRecord = { ...value };

  if (isRecord(value.properties)) {
    normalized.properties = Object.fromEntries(
      Object.entries(value.properties).map(([name, schema]) => [
        name,
        normalizeSchema(schema) || schema,
      ])
    );
  }
  if (value.items) normalized.items = normalizeSchema(value.items) || value.items;
  if (isRecord(value.additionalProperties)) {
    normalized.additionalProperties = normalizeSchema(value.additionalProperties);
  }
  for (const keyword of ["allOf", "anyOf", "oneOf"] as const) {
    if (Array.isArray(value[keyword])) {
      normalized[keyword] = value[keyword].map(
        (schema: unknown) => normalizeSchema(schema) || schema
      );
    }
  }

  return normalized as PontxJsonSchema;
}

function namedEntries(value: unknown): Array<[string, JsonRecord]> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const name = refName(item) || (isRecord(item) && typeof item.name === "string" ? item.name : undefined);
      const record = isRecord(item) ? item : undefined;
      return name && record ? [[name || `message${index + 1}`, record]] : [];
    });
  }

  return isRecord(value)
    ? Object.entries(value).flatMap(([name, item]) => (isRecord(item) ? [[name, item]] : []))
    : [];
}

function getMessageNames(value: unknown): string[] {
  return namedEntries(value).map(([name]) => name);
}

function parseMessage(
  name: string,
  candidate: JsonRecord,
  source: JsonRecord
): PontxAsyncApiMessage {
  const message = resolveRef(candidate, source) || candidate;
  const payload = normalizeSchema(message.payload);
  const headers = normalizeSchema(message.headers);

  return {
    pontx: "2.1",
    name,
    ...(typeof message.title === "string" ? { title: message.title } : {}),
    ...(typeof message.summary === "string" ? { summary: message.summary } : {}),
    ...(typeof message.description === "string"
      ? { description: message.description }
      : {}),
    ...(typeof message.contentType === "string"
      ? { contentType: message.contentType }
      : {}),
    ...(payload ? { payload } : {}),
    ...(headers ? { headers } : {}),
    ...(Array.isArray(message.examples) ? { examples: message.examples } : {}),
  };
}

function parseMessages(source: JsonRecord): Record<string, PontxAsyncApiMessage> {
  const components = source.components || {};
  const messages: Record<string, PontxAsyncApiMessage> = {};

  const addMessages = (messageSource: unknown) => {
    for (const [name, candidate] of namedEntries(messageSource)) {
      messages[name] = parseMessage(name, candidate, source);
    }
  };

  addMessages(components.messages);
  for (const [, candidate] of namedEntries(source.channels)) {
    const channel = resolveRef(candidate, source) || candidate;
    addMessages(channel.messages || channel.message);
  }
  for (const [, candidate] of namedEntries(source.operations)) {
    const operation = resolveRef(candidate, source) || candidate;
    addMessages(operation.messages || operation.message);
  }

  return messages;
}

function parseChannels(source: JsonRecord): Record<string, PontxAsyncApiChannel> {
  const channels: Record<string, PontxAsyncApiChannel> = {};

  for (const [name, candidate] of namedEntries(source.channels)) {
    const channel = resolveRef(candidate, source) || candidate;
    const messages = getMessageNames(channel.messages || channel.message);
    channels[name] = {
      name,
      address: typeof channel.address === "string" ? channel.address : name,
      ...(typeof channel.title === "string" ? { title: channel.title } : {}),
      ...(typeof channel.summary === "string" ? { summary: channel.summary } : {}),
      ...(typeof channel.description === "string"
        ? { description: channel.description }
        : {}),
      messages,
    };
  }

  return channels;
}

function parseOperations(
  source: JsonRecord,
  channels: Record<string, PontxAsyncApiChannel>
): Record<string, PontxAsyncApiOperation> {
  const operations: Record<string, PontxAsyncApiOperation> = {};

  for (const [name, candidate] of namedEntries(source.operations)) {
    const operation = resolveRef(candidate, source) || candidate;
    const channelRef = refName(operation.channel);
    const channelName = channelRef || (typeof operation.channel === "string" ? operation.channel : undefined);
    if (!channelName || !channels[channelName]) continue;
    if (operation.action !== "send" && operation.action !== "receive") continue;

    const messageNames = getMessageNames(operation.messages || operation.message);
    operations[name] = {
      name,
      action: operation.action,
      channel: channelName,
      ...(typeof operation.title === "string" ? { title: operation.title } : {}),
      ...(typeof operation.summary === "string" ? { summary: operation.summary } : {}),
      ...(typeof operation.description === "string"
        ? { description: operation.description }
        : {}),
      messages: messageNames.length ? messageNames : channels[channelName].messages,
      ...(Array.isArray(operation.security) ? { security: operation.security } : {}),
    };
  }

  return operations;
}

function parseServers(source: JsonRecord): Record<string, PontxAsyncApiServer> {
  const servers: Record<string, PontxAsyncApiServer> = {};

  for (const [name, candidate] of namedEntries(source.servers)) {
    const server = resolveRef(candidate, source) || candidate;
    if (typeof server.protocol !== "string") continue;
    const host = typeof server.host === "string" ? server.host : undefined;
    const pathname = typeof server.pathname === "string" ? server.pathname : undefined;
    const url =
      typeof server.url === "string"
        ? server.url
        : host && ["ws", "wss"].includes(server.protocol)
          ? `${server.protocol}://${host}${pathname || ""}`
          : undefined;
    servers[name] = {
      name,
      protocol: server.protocol,
      ...(host ? { host } : {}),
      ...(pathname ? { pathname } : {}),
      ...(url ? { url } : {}),
      ...(typeof server.description === "string"
        ? { description: server.description }
        : {}),
      ...(Array.isArray(server.security) ? { security: server.security } : {}),
    };
  }

  return servers;
}

/** Returns true for an AsyncAPI 3.x document without accepting generic JSON. */
export function checkIsAsyncApi3(value: unknown): value is JsonRecord {
  return (
    isRecord(value) &&
    typeof value.asyncapi === "string" &&
    value.asyncapi.startsWith("3.") &&
    isRecord(value.info) &&
    isRecord(value.channels) &&
    isRecord(value.operations)
  );
}

/**
 * Normalizes an AsyncAPI 3.x document into PontxSpec while retaining the
 * streaming contract separately from HTTP Endpoints.  The empty `apis` map is
 * intentional: AsyncAPI operations must not be fabricated as HTTP calls.
 */
export function parseAsyncApi3(source: JsonRecord, name = ""): PontxSpec {
  const channels = parseChannels(source);
  const asyncapi: PontxAsyncApiSpec = {
    version: source.asyncapi,
    info: {
      ...(typeof source.info.title === "string" ? { title: source.info.title } : {}),
      ...(typeof source.info.version === "string" ? { version: source.info.version } : {}),
      ...(typeof source.info.description === "string"
        ? { description: source.info.description }
        : {}),
    },
    servers: parseServers(source),
    channels,
    operations: parseOperations(source, channels),
    messages: parseMessages(source),
    components: {
      schemas: Object.fromEntries(
        Object.entries(source.components?.schemas || {}).map(([schemaName, schema]) => [
          schemaName,
          normalizeSchema(schema) || schema,
        ])
      ) as Record<string, PontxJsonSchema>,
      ...(isRecord(source.components?.securitySchemes)
        ? { securitySchemes: source.components.securitySchemes }
        : {}),
    },
  };

  return {
    name,
    info: asyncapi.info as PontxSpec["info"],
    style: PontxStyle.AsyncAPI,
    apis: {},
    components: {
      schemas: asyncapi.components.schemas,
    },
    asyncapi,
  };
}
