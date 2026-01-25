import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "../client";
import type { PontxSpecMeta } from "../type";

describe("createClient", () => {
  let mockFetchFn: ReturnType<typeof vi.fn>;
  let pontxSpecMeta: PontxSpecMeta;

  beforeEach(() => {
    mockFetchFn = vi.fn().mockResolvedValue({ success: true });
    pontxSpecMeta = {
      name: "TestAPI",
      hasTags: false,
      apis: {
        "UserController/getUser": {
          path: "/api/users/{id}",
          method: "GET",
          hasBody: false,
          hasParams: true,
          consumes: ["application/json"],
          produces: ["application/json"],
        },
        "UserController/createUser": {
          path: "/api/users",
          method: "POST",
          hasBody: true,
          hasParams: false,
          consumes: ["application/json"],
          produces: ["application/json"],
        },
        "PostController/updatePost": {
          path: "/api/posts/{id}",
          method: "PUT",
          hasBody: true,
          hasParams: true,
          consumes: ["application/json"],
          produces: ["application/json"],
        },
      },
    };
  });

  describe("客户端创建", () => {
    it("应该成功创建客户端", () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });
      expect(client).toBeDefined();
    });

    it("应该通过 Proxy 动态创建控制器", () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });
      expect(client.UserController).toBeDefined();
      expect(client.PostController).toBeDefined();
    });
  });

  describe("getFetchKey", () => {
    it("应该生成正确的 fetch key", () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });
      const fetchKey = client.UserController.getUser.getFetchKey({ id: 123 });
      expect(fetchKey).toBe("/api/users/123");
    });

    it("应该使用自定义的 getFetchUrl 函数", () => {
      const customGetFetchUrl = vi.fn(
        (path: string, params: Record<string, any>) => {
          return `https://api.example.com${path.replace("{id}", params.id)}`;
        }
      );
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
        getFetchUrl: customGetFetchUrl,
      });
      const fetchKey = client.UserController.getUser.getFetchKey({ id: 123 });
      expect(customGetFetchUrl).toHaveBeenCalledWith("/api/users/{id}", {
        id: 123,
      });
      expect(fetchKey).toBe("https://api.example.com/api/users/123");
    });

    it("应该使用 pathMark 替换未提供的路径参数", () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
        pathMark: ":id",
      });
      const fetchKey = client.UserController.getUser.getFetchKey({});
      expect(fetchKey).toBe("/api/users/:id");
    });
  });

  describe("request 方法", () => {
    it("应该使用正确的参数调用 fetchFn", async () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });
      await client.UserController.getUser.request({ id: 123 });

      expect(mockFetchFn).toHaveBeenCalledWith(
        "/api/users/123",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "application/json",
          }),
        })
      );
    });

    it("应该为 POST 请求序列化 body", async () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });
      const userData = { name: "John", email: "john@example.com" };
      await client.UserController.createUser.request(
        {},
        { body: userData }
      );

      expect(mockFetchFn).toHaveBeenCalledWith(
        "/api/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(userData),
        })
      );
    });

    it("应该正确设置 Content-Type header", async () => {
      pontxSpecMeta.apis["UserController/createUser"].consumes = [
        "application/x-www-form-urlencoded",
      ];
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      await client.UserController.createUser.request(
        {},
        { body: { name: "John" } }
      );

      expect(mockFetchFn).toHaveBeenCalledWith(
        "/api/users",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        })
      );
    });

    it("应该正确设置 Accept header", async () => {
      pontxSpecMeta.apis["UserController/getUser"].produces = [
        "application/xml",
      ];
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      await client.UserController.getUser.request({ id: 123 });

      expect(mockFetchFn).toHaveBeenCalledWith(
        "/api/users/123",
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "application/xml",
          }),
        })
      );
    });

    it("应该合并自定义的 requestOptions", async () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      await client.UserController.getUser.request(
        { id: 123 },
        {
          headers: { Authorization: "Bearer token123" },
          credentials: "include",
        } as any
      );

      expect(mockFetchFn).toHaveBeenCalledWith(
        "/api/users/123",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token123",
          }),
          credentials: "include",
        })
      );
    });

    it("应该在 requestInit 中包含 getMetadata 方法", async () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      await client.UserController.getUser.request({ id: 123 });

      const callArgs = mockFetchFn.mock.calls[0];
      const requestInit = callArgs[1];
      expect(requestInit.getMetadata).toBeTypeOf("function");

      const metadata = requestInit.getMetadata();
      expect(metadata).toEqual({
        specName: "TestAPI",
        controllerName: "UserController",
        apiName: "getUser",
        apiMeta: pontxSpecMeta.apis["UserController/getUser"],
      });
    });

    it("当请求失败时应该抛出错误", async () => {
      const error = new Error("Network error");
      mockFetchFn.mockRejectedValue(error);
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      await expect(
        client.UserController.getUser.request({ id: 123 })
      ).rejects.toThrow("Network error");
    });

    it("应该处理没有 body 的请求", async () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      await client.UserController.getUser.request({ id: 123 });

      expect(mockFetchFn).toHaveBeenCalledWith(
        "/api/users/123",
        expect.not.objectContaining({
          body: expect.anything(),
        })
      );
    });

    it("应该只在 hasBody 为 true 时序列化 body", async () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      // GET 请求，hasBody = false
      // requestOptions 通过展开运算符合并，所以 body 会被传递但不会被序列化
      await client.UserController.getUser.request(
        { id: 123 },
        { body: { shouldBeIgnored: true } } as any
      );

      const getCall = mockFetchFn.mock.calls[0][1];
      // body 会通过 ...requestOptions 传递，但不会被序列化
      expect(getCall.body).toEqual({ shouldBeIgnored: true });

      mockFetchFn.mockClear();

      // POST 请求，hasBody = true，body 应该被序列化
      await client.UserController.createUser.request(
        {},
        { body: { name: "John" } }
      );

      const postCall = mockFetchFn.mock.calls[0][1];
      expect(postCall.body).toBeDefined();
      expect(postCall.body).toBe(JSON.stringify({ name: "John" }));
    });
  });

  describe("queryOptions 方法", () => {
    it("应该返回包含 fetchKey 和 fetchFn 的对象", () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      const options = client.UserController.getUser.queryOptions({ id: 123 });

      expect(options).toHaveProperty("fetchKey");
      expect(options).toHaveProperty("fetchFn");
      expect(options.fetchKey).toBe("/api/users/123");
      expect(options.fetchFn).toBeTypeOf("function");
    });

    it("fetchFn 应该调用 request 方法", async () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      const options = client.UserController.getUser.queryOptions({ id: 123 });
      await options.fetchFn();

      expect(mockFetchFn).toHaveBeenCalledWith(
        "/api/users/123",
        expect.objectContaining({
          method: "GET",
        })
      );
    });
  });

  describe("makeCustomUsages", () => {
    it("应该允许添加自定义方法", () => {
      const makeCustomUsages = vi.fn((usages) => ({
        customMethod: () => "custom",
      }));

      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
        makeCustomUsages,
      });

      expect(client.UserController.getUser.customMethod).toBeDefined();
      expect(client.UserController.getUser.customMethod()).toBe("custom");
    });

    it("应该保留原有的方法", () => {
      const makeCustomUsages = vi.fn((usages) => ({
        customMethod: () => "custom",
      }));

      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
        makeCustomUsages,
      });

      expect(client.UserController.getUser.request).toBeDefined();
      expect(client.UserController.getUser.getFetchKey).toBeDefined();
      expect(client.UserController.getUser.queryOptions).toBeDefined();
    });

    it("应该接收 apiMeta 参数", () => {
      const makeCustomUsages = vi.fn();

      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
        makeCustomUsages,
      });

      // 触发 proxy get
      client.UserController.getUser;

      expect(makeCustomUsages).toHaveBeenCalledWith(
        expect.objectContaining({
          getFetchKey: expect.any(Function),
          request: expect.any(Function),
          queryOptions: expect.any(Function),
        }),
        pontxSpecMeta.apis["UserController/getUser"]
      );
    });
  });

  describe("复杂场景", () => {
    it("应该正确处理带有查询参数和路径参数的请求", async () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      await client.PostController.updatePost.request(
        { id: 1, includeComments: true },
        { body: { title: "Updated" } }
      );

      expect(mockFetchFn).toHaveBeenCalledWith(
        "/api/posts/1?includeComments=true",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ title: "Updated" }),
        })
      );
    });

    it("应该正确处理没有 consumes 和 produces 的 API", async () => {
      pontxSpecMeta.apis["UserController/getUser"].consumes = undefined;
      pontxSpecMeta.apis["UserController/getUser"].produces = undefined;

      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      await client.UserController.getUser.request({ id: 123 });

      expect(mockFetchFn).toHaveBeenCalledWith(
        "/api/users/123",
        expect.objectContaining({
          method: "GET",
          headers: {},
        })
      );
    });

    it("应该支持多个控制器", () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      expect(client.UserController).toBeDefined();
      expect(client.PostController).toBeDefined();
      expect(client.UserController.getUser).toBeDefined();
      expect(client.PostController.updatePost).toBeDefined();
    });

    it("应该缓存控制器实例", () => {
      const client = createClient({
        fetchFn: mockFetchFn,
        pontxSpecMeta,
      });

      const controller1 = client.UserController;
      const controller2 = client.UserController;

      expect(controller1).toBe(controller2);
    });
  });
});
