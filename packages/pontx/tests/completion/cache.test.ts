/**
 * Tests for CompletionCache
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompletionCache } from "../../src/completion/cache";

describe("CompletionCache", () => {
  let cache: CompletionCache;

  beforeEach(() => {
    cache = new CompletionCache(1000); // 1 second TTL
  });

  describe("constructor", () => {
    it("should create cache with default TTL", () => {
      const defaultCache = new CompletionCache();
      expect(defaultCache).toBeDefined();
    });

    it("should create cache with custom TTL", () => {
      const customCache = new CompletionCache(5000);
      expect(customCache).toBeDefined();
    });
  });

  describe("set and get", () => {
    it("should store and retrieve a value", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should store and retrieve different types", () => {
      cache.set("string", "hello");
      cache.set("number", 42);
      cache.set("object", { a: 1, b: 2 });
      cache.set("array", [1, 2, 3]);

      expect(cache.get("string")).toBe("hello");
      expect(cache.get("number")).toBe(42);
      expect(cache.get("object")).toEqual({ a: 1, b: 2 });
      expect(cache.get("array")).toEqual([1, 2, 3]);
    });

    it("should return undefined for non-existent key", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should overwrite existing value", () => {
      cache.set("key", "value1");
      cache.set("key", "value2");
      expect(cache.get("key")).toBe("value2");
    });
  });

  describe("TTL expiration", () => {
    it("should return undefined for expired entry", async () => {
      const shortCache = new CompletionCache(50); // 50ms TTL
      shortCache.set("key", "value");

      expect(shortCache.get("key")).toBe("value");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(shortCache.get("key")).toBeUndefined();
    });

    it("should support custom TTL per entry", async () => {
      cache.set("short", "value", 50); // 50ms TTL
      cache.set("long", "value", 5000); // 5s TTL

      // Wait for short TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.get("short")).toBeUndefined();
      expect(cache.get("long")).toBe("value");
    });
  });

  describe("has", () => {
    it("should return true for existing key", () => {
      cache.set("key", "value");
      expect(cache.has("key")).toBe(true);
    });

    it("should return false for non-existent key", () => {
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should return false for expired key", async () => {
      const shortCache = new CompletionCache(50);
      shortCache.set("key", "value");

      expect(shortCache.has("key")).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(shortCache.has("key")).toBe(false);
    });
  });

  describe("getOrLoad", () => {
    it("should load value when not cached", async () => {
      const loader = vi.fn().mockResolvedValue("loaded");

      const result = await cache.getOrLoad("key", loader);

      expect(result).toBe("loaded");
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it("should return cached value without calling loader", async () => {
      cache.set("key", "cached");
      const loader = vi.fn().mockResolvedValue("loaded");

      const result = await cache.getOrLoad("key", loader);

      expect(result).toBe("cached");
      expect(loader).not.toHaveBeenCalled();
    });

    it("should reload expired value", async () => {
      const shortCache = new CompletionCache(50);
      const loader = vi.fn().mockResolvedValue("loaded");

      shortCache.set("key", "old");

      await new Promise((resolve) => setTimeout(resolve, 60));

      const result = await shortCache.getOrLoad("key", loader);

      expect(result).toBe("loaded");
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it("should cache loaded value", async () => {
      const loader = vi.fn().mockResolvedValue("loaded");

      await cache.getOrLoad("key", loader);
      await cache.getOrLoad("key", loader);

      expect(loader).toHaveBeenCalledTimes(1);
      expect(cache.get("key")).toBe("loaded");
    });
  });

  describe("invalidate", () => {
    it("should clear all entries when no pattern provided", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      cache.invalidate();

      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
      expect(cache.get("key3")).toBeUndefined();
    });

    it("should clear entries matching pattern", () => {
      cache.set("spec:petstore", "value1");
      cache.set("spec:yuque", "value2");
      cache.set("tags:petstore", "value3");

      cache.invalidate("petstore");

      expect(cache.get("spec:petstore")).toBeUndefined();
      expect(cache.get("tags:petstore")).toBeUndefined();
      expect(cache.get("spec:yuque")).toBe("value2");
    });

    it("should clear entries with prefix pattern", () => {
      cache.set("spec:petstore", "value1");
      cache.set("spec:yuque", "value2");
      cache.set("tags:petstore", "value3");

      cache.invalidate("spec:");

      expect(cache.get("spec:petstore")).toBeUndefined();
      expect(cache.get("spec:yuque")).toBeUndefined();
      expect(cache.get("tags:petstore")).toBe("value3");
    });
  });

  describe("size", () => {
    it("should return 0 for empty cache", () => {
      expect(cache.size).toBe(0);
    });

    it("should return correct count", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      expect(cache.size).toBe(2);
    });

    it("should include expired entries in count", async () => {
      const shortCache = new CompletionCache(50);
      shortCache.set("key1", "value1");
      shortCache.set("key2", "value2");

      await new Promise((resolve) => setTimeout(resolve, 60));

      // size includes expired entries (until cleanup)
      expect(shortCache.size).toBe(2);
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries", async () => {
      const shortCache = new CompletionCache(50);
      shortCache.set("expired1", "value1");
      shortCache.set("expired2", "value2");

      await new Promise((resolve) => setTimeout(resolve, 60));

      shortCache.set("fresh", "value3");

      const removed = shortCache.cleanup();

      expect(removed).toBe(2);
      expect(shortCache.size).toBe(1);
      expect(shortCache.get("fresh")).toBe("value3");
    });

    it("should return 0 when no expired entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      const removed = cache.cleanup();

      expect(removed).toBe(0);
      expect(cache.size).toBe(2);
    });
  });
});
