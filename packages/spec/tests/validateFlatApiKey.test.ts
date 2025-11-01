import { test, expect, describe } from "vitest";
import { validateFlatApiKey } from "../src/index";

describe("validateFlatApiKey", () => {
  describe("valid API keys", () => {
    test("should accept simple alphabetic key", () => {
      const result = validateFlatApiKey("symbolSearch");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should accept key with numbers", () => {
      const result = validateFlatApiKey("getUser123");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should accept key with underscores", () => {
      const result = validateFlatApiKey("get_user_profile");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should accept key with dollar sign", () => {
      const result = validateFlatApiKey("$specialApi");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should accept key starting with underscore", () => {
      const result = validateFlatApiKey("_privateApi");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should accept single character key", () => {
      const result = validateFlatApiKey("a");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should accept 255 character key", () => {
      const longKey = "a".repeat(255);
      const result = validateFlatApiKey(longKey);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("invalid API keys - contains slash", () => {
    test("should reject key containing forward slash", () => {
      const result = validateFlatApiKey("users/getUser");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("/");
      expect(result.error).toContain("users/getUser");
    });

    test("should reject key with multiple slashes", () => {
      const result = validateFlatApiKey("api/v1/users");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("/");
    });
  });

  describe("invalid API keys - not valid JavaScript identifier", () => {
    test("should reject key starting with number", () => {
      const result = validateFlatApiKey("123api");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid JavaScript identifier");
      expect(result.error).toContain("123api");
    });

    test("should reject key with special characters", () => {
      const result = validateFlatApiKey("api-name");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid JavaScript identifier");
    });

    test("should reject key with spaces", () => {
      const result = validateFlatApiKey("get user");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid JavaScript identifier");
    });

    test("should reject key with dot", () => {
      const result = validateFlatApiKey("api.method");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid JavaScript identifier");
    });

    test("should reject key with at sign", () => {
      const result = validateFlatApiKey("@api");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid JavaScript identifier");
    });
  });

  describe("invalid API keys - length constraints", () => {
    test("should reject empty string", () => {
      const result = validateFlatApiKey("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    test("should reject whitespace-only string", () => {
      const result = validateFlatApiKey("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    test("should reject key longer than 255 characters", () => {
      const longKey = "a".repeat(256);
      const result = validateFlatApiKey(longKey);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("length");
      expect(result.error).toContain("255");
    });
  });

  describe("edge cases - reserved keywords", () => {
    test("should accept 'constructor' as it's a valid identifier (implementation may warn but technically valid)", () => {
      // Note: constructor is a valid JavaScript identifier, though it's a reserved property
      // The validation focuses on identifier syntax, not semantic safety
      const result = validateFlatApiKey("constructor");
      expect(result.valid).toBe(true);
    });

    test("should accept '__proto__' as it's a valid identifier", () => {
      const result = validateFlatApiKey("__proto__");
      expect(result.valid).toBe(true);
    });

    test("should accept JavaScript keywords as they are valid identifiers", () => {
      // Keywords like 'if', 'for' are valid identifiers in object property context
      const result = validateFlatApiKey("if");
      expect(result.valid).toBe(true);
    });
  });

  describe("type safety", () => {
    test("should handle non-string input gracefully", () => {
      // @ts-expect-error - testing runtime behavior
      const result = validateFlatApiKey(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should handle undefined input gracefully", () => {
      // @ts-expect-error - testing runtime behavior
      const result = validateFlatApiKey(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should handle number input gracefully", () => {
      // @ts-expect-error - testing runtime behavior
      const result = validateFlatApiKey(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
