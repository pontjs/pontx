import { describe, expect, it } from "vitest";
import ts from "typescript";
import { generateAsyncApiTypes } from "../../src/generate/typescript/stream";
import { generateAsyncApiClient } from "../../src/generate/typescript/stream-client";
import { checkIsAsyncApi3, parseAsyncApi3 } from "../../src/parse/parseAsyncApi3";

const document = {
  asyncapi: "3.1.0",
  info: {
    title: "FX prices",
    version: "1.0.0",
    description: "Live quotes.",
  },
  servers: {
    production: {
      host: "ws.example.test",
      pathname: "/v1/quotes",
      protocol: "wss",
      security: [{ apiKey: [] }],
    },
  },
  channels: {
    quotes: {
      address: "quotes.{symbol}",
      messages: {
        price: { $ref: "#/components/messages/price" },
      },
    },
  },
  operations: {
    sendSubscribe: {
      action: "send",
      channel: { $ref: "#/channels/quotes" },
      messages: [{ $ref: "#/components/messages/subscribe" }],
    },
    receivePrice: {
      action: "receive",
      channel: { $ref: "#/channels/quotes" },
      messages: [{ $ref: "#/components/messages/price" }],
    },
  },
  components: {
    messages: {
      subscribe: {
        title: "Subscribe",
        payload: {
          type: "object",
          required: ["action", "params"],
          properties: {
            action: { type: "string", enum: ["subscribe"] },
            params: {
              type: "object",
              required: ["symbols"],
              properties: { symbols: { type: "string" } },
            },
          },
        },
      },
      price: {
        title: "Price update",
        contentType: "application/json",
        payload: {
          type: "object",
          required: ["event", "price"],
          properties: {
            event: { type: "string", enum: ["price"] },
            price: { type: "number" },
          },
        },
      },
    },
    schemas: {
      Symbol: { type: "string", pattern: "^[A-Z]{3}/[A-Z]{3}$" },
    },
    securitySchemes: {
      apiKey: { type: "httpApiKey", in: "query", name: "apikey" },
    },
  },
};

describe("parseAsyncApi3", () => {
  it("recognizes and keeps AsyncAPI contracts outside HTTP operations", () => {
    expect(checkIsAsyncApi3(document)).toBe(true);

    const spec = parseAsyncApi3(document, "fx-prices");

    expect(spec.style).toBe("AsyncAPI");
    expect(spec.apis).toEqual({});
    expect(spec.asyncapi?.servers.production.url).toBe(
      "wss://ws.example.test/v1/quotes"
    );
    expect(spec.asyncapi?.operations.receivePrice).toMatchObject({
      action: "receive",
      channel: "quotes",
      messages: ["price"],
    });
    expect(spec.asyncapi?.messages.price.payload).toMatchObject({
      required: ["event", "price"],
    });
    expect(spec.components?.schemas.Symbol).toMatchObject({ type: "string" });
  });

  it("does not treat an OpenAPI document as AsyncAPI", () => {
    expect(checkIsAsyncApi3({ openapi: "3.1.0", info: {}, paths: {} })).toBe(
      false
    );
  });

  it("generates stream operation types without manufacturing HTTP methods", () => {
    const spec = parseAsyncApi3(document, "fx-prices");
    const code = generateAsyncApiTypes(spec.asyncapi!);

    expect(code).toContain("export type StreamOperations");
    expect(code).toContain("export type StreamSendMessage");
    expect(code).toContain("export type StreamReceivedMessage");
    expect(code).toContain("sendSubscribe");
    expect(code).toContain("receivePrice");
    expect(code).toContain('action: "receive"');
    expect(code).not.toContain("method:");
  });

  it("generates an explicit runtime binding that never embeds credentials", () => {
    const spec = parseAsyncApi3(document, "fx-prices");
    const code = generateAsyncApiClient(spec.asyncapi!);

    expect(code).toContain('import { createWebSocketClient } from "@pontx/sdk"');
    expect(code).toContain("CreateWebSocketClientOptions");
    expect(code).toContain("createStreamClient");
    expect(code).not.toContain("apikey");
  });

  it("emits syntactically valid TypeScript for the generated stream SDK files", () => {
    const spec = parseAsyncApi3(document, "fx-prices");
    const output = `${generateAsyncApiTypes(spec.asyncapi!)}\n${generateAsyncApiClient(
      spec.asyncapi!
    )}`;
    const diagnostics = ts
      .transpileModule(output, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
        reportDiagnostics: true,
      })
      .diagnostics?.filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
      );

    expect(diagnostics).toEqual([]);
  });

  it("retains an inline channel message when components do not declare it", () => {
    const inlineDocument = {
      ...document,
      channels: {
        updates: {
          address: "updates",
          messages: {
            heartbeat: { payload: { type: "object", properties: { ts: { type: "number" } } } },
          },
        },
      },
      operations: {
        receiveHeartbeat: {
          action: "receive",
          channel: { $ref: "#/channels/updates" },
        },
      },
    };

    const spec = parseAsyncApi3(inlineDocument, "fx-prices");

    expect(spec.asyncapi?.operations.receiveHeartbeat.messages).toEqual([
      "heartbeat",
    ]);
    expect(spec.asyncapi?.messages.heartbeat.payload).toMatchObject({
      type: "object",
    });
  });
});
