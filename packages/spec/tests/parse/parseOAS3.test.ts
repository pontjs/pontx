import { describe, it, expect } from "vitest";
import { parseOAS3 } from "../../src/parse/parseOAS3";
import { parsePontSpec2OAS3 } from "../../src/parse";
import { resolveRef } from "../../src/parse/utils";
import * as fs from "fs";
import path from "path";

describe("resolveRef", () => {
  it("应正确解析 requestBodies 引用", () => {
    const doc = {
      components: {
        requestBodies: {
          MyBody: {
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    };
    const ref = { $ref: "#/components/requestBodies/MyBody" };
    expect(resolveRef(ref, doc)).toEqual(doc.components.requestBodies.MyBody);
  });

  it("应正确解析 parameters 引用", () => {
    const doc = {
      components: {
        parameters: {
          PageParam: {
            name: "page",
            in: "query",
            schema: { type: "integer" },
          },
        },
      },
    };
    const ref = { $ref: "#/components/parameters/PageParam" };
    expect(resolveRef(ref, doc)).toEqual(doc.components.parameters.PageParam);
  });

  it("引用不存在时返回 null", () => {
    const doc = { components: {} };
    const ref = { $ref: "#/components/requestBodies/NotExist" };
    expect(resolveRef(ref, doc)).toBeNull();
  });

  it("路径中间节点不存在时返回 null", () => {
    const doc = {};
    const ref = { $ref: "#/components/requestBodies/MyBody" };
    expect(resolveRef(ref, doc)).toBeNull();
  });

  it("非引用对象直接返回原对象", () => {
    const obj = { content: { "application/json": {} } };
    expect(resolveRef(obj, {})).toBe(obj);
  });

  it("null 或 undefined 直接返回", () => {
    expect(resolveRef(null, {})).toBeNull();
    expect(resolveRef(undefined, {})).toBeUndefined();
  });

  it("非对象直接返回", () => {
    expect(resolveRef("string" as any, {})).toBe("string");
    expect(resolveRef(123 as any, {})).toBe(123);
  });

  it("应正确处理 JSON 指针转义字符 ~1 -> /", () => {
    const doc = { "a/b": { value: "found" } };
    const ref = { $ref: "#/a~1b/value" };
    expect(resolveRef(ref, doc)).toBe("found");
  });

  it("应正确处理 JSON 指针转义字符 ~0 -> ~", () => {
    const doc = { "a~b": { value: "found" } };
    const ref = { $ref: "#/a~0b/value" };
    expect(resolveRef(ref, doc)).toBe("found");
  });

  it("应正确处理组合转义字符", () => {
    const doc = { "a/b~c": "value" };
    const ref = { $ref: "#/a~1b~0c" };
    expect(resolveRef(ref, doc)).toBe("value");
  });

  it("非 #/ 开头的 $ref 返回原对象", () => {
    const obj = { $ref: "external.json#/definitions/User" };
    expect(resolveRef(obj, {})).toBe(obj);
  });
});

describe("parseOAS3", () => {
  const testDataPath = path.join(__dirname, "../oas3/requestBody-ref.json");
  const testData = JSON.parse(fs.readFileSync(testDataPath, "utf-8"));

  it("应正确解析带 $ref 的 requestBody", () => {
    const result = parseOAS3(testData, "test");

    const updateUserApi = result.apis["user/updateUser"];
    expect(updateUserApi).toBeDefined();

    // 验证 body 参数被正确解析
    const bodyParam = updateUserApi.parameters.find((p) => p.in === "body");
    expect(bodyParam).toBeDefined();
    expect(bodyParam?.required).toBe(false);
    expect(bodyParam?.name).toBe("body");
    expect(bodyParam?.schema).toBeDefined();
    expect(bodyParam?.schema?.properties?.name).toBeDefined();
    expect(bodyParam?.schema?.properties?.email).toBeDefined();

    // 验证 consumes 被正确设置
    expect(updateUserApi.consumes).toContain("application/json");
  });

  it("应正确解析内联定义的 requestBody", () => {
    const result = parseOAS3(testData, "test");

    const createUserApi = result.apis["user/createUser"];
    expect(createUserApi).toBeDefined();

    // 验证 body 参数被正确解析
    const bodyParam = createUserApi.parameters.find((p) => p.in === "body");
    expect(bodyParam).toBeDefined();
    expect(bodyParam?.schema?.properties?.name).toBeDefined();
  });

  it("应保留必填 requestBody 的 required=true", () => {
    const document = structuredClone(testData);
    document.paths["/users"].post.requestBody.required = true;
    const result = parseOAS3(document, "test");
    const bodyParam = result.apis["user/createUser"].parameters.find((p) => p.in === "body");
    expect(bodyParam?.required).toBe(true);
  });

  it("引用不存在时应优雅降级（不报错，无 body 参数）", () => {
    const result = parseOAS3(testData, "test");

    const missingRefApi = result.apis["user/missingRef"];
    expect(missingRefApi).toBeDefined();

    // 验证不会因为引用不存在而报错，但也不会有 body 参数
    const bodyParam = missingRefApi.parameters.find((p) => p.in === "body");
    expect(bodyParam).toBeUndefined();
  });

  it("应同时解析 path 参数和 body 参数", () => {
    const result = parseOAS3(testData, "test");

    const updateUserApi = result.apis["user/updateUser"];
    expect(updateUserApi.parameters.length).toBe(2);

    const pathParam = updateUserApi.parameters.find((p) => p.in === "path");
    expect(pathParam).toBeDefined();
    expect(pathParam?.name).toBe("id");

    const bodyParam = updateUserApi.parameters.find((p) => p.in === "body");
    expect(bodyParam).toBeDefined();
  });

  it("应保留响应描述并归一化 OAS Schema 方言", () => {
    const document = {
      openapi: "3.1.0",
      info: { title: "测试", version: "1.0.0" },
      servers: [{ url: "https://api.example.com" }],
      tags: [{ name: "test" }],
      components: {
        responses: {
          BadRequest: { description: "请求错误" },
        },
      },
      paths: {
        "/items": {
          get: {
            operationId: "getItems",
            tags: ["test"],
            "x-pontx-request-examples": {
              default: {
                request: { path: {}, query: { currency: "USD" }, headers: {} },
                expectedStatus: "200",
              },
            },
            parameters: [{
              name: "currency", in: "query", required: true,
              schema: {
                type: ["string", "null"], example: "USD", enum: ["USD"],
                "x-enum-descriptions": ["美元"],
              },
            }],
            responses: {
              200: {
                description: "成功",
                content: { "application/json": { schema: { type: "number", minimum: 0, exclusiveMinimum: true, example: 1 } } },
              },
              400: { $ref: "#/components/responses/BadRequest" },
            },
          },
        },
      },
    } as any;
    const result = parseOAS3(document, "test");
    const api = result.apis["test/getItems"];

    expect(api.responses["200"].description).toBe("成功");
    expect(api.operationId).toBe("getItems");
    expect(api.requestExamples?.default.request?.query).toEqual({ currency: "USD" });
    expect(api.responses["400"].description).toBe("请求错误");
    expect(api.responses["200"].schema?.examples).toEqual([1]);
    expect(api.responses["200"].schema?.exclusiveMinimum).toBe(0);
    expect(api.parameters?.[0].schema.type).toBe("string");
    expect(api.parameters?.[0].schema.examples).toEqual(["USD"]);
    expect(api.parameters?.[0].schema.enumValueTitles).toEqual({ USD: "美元" });
    const roundTrip = parsePontSpec2OAS3(result) as any;
    expect(roundTrip.paths["/items"].GET.operationId).toBe("getItems");
    expect(roundTrip.paths["/items"].GET["x-pontx-request-examples"])
      .toEqual(document.paths["/items"].get["x-pontx-request-examples"]);
  });
});
