/**
 * @author pontx-generator
 * @description 生成 apis.ts 文件
 */

import type { PontxSpec, PontxAPI } from '@pontx/spec';

/**
 * 转换 schema 类型到 TypeScript 类型
 */
function schemaToTsType(schema: any, useSchemaPrefix = true): string {
  if (!schema) return 'any';

  if (schema.$ref) {
    const typeName = schema.$ref.split('/').pop();
    return useSchemaPrefix ? `schemas.${typeName}` : typeName;
  }

  if (schema.type === 'array') {
    return `Array<${schemaToTsType(schema.items, useSchemaPrefix)}>`;
  }

  if (schema.type === 'object') {
    if (schema.properties) {
      const props = Object.entries(schema.properties)
        .map(([key, value]: [string, any]) => {
          const required = schema.required?.includes(key);
          const tsType = schemaToTsType(value, useSchemaPrefix);
          const optional = required ? '' : '?';
          const desc = value.description ? `/** ${value.description} */\n    ` : '';
          return `${desc}${key}${optional}: ${tsType};`;
        })
        .join('\n    ');
      return `{\n    ${props}\n  }`;
    }
    return 'Record<string, any>';
  }

  const typeMap: Record<string, string> = {
    integer: 'number',
    number: 'number',
    string: 'string',
    boolean: 'boolean',
    file: 'File',
  };

  if (schema.enum) {
    return schema.enum.map((v: any) => `'${v}'`).join(' | ');
  }

  return typeMap[schema.type] || 'any';
}

/**
 * 生成参数类型定义（查询参数 + 可合并的 body 参数）
 */
function generateParamsType(api: PontxAPI, typeName: string): string | null {
  const queryParams = api.parameters?.filter((p) => p.in === 'query') || [];
  const bodyParam = api.parameters?.find((p) => p.in === 'body');
  const contentType = api.consumes?.[0] || 'application/json';
  const canMerge = contentType === 'application/json' && bodyParam?.schema?.type === 'object';

  if (queryParams.length === 0 && !canMerge) {
    return null;
  }

  const params: string[] = [];

  if (queryParams.length > 0) {
    queryParams.forEach((param) => {
      const desc = param.schema?.description;
      const required = param.required;
      const tsType = schemaToTsType(param.schema);
      const optional = required ? '' : '?';
      const comment = desc ? `/** ${desc} */\n    ` : '';
      params.push(`${comment}${param.name}${optional}: ${tsType};`);
    });
  }

  if (canMerge && bodyParam?.schema?.properties) {
    Object.entries(bodyParam.schema.properties).forEach(([key, value]: [string, any]) => {
      const required = bodyParam.schema.required?.includes(key);
      const tsType = schemaToTsType(value);
      const optional = required ? '' : '?';
      const desc = value.description;
      const comment = desc ? `/** ${desc} */\n    ` : '';
      params.push(`${comment}${key}${optional}: ${tsType};`);
    });
  }

  return `export type ${typeName} = {\n    ${params.join('\n    ')}\n  };`;
}

/**
 * 生成 Body 类型定义（formData 或其他不可合并的 body）
 */
function generateBodyType(api: PontxAPI, typeName: string): string | null {
  const formDataParams = api.parameters?.filter((p) => p.in === 'formData') || [];

  if (formDataParams.length === 0) {
    return null;
  }

  const params: string[] = [];
  formDataParams.forEach((param) => {
    const desc = param.schema?.description;
    const required = param.required;
    const tsType = schemaToTsType(param.schema);
    const optional = required ? '' : '?';
    const comment = desc ? `/** ${desc} */\n    ` : '';
    params.push(`${comment}${param.name}${optional}: ${tsType};`);
  });

  return `export type ${typeName} = {\n    ${params.join('\n    ')}\n  };`;
}

/**
 * 生成单个 API 的类型定义
 */
function generateApiType(api: PontxAPI, apiName: string, controllerName: string): {
  typeCode: string;
  paramsType: string | null;
} {
  const pathParams = api.parameters?.filter((p) => p.in === 'path') || [];
  const queryParams = api.parameters?.filter((p) => p.in === 'query') || [];
  const bodyParam = api.parameters?.find((p) => p.in === 'body');
  const contentType = api.consumes?.[0] || 'application/json';
  const canMerge = contentType === 'application/json' && bodyParam?.schema?.type === 'object';

  const responseType = schemaToTsType(api.responses?.['200']?.schema);

  const capitalizedApiName = apiName.charAt(0).toUpperCase() + apiName.slice(1);
  const capitalizedController = controllerName.charAt(0).toUpperCase() + controllerName.slice(1);
  const paramsTypeName = `${capitalizedController}${capitalizedApiName}Params`;

  const paramLines: string[] = [];

  // Path 参数
  pathParams.forEach((param) => {
    const desc = param.schema?.description || `${param.name}`;
    const tsType = schemaToTsType(param.schema);
    paramLines.push(`/** ${desc} */`);
    paramLines.push(`${param.name}: ${tsType},`);
  });

  // Query + Body 合并 或 单独的 Query
  if (queryParams.length > 0 || canMerge) {
    paramLines.push(`params: ${paramsTypeName},`);
  }

  // 单独的 Body（不能合并的情况）
  if (bodyParam && !canMerge) {
    const bodyType = schemaToTsType(bodyParam.schema);
    const desc = bodyParam.schema?.description || 'Request body';
    paramLines.push(`/** ${desc} */`);
    paramLines.push(`body: ${bodyType},`);
  }

  // RequestInit (最后一个参数，不加逗号)
  paramLines.push('requestInit?: RequestInit');

  const paramsCode = paramLines.map((p) => `    ${p}`).join('\n');

  const summary = api.summary || api.title || '';
  const description = api.description || '';

  let comment = '/**\n';
  if (summary) comment += `   * ${summary}\n   *\n`;
  if (description && description !== summary) {
    comment += `   * ${description}\n   *\n`;
  }
  comment += `   * @example\n`;
  comment += `   * \`\`\`ts\n`;
  comment += `   * // TODO: Add example\n`;
  comment += `   * \`\`\`\n`;
  comment += `   */`;

  const typeCode = `${comment}\n  export type ${apiName} = (\n${paramsCode}\n  ) => Promise<${responseType}>;`;

  const paramsType = generateParamsType(api, paramsTypeName);

  return { typeCode, paramsType };
}

