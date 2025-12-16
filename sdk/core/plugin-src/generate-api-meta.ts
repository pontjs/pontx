/**
 * @author pontx-generator
 * @description 生成 apiMeta.ts 文件
 */

import { PontxSpec } from "@pontx/spec";

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
 * 生成 apiMeta.ts 内容
 */
export function generateApiMeta(spec: PontxSpec): string {
  const specName = spec.info?.title || "api";
  const baseUrl = spec.servers?.[0]?.url || "";

  const apisCode = Object.entries(spec.apis || {})
    .map(([apiKey, api]) => {
      // 从 path 中提取参数顺序
      const pathParamsOrder = extractPathParamsOrder(api.path || "");

      // 按照 path 中的顺序排序参数
      const pathParams = pathParamsOrder.map((paramName) => `"${paramName}"`);

      const queryParams =
        api.parameters
          ?.filter((p) => p.in === "query")
          .map((p) => `"${p.name}"`) || [];

      const bodyParam = api.parameters?.find((p) => p.in === "body");
      const hasBody =
        !!bodyParam ||
        ["POST", "PUT", "PATCH"].includes(api.method?.toUpperCase() || "");

      let bodyParamsCode = "null";
      if (hasBody) {
        const contentType = api.consumes?.[0] || "application/json";
        const canMerge =
          contentType === "application/json" &&
          bodyParam?.schema?.type === "object";

        bodyParamsCode = `{\n        contentType: "${contentType}",\n        canMerge: ${canMerge}`;

        if (canMerge && bodyParam?.schema?.properties) {
          const fields = Object.keys(bodyParam.schema.properties).map(
            (k) => `"${k}"`
          );
          bodyParamsCode += `,\n        fields: [${fields.join(", ")}]`;
        }

        bodyParamsCode += "\n      }";
      }

      return `    "${apiKey}": {
      method: "${api.method?.toUpperCase() || "GET"}",
      path: "${api.path}",
      consumes: ${JSON.stringify(api.consumes || [])},
      produces: ${JSON.stringify(api.produces || [])},
      pathParams: ${
        pathParams.length > 0 ? `[${pathParams.join(", ")}]` : "null"
      },
      queryParams: ${
        queryParams.length > 0 ? `[${queryParams.join(", ")}]` : "null"
      },
      bodyParams: ${bodyParamsCode}
    }`;
    })
    .join(",\n\n");

  return `export const specMeta = {
  name: "${specName}",
  hasTags: ${PontxSpec.checkHasMods(spec)},
  url: [
    {
      url: "${baseUrl}"
    }
  ],
  apis: {
${apisCode}
  }
} as const;
`;
}
