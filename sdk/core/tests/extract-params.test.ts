/**
 * @author jasonHzq
 * @description extract-params 模块测试
 *
 * 测试 Graceful Client 的参数提取和转换功能
 */

import { describe, it, expect } from "vitest";
import { extractParams } from "../src/graceful-client/extract-params";
import type { GracefulApiMeta } from "../src/graceful-client/requester";

describe("extractParams - 参数提取和转换", () => {
  describe("场景 1: 只有 Path 参数", () => {
    it("应该正确提取单个 path 参数", () => {
      const meta: GracefulApiMeta = {
        method: "GET",
        path: "/pet/{petId}",
        pathParams: ["petId"],
        queryParams: null,
        bodyParams: null,
      };

      const result = extractParams([123], meta);

      expect(result).toEqual({
        pathParams: { petId: 123 },
        queryParams: {},
        bodyParams: undefined,
        requestInit: undefined,
      });
    });

    it("应该正确提取多个 path 参数", () => {
      const meta: GracefulApiMeta = {
        method: "GET",
        path: "/user/{userId}/post/{postId}",
        pathParams: ["userId", "postId"],
        queryParams: null,
        bodyParams: null,
      };

      const result = extractParams(["user123", 456], meta);

      expect(result).toEqual({
        pathParams: { userId: "user123", postId: 456 },
        queryParams: {},
        bodyParams: undefined,
        requestInit: undefined,
      });
    });

    it("应该正确提取 path 参数和 requestInit", () => {
      const meta: GracefulApiMeta = {
        method: "GET",
        path: "/pet/{petId}",
        pathParams: ["petId"],
        queryParams: null,
        bodyParams: null,
      };

      const requestInit = { headers: { "X-Custom": "value" } };
      const result = extractParams([123, requestInit], meta);

      expect(result).toEqual({
        pathParams: { petId: 123 },
        queryParams: {},
        bodyParams: undefined,
        requestInit,
      });
    });
  });

  describe("场景 2: 只有 Query 参数", () => {
    it("应该正确提取 query 参数", () => {
      const meta: GracefulApiMeta = {
        method: "GET",
        path: "/user/login",
        pathParams: null,
        queryParams: ["username", "password"],
        bodyParams: null,
      };

      const result = extractParams(
        [{ username: "john", password: "123456" }],
        meta
      );

      expect(result).toEqual({
        pathParams: {},
        queryParams: { username: "john", password: "123456" },
        bodyParams: undefined,
        requestInit: undefined,
      });
    });

    it("应该处理空 query 参数对象", () => {
      const meta: GracefulApiMeta = {
        method: "GET",
        path: "/user/list",
        pathParams: null,
        queryParams: ["page", "size"],
        bodyParams: null,
      };

      const result = extractParams([], meta);

      expect(result).toEqual({
        pathParams: {},
        queryParams: {},
        bodyParams: undefined,
        requestInit: undefined,
      });
    });
  });

  describe("场景 3: 只有 Body 参数（可合并）", () => {
    it("应该正确提取 body 参数", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/pet",
        pathParams: null,
        queryParams: null,
        bodyParams: {
          contentType: "application/json",
          canMerge: true,
          fields: ["name", "status"],
        },
      };

      const result = extractParams([{ name: "doggie", status: "available" }], meta);

      expect(result).toEqual({
        pathParams: {},
        queryParams: {},
        bodyParams: { name: "doggie", status: "available" },
        requestInit: undefined,
      });
    });
  });

  describe("场景 4: Path + Query 参数", () => {
    it("应该正确提取 path 和 query 参数", () => {
      const meta: GracefulApiMeta = {
        method: "GET",
        path: "/pet/{petId}",
        pathParams: ["petId"],
        queryParams: ["status"],
        bodyParams: null,
      };

      const result = extractParams([123, { status: "available" }], meta);

      expect(result).toEqual({
        pathParams: { petId: 123 },
        queryParams: { status: "available" },
        bodyParams: undefined,
        requestInit: undefined,
      });
    });

    it("应该正确提取 path、query 和 requestInit", () => {
      const meta: GracefulApiMeta = {
        method: "GET",
        path: "/pet/{petId}",
        pathParams: ["petId"],
        queryParams: ["status"],
        bodyParams: null,
      };

      const requestInit = { signal: new AbortController().signal };
      const result = extractParams(
        [123, { status: "available" }, requestInit],
        meta
      );

      expect(result).toEqual({
        pathParams: { petId: 123 },
        queryParams: { status: "available" },
        bodyParams: undefined,
        requestInit,
      });
    });
  });

  describe("场景 5: Path + Body 参数（不可合并）", () => {
    it("应该正确提取 path 和 body 参数（FormData）", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/pet/{petId}/uploadImage",
        pathParams: ["petId"],
        queryParams: null,
        bodyParams: {
          contentType: "multipart/form-data",
          canMerge: false,
        },
      };

      const formData = new FormData();
      formData.append("file", "test");
      const result = extractParams([123, formData], meta);

      expect(result).toEqual({
        pathParams: { petId: 123 },
        queryParams: {},
        bodyParams: formData,
        requestInit: undefined,
      });
    });

    it("应该正确提取 path、body 和 requestInit", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/pet/{petId}/uploadImage",
        pathParams: ["petId"],
        queryParams: null,
        bodyParams: {
          contentType: "multipart/form-data",
          canMerge: false,
        },
      };

      const formData = new FormData();
      const requestInit = { headers: { "X-Custom": "value" } };
      const result = extractParams([123, formData, requestInit], meta);

      expect(result).toEqual({
        pathParams: { petId: 123 },
        queryParams: {},
        bodyParams: formData,
        requestInit,
      });
    });
  });

  describe("场景 6: Query + Body 参数（可合并）", () => {
    it("应该从合并对象中正确分离 query 和 body 参数", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/user/search",
        pathParams: null,
        queryParams: ["page", "size"],
        bodyParams: {
          contentType: "application/json",
          canMerge: true,
          fields: ["name", "email"],
        },
      };

      const result = extractParams(
        [{ page: 1, size: 10, name: "John", email: "john@example.com" }],
        meta
      );

      expect(result).toEqual({
        pathParams: {},
        queryParams: { page: 1, size: 10 },
        bodyParams: { name: "John", email: "john@example.com" },
        requestInit: undefined,
      });
    });

    it("应该处理参数名冲突（使用 paramMapping）", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/user/search",
        pathParams: null,
        queryParams: ["name", "age"],
        bodyParams: {
          contentType: "application/json",
          canMerge: true,
          fields: ["name", "city"],
        },
        paramMapping: {
          query_name: { source: "query", field: "name" },
          age: { source: "query", field: "age" },
          body_name: { source: "body", field: "name" },
          city: { source: "body", field: "city" },
        },
      };

      const result = extractParams(
        [
          {
            query_name: "john",
            age: 25,
            body_name: "John Doe",
            city: "NYC",
          },
        ],
        meta
      );

      expect(result).toEqual({
        pathParams: {},
        queryParams: { name: "john", age: 25 },
        bodyParams: { name: "John Doe", city: "NYC" },
        requestInit: undefined,
      });
    });

    it("应该处理部分映射的参数", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/user/update",
        pathParams: null,
        queryParams: ["notify", "sendEmail"],
        bodyParams: {
          contentType: "application/json",
          canMerge: true,
          fields: ["name", "email"],
        },
        paramMapping: {
          notify: { source: "query", field: "notify" },
        },
      };

      const result = extractParams(
        [
          {
            notify: true,
            sendEmail: false,
            name: "John",
            email: "john@example.com",
          },
        ],
        meta
      );

      expect(result).toEqual({
        pathParams: {},
        queryParams: { notify: true, sendEmail: false },
        bodyParams: { name: "John", email: "john@example.com" },
        requestInit: undefined,
      });
    });
  });

  describe("场景 7: Path + Query + Body 参数（不可合并）", () => {
    it("应该正确提取所有类型的参数", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/user/{userId}/upload",
        pathParams: ["userId"],
        queryParams: ["type"],
        bodyParams: {
          contentType: "multipart/form-data",
          canMerge: false,
        },
      };

      const formData = new FormData();
      formData.append("file", "test");
      const result = extractParams(["user123", { type: "avatar" }, formData], meta);

      expect(result).toEqual({
        pathParams: { userId: "user123" },
        queryParams: { type: "avatar" },
        bodyParams: formData,
        requestInit: undefined,
      });
    });

    it("应该正确提取所有类型的参数和 requestInit", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/user/{userId}/upload",
        pathParams: ["userId"],
        queryParams: ["type"],
        bodyParams: {
          contentType: "multipart/form-data",
          canMerge: false,
        },
      };

      const formData = new FormData();
      const requestInit = { headers: { "X-Upload-Id": "123" } };
      const result = extractParams(
        ["user123", { type: "avatar" }, formData, requestInit],
        meta
      );

      expect(result).toEqual({
        pathParams: { userId: "user123" },
        queryParams: { type: "avatar" },
        bodyParams: formData,
        requestInit,
      });
    });
  });

  describe("边界情况", () => {
    it("应该处理空参数列表", () => {
      const meta: GracefulApiMeta = {
        method: "GET",
        path: "/user/list",
        pathParams: null,
        queryParams: null,
        bodyParams: null,
      };

      const result = extractParams([], meta);

      expect(result).toEqual({
        pathParams: {},
        queryParams: {},
        bodyParams: undefined,
        requestInit: undefined,
      });
    });

    it("应该处理 undefined 参数对象", () => {
      const meta: GracefulApiMeta = {
        method: "GET",
        path: "/user/login",
        pathParams: null,
        queryParams: ["username", "password"],
        bodyParams: null,
      };

      const result = extractParams([undefined], meta);

      expect(result).toEqual({
        pathParams: {},
        queryParams: {},
        bodyParams: undefined,
        requestInit: undefined,
      });
    });

    it("应该处理没有字段列表的 body 参数", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/data/upload",
        pathParams: null,
        queryParams: null,
        bodyParams: {
          contentType: "application/json",
          canMerge: true,
        },
      };

      const result = extractParams([{ data: [1, 2, 3] }], meta);

      expect(result).toEqual({
        pathParams: {},
        queryParams: {},
        bodyParams: { data: [1, 2, 3] },
        requestInit: undefined,
      });
    });

    it("应该处理空的字段列表", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/user/action",
        pathParams: null,
        queryParams: [],
        bodyParams: {
          contentType: "application/json",
          canMerge: true,
          fields: [],
        },
      };

      const result = extractParams([{ action: "reset" }], meta);

      // 当字段列表为空时，body 会包含所有传入的数据（因为没有字段可以过滤）
      expect(result).toEqual({
        pathParams: {},
        queryParams: {},
        bodyParams: { action: "reset" },
        requestInit: undefined,
      });
    });

    it("应该处理参数中不在字段列表中的额外字段", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/user/search",
        pathParams: null,
        queryParams: ["page"],
        bodyParams: {
          contentType: "application/json",
          canMerge: true,
          fields: ["name"],
        },
      };

      const result = extractParams(
        [{ page: 1, name: "John", extraField: "ignored" }],
        meta
      );

      expect(result).toEqual({
        pathParams: {},
        queryParams: { page: 1 },
        bodyParams: { name: "John" },
        requestInit: undefined,
      });
    });
  });

  describe("复杂场景", () => {
    it("应该处理多个 path 参数 + 合并的 query/body + requestInit", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/org/{orgId}/user/{userId}",
        pathParams: ["orgId", "userId"],
        queryParams: ["notify"],
        bodyParams: {
          contentType: "application/json",
          canMerge: true,
          fields: ["role", "permissions"],
        },
      };

      const requestInit = {
        headers: { Authorization: "Bearer token" },
      };

      const result = extractParams(
        [
          "org123",
          "user456",
          {
            notify: true,
            role: "admin",
            permissions: ["read", "write"],
          },
          requestInit,
        ],
        meta
      );

      expect(result).toEqual({
        pathParams: { orgId: "org123", userId: "user456" },
        queryParams: { notify: true },
        bodyParams: { role: "admin", permissions: ["read", "write"] },
        requestInit,
      });
    });

    it("应该处理复杂的参数映射场景", () => {
      const meta: GracefulApiMeta = {
        method: "POST",
        path: "/api/search",
        pathParams: null,
        queryParams: ["q", "type", "limit"],
        bodyParams: {
          contentType: "application/json",
          canMerge: true,
          fields: ["filters", "sort", "fields"],
        },
        paramMapping: {
          search_q: { source: "query", field: "q" },
          search_type: { source: "query", field: "type" },
          result_limit: { source: "query", field: "limit" },
          filter_options: { source: "body", field: "filters" },
          sort_order: { source: "body", field: "sort" },
          return_fields: { source: "body", field: "fields" },
        },
      };

      const result = extractParams(
        [
          {
            search_q: "test",
            search_type: "full",
            result_limit: 10,
            filter_options: { status: "active" },
            sort_order: "desc",
            return_fields: ["id", "name"],
          },
        ],
        meta
      );

      expect(result).toEqual({
        pathParams: {},
        queryParams: { q: "test", type: "full", limit: 10 },
        bodyParams: {
          filters: { status: "active" },
          sort: "desc",
          fields: ["id", "name"],
        },
        requestInit: undefined,
      });
    });
  });
});