/**
 * 生成 APIs 类型的 JSDoc
 */
function generateAPIsTypeJSDoc(api: PontxAPI): string {
  const summary = api.summary || api.title || '';
  const description = api.description || '';

  let comment = '/**\n';
  if (summary) comment += `     * ${summary}\n     *\n`;
  if (description && description !== summary) {
    comment += `     * ${description}\n     *\n`;
  }
  comment += `     * @example\n`;
  comment += `     * \`\`\`ts\n`;
  comment += `     * // TODO: Add example\n`;
  comment += `     * \`\`\`\n`;
  comment += `     */`;

  return comment;
}

/**
 * 生成方法类型代码（用于 export type controller = { ... } 中）
 */
function generateApiMethodType(api: PontxAPI, apiName: string, controllerName: string): {
  methodCode: string;
} {
  const pathParams = api.parameters?.filter((p) => p.in === 'path') || [];
  const queryParams = api.parameters?.filter((p) => p.in === 'query') || [];
  const bodyParam = api.parameters?.find((p) => p.in === 'body');
  const formDataParams = api.parameters?.filter((p) => p.in === 'formData') || [];
  const contentType = api.consumes?.[0] || 'application/json';
  const canMerge = contentType === 'application/json' && bodyParam?.schema?.type === 'object';

  const responseType = schemaToTsType(api.responses?.['200']?.schema);

  const capitalizedApiName = apiName.charAt(0).toUpperCase() + apiName.slice(1);
  const capitalizedController = controllerName.charAt(0).toUpperCase() + controllerName.slice(1);
  const paramsTypeName = `${capitalizedController}${capitalizedApiName}Params`;
  const bodyTypeName = `${capitalizedController}${capitalizedApiName}Body`;

  const paramLines: string[] = [];

  // Path 参数
  pathParams.forEach((param) => {
    const desc = param.schema?.description || `${param.name}`;
    const tsType = schemaToTsType(param.schema);
    paramLines.push(`/** ${desc} */`);
    paramLines.push(`${param.name}: ${tsType},`);
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
    const bodyType = schemaToTsType(bodyParam.schema);
    const desc = bodyParam.schema?.description || 'Request body';
    paramLines.push(`/** ${desc} */`);
    paramLines.push(`body: ${bodyType},`);
  }

  // RequestInit (最后一个参数，不加逗号)
  paramLines.push('requestInit?: RequestInit,');

  const paramsCode = paramLines.map((p) => `    ${p}`).join('\n');

  const summary = api.summary || api.title || '';
  const description = api.description || '';

  let comment = '  /**\n';
  if (summary) comment += `   * ${summary}\n   *\n`;
  if (description && description !== summary) {
    comment += `   * ${description}\n   *\n`;
  }
  comment += `   * @example\n`;
  comment += `   * \`\`\`ts\n`;
  comment += `   * // TODO: Add example\n`;
  comment += `   * \`\`\`\n`;
  comment += `   */`;

  const methodCode = `${comment}\n  ${apiName}: (\n${paramsCode}\n  ) => Promise<${responseType}>;\n\n`;

  return { methodCode };
}

/**
 * 生成 apis.ts 内容
 */
export function generateApis(spec: PontxSpec): string {
  const controllers: Record<string, any[]> = {};

  // 按 controller 分组
  Object.entries(spec.apis || {}).forEach(([apiKey, api]) => {
    const [controller, apiName] = apiKey.split('/');
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
      const capitalizedApiName = apiName.charAt(0).toUpperCase() + apiName.slice(1);
      const capitalizedController = controller.charAt(0).toUpperCase() + controller.slice(1);
      const paramsTypeName = `${capitalizedController}${capitalizedApiName}Params`;
      const bodyTypeName = `${capitalizedController}${capitalizedApiName}Body`;

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
      paramsTypes.forEach(pt => {
        code += `  ${pt}\n\n`;
      });
      bodyTypes.forEach(bt => {
        code += `  ${bt}\n\n`;
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
