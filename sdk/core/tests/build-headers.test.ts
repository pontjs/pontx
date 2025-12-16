/**
 * @author jasonHzq
 * @description build-headers 模块测试
 *
 * 测试 HTTP 请求头构建功能
 */

import { describe, it, expect } from "vitest";
import { buildHeaders } from "../src/core/build-headers";
import type { PontxAPIMeta } from "../src/types";

describe("buildHeaders - HTTP 请求头构建", () => {
  describe("基础功能", () => {
    it("应该返回空对象当 API 元数据为空", () => {
      const apiMeta: PontxAPIMeta = {
        method: "GET",
        path: "/test",
        hasBody: false,
        hasParams: false,
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({});
    });

    it("应该从 consumes 设置 Content-Type", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/test",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({
        "Content-Type": "application/json",
      });
    });

    it("应该从 produces 设置 Accept", () => {
      const apiMeta: PontxAPIMeta = {
        method: "GET",
        path: "/test",
        hasBody: false,
        hasParams: false,
        produces: ["application/json"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({
        Accept: "application/json",
      });
    });

    it("应该同时设置 Content-Type 和 Accept", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/test",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json"],
        produces: ["application/json"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({
        "Content-Type": "application/json",
        Accept: "application/json",
      });
    });
  });

  describe("多个 Content-Type/Accept", () => {
    it("应该使用 consumes 数组的第一个元素作为 Content-Type", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/test",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json", "application/xml", "text/plain"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("应该使用 produces 数组的第一个元素作为 Accept", () => {
      const apiMeta: PontxAPIMeta = {
        method: "GET",
        path: "/test",
        hasBody: false,
        hasParams: false,
        produces: ["application/json", "application/xml", "text/html"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers.Accept).toBe("application/json");
    });
  });

  describe("用户自定义 headers", () => {
    it("应该合并用户提供的 headers", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/test",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json"],
      };

      const options: RequestInit = {
        headers: {
          Authorization: "Bearer token123",
          "X-Custom-Header": "custom-value",
        },
      };

      const headers = buildHeaders(apiMeta, options);

      expect(headers).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer token123",
        "X-Custom-Header": "custom-value",
      });
    });

    it("用户 headers 应该覆盖 API 元数据中的 headers", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/test",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json"],
        produces: ["application/json"],
      };

      const options: RequestInit = {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html",
        },
      };

      const headers = buildHeaders(apiMeta, options);

      expect(headers).toEqual({
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
      });
    });

    // 注意：buildHeaders 目前仅支持普通对象格式的 headers
    // 不支持 Headers 对象和数组格式 (这是设计上的限制)
  });

  describe("边界情况", () => {
    it("应该处理空的 consumes 数组", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/test",
        hasBody: true,
        hasParams: false,
        consumes: [],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({});
    });

    it("应该处理空的 produces 数组", () => {
      const apiMeta: PontxAPIMeta = {
        method: "GET",
        path: "/test",
        hasBody: false,
        hasParams: false,
        produces: [],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({});
    });

    it("应该处理 undefined options", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/test",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json"],
      };

      const headers = buildHeaders(apiMeta, undefined);

      expect(headers).toEqual({
        "Content-Type": "application/json",
      });
    });

    it("应该处理空的 options.headers", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/test",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json"],
      };

      const options: RequestInit = {
        headers: {},
      };

      const headers = buildHeaders(apiMeta, options);

      expect(headers).toEqual({
        "Content-Type": "application/json",
      });
    });

    it("应该处理 undefined options.headers", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/test",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json"],
      };

      const options: RequestInit = {
        headers: undefined,
      };

      const headers = buildHeaders(apiMeta, options);

      expect(headers).toEqual({
        "Content-Type": "application/json",
      });
    });
  });

  describe("常见 Content-Type", () => {
    it("应该处理 application/json", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/api/data",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json"],
        produces: ["application/json"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({
        "Content-Type": "application/json",
        Accept: "application/json",
      });
    });

    it("应该处理 application/x-www-form-urlencoded", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/api/form",
        hasBody: true,
        hasParams: false,
        consumes: ["application/x-www-form-urlencoded"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({
        "Content-Type": "application/x-www-form-urlencoded",
      });
    });

    it("应该处理 multipart/form-data", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/api/upload",
        hasBody: true,
        hasParams: false,
        consumes: ["multipart/form-data"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({
        "Content-Type": "multipart/form-data",
      });
    });

    it("应该处理 text/plain", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/api/text",
        hasBody: true,
        hasParams: false,
        consumes: ["text/plain"],
        produces: ["text/plain"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({
        "Content-Type": "text/plain",
        Accept: "text/plain",
      });
    });

    it("应该处理 application/xml", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/api/xml",
        hasBody: true,
        hasParams: false,
        consumes: ["application/xml"],
        produces: ["application/xml"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({
        "Content-Type": "application/xml",
        Accept: "application/xml",
      });
    });
  });

  describe("实际使用场景", () => {
    it("REST API - GET 请求", () => {
      const apiMeta: PontxAPIMeta = {
        method: "GET",
        path: "/api/users/{id}",
        hasBody: false,
        hasParams: true,
        produces: ["application/json"],
      };

      const options: RequestInit = {
        headers: {
          Authorization: "Bearer token123",
        },
      };

      const headers = buildHeaders(apiMeta, options);

      expect(headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer token123",
      });
    });

    it("REST API - POST 请求（JSON）", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/api/users",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json"],
        produces: ["application/json"],
      };

      const options: RequestInit = {
        headers: {
          Authorization: "Bearer token123",
          "X-Request-ID": "abc-123",
        },
      };

      const headers = buildHeaders(apiMeta, options);

      expect(headers).toEqual({
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Bearer token123",
        "X-Request-ID": "abc-123",
      });
    });

    it("文件上传 - multipart/form-data", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/api/upload",
        hasBody: true,
        hasParams: false,
        consumes: ["multipart/form-data"],
        produces: ["application/json"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({
        "Content-Type": "multipart/form-data",
        Accept: "application/json",
      });
    });

    it("表单提交 - application/x-www-form-urlencoded", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/api/login",
        hasBody: true,
        hasParams: false,
        consumes: ["application/x-www-form-urlencoded"],
        produces: ["application/json"],
      };

      const headers = buildHeaders(apiMeta);

      expect(headers).toEqual({
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      });
    });

    it("自定义 API - 覆盖默认 Content-Type", () => {
      const apiMeta: PontxAPIMeta = {
        method: "POST",
        path: "/api/custom",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json"],
        produces: ["application/json"],
      };

      const options: RequestInit = {
        headers: {
          "Content-Type": "application/x-custom-format",
        },
      };

      const headers = buildHeaders(apiMeta, options);

      expect(headers).toEqual({
        "Content-Type": "application/x-custom-format",
        Accept: "application/json",
      });
    });
  });
});
