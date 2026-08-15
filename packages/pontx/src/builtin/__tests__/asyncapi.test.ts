import { describe, expect, it } from "vitest";
import { getBuiltinPlugin } from "../index";

const document = {
  asyncapi: "3.1.0",
  info: { title: "FX prices", version: "1.0.0" },
  servers: {
    production: {
      protocol: "wss",
      host: "ws.example.test",
      pathname: "/v1/quotes",
    },
  },
  channels: {
    quotes: {
      address: "quotes.{symbol}",
      messages: { price: { $ref: "#/components/messages/price" } },
    },
  },
  operations: {
    receivePrice: {
      action: "receive",
      channel: { $ref: "#/channels/quotes" },
    },
  },
  components: {
    messages: {
      price: {
        payload: {
          type: "object",
          properties: { price: { type: "number" } },
        },
      },
    },
  },
};

describe("built-in AsyncAPI support", () => {
  it("parses and generates stream types without converting them to HTTP APIs", async () => {
    const plugin = getBuiltinPlugin();
    const options = {
      originConfig: { name: "fx-prices" },
      resolvedConfig: { origins: [] },
    } as any;

    const spec = await plugin.parseMeta!(JSON.stringify(document), options);
    const generated = await plugin.generate!(spec, options);

    expect(spec.apis).toEqual({});
    expect(spec.asyncapi?.operations.receivePrice.messages).toEqual(["price"]);
    expect(generated["streams.ts"]).toContain("StreamOperations");
    expect(generated["stream-client.ts"]).toContain("createStreamClient");
    expect(generated["apis.ts"]).toContain("export type APIs =");
  });
});
