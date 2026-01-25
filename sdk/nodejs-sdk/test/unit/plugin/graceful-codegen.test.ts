import { describe, it, expect } from "vitest";
import { gracefulCodegenPlugin } from "../../../src/plugin/index";
import type { PontxAPI, PontxSpec } from "@pontx/spec";
import {
  extractPathParams,
  extractQueryParams,
  detectBodyType,
  generateGracefulApiMeta,
} from "../../../src/plugin/graceful-codegen";

describe("Graceful Codegen Plugin", () => {
  describe("extractPathParams", () => {
    it("should extract path parameter names", () => {
      const api: PontxAPI = {
        path: "/users/{userId}/posts/{postId}",
        method: "GET",
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "postId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          { name: "limit", in: "query", schema: { type: "number" } },
        ],
        responses: {},
      };

      expect(extractPathParams(api)).toEqual(["userId", "postId"]);
    });

    it("should return empty array when no path params", () => {
      const api: PontxAPI = {
        path: "/users",
        method: "GET",
        parameters: [
          { name: "limit", in: "query", schema: { type: "number" } },
        ],
        responses: {},
      };

      expect(extractPathParams(api)).toEqual([]);
    });
  });

  describe("extractQueryParams", () => {
    it("should extract query parameter names", () => {
      const api: PontxAPI = {
        path: "/users",
        method: "GET",
        parameters: [
          { name: "limit", in: "query", schema: { type: "number" } },
          { name: "offset", in: "query", schema: { type: "number" } },
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {},
      };

      expect(extractQueryParams(api)).toEqual(["limit", "offset"]);
    });

    it("should return empty array when no query params", () => {
      const api: PontxAPI = {
        path: "/users/{userId}",
        method: "GET",
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {},
      };

      expect(extractQueryParams(api)).toEqual([]);
    });
  });

  describe("detectBodyType", () => {
    it("should detect object body type", () => {
      const api: PontxAPI = {
        path: "/users",
        method: "POST",
        parameters: [
          {
            name: "body",
            in: "body",
            schema: {
              type: "object",
              properties: { name: { type: "string" } },
            },
          },
        ],
        responses: {},
      };

      expect(detectBodyType(api)).toBe("object");
    });

    it("should detect array body type", () => {
      const api: PontxAPI = {
        path: "/users",
        method: "POST",
        parameters: [
          {
            name: "body",
            in: "body",
            schema: { type: "array", items: { type: "string" } },
          },
        ],
        responses: {},
      };

      expect(detectBodyType(api)).toBe("array");
    });

    it("should detect string body type", () => {
      const api: PontxAPI = {
        path: "/users",
        method: "POST",
        parameters: [{ name: "body", in: "body", schema: { type: "string" } }],
        responses: {},
      };

      expect(detectBodyType(api)).toBe("string");
    });

    it("should detect number body type", () => {
      const api: PontxAPI = {
        path: "/users",
        method: "POST",
        parameters: [{ name: "body", in: "body", schema: { type: "number" } }],
        responses: {},
      };

      expect(detectBodyType(api)).toBe("number");
    });

    it("should return none when no body parameter", () => {
      const api: PontxAPI = {
        path: "/users",
        method: "GET",
        parameters: [
          { name: "limit", in: "query", schema: { type: "number" } },
        ],
        responses: {},
      };

      expect(detectBodyType(api)).toBe("none");
    });

    it("should default to object for complex schemas", () => {
      const api: PontxAPI = {
        path: "/users",
        method: "POST",
        parameters: [
          {
            name: "body",
            in: "body",
            schema: {
              oneOf: [{ type: "object" }, { type: "string" }],
            },
          },
        ],
        responses: {},
      };

      expect(detectBodyType(api)).toBe("object");
    });
  });

  describe("generateGracefulApiMeta", () => {
    it("should generate enhanced API metadata", () => {
      const spec: PontxSpec = {
        name: "test-api",
        apis: {
          "users/getUser": {
            path: "/users/{userId}",
            method: "GET",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
              { name: "include", in: "query", schema: { type: "string" } },
            ],
            responses: {},
          },
          "users/createUser": {
            path: "/users",
            method: "POST",
            consumes: ["application/json"],
            parameters: [
              {
                name: "body",
                in: "body",
                schema: {
                  type: "object",
                  properties: { name: { type: "string" } },
                },
              },
            ],
            responses: {},
          },
        },
      };

      const result = generateGracefulApiMeta(spec);
      expect(result).toContain("pathParams");
      expect(result).toContain("queryParams");
      expect(result).toContain("bodyType");

      // Check formatted output contains expected values
      expect(result).toContain('"userId"');
      expect(result).toContain('"include"');
      expect(result).toContain('"bodyType": "none"');
      expect(result).toContain('"bodyType": "object"');
    });
  });

  describe("gracefulCodegenPlugin", () => {
    it("should create a valid plugin instance", () => {
      const plugin = gracefulCodegenPlugin();

      expect(plugin).toHaveProperty("name", "graceful-codegen-plugin");
      expect(plugin).toHaveProperty("generate");
      expect(typeof plugin.generate).toBe("function");
    });

    it("should generate files with enhanced metadata", async () => {
      const plugin = gracefulCodegenPlugin();

      const spec: PontxSpec = {
        name: "test-api",
        apis: {
          getUser: {
            path: "/users/{userId}",
            method: "GET",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": { schema: { type: "object" } },
            },
          },
        },
      };

      const files = await plugin.generate!(spec);

      expect(files).toHaveProperty("api-lock.json");
      expect(files).toHaveProperty("apis.ts");
      expect(files).toHaveProperty("apiMeta.ts");

      // Check apiMeta contains enhanced fields
      expect(files["apiMeta.ts"]).toContain("pathParams");
      expect(files["apiMeta.ts"]).toContain("queryParams");
      expect(files["apiMeta.ts"]).toContain("bodyType");
    });

    it("should generate schemas.ts when schemas exist", async () => {
      const plugin = gracefulCodegenPlugin();

      const spec: PontxSpec = {
        name: "test-api",
        apis: {},
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      const files = await plugin.generate!(spec);

      expect(files).toHaveProperty("schemas.ts");
    });

    it("should not generate schemas.ts when no schemas exist", async () => {
      const plugin = gracefulCodegenPlugin();

      const spec: PontxSpec = {
        name: "test-api",
        apis: {},
      };

      const files = await plugin.generate!(spec);

      expect(files).not.toHaveProperty("schemas.ts");
    });
  });
});
