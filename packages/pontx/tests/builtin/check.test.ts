/**
 * Tests for builtin check implementation
 */

import { describe, it, expect } from "vitest";
import { builtinCheck, parseApiKey } from "../../src/builtin/check";
import { PontxSpec } from "@pontx/spec";
import type { PluginHookOptions } from "../../src/type";

describe("builtin check", () => {
  const mockOptions: PluginHookOptions = {
    resolvedConfig: {
      rootDir: "/test",
      configDir: "/test",
      configPath: "/test/pontx.config.ts",
      outDir: "/test/api",
      origins: [],
    },
  };

  describe("builtinCheck", () => {
    it("should return empty array when localSpec is null", async () => {
      const remoteSpec: PontxSpec = {
        name: "test",
        apis: {},
      };

      const results = await builtinCheck(null, remoteSpec, mockOptions);

      expect(results).toEqual([]);
    });

    it("should return empty array when no issues found", async () => {
      const localSpec: PontxSpec = {
        name: "test",
        apis: {
          "user.getUserById": {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const remoteSpec: PontxSpec = {
        name: "test",
        apis: {
          "user.getUserById": {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const results = await builtinCheck(localSpec, remoteSpec, mockOptions);

      expect(results).toEqual([]);
    });

    it("should detect apiKey change (tag changed) as breaking change", async () => {
      const localSpec: PontxSpec = {
        name: "test",
        apis: {
          "user.getUserById": {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const remoteSpec: PontxSpec = {
        name: "test",
        apis: {
          "userService.getUserById": {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const results = await builtinCheck(localSpec, remoteSpec, mockOptions);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        level: "error",
        type: "breaking-change",
        message:
          'API name changed: "user.getUserById" → "userService.getUserById"',
        api: {
          tagName: "user",
          apiName: "getUserById",
          method: "GET",
          path: "/users/{id}",
        },
        details: {
          oldApiKey: "user.getUserById",
          newApiKey: "userService.getUserById",
          oldTag: "user",
          newTag: "userService",
        },
      });
    });

    it("should detect apiKey change (apiName changed) as breaking change", async () => {
      const localSpec: PontxSpec = {
        name: "test",
        apis: {
          "user.getUserById": {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const remoteSpec: PontxSpec = {
        name: "test",
        apis: {
          "user.getUser": {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const results = await builtinCheck(localSpec, remoteSpec, mockOptions);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        level: "error",
        type: "breaking-change",
        message: 'API name changed: "user.getUserById" → "user.getUser"',
        api: {
          tagName: "user",
          apiName: "getUserById",
          method: "GET",
          path: "/users/{id}",
        },
        details: {
          oldApiKey: "user.getUserById",
          newApiKey: "user.getUser",
          oldApiName: "getUserById",
          newApiName: "getUser",
        },
      });
    });

    it("should detect deleted APIs as warning", async () => {
      const localSpec: PontxSpec = {
        name: "test",
        apis: {
          "user.getUserById": {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
          "user.deleteUser": {
            method: "DELETE",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const remoteSpec: PontxSpec = {
        name: "test",
        apis: {
          "user.getUserById": {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const results = await builtinCheck(localSpec, remoteSpec, mockOptions);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        level: "warning",
        type: "api-deleted",
        message: "API has been deleted from remote",
        api: {
          tagName: "user",
          apiName: "deleteUser",
          method: "DELETE",
          path: "/users/{id}",
        },
      });
    });

    it("should detect multiple issues", async () => {
      const localSpec: PontxSpec = {
        name: "test",
        apis: {
          "user.getUserById": {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
          "user.createUser": {
            method: "POST",
            path: "/users",
            responses: { "200": { description: "Success" } },
          },
          "pet.getPetById": {
            method: "GET",
            path: "/pets/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const remoteSpec: PontxSpec = {
        name: "test",
        apis: {
          "userService.getUserById": {
            // apiKey changed (tag changed)
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
          "user.addUser": {
            // apiKey changed (apiName changed)
            method: "POST",
            path: "/users",
            responses: { "200": { description: "Success" } },
          },
          // pet.getPetById deleted
        },
      };

      const results = await builtinCheck(localSpec, remoteSpec, mockOptions);

      expect(results).toHaveLength(3);

      // Check for apiKey change (tag changed)
      const tagChangeError = results.find(
        (r) =>
          r.type === "breaking-change" &&
          r.details?.oldApiKey === "user.getUserById"
      );
      expect(tagChangeError).toBeDefined();
      expect(tagChangeError?.details?.newApiKey).toBe(
        "userService.getUserById"
      );

      // Check for apiKey change (apiName changed)
      const apiNameChangeError = results.find(
        (r) =>
          r.type === "breaking-change" &&
          r.details?.oldApiKey === "user.createUser"
      );
      expect(apiNameChangeError).toBeDefined();
      expect(apiNameChangeError?.details?.newApiKey).toBe("user.addUser");

      // Check for deleted API
      const deletedWarning = results.find((r) => r.type === "api-deleted");
      expect(deletedWarning).toBeDefined();
      expect(deletedWarning?.api?.apiName).toBe("getPetById");
    });

    it("should handle APIs without namespace (no tag)", async () => {
      const localSpec: PontxSpec = {
        name: "test",
        apis: {
          getUserById: {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const remoteSpec: PontxSpec = {
        name: "test",
        apis: {
          getUserById: {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const results = await builtinCheck(localSpec, remoteSpec, mockOptions);

      expect(results).toEqual([]);
    });

    it("should detect tag added to API without namespace", async () => {
      const localSpec: PontxSpec = {
        name: "test",
        apis: {
          getUserById: {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const remoteSpec: PontxSpec = {
        name: "test",
        apis: {
          "user.getUserById": {
            method: "GET",
            path: "/users/{id}",
            responses: { "200": { description: "Success" } },
          },
        },
      };

      const results = await builtinCheck(localSpec, remoteSpec, mockOptions);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("breaking-change");
      expect(results[0].message).toContain(
        'API name changed: "getUserById" → "user.getUserById"'
      );
    });
  });

  describe("parseApiKey", () => {
    it("should parse apiKey without namespace", () => {
      const result = parseApiKey("getUserById");

      expect(result).toEqual({
        tagName: "",
        apiName: "getUserById",
      });
    });

    it("should parse apiKey with namespace", () => {
      const result = parseApiKey("user.getUserById");

      expect(result).toEqual({
        tagName: "user",
        apiName: "getUserById",
      });
    });

    it("should parse apiKey with nested namespace (only split once)", () => {
      const result = parseApiKey("user.service.getUserById");

      expect(result).toEqual({
        tagName: "user",
        apiName: "service.getUserById",
      });
    });
  });
});
