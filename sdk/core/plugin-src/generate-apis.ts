/**
 * @author pontx-generator
 * @description 生成 apis.ts 文件
 */

import {
  PontxSpec,
  PontxAPI,
  PontxJsonSchema,
  generateApiComment,
  generateSchemaComment,
  generateSchemaCode,
  indentation,
  checkNeedQuotationMark,
} from "@pontx/spec";

/**
 * 从 path 中提取参数名称并按照出现顺序排序
 * @param path API 路径，如 /api/{userId}/posts/{postId}
 * @returns 参数名称数组，按照在 path 中的出现顺序
 */
function extractPathParamsOrder(path: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const params: string[] = [];
  let match;
  while ((match = regex.exec(path)) !== null) {
    params.push(match[1]);
  }
  return params;
}

/**
 * 生成参数类型定义（查询参数 + 可合并的 body 参数）
 */
function generateParamsType(api: PontxAPI, typeName: string): string | null {
  const queryParams = api.parameters?.filter((p) => p.in === "query") || [];
  const bodyParam = api.parameters?.find((p) => p.in === "body");
  const contentType = api.consumes?.[0] || "application/json";
  const canMerge =
    contentType === "application/json" && bodyParam?.schema?.type === "object";

  if (queryParams.length === 0 && !canMerge) {
    return null;
  }

  const params: string[] = [];

  if (queryParams.length > 0) {
    queryParams.forEach((param) => {
      const comment = generateSchemaComment(
        param.schema as PontxJsonSchema,
        param.name
      );
      const required = param.required;
      const tsType = generateSchemaCode(
        param.schema as PontxJsonSchema,
        "schemas."
      );
      const optional = required ? "" : "?";
      const paramName = checkNeedQuotationMark(param.name)
        ? `'${param.name}'`
        : param.name;

      params.push(`${comment}${paramName}${optional}: ${tsType};`);
    });
  }

  if (canMerge && bodyParam?.schema?.properties) {
    Object.entries(bodyParam.schema.properties).forEach(
      ([key, value]: [string, any]) => {
        const required = PontxJsonSchema.checkRequired(
          bodyParam.schema as PontxJsonSchema,
          key
        );
        const tsType = generateSchemaCode(value as PontxJsonSchema, "schemas.");
        const optional = required ? "" : "?";
        const comment = generateSchemaComment(value as PontxJsonSchema, key);
        const propName = checkNeedQuotationMark(key) ? `'${key}'` : key;

        params.push(`${comment}${propName}${optional}: ${tsType};`);
      }
    );
  }

  return `export type ${typeName} = {\n${indentation(2)(
    params.join("\n")
  )}\n};`;
}

/**
 * 生成 Body 类型定义（formData 或其他不可合并的 body）
 */
function generateBodyType(api: PontxAPI, typeName: string): string | null {
  const formDataParams =
    api.parameters?.filter((p) => p.in === "formData") || [];

  if (formDataParams.length === 0) {
    return null;
  }

  const params: string[] = [];
  formDataParams.forEach((param) => {
    const comment = generateSchemaComment(param.schema as PontxJsonSchema);
    const required = param.required;
    const tsType = generateSchemaCode(
      param.schema as PontxJsonSchema,
      "schemas."
    );
    const optional = required ? "" : "?";
    const paramName = checkNeedQuotationMark(param.name)
      ? `'${param.name}'`
      : param.name;
    params.push(`${comment}${paramName}${optional}: ${tsType};`);
  });

  return `export type ${typeName} = {\n${indentation(2)(
    params.join("\n")
  )}\n};`;
}

/**
 * 生成方法类型代码（用于 export type controller = { ... } 中）
 */
