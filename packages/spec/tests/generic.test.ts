/**
 * @author: jasonHzq
 * 泛型解析测试用例
 * 测试 GenericHelper.resolveGenericSchema 方法的各种场景
 */

import { describe, it, expect } from "vitest";
import { GenericHelper } from "../src/generic";
import { PontxJsonSchema } from "../src/schema";

describe("GenericHelper.resolveGenericSchema", () => {
  /** 测试用的基础 schemas 定义 */
  const testSchemas: Record<string, PontxJsonSchema> = {
    // 基础泛型类定义
    Result: {
      type: "object",
      properties: {
        code: { type: "string" },
        data: {
          type: "generic",
          genericTypeParameterRef: "T0",
        },
        message: { type: "string" },
      },
      title: "Result",
      genericTypeParameters: [
        {
          name: "T0",
          default: { type: "object" },
        },
      ],
      required: [],
    },

    // 多参数泛型类定义
    Pair: {
      type: "object",
      properties: {
        first: {
          type: "generic",
          genericTypeParameterRef: "T0",
        },
        second: {
          type: "generic",
          genericTypeParameterRef: "T1",
        },
      },
      title: "Pair",
      genericTypeParameters: [
        { name: "T0", default: { type: "string" } },
        { name: "T1", default: { type: "number" } },
      ],
      required: [],
    },

    // 嵌套泛型类定义
    List: {
      type: "object",
      properties: {
        items: {
          type: "generic",
          genericTypeParameterRef: "T0",
        },
      },
      title: "List",
      genericTypeParameters: [{ name: "T0", default: { type: "object" } }],
      required: [],
    },

    // 普通类定义
    User: {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
      },
      title: "User",
      required: [],
    },
  };

  it("应该正确解析简单的泛型引用", () => {
    /** 测试简单的泛型引用解析 */
    const genericSchema: PontxJsonSchema = {
      type: "generic",
      genericRef: {
        typeArguments: [{ type: "string" }],
        $ref: "#/components/schemas/Result",
      },
    };

    const result = GenericHelper.resolveGenericSchema(
      genericSchema,
      testSchemas
    );

    expect(result).toEqual({
      type: "object",
      properties: {
        code: { type: "string" },
        data: { type: "string" }, // T0 被替换为 string
        message: { type: "string" },
      },
      title: "Result",
      genericTypeParameters: [
        {
          name: "T0",
          default: { type: "object" },
        },
      ],
      genericTypeArguments: [{ type: "string" }],
      required: [],
    });
  });

  it("应该正确解析多参数泛型引用", () => {
    /** 测试多参数泛型引用解析 */
    const genericSchema: PontxJsonSchema = {
      type: "generic",
      genericRef: {
        typeArguments: [{ type: "number" }, { type: "boolean" }],
        $ref: "#/components/schemas/Pair",
      },
    };

    const result = GenericHelper.resolveGenericSchema(
      genericSchema,
      testSchemas
    );

    expect(result).toEqual({
      type: "object",
      properties: {
        first: { type: "number" }, // T0 被替换为 number
        second: { type: "boolean" }, // T1 被替换为 boolean
      },
      title: "Pair",
      genericTypeParameters: [
        { name: "T0", default: { type: "string" } },
        { name: "T1", default: { type: "number" } },
      ],
      genericTypeArguments: [{ type: "number" }, { type: "boolean" }],
      required: [],
    });
  });

  it("应该正确解析嵌套的泛型引用", () => {
    /** 测试嵌套泛型引用解析 */
    const genericSchema: PontxJsonSchema = {
      type: "generic",
      genericRef: {
        typeArguments: [
          {
            type: "generic",
            genericRef: {
              typeArguments: [{ type: "string" }],
              $ref: "#/components/schemas/List",
            },
          },
        ],
        $ref: "#/components/schemas/Result",
      },
    };

    const result = GenericHelper.resolveGenericSchema(
      genericSchema,
      testSchemas
    );

    // 验证嵌套泛型被正确解析
    expect(result.type).toBe("object");
    expect(result.properties?.data).toEqual({
      type: "object",
      properties: {
        items: { type: "string" }, // 嵌套的 T0 被替换为 string
      },
      title: "List",
      genericTypeParameters: [{ name: "T0", default: { type: "object" } }],
      genericTypeArguments: [{ type: "string" }],
      required: [],
    });

    // 验证顶层泛型也有 genericTypeArguments
    expect(result.genericTypeArguments).toEqual([
      {
        type: "generic",
        genericRef: {
          typeArguments: [{ type: "string" }],
          $ref: "#/components/schemas/List",
        },
      },
    ]);
  });

  it("应该正确处理非泛型 schema", () => {
    /** 测试非泛型 schema 的处理 */
    const nonGenericSchema: PontxJsonSchema = {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
      },
      title: "User",
      required: [],
    };

    const result = GenericHelper.resolveGenericSchema(
      nonGenericSchema,
      testSchemas
    );

    // 非泛型 schema 应该保持不变
    expect(result).toEqual(nonGenericSchema);
  });

  it("应该正确处理包含泛型引用的复杂对象", () => {
    /** 测试包含泛型引用的复杂对象结构 */
    const complexSchema: PontxJsonSchema = {
      type: "object",
      properties: {
        success: { type: "boolean" },
        result: {
          type: "generic",
          genericRef: {
            typeArguments: [
              {
                type: "object",
                properties: {
                  id: { type: "number" },
                  name: { type: "string" },
                },
              },
            ],
            $ref: "#/components/schemas/Result",
          },
        },
        timestamp: { type: "string" },
      },
      title: "ApiResponse",
      required: [],
    };

    const result = GenericHelper.resolveGenericSchema(
      complexSchema,
      testSchemas
    );

    expect(result.type).toBe("object");
    expect(result.properties?.success).toEqual({ type: "boolean" });
    expect(result.properties?.timestamp).toEqual({ type: "string" });

    // 验证泛型引用被正确解析
    expect(result.properties?.result).toEqual({
      type: "object",
      properties: {
        code: { type: "string" },
        data: {
          type: "object",
          properties: {
            id: { type: "number" },
            name: { type: "string" },
          },
        },
        message: { type: "string" },
      },
      title: "Result",
      genericTypeParameters: [
        {
          name: "T0",
          default: { type: "object" },
        },
      ],
      genericTypeArguments: [
        {
          type: "object",
          properties: {
            id: { type: "number" },
            name: { type: "string" },
          },
        },
      ],
      required: [],
    });
  });

  it("应该正确处理引用不存在的 schema", () => {
    /** 测试引用不存在 schema 的情况 */
    const invalidGenericSchema: PontxJsonSchema = {
      type: "generic",
      genericRef: {
        typeArguments: [{ type: "string" }],
        $ref: "#/components/schemas/NonExistentSchema",
      },
    };

    const result = GenericHelper.resolveGenericSchema(
      invalidGenericSchema,
      testSchemas
    );

    // 引用不存在的 schema 时，应该返回原始 schema
    expect(result).toEqual(invalidGenericSchema);
  });

  it("应该正确处理空的 schema", () => {
    /** 测试空 schema 的处理 */
    const emptySchema: PontxJsonSchema = {
      type: "object",
    };

    const result = GenericHelper.resolveGenericSchema(emptySchema, testSchemas);

    expect(result).toEqual({
      type: "object",
    });
  });

  it("应该正确处理 null 或 undefined 的 schema", () => {
    /** 测试 null 或 undefined schema 的处理 */
    const nullSchema = null as any;
    const undefinedSchema = undefined as any;

    const nullResult = GenericHelper.resolveGenericSchema(
      nullSchema,
      testSchemas
    );
    const undefinedResult = GenericHelper.resolveGenericSchema(
      undefinedSchema,
      testSchemas
    );

    expect(nullResult).toBeNull();
    expect(undefinedResult).toBeUndefined();
  });

  it("应该正确处理泛型参数数量不匹配的情况", () => {
    /** 测试泛型参数数量不匹配的情况 */
    const mismatchedGenericSchema: PontxJsonSchema = {
      type: "generic",
      genericRef: {
        typeArguments: [
          { type: "string" },
          // 缺少第二个参数
        ],
        $ref: "#/components/schemas/Pair",
      },
    };

    const result = GenericHelper.resolveGenericSchema(
      mismatchedGenericSchema,
      testSchemas
    );

    // 参数数量不匹配时，应该使用默认值
    expect(result).toEqual({
      type: "object",
      properties: {
        first: { type: "string" }, // 第一个参数被替换
        second: { type: "number" }, // 第二个参数使用默认值
      },
      title: "Pair",
      genericTypeParameters: [
        { name: "T0", default: { type: "string" } },
        { name: "T1", default: { type: "number" } },
      ],
      genericTypeArguments: [{ type: "string" }],
      required: [],
    });
  });

  it("应该正确处理数组中的泛型引用", () => {
    /** 测试数组中包含泛型引用的情况 */
    const arrayWithGenericSchema: PontxJsonSchema = {
      type: "array",
      items: {
        type: "generic",
        genericRef: {
          typeArguments: [{ type: "number" }],
          $ref: "#/components/schemas/Result",
        },
      },
    };

    const result = GenericHelper.resolveGenericSchema(
      arrayWithGenericSchema,
      testSchemas
    );

    expect(result.type).toBe("array");
    expect(result.items).toEqual({
      type: "object",
      properties: {
        code: { type: "string" },
        data: { type: "number" }, // T0 被替换为 number
        message: { type: "string" },
      },
      title: "Result",
      genericTypeParameters: [
        {
          name: "T0",
          default: { type: "object" },
        },
      ],
      genericTypeArguments: [{ type: "number" }],
      required: [],
    });
  });
});
