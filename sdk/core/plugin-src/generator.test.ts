/**
 * @author pontx-generator
 * @description 代码生成器测试
 */

import { describe, it, expect } from "vitest";
import { generateGracefulClient } from "./index";
import { writeFileTree } from "./write-files";
import * as fs from "fs";
import * as path from "path";

describe("Graceful Client Generator", () => {
  it("should generate apis.ts, apiMeta.ts and schemas.ts", () => {
    /* 读取测试用的 PontxSpec */
    const specPath = path.join(__dirname, "tests/petstore/api-lock.json");
    const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));

    /* 生成代码 */
    const files = generateGracefulClient(spec);

    /* 验证输出结构 */
    expect(files).toHaveProperty("apis.ts");
    expect(files).toHaveProperty("apiMeta.ts");
    expect(files).toHaveProperty("schemas.ts");

    /* 验证 apis.ts 内容 */
    const apisCode = files["apis.ts"] as string;
    expect(apisCode).toContain("export declare namespace");
    expect(apisCode).toContain("export type APIs");
    expect(apisCode).toContain("import type * as schemas");
    expect(apisCode).toContain("export type pet");
    expect(apisCode).toContain("export type user");

    /* 验证 apiMeta.ts 内容 */
    const apiMetaCode = files["apiMeta.ts"] as string;
    expect(apiMetaCode).toContain("export const specMeta");
    expect(apiMetaCode).toContain("method:");
    expect(apiMetaCode).toContain("path:");

    /* 验证 schemas.ts 内容 */
    const schemasCode = files["schemas.ts"] as string;
    expect(schemasCode).toContain("export type");
    expect(schemasCode).toContain("Pet");
    expect(schemasCode).toContain("User");
  });

  it("should write files to disk", () => {
    /* 读取测试用的 PontxSpec */
    const specPath = path.join(__dirname, "tests/petstore/api-lock.json");
    const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));

    /* 生成代码 */
    const files = generateGracefulClient(spec);

    /* 写入到测试目录 */
    const outputDir = path.join(__dirname, "./tests/petstore");
    writeFileTree(files, outputDir);

    /* 验证文件已创建 */
    expect(fs.existsSync(path.join(outputDir, "apis.ts"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "apiMeta.ts"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "schemas.ts"))).toBe(true);

    /* 验证文件内容 */
    const apisContent = fs.readFileSync(
      path.join(outputDir, "apis.ts"),
      "utf-8"
    );
    expect(apisContent).toContain("export declare namespace");
    expect(apisContent).toContain("export type pet");
    expect(apisContent).toContain("export type user");

    const apiMetaContent = fs.readFileSync(
      path.join(outputDir, "apiMeta.ts"),
      "utf-8"
    );
    expect(apiMetaContent).toContain("export const specMeta");

    const schemasContent = fs.readFileSync(
      path.join(outputDir, "schemas.ts"),
      "utf-8"
    );
    expect(schemasContent).toContain("export type");
    expect(schemasContent).toContain("Pet");
  });

  it("should preserve path parameters order from path, not from parameters array", () => {
    // 构造一个包含多个 path 参数的 API，且 parameters 数组中的顺序与 path 不一致
    const spec = {
      openapi: "3.0.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      apis: {
        "user/getUserPosts": {
          path: "/api/{userId}/posts/{postId}",
          method: "GET",
          parameters: [
            {
              name: "postId", // postId 在 parameters 数组中排第一位
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
            {
              name: "userId", // userId 在 parameters 数组中排第二位
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "Success",
              schema: {
                type: "object",
              },
            },
          },
        },
      },
    };

    // 测试 apiMeta 生成
    const files = generateGracefulClient(spec as any);
    const apiMetaCode = files["apiMeta.ts"] as string;

    // pathParams 应该按照 path 中的顺序：userId, postId
    expect(apiMetaCode).toContain('pathParams: ["userId", "postId"]');
    // 不应该是 parameters 数组的顺序
    expect(apiMetaCode).not.toContain('pathParams: ["postId", "userId"]');

    // 测试 apis 生成
    const apisCode = files["apis.ts"] as string;

    // 在生成的方法签名中，参数顺序应该是 userId, postId
    expect(apisCode).toMatch(/userId:\s*string,[\s\S]*postId:\s*string,/);
    // 不应该是相反的顺序
    expect(apisCode).not.toMatch(/postId:\s*string,[\s\S]*userId:\s*string,/);
  });

  it("should handle path with three or more parameters", () => {
    const spec = {
      openapi: "3.0.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      apis: {
        "resource/getNestedResource": {
          path: "/api/{orgId}/projects/{projectId}/resources/{resourceId}",
          method: "GET",
          parameters: [
            {
              name: "resourceId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "projectId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "orgId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Success",
              schema: { type: "object" },
            },
          },
        },
      },
    };

    const files = generateGracefulClient(spec as any);
    const apiMetaCode = files["apiMeta.ts"] as string;
    // 应该按照 path 中的顺序
    expect(apiMetaCode).toContain(
      'pathParams: ["orgId", "projectId", "resourceId"]'
    );

    const apisCode = files["apis.ts"] as string;
    // 方法签名中的参数顺序应该与 path 一致
    expect(apisCode).toMatch(
      /orgId:\s*string,[\s\S]*projectId:\s*string,[\s\S]*resourceId:\s*string,/
    );
  });
});
