import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  importOpenAPI,
  loadPontxSpec,
  PontxSpecValidationError,
  validatePontxSpecLocale,
} from "../src/index";

describe("PontxSpec protocol boundary", () => {
  it("loads and indexes an RPC spec without HTTP method or path", () => {
    const fixturePath = path.join(__dirname, "fixtures/rpc-minimal.pontx.json");
    const spec = loadPontxSpec(fs.readFileSync(fixturePath, "utf8"));

    expect(spec.style).toBe("RPC");
    expect(Object.keys(spec.apis)).toEqual(["inventory/getItem"]);
    expect(spec.apis["inventory/getItem"].operationId).toBe("getItem");
    expect(spec.apis["inventory/getItem"].path).toBeUndefined();
    expect(spec.components.schemas.Item.required).toEqual(["id"]);
  });

  it("requires HTTP method and path only for RESTFul specs", () => {
    expect(() => loadPontxSpec({
      pontx: "2.1",
      style: "RESTFul",
      name: "broken-rest",
      apis: { getItem: { responses: { 200: { description: "ok" } } } },
      components: { schemas: {} },
    })).toThrow(PontxSpecValidationError);
  });

  it("allows locale prose changes and rejects structural changes", () => {
    const base = {
      pontx: "2.1",
      style: "RESTFul",
      name: "example",
      info: { title: "示例", version: "1.0.0" },
      apis: {
        getItem: {
          path: "/items/{id}", method: "GET", summary: "获取项目",
          responses: { 200: { description: "成功" } },
        },
      },
      components: { schemas: {} },
    };
    const locale = structuredClone(base);
    locale.info.title = "Example";
    locale.apis.getItem.summary = "Get item";
    locale.apis.getItem.responses[200].description = "Success";

    expect(validatePontxSpecLocale(base, locale).valid).toBe(true);
    locale.apis.getItem.path = "/things/{id}";
    expect(validatePontxSpecLocale(base, locale).valid).toBe(false);
  });

  it("imports OAS3 without losing tags, media types, evidence or security", () => {
    const spec = importOpenAPI({
      openapi: "3.1.0",
      info: { title: "Example", version: "1.0.0" },
      servers: [{ url: "https://api.example.com" }],
      security: [{ apiKey: [] }],
      tags: [{ name: "items", description: "Items" }],
      paths: {
        "/items": {
          post: {
            operationId: "createItem",
            tags: ["items"],
            security: [{ apiKey: [] }],
            "x-pontx-documentation-status": "official",
            "x-pontx-evidence": ["https://docs.example.com/items"],
            "x-pontx-proxy-enabled": false,
            "x-pontx-proxy-disabled-reason": "Use the local SDK.",
            requestBody: {
              required: true,
              content: {
                "application/json": { schema: { type: "object" } },
                "application/cbor": { schema: { type: "string", format: "binary" } },
              },
            },
            responses: {
              201: {
                description: "created",
                content: {
                  "application/json": { schema: { type: "object" } },
                  "application/cbor": { schema: { type: "string" } },
                },
              },
              400: { description: "bad request" },
            },
          },
        },
      },
      components: {
        schemas: {},
        securitySchemes: {
          apiKey: { type: "apiKey", in: "header", name: "x-api-key" },
        },
      },
    }, { name: "example" });
    const api = spec.apis["items/createItem"];

    expect(spec.pontx).toBe("2.1");
    expect(spec.style).toBe("RESTFul");
    expect(api.tags).toEqual(["items"]);
    expect(Object.keys(api.parameters?.find((parameter) => parameter.in === "body")?.content ?? {}))
      .toEqual(["application/json", "application/cbor"]);
    expect(Object.keys(api.responses["201"].content ?? {}))
      .toEqual(["application/json", "application/cbor"]);
    expect(Object.keys(api.responses)).toEqual(["201", "400"]);
    expect(api.security).toEqual([{ apiKey: [] }]);
    expect(api.metadata?.documentation?.evidence).toEqual(["https://docs.example.com/items"]);
    expect(api.metadata?.execution).toEqual({
      enabled: false,
      permission: undefined,
      disabledReason: "Use the local SDK.",
    });
  });
});
