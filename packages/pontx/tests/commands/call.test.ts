/**
 * Tests for parseToolParams function in call command
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { parseToolParams, tryParseJson, CLI_OPTIONS } from "../../src/commands/call";

describe("parseToolParams", () => {
  const testDir = path.join(__dirname, ".test-fixtures");
  const testJsonFile = path.join(testDir, "test-body.json");

  beforeAll(() => {
    // Create test fixtures directory and files
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(
      testJsonFile,
      JSON.stringify({ name: "test", value: 123 })
    );
  });

  afterAll(() => {
    // Cleanup test fixtures
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe("basic parameter parsing", () => {
    it("should parse single parameter with space separator", () => {
      const args = ["--userId", "123"];
      const result = parseToolParams(args);
      // "123" is parsed as number by tryParseJson
      expect(result).toEqual({ userId: 123 });
    });

    it("should parse string parameter", () => {
      const args = ["--userId", "user-123"];
      const result = parseToolParams(args);
      // "user-123" is not valid JSON, kept as string
      expect(result).toEqual({ userId: "user-123" });
    });

    it("should parse multiple parameters", () => {
      const args = ["--userId", "123", "--name", "John"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123, name: "John" });
    });

    it("should handle boolean flags (no value)", () => {
      const args = ["--verbose", "--userId", "123"];
      const result = parseToolParams(args);
      expect(result).toEqual({ verbose: true, userId: 123 });
    });

    it("should handle boolean flag at the end", () => {
      const args = ["--userId", "123", "--verbose"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123, verbose: true });
    });

    it("should handle boolean flag followed by another flag", () => {
      const args = ["--verbose", "--debug"];
      const result = parseToolParams(args);
      // --debug is a CLI option, should be skipped
      expect(result).toEqual({ verbose: true });
    });
  });

  describe("JSON value parsing", () => {
    it("should parse JSON object as value", () => {
      const args = ["--body", '{"name":"John","age":30}'];
      const result = parseToolParams(args);
      expect(result).toEqual({ body: { name: "John", age: 30 } });
    });

    it("should parse JSON array as value", () => {
      const args = ["--ids", "[1,2,3]"];
      const result = parseToolParams(args);
      expect(result).toEqual({ ids: [1, 2, 3] });
    });

    it("should parse number string as number", () => {
      const args = ["--count", "42"];
      const result = parseToolParams(args);
      expect(result).toEqual({ count: 42 });
    });

    it("should parse boolean string as boolean", () => {
      const args = ["--enabled", "true", "--disabled", "false"];
      const result = parseToolParams(args);
      expect(result).toEqual({ enabled: true, disabled: false });
    });

    it("should keep plain string as string", () => {
      const args = ["--name", "hello-world"];
      const result = parseToolParams(args);
      expect(result).toEqual({ name: "hello-world" });
    });

    it("should handle complex nested JSON", () => {
      const args = [
        "--data",
        '{"user":{"name":"John","roles":["admin","user"]},"active":true}',
      ];
      const result = parseToolParams(args);
      expect(result).toEqual({
        data: {
          user: { name: "John", roles: ["admin", "user"] },
          active: true,
        },
      });
    });
  });

  describe("file body shorthand (@file)", () => {
    it("should load body from @file shorthand", () => {
      const args = [`@${testJsonFile}`];
      const result = parseToolParams(args);
      expect(result).toEqual({ body: { name: "test", value: 123 } });
    });

    it("should load body from --body @file syntax", () => {
      const args = ["--body", `@${testJsonFile}`];
      const result = parseToolParams(args);
      expect(result).toEqual({ body: { name: "test", value: 123 } });
    });

    it("should load any parameter from @file syntax", () => {
      const args = ["--data", `@${testJsonFile}`];
      const result = parseToolParams(args);
      expect(result).toEqual({ data: { name: "test", value: 123 } });
    });

    it("should throw error for non-existent file", () => {
      const args = ["@/non/existent/file.json"];
      expect(() => parseToolParams(args)).toThrow("File not found");
    });
  });

  describe("CLI options filtering", () => {
    it("should skip --env option with value", () => {
      const args = ["--env", "prod", "--userId", "123"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
      expect(result).not.toHaveProperty("env");
    });

    it("should skip --output option with value", () => {
      const args = ["--userId", "123", "--output", "result.json"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
      expect(result).not.toHaveProperty("output");
    });

    it("should skip --query option with value", () => {
      const args = ["--userId", "123", "--query", "[].Name"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
      expect(result).not.toHaveProperty("query");
    });

    it("should skip --header option with value", () => {
      const args = ["--header", "Authorization: Bearer token", "--userId", "123"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
      expect(result).not.toHaveProperty("header");
    });

    it("should skip --debug boolean flag", () => {
      const args = ["--debug", "--userId", "123"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
      expect(result).not.toHaveProperty("debug");
    });

    it("should skip --dry-run boolean flag", () => {
      const args = ["--dry-run", "--userId", "123"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
      expect(result).not.toHaveProperty("dry-run");
    });

    it("should skip --global boolean flag", () => {
      const args = ["--global", "--userId", "123"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
      expect(result).not.toHaveProperty("global");
    });

    it("should skip --use-remote boolean flag", () => {
      const args = ["--use-remote", "--userId", "123"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
      expect(result).not.toHaveProperty("use-remote");
    });

    it("should skip --help flag", () => {
      const args = ["--help", "--userId", "123"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
      expect(result).not.toHaveProperty("help");
    });

    it("should handle multiple CLI options mixed with API params", () => {
      const args = [
        "--env",
        "prod",
        "--userId",
        "123",
        "--debug",
        "--name",
        "John",
        "--output",
        "out.json",
        "--query",
        "[0]",
      ];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123, name: "John" });
    });
  });

  describe("edge cases", () => {
    it("should return empty object for empty args", () => {
      const result = parseToolParams([]);
      expect(result).toEqual({});
    });

    it("should ignore non-option arguments", () => {
      const args = ["someValue", "--userId", "123", "anotherValue"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
    });

    it("should ignore short options (handled by commander)", () => {
      const args = ["-e", "prod", "--userId", "123"];
      const result = parseToolParams(args);
      expect(result).toEqual({ userId: 123 });
    });

    it("should handle parameter with empty string value", () => {
      // Empty string is falsy, treated as boolean flag (no next value)
      const args = ["--name", ""];
      const result = parseToolParams(args);
      // Empty string is falsy, so it's treated as no value -> boolean true
      expect(result).toEqual({ name: true });
    });

    it("should handle parameter with whitespace value", () => {
      const args = ["--name", "  spaces  "];
      const result = parseToolParams(args);
      expect(result).toEqual({ name: "  spaces  " });
    });

    it("should handle parameter names with hyphens", () => {
      const args = ["--user-id", "123", "--first-name", "John"];
      const result = parseToolParams(args);
      expect(result).toEqual({ "user-id": 123, "first-name": "John" });
    });

    it("should handle value that looks like a flag but is quoted", () => {
      // In shell, this would be: --message "--not-a-flag"
      // But in args array, it's just a string
      const args = ["--message", "--not-a-flag"];
      const result = parseToolParams(args);
      // Since --not-a-flag starts with --, it's treated as next param (boolean)
      expect(result).toEqual({ message: true, "not-a-flag": true });
    });

    it("should handle numeric parameter names", () => {
      const args = ["--123", "value"];
      const result = parseToolParams(args);
      expect(result).toEqual({ "123": "value" });
    });
  });

  describe("real-world scenarios", () => {
    it("should parse typical API call args", () => {
      const args = [
        "--env",
        "production",
        "--petId",
        "123",
        "--query",
        "[].name",
        "--debug",
      ];
      const result = parseToolParams(args);
      // "123" is parsed as number
      expect(result).toEqual({ petId: 123 });
    });

    it("should parse typical API call args with string id", () => {
      const args = [
        "--env",
        "production",
        "--petId",
        "pet-123",
        "--query",
        "[].name",
        "--debug",
      ];
      const result = parseToolParams(args);
      // "pet-123" is not valid JSON, kept as string
      expect(result).toEqual({ petId: "pet-123" });
    });

    it("should parse POST request with body", () => {
      const args = [
        "--body",
        '{"name":"Fluffy","species":"cat"}',
        "--env",
        "dev",
      ];
      const result = parseToolParams(args);
      expect(result).toEqual({
        body: { name: "Fluffy", species: "cat" },
      });
    });

    it("should parse request with multiple path and query params", () => {
      const args = [
        "--storeId",
        "store-001",
        "--orderId",
        "order-123",
        "--includeDetails",
        "true",
        "--limit",
        "10",
        "--offset",
        "0",
      ];
      const result = parseToolParams(args);
      expect(result).toEqual({
        storeId: "store-001",
        orderId: "order-123",
        includeDetails: true,
        limit: 10,
        offset: 0,
      });
    });
  });
});

describe("tryParseJson", () => {
  it("should parse valid JSON object", () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("should parse valid JSON array", () => {
    expect(tryParseJson("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("should parse JSON number", () => {
    expect(tryParseJson("42")).toBe(42);
    expect(tryParseJson("3.14")).toBe(3.14);
  });

  it("should parse JSON boolean", () => {
    expect(tryParseJson("true")).toBe(true);
    expect(tryParseJson("false")).toBe(false);
  });

  it("should parse JSON null", () => {
    expect(tryParseJson("null")).toBe(null);
  });

  it("should return original string for invalid JSON", () => {
    expect(tryParseJson("hello")).toBe("hello");
    expect(tryParseJson("not-json")).toBe("not-json");
    expect(tryParseJson("{invalid}")).toBe("{invalid}");
  });

  it("should return original string for partial JSON", () => {
    expect(tryParseJson('{"incomplete')).toBe('{"incomplete');
  });
});

describe("CLI_OPTIONS", () => {
  it("should contain all expected CLI options", () => {
    const expectedOptions = [
      "env",
      "e",
      "header",
      "H",
      "output",
      "o",
      "debug",
      "dry-run",
      "use-remote",
      "global",
      "query",
      "q",
      "help",
      "h",
    ];

    for (const opt of expectedOptions) {
      expect(CLI_OPTIONS.has(opt)).toBe(true);
    }
  });

  it("should not contain API parameter names", () => {
    expect(CLI_OPTIONS.has("userId")).toBe(false);
    expect(CLI_OPTIONS.has("body")).toBe(false);
    expect(CLI_OPTIONS.has("petId")).toBe(false);
  });
});