function generateApiMethodType(
  api: PontxAPI,
  apiName: string,
  controllerName: string
): {
  methodCode: string;
} {
  // 从 path 中提取参数顺序
  const pathParamsOrder = extractPathParamsOrder(api.path || "");

  // 按照 path 中的顺序获取参数定义
  const pathParams = pathParamsOrder
    .map((paramName) => api.parameters?.find((p) => p.in === "path" && p.name === paramName))
    .filter(Boolean) as any[];

  const queryParams = api.parameters?.filter((p) => p.in === "query") || [];
  const bodyParam = api.parameters?.find((p) => p.in === "body");
  const formDataParams =
    api.parameters?.filter((p) => p.in === "formData") || [];
  const contentType = api.consumes?.[0] || "application/json";
  const canMerge =
    contentType === "application/json" && bodyParam?.schema?.type === "object";

  const responseType = generateSchemaCode(
    api.responses?.["200"]?.schema as PontxJsonSchema,
    "schemas."
  );

  const capitalizedApiName = apiName.charAt(0).toUpperCase() + apiName.slice(1);
  // const capitalizedController =
  //   controllerName.charAt(0).toUpperCase() + controllerName.slice(1);
  const paramsTypeName = `${capitalizedApiName}Params`;
  const bodyTypeName = `${capitalizedApiName}Body`;

  const paramLines: string[] = [];

  // Path 参数
  pathParams.forEach((param) => {
    const comment = generateSchemaComment(
      param.schema as PontxJsonSchema,
      param.name
    );
    const tsType = generateSchemaCode(
      param.schema as PontxJsonSchema,
      "schemas."
    );
    const paramName = checkNeedQuotationMark(param.name)
      ? `'${param.name}'`
      : param.name;
    if (comment) {
      paramLines.push(comment.trim());
    }
    paramLines.push(`${paramName}: ${tsType},`);
  });

  // Query + Body 合并 或 单独的 Query
  if (queryParams.length > 0 || canMerge) {
    paramLines.push(`params: ${controllerName}.${paramsTypeName},`);
  }

  // FormData 参数
  if (formDataParams.length > 0) {
    paramLines.push(`body: ${controllerName}.${bodyTypeName},`);
  }
  // 单独的 Body（不能合并的情况）
  else if (bodyParam && !canMerge) {
    const bodyType = generateSchemaCode(
      bodyParam.schema as PontxJsonSchema,
      "schemas."
    );
    const comment = generateSchemaComment(bodyParam.schema as PontxJsonSchema);
    if (comment) {
      paramLines.push(comment.trim());
    }
    paramLines.push(`body: ${bodyType},`);
  }

  // RequestInit (最后一个参数，不加逗号)
  paramLines.push("requestInit?: RequestInit,");

  // 参数需要 4 个空格缩进（type 内 2 空格 + 函数参数 2 空格）
  const paramsCode = indentation(4)(paramLines.join("\n"));

  // 使用 @pontx/spec 的 generateApiComment 生成注释
  let comment = generateApiComment(api);
  // 为注释添加缩进（除了最后的换行符）
  if (comment) {
    comment = indentation(2)(comment.trimEnd()) + "\n";
  }

  const methodCode = `${comment}  ${apiName}: (\n${paramsCode}\n  ) => Promise<${responseType}>;\n\n`;

  return { methodCode };
}

/**
 * 生成 apis.ts 内容
 */
export function generateApis(spec: PontxSpec): string {
  const controllers: Record<string, any[]> = {};

  // 按 controller 分组
  Object.entries(spec.apis || {}).forEach(([apiKey, api]) => {
    const [controller, apiName] = apiKey.split("/");
    if (!controllers[controller]) {
      controllers[controller] = [];
    }
    controllers[controller].push({ apiKey, apiName, api });
  });

  let code = `/**
 * @author pontx-generator
 * @description API 类型定义
 */

import type * as schemas from './schemas';

`;

  // 生成每个 controller 的参数类型和方法类型
  Object.entries(controllers).forEach(([controller, apis]) => {
    code += `// ============ ${controller} 模块 ============\n\n`;

    // 1. 生成参数类型 namespace
    const paramsTypes: string[] = [];
    const bodyTypes: string[] = [];

    apis.forEach(({ apiName, api }) => {
      const capitalizedApiName =
        apiName.charAt(0).toUpperCase() + apiName.slice(1);
      // const capitalizedController =
      //   controller.charAt(0).toUpperCase() + controller.slice(1);
      const paramsTypeName = `${capitalizedApiName}Params`;
      const bodyTypeName = `${capitalizedApiName}Body`;

      const paramsType = generateParamsType(api, paramsTypeName);
      if (paramsType) {
        paramsTypes.push(paramsType);
      }

      const bodyType = generateBodyType(api, bodyTypeName);
      if (bodyType) {
        bodyTypes.push(bodyType);
      }
    });

    if (paramsTypes.length > 0 || bodyTypes.length > 0) {
      code += `export declare namespace ${controller} {\n`;
      paramsTypes.forEach((pt) => {
        code += indentation(2)(pt) + "\n\n";
      });
      bodyTypes.forEach((bt) => {
        code += indentation(2)(bt) + "\n\n";
      });
      code += `}\n\n`;
    }

    // 2. 生成 controller 类型
    code += `export type ${controller} = {\n`;

    apis.forEach(({ apiName, api }) => {
      const { methodCode } = generateApiMethodType(api, apiName, controller);
      code += methodCode;
    });

    code += `};\n\n`;
  });

  // 生成 APIs 集合类型
  code += `// ============ API 集合类型 ============\n\n`;
  code += `/**\n * API 类型定义\n */\n`;
  code += `export type APIs = {\n`;

  Object.keys(controllers).forEach((controller) => {
    code += `  /** ${controller} 模块 */\n`;
    code += `  ${controller}: ${controller};\n`;
  });

  code += `};\n\n`;

  // 生成 APIs namespace 导出
  code += `export declare namespace APIs {\n`;
  Object.keys(controllers).forEach((controller) => {
    code += `  export { ${controller} };\n`;
  });
  code += `}\n`;

  return code;
}
