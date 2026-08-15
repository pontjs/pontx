import { createHash, timingSafeEqual } from "node:crypto";
import type { ApiRequest } from "../types/execute-api";

export const MUTATION_CONFIRMATION_TTL_MS = 5 * 60 * 1000;

export function isMutationMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method.toUpperCase());
}

function headerEntries(headers: RequestInit["headers"]): Array<[string, string]> {
  if (!headers) return [];
  if (headers instanceof Headers) return Array.from(headers.entries());
  if (Array.isArray(headers)) {
    return headers.map(([name, value]) => [name.toLowerCase(), String(value)]);
  }
  return Object.entries(headers).map(([name, value]) => [
    name.toLowerCase(),
    String(value),
  ]);
}

async function hashBinary(value: ArrayBuffer | Blob): Promise<string> {
  const bytes = value instanceof Blob ? await value.arrayBuffer() : value;
  return createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
}

async function canonicalBody(body: unknown): Promise<unknown> {
  if (body === undefined || body === null) return null;
  if (typeof body === "string") return { kind: "string", value: body };
  if (body instanceof URLSearchParams) {
    return { kind: "url-search-params", value: body.toString() };
  }
  if (body instanceof FormData) {
    const entries: unknown[] = [];
    for (const [name, value] of body.entries()) {
      entries.push(typeof value === "string"
        ? [name, { kind: "string", value }]
        : [name, {
            kind: "blob",
            type: value.type,
            size: value.size,
            name: "name" in value ? String(value.name) : undefined,
            sha256: await hashBinary(value),
          }]);
    }
    return { kind: "form-data", entries };
  }
  if (body instanceof Blob) {
    return {
      kind: "blob",
      type: body.type,
      size: body.size,
      sha256: await hashBinary(body),
    };
  }
  if (body instanceof ArrayBuffer) {
    return { kind: "array-buffer", sha256: await hashBinary(body) };
  }
  if (ArrayBuffer.isView(body)) {
    const bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    return {
      kind: "array-buffer-view",
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }
  throw new Error("Cannot create a mutation confirmation for a streaming request body");
}

async function requestDigest(request: ApiRequest, expiresAt: number): Promise<Buffer> {
  const normalized = {
    version: 1,
    expiresAt,
    method: String(request.init.method || request.meta.method).toUpperCase(),
    url: request.url,
    headers: headerEntries(request.init.headers)
      .sort(([leftName, leftValue], [rightName, rightValue]) =>
        leftName.localeCompare(rightName) || leftValue.localeCompare(rightValue)),
    body: await canonicalBody(request.init.body),
  };
  return createHash("sha256").update(JSON.stringify(normalized)).digest();
}

export async function createMutationConfirmation(
  request: ApiRequest,
  now = Date.now(),
): Promise<string> {
  const expiresAt = now + MUTATION_CONFIRMATION_TTL_MS;
  const digest = await requestDigest(request, expiresAt);
  return `ptx1.${expiresAt}.${digest.toString("hex")}`;
}

export async function verifyMutationConfirmation(
  request: ApiRequest,
  token: string,
  now = Date.now(),
): Promise<boolean> {
  const match = /^ptx1\.(\d+)\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now) return false;
  if (expiresAt - now > MUTATION_CONFIRMATION_TTL_MS) return false;

  const expected = await requestDigest(request, expiresAt);
  const actual = Buffer.from(match[2], "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export type CliResponseOutput = {
  data: string | Uint8Array;
  binary: boolean;
};

const SENSITIVE_NAME_PATTERN = /(authorization|cookie|token|secret|password|passwd|apikey)/i;

function normalizedName(name: string): string {
  return name.replace(/[-_\s]/g, "");
}

function isAdditionalSensitiveName(name: string, additionalNames?: readonly string[]): boolean {
  if (!additionalNames) return false;
  const normalized = normalizedName(name).toLowerCase();
  return additionalNames.some(
    (candidate) => normalizedName(candidate).toLowerCase() === normalized,
  );
}

export function isSensitiveName(name: string, additionalNames?: readonly string[]): boolean {
  return SENSITIVE_NAME_PATTERN.test(normalizedName(name))
    || isAdditionalSensitiveName(name, additionalNames);
}

export function redactSensitiveValue(
  name: string,
  value: unknown,
  additionalNames?: readonly string[],
): string {
  return isSensitiveName(name, additionalNames) ? "<redacted>" : String(value);
}

export function redactForPreview(
  name: string,
  value: unknown,
  additionalNames?: readonly string[],
): unknown {
  if (isSensitiveName(name, additionalNames)) return "<redacted>";
  if (Array.isArray(value)) {
    return value.map((item) => redactForPreview("", item, additionalNames));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        redactForPreview(key, item, additionalNames),
      ])
    );
  }
  return value;
}

export function redactUrlForPreview(
  value: string,
  additionalNames?: readonly string[],
): string {
  try {
    const relative = value.startsWith("/");
    const url = new URL(value, "https://pontx.invalid");
    for (const name of Array.from(url.searchParams.keys())) {
      if (isSensitiveName(name, additionalNames)) url.searchParams.set(name, "<redacted>");
    }
    return relative ? `${url.pathname}${url.search}${url.hash}` : url.toString();
  } catch {
    return value;
  }
}

export function redactBodyForPreview(
  body: BodyInit,
  additionalNames?: readonly string[],
): string {
  if (typeof body === "string") {
    try {
      return JSON.stringify(redactForPreview("", JSON.parse(body), additionalNames));
    } catch {
      if (/^[^=&]+=[^&]*(?:&|$)/.test(body)) {
        const redacted = new URLSearchParams(body);
        for (const name of Array.from(redacted.keys())) {
          if (isSensitiveName(name, additionalNames)) redacted.set(name, "<redacted>");
        }
        return redacted.toString();
      }
      return body;
    }
  }
  if (body instanceof URLSearchParams) {
    const redacted = new URLSearchParams(body);
    for (const name of Array.from(redacted.keys())) {
      if (isSensitiveName(name, additionalNames)) redacted.set(name, "<redacted>");
    }
    return redacted.toString();
  }
  if (body instanceof FormData) return "[FormData body omitted]";
  if (body instanceof Blob) return `[Blob body: ${body.size} bytes]`;
  return "[Binary or streaming body omitted]";
}

export async function serializeCliResponse(value: unknown): Promise<CliResponseOutput> {
  if (value instanceof Blob) {
    return { data: new Uint8Array(await value.arrayBuffer()), binary: true };
  }
  if (value instanceof ArrayBuffer) {
    return { data: new Uint8Array(value), binary: true };
  }
  if (ArrayBuffer.isView(value)) {
    return {
      data: new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      binary: true,
    };
  }
  if (typeof value === "string") return { data: value, binary: false };
  if (value === undefined) return { data: "", binary: false };
  return { data: JSON.stringify(value, null, 2), binary: false };
}
