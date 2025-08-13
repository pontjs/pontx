/**
 * @author: jasonHzq
 * @description: 注释生成模块的单元测试
 */

import { test, expect, describe } from "vitest";
import {
  escapeCommentText,
  generateApiComment,
  generateSchemaComment,
  generateTagComment,
} from "../src/generate/comment.js";
import { PontxAPI } from "../src/api.js";
import { PontxJsonSchema } from "../src/schema.js";
import { TagGroup } from "../src/spec.js";

describe("escapeCommentText", () => {
  test("应该返回空值或undefined而不报错", () => {
    expect(escapeCommentText("")).toBe("");
    expect(escapeCommentText(null as any)).toBe(null);
    expect(escapeCommentText(undefined as any)).toBe(undefined);
  });

  test("应该正确转义JSDoc注释结束符", () => {
    expect(escapeCommentText("这是注释结束*/")).toBe("这是注释结束*\\/");
    expect(escapeCommentText("多个*/注释*/结束")).toBe("多个*\\/注释*\\/结束");
  });

  test("应该正确转义JSDoc注释开始符", () => {
    expect(escapeCommentText("/*这是注释开始")).toBe("/\\*这是注释开始");
    expect(escapeCommentText("多个/*注释/*开始")).toBe("多个/\\*注释/\\*开始");
  });

  test("应该正确转义markdown加粗格式", () => {
    expect(escapeCommentText("**粗体文本**")).toBe("\\*\\*粗体文本\\*\\*");
    expect(escapeCommentText("这是**粗体**文本")).toBe(
      "这是\\*\\*粗体\\*\\*文本"
    );
    expect(escapeCommentText("多个**粗体1**和**粗体2**")).toBe(
      "多个\\*\\*粗体1\\*\\*和\\*\\*粗体2\\*\\*"
    );
  });

  test("应该正确转义markdown斜体格式", () => {
    expect(escapeCommentText("*斜体文本*")).toBe("\\*斜体文本\\*");
    expect(escapeCommentText("这是*斜体*文本")).toBe("这是\\*斜体\\*文本");
    expect(escapeCommentText("多个*斜体1*和*斜体2*")).toBe(
      "多个\\*斜体1\\*和\\*斜体2\\*"
    );
  });

  test("应该正确处理混合的markdown格式", () => {
    expect(escapeCommentText("**粗体**和*斜体*混合")).toBe(
      "\\*\\*粗体\\*\\*和\\*斜体\\*混合"
    );
    expect(escapeCommentText("***粗斜体***")).toBe("\\*\\*\\*粗斜体\\*\\*\\*");
  });

  test("应该正确处理复合场景", () => {
    const input = "这是/*注释开始*/和**粗体**以及*斜体*的混合测试";
    const expected =
      "这是/\\*注释开始*\\/和\\*\\*粗体\\*\\*以及\\*斜体\\*的混合测试";
    expect(escapeCommentText(input)).toBe(expected);
  });

  test("应该正确处理包含换行符的文本", () => {
    const input = "第一行**粗体**\n第二行*斜体*\n第三行/*注释*/";
    const expected =
      "第一行\\*\\*粗体\\*\\*\n第二行\\*斜体\\*\n第三行/\\*注释*\\/";
    expect(escapeCommentText(input)).toBe(expected);
  });

  test("应该保持普通文本不变", () => {
    expect(escapeCommentText("普通文本")).toBe("普通文本");
    expect(escapeCommentText("包含数字123和符号!@#")).toBe(
      "包含数字123和符号!@#"
    );
    expect(escapeCommentText("中文和English混合")).toBe("中文和English混合");
  });

  test("应该避免重复转义已转义的字符", () => {
    // 测试已经转义的字符不会被重复转义
    expect(escapeCommentText("\\*已转义的星号")).toBe("\\*已转义的星号");
    expect(escapeCommentText("\\*\\*已转义的双星号")).toBe(
      "\\*\\*已转义的双星号"
    );
  });
});

describe("注释生成函数集成测试", () => {
  test("generateApiComment应该正确转义API描述中的markdown", () => {
    const api: Partial<PontxAPI> = {
      method: "GET",
      path: "/api/test",
      description: "这是**重要的**API，支持*多种*格式",
    };

    const result = generateApiComment(api as PontxAPI);
    expect(result).toContain("\\*\\*重要的\\*\\*");
    expect(result).toContain("\\*多种\\*");
  });

  test("generateApiComment应该正确转义title中的markdown", () => {
    const api: Partial<PontxAPI> = {
      method: "GET",
      path: "/api/test",
      description: "普通描述",
      title: "**测试API标题**",
    };

    const result = generateApiComment(api as PontxAPI);
    expect(result).toContain("\\*\\*测试API标题\\*\\*");
  });

  test("generateApiComment应该正确转义summary中的markdown", () => {
    const api: Partial<PontxAPI> = {
      method: "GET",
      path: "/api/test",
      description: "普通描述",
      summary: "*API摘要*",
    };

    const result = generateApiComment(api as PontxAPI);
    expect(result).toContain("\\*API摘要\\*");
  });

  test("generateSchemaComment应该正确转义Schema描述中的markdown", () => {
    const schema: Partial<PontxJsonSchema> = {
      title: "**用户模型**",
      description: "这是*用户*的数据模型，包含**必要**字段",
    };

    const result = generateSchemaComment(schema as PontxJsonSchema);
    expect(result).toContain("\\*\\*用户模型\\*\\*");
    expect(result).toContain("\\*用户\\*");
    expect(result).toContain("\\*\\*必要\\*\\*");
  });

  test("generateTagComment应该正确转义Tag描述中的markdown", () => {
    const tagGroup: Partial<TagGroup> = {
      name: "user",
      description: "**用户管理**相关的*API*接口",
    };

    const result = generateTagComment(tagGroup as TagGroup);
    expect(result).toContain("\\*\\*用户管理\\*\\*");
    expect(result).toContain("\\*API\\*");
  });
});
