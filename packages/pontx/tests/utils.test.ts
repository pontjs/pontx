/**
 * Tests for utils.ts pure functions
 */

import { describe, it, expect } from "vitest";
import {
  isObject,
  slash,
  normalizePath,
  stripBomTag,
} from "../src/utils";

describe("isObject", () => {
  it("should return true for plain objects", () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
    expect(isObject({ nested: { value: true } })).toBe(true);
  });

  it("should return false for arrays", () => {
    expect(isObject([])).toBe(false);
    expect(isObject([1, 2, 3])).toBe(false);
  });

  it("should return false for null", () => {
    expect(isObject(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isObject(undefined)).toBe(false);
  });

  it("should return false for primitives", () => {
    expect(isObject("string")).toBe(false);
    expect(isObject(123)).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(Symbol("test"))).toBe(false);
  });

  it("should return false for functions", () => {
    expect(isObject(() => {})).toBe(false);
    expect(isObject(function() {})).toBe(false);
  });

  it("should return false for class instances (Date, RegExp, etc.)", () => {
    expect(isObject(new Date())).toBe(false);
    expect(isObject(/regex/)).toBe(false);
    expect(isObject(new Map())).toBe(false);
    expect(isObject(new Set())).toBe(false);
  });
});

describe("slash", () => {
  it("should convert backslashes to forward slashes", () => {
    expect(slash("a\\b\\c")).toBe("a/b/c");
    expect(slash("C:\\Users\\test")).toBe("C:/Users/test");
  });

  it("should keep forward slashes unchanged", () => {
    expect(slash("a/b/c")).toBe("a/b/c");
    expect(slash("/Users/test")).toBe("/Users/test");
  });

  it("should handle mixed slashes", () => {
    expect(slash("a\\b/c\\d")).toBe("a/b/c/d");
  });

  it("should handle empty string", () => {
    expect(slash("")).toBe("");
  });

  it("should handle string without slashes", () => {
    expect(slash("filename.txt")).toBe("filename.txt");
  });

  it("should handle multiple consecutive backslashes", () => {
    expect(slash("a\\\\b")).toBe("a//b");
  });
});

describe("normalizePath", () => {
  it("should normalize path with forward slashes", () => {
    expect(normalizePath("/a/b/c")).toBe("/a/b/c");
    expect(normalizePath("/a//b/c")).toBe("/a/b/c");
  });

  it("should normalize path with dots", () => {
    expect(normalizePath("/a/./b/c")).toBe("/a/b/c");
    expect(normalizePath("/a/b/../c")).toBe("/a/c");
  });

  it("should handle relative paths", () => {
    expect(normalizePath("./a/b")).toBe("a/b");
    expect(normalizePath("a/./b")).toBe("a/b");
  });

  it("should handle empty string", () => {
    expect(normalizePath("")).toBe(".");
  });

  it("should handle root path", () => {
    expect(normalizePath("/")).toBe("/");
  });
});

describe("stripBomTag", () => {
  it("should remove UTF-8 BOM from start of string", () => {
    const bomChar = String.fromCharCode(0xfeff);
    const content = bomChar + "Hello World";
    expect(stripBomTag(content)).toBe("Hello World");
  });

  it("should keep string unchanged if no BOM", () => {
    expect(stripBomTag("Hello World")).toBe("Hello World");
  });

  it("should handle empty string", () => {
    expect(stripBomTag("")).toBe("");
  });

  it("should only remove BOM from start, not middle", () => {
    const bomChar = String.fromCharCode(0xfeff);
    const content = "Hello" + bomChar + "World";
    expect(stripBomTag(content)).toBe(content);
  });

  it("should handle string that is only BOM", () => {
    const bomChar = String.fromCharCode(0xfeff);
    expect(stripBomTag(bomChar)).toBe("");
  });

  it("should handle JSON content with BOM", () => {
    const bomChar = String.fromCharCode(0xfeff);
    const jsonContent = bomChar + '{"key": "value"}';
    expect(stripBomTag(jsonContent)).toBe('{"key": "value"}');
  });
});
