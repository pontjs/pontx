import { describe, it, expect } from "vitest";
import { serializeRequestBody } from "../client";

describe("serializeRequestBody", () => {
  describe("application/json", () => {
    it("应该将对象序列化为 JSON 字符串", () => {
      const body = { name: "John", age: 30 };
      const result = serializeRequestBody(body, "application/json");
      expect(result).toBe(JSON.stringify(body));
    });

    it("应该处理嵌套对象", () => {
      const body = {
        user: {
          name: "John",
          address: {
            city: "NYC",
            zip: "10001",
          },
        },
      };
      const result = serializeRequestBody(body, "application/json");
      expect(result).toBe(JSON.stringify(body));
    });

    it("应该处理数组", () => {
      const body = [1, 2, 3];
      const result = serializeRequestBody(body, "application/json");
      expect(result).toBe(JSON.stringify(body));
    });

    it("当 body 为 null 或 undefined 时应该返回原值", () => {
      expect(serializeRequestBody(null, "application/json")).toBe(null);
      expect(serializeRequestBody(undefined, "application/json")).toBe(undefined);
    });
  });

  describe("application/x-www-form-urlencoded", () => {
    it("应该将对象转换为 URLSearchParams", () => {
      const body = { name: "John", age: "30" };
      const result = serializeRequestBody(
        body,
        "application/x-www-form-urlencoded"
      );
      expect(result).toBeInstanceOf(URLSearchParams);
      expect((result as URLSearchParams).get("name")).toBe("John");
      expect((result as URLSearchParams).get("age")).toBe("30");
    });

    it("应该正确处理特殊字符", () => {
      const body = { query: "hello world", email: "test@example.com" };
      const result = serializeRequestBody(
        body,
        "application/x-www-form-urlencoded"
      ) as URLSearchParams;
      expect(result.get("query")).toBe("hello world");
      expect(result.get("email")).toBe("test@example.com");
    });

    it("应该处理空对象", () => {
      const result = serializeRequestBody(
        {},
        "application/x-www-form-urlencoded"
      );
      expect(result).toBeInstanceOf(URLSearchParams);
      expect((result as URLSearchParams).toString()).toBe("");
    });

    it("当 body 为 null 或 undefined 时应该返回原值", () => {
      const result1 = serializeRequestBody(
        null,
        "application/x-www-form-urlencoded"
      );
      const result2 = serializeRequestBody(
        undefined,
        "application/x-www-form-urlencoded"
      );
      expect(result1).toBe(null);
      expect(result2).toBe(undefined);
    });
  });

  describe("multipart/form-data", () => {
    it("应该将对象转换为 FormData", () => {
      const body = { name: "John", age: "30" };
      const result = serializeRequestBody(body, "multipart/form-data");
      expect(result).toBeInstanceOf(FormData);
      expect((result as FormData).get("name")).toBe("John");
      expect((result as FormData).get("age")).toBe("30");
    });

    it("应该处理文件对象", () => {
      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const body = { file: file, name: "test" };
      const result = serializeRequestBody(body, "multipart/form-data") as FormData;
      expect(result).toBeInstanceOf(FormData);
      // FormData.get() 返回的是字符串或 File，但在测试环境中可能是字符串
      expect(result.get("file")).toBeTruthy();
      expect(result.get("name")).toBe("test");
    });

    it("应该处理空对象", () => {
      const result = serializeRequestBody({}, "multipart/form-data");
      expect(result).toBeInstanceOf(FormData);
    });

    it("当 body 为 null 或 undefined 时应该返回原值", () => {
      const result1 = serializeRequestBody(null, "multipart/form-data");
      const result2 = serializeRequestBody(undefined, "multipart/form-data");
      expect(result1).toBe(null);
      expect(result2).toBe(undefined);
    });
  });

  describe("text/plain", () => {
    it("应该直接返回文本内容", () => {
      const body = "Hello World";
      const result = serializeRequestBody(body, "text/plain");
      expect(result).toBe("Hello World");
    });

    it("应该处理数字", () => {
      const body = 123;
      const result = serializeRequestBody(body, "text/plain");
      expect(result).toBe(123);
    });

    it("应该处理布尔值", () => {
      const body = true;
      const result = serializeRequestBody(body, "text/plain");
      expect(result).toBe(true);
    });
  });

  describe("其他 content type", () => {
    it("应该直接返回原始 body", () => {
      const body = { data: "test" };
      const result = serializeRequestBody(body, "application/octet-stream");
      expect(result).toBe(body);
    });

    it("对于未知的 content type 应该返回原始值", () => {
      const body = "custom data";
      const result = serializeRequestBody(body, "custom/type" as any);
      expect(result).toBe(body);
    });
  });

  describe("边界情况", () => {
    it("当 body 为 null 时应该正确处理", () => {
      const result = serializeRequestBody(null, "application/json");
      expect(result).toBe(null);
    });

    it("当 body 为 undefined 时应该正确处理", () => {
      const result = serializeRequestBody(undefined, "application/json");
      expect(result).toBe(undefined);
    });

    it("当 body 为空字符串时应该保留", () => {
      const result = serializeRequestBody("", "text/plain");
      expect(result).toBe("");
    });

    it("当 body 为 0 时应该保留", () => {
      const result = serializeRequestBody(0, "text/plain");
      expect(result).toBe(0);
    });
  });
});
