import { describe, it, expect } from "vitest";
import { buildUrl } from "../utils";

describe("buildUrl", () => {
  describe("路径参数替换", () => {
    it("应该正确替换单个路径参数", () => {
      const result = buildUrl("/users/{id}", { id: 123 });
      expect(result).toBe("/users/123");
    });

    it("应该正确替换多个路径参数", () => {
      const result = buildUrl("/users/{userId}/posts/{postId}", {
        userId: 1,
        postId: 2,
      });
      expect(result).toBe("/users/1/posts/2");
    });

    it("应该对路径参数进行 URL 编码", () => {
      const result = buildUrl("/search/{query}", { query: "hello world" });
      expect(result).toBe("/search/hello%20world");
    });

    it("当参数不存在时应该使用 pathMark", () => {
      const result = buildUrl("/users/{id}", {}, ":id");
      expect(result).toBe("/users/:id");
    });
  });

  describe("查询参数处理", () => {
    it("应该正确添加单个查询参数", () => {
      const result = buildUrl("/users", { name: "John" });
      expect(result).toBe("/users?name=John");
    });

    it("应该正确添加多个查询参数", () => {
      const result = buildUrl("/users", { name: "John", age: 30 });
      expect(result).toContain("/users?");
      expect(result).toContain("name=John");
      expect(result).toContain("age=30");
    });

    it("应该过滤掉 undefined 和 null 值", () => {
      const result = buildUrl("/users", {
        name: "John",
        age: undefined,
        city: null,
      });
      expect(result).toBe("/users?name=John");
    });

    it("应该正确处理数组参数", () => {
      const result = buildUrl("/users", { tags: ["js", "ts"] });
      expect(result).toContain("/users?");
      expect(result).toContain("tags=js");
      expect(result).toContain("tags=ts");
    });

    it("应该将对象参数转换为 JSON 字符串", () => {
      const result = buildUrl("/users", { filter: { age: 30, city: "NYC" } });
      expect(result).toContain("/users?");
      expect(result).toContain("filter=");
      // 验证包含 JSON 编码的内容
      const params = new URLSearchParams(result.split("?")[1]);
      expect(JSON.parse(params.get("filter")!)).toEqual({
        age: 30,
        city: "NYC",
      });
    });
  });

  describe("混合参数处理", () => {
    it("应该同时处理路径参数和查询参数", () => {
      const result = buildUrl("/users/{id}", { id: 123, includeDetails: true });
      expect(result).toBe("/users/123?includeDetails=true");
    });

    it("应该在替换路径参数后将剩余参数作为查询参数", () => {
      const result = buildUrl("/users/{id}/posts", {
        id: 1,
        page: 2,
        limit: 10,
      });
      expect(result).toContain("/users/1/posts?");
      expect(result).toContain("page=2");
      expect(result).toContain("limit=10");
    });
  });

  describe("边界情况", () => {
    it("当 params 为 null 或 undefined 时应该返回 null", () => {
      expect(buildUrl("/users", null as any)).toBe(null);
      expect(buildUrl("/users", undefined as any)).toBe(null);
    });

    it("当没有查询参数时应该返回原路径", () => {
      const result = buildUrl("/users", {});
      expect(result).toBe("/users");
    });

    it("应该正确处理空字符串值", () => {
      const result = buildUrl("/users", { name: "" });
      expect(result).toBe("/users?name=");
    });

    it("应该正确处理数字 0 作为参数值", () => {
      const result = buildUrl("/users", { page: 0 });
      expect(result).toBe("/users?page=0");
    });

    it("应该正确处理布尔值参数", () => {
      const result = buildUrl("/users", { active: true, deleted: false });
      expect(result).toContain("/users?");
      expect(result).toContain("active=true");
      expect(result).toContain("deleted=false");
    });
  });

  describe("特殊字符处理", () => {
    it("应该正确编码特殊字符", () => {
      const result = buildUrl("/search", { q: "hello+world&foo=bar" });
      expect(result).toContain("/search?");
      const params = new URLSearchParams(result.split("?")[1]);
      expect(params.get("q")).toBe("hello+world&foo=bar");
    });

    it("应该正确处理中文字符", () => {
      const result = buildUrl("/search", { keyword: "你好世界" });
      expect(result).toContain("/search?");
      const params = new URLSearchParams(result.split("?")[1]);
      expect(params.get("keyword")).toBe("你好世界");
    });
  });
});
