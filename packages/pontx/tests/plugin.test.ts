/**
 * Tests for Plugin check lifecycle hook
 */

import { describe, it, expect, vi } from "vitest";
import { resolvePlugin } from "../src/plugin";
import type { Plugin, CheckResult, PluginHookOptions } from "../src/type";
import { PontxSpec } from "@pontx/spec";

describe("Plugin check lifecycle hook", () => {
  const mockOptions: PluginHookOptions = {
    resolvedConfig: {
      rootDir: "/test",
      configDir: "/test",
      configPath: "/test/pontx.config.ts",
      outDir: "/test/api",
      origins: [],
    },
  };

  const mockLocalSpec: PontxSpec = {
    name: "test",
    apis: {
      "user.getUserById": {
        method: "GET",
        path: "/users/{id}",
        responses: {
          "200": {
            description: "Success",
          },
        },
      },
    },
  };

  const mockRemoteSpec: PontxSpec = {
    name: "test",
    apis: {
      "user.getUserById": {
        method: "GET",
        path: "/users/{id}",
        responses: {
          "200": {
            description: "Success",
          },
        },
      },
    },
  };

  it("should collect results from all plugins", async () => {
    const plugin1: Plugin = {
      name: "plugin-1",
      check: async () => [
        {
          level: "error",
          type: "test-error-1",
          message: "Error from plugin 1",
        },
      ],
    };

    const plugin2: Plugin = {
      name: "plugin-2",
      check: async () => [
        {
          level: "warning",
          type: "test-warning-2",
          message: "Warning from plugin 2",
        },
      ],
    };

    const resolvedPlugin = resolvePlugin([plugin1, plugin2]);
    const results = await resolvedPlugin.check!(
      mockLocalSpec,
      mockRemoteSpec,
      mockOptions
    );

    // Should have 2 user plugin results
    // Note: builtin plugin is automatically added, so we filter by type
    const userResults = results.filter(
      (r) => r.type === "test-error-1" || r.type === "test-warning-2"
    );
    expect(userResults).toHaveLength(2);
  });

  it("should handle plugin returning undefined gracefully", async () => {
    const badPlugin: Plugin = {
      name: "bad-plugin",
      check: async () => undefined as any,
    };

    const resolvedPlugin = resolvePlugin([badPlugin]);
    const results = await resolvedPlugin.check!(
      mockLocalSpec,
      mockRemoteSpec,
      mockOptions
    );

    // Should not crash, just skip the invalid result
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("should handle plugin returning null gracefully", async () => {
    const badPlugin: Plugin = {
      name: "bad-plugin",
      check: async () => null as any,
    };

    const resolvedPlugin = resolvePlugin([badPlugin]);
    const results = await resolvedPlugin.check!(
      mockLocalSpec,
      mockRemoteSpec,
      mockOptions
    );

    // Should not crash, just skip the invalid result
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("should handle plugin returning non-array gracefully", async () => {
    const badPlugin: Plugin = {
      name: "bad-plugin",
      check: async () => ({ invalid: "data" } as any),
    };

    const resolvedPlugin = resolvePlugin([badPlugin]);
    const results = await resolvedPlugin.check!(
      mockLocalSpec,
      mockRemoteSpec,
      mockOptions
    );

    // Should not crash, just skip the invalid result
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("should filter out invalid result items", async () => {
    const badPlugin: Plugin = {
      name: "bad-plugin",
      check: async () => [
        {
          level: "error",
          type: "valid-error",
          message: "Valid error",
        },
        { invalid: "item" } as any, // Invalid item
        null as any, // Invalid item
        {
          level: "warning",
          // missing type and message
        } as any,
      ],
    };

    const resolvedPlugin = resolvePlugin([badPlugin]);
    const results = await resolvedPlugin.check!(
      mockLocalSpec,
      mockRemoteSpec,
      mockOptions
    );

    // Should only include the valid result
    const userResults = results.filter((r) => r.type === "valid-error");
    expect(userResults).toHaveLength(1);
    expect(userResults[0].message).toBe("Valid error");
  });

  it("should catch plugin errors and not crash", async () => {
    const errorPlugin: Plugin = {
      name: "error-plugin",
      check: async () => {
        throw new Error("Plugin crashed!");
      },
    };

    const resolvedPlugin = resolvePlugin([errorPlugin]);

    // Should not throw
    await expect(
      resolvedPlugin.check!(mockLocalSpec, mockRemoteSpec, mockOptions)
    ).resolves.toBeDefined();

    const results = await resolvedPlugin.check!(
      mockLocalSpec,
      mockRemoteSpec,
      mockOptions
    );

    // Should have a plugin-error result
    const errorResult = results.find((r) => r.type === "plugin-error");
    expect(errorResult).toBeDefined();
    expect(errorResult?.message).toContain("error-plugin");
    expect(errorResult?.message).toContain("Plugin crashed!");
  });

  it("should continue checking other plugins after one fails", async () => {
    const errorPlugin: Plugin = {
      name: "error-plugin",
      check: async () => {
        throw new Error("Plugin crashed!");
      },
    };

    const goodPlugin: Plugin = {
      name: "good-plugin",
      check: async () => [
        {
          level: "info",
          type: "good-result",
          message: "Good plugin result",
        },
      ],
    };

    const resolvedPlugin = resolvePlugin([errorPlugin, goodPlugin]);
    const results = await resolvedPlugin.check!(
      mockLocalSpec,
      mockRemoteSpec,
      mockOptions
    );

    // Should have both the error result and the good result
    const errorResult = results.find((r) => r.type === "plugin-error");
    const goodResult = results.find((r) => r.type === "good-result");

    expect(errorResult).toBeDefined();
    expect(goodResult).toBeDefined();
  });

  it("should work with plugins that don't implement check", async () => {
    const noCheckPlugin: Plugin = {
      name: "no-check-plugin",
      generate: async () => ({}),
    };

    const withCheckPlugin: Plugin = {
      name: "with-check-plugin",
      check: async () => [
        {
          level: "info",
          type: "test-info",
          message: "Test info",
        },
      ],
    };

    const resolvedPlugin = resolvePlugin([noCheckPlugin, withCheckPlugin]);
    const results = await resolvedPlugin.check!(
      mockLocalSpec,
      mockRemoteSpec,
      mockOptions
    );

    // Should only have results from plugins that implement check
    const testResult = results.find((r) => r.type === "test-info");
    expect(testResult).toBeDefined();
  });

  it("should include builtin plugin checks", async () => {
    // Create a scenario where builtin check will detect issues
    const localSpec: PontxSpec = {
      name: "test",
      apis: {
        "user.getUserById": {
          method: "GET",
          path: "/users/{id}",
          responses: {
            "200": {
              description: "Success",
            },
          },
        },
      },
    };

    const remoteSpec: PontxSpec = {
      name: "test",
      apis: {
        "userService.getUserById": {
          // tag changed
          method: "GET",
          path: "/users/{id}",
          responses: {
            "200": {
              description: "Success",
            },
          },
        },
      },
    };

    const resolvedPlugin = resolvePlugin([]);
    const results = await resolvedPlugin.check!(
      localSpec,
      remoteSpec,
      mockOptions
    );

    // Should detect the tag name change
    expect(results.length).toBeGreaterThan(0);
    const breakingChange = results.find((r) => r.type === "breaking-change");
    expect(breakingChange).toBeDefined();
  });

  it("should validate CheckResult interface", () => {
    const validResult: CheckResult = {
      level: "error",
      type: "test-type",
      message: "Test message",
      api: {
        tagName: "user",
        apiName: "getUserById",
        method: "GET",
        path: "/users/{id}",
      },
      details: {
        custom: "data",
      },
    };

    expect(validResult.level).toBe("error");
    expect(validResult.type).toBe("test-type");
    expect(validResult.message).toBe("Test message");
    expect(validResult.api?.tagName).toBe("user");
    expect(validResult.details?.custom).toBe("data");
  });

  it("should handle empty local spec (null)", async () => {
    const resolvedPlugin = resolvePlugin([]);
    const results = await resolvedPlugin.check!(
      null,
      mockRemoteSpec,
      mockOptions
    );

    // Builtin check should return empty array when localSpec is null
    expect(results).toEqual([]);
  });

  it("should preserve result order from plugins", async () => {
    const plugin1: Plugin = {
      name: "plugin-1",
      check: async () => [
        { level: "error", type: "error-1", message: "Error 1" },
        { level: "warning", type: "warning-1", message: "Warning 1" },
      ],
    };

    const plugin2: Plugin = {
      name: "plugin-2",
      check: async () => [
        { level: "error", type: "error-2", message: "Error 2" },
      ],
    };

    const resolvedPlugin = resolvePlugin([plugin1, plugin2]);
    const results = await resolvedPlugin.check!(
      mockLocalSpec,
      mockRemoteSpec,
      mockOptions
    );

    // Filter user plugin results and check order
    const userResults = results.filter((r) =>
      ["error-1", "warning-1", "error-2"].includes(r.type)
    );

    expect(userResults[0].type).toBe("error-1");
    expect(userResults[1].type).toBe("warning-1");
    expect(userResults[2].type).toBe("error-2");
  });
});
