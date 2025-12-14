/**
 * @author pontx-generator
 * @description 生成 apiMeta.ts 文件
 */

import { PontxSpec } from '@pontx/spec';

/**
 * 生成 apiMeta.ts 内容
 */
export function generateApiMeta(spec: PontxSpec): string {
  const specName = spec.info?.title || 'api';
  const baseUrl = spec.servers?.[0]?.url || '';

  const apisCode = Object.entries(spec.apis || {})
    .map(([apiKey, api]) => {
      const pathParams =
        api.parameters
          ?.filter((p) => p.in === 'path')
          .map((p) => `"${p.name}"`) || [];

      const queryParams =
        api.parameters
          ?.filter((p) => p.in === 'query')
          .map((p) => `"${p.name}"`) || [];

      const bodyParam = api.parameters?.find((p) => p.in === 'body');
      const hasBody =
        !!bodyParam ||
        ['POST', 'PUT', 'PATCH'].includes(api.method?.toUpperCase() || '');

      let bodyParamsCode = 'null';
      if (hasBody) {
        const contentType = api.consumes?.[0] || 'application/json';
        const canMerge =
          contentType === 'application/json' &&
          bodyParam?.schema?.type === 'object';

        bodyParamsCode = `{\n        contentType: "${contentType}",\n        canMerge: ${canMerge}`;

        if (canMerge && bodyParam?.schema?.properties) {
          const fields = Object.keys(bodyParam.schema.properties).map(
            (k) => `"${k}"`,
          );
          bodyParamsCode += `,\n        fields: [${fields.join(', ')}]`;
        }

        bodyParamsCode += '\n      }';
      }

      return `    "${apiKey}": {
      method: "${api.method?.toUpperCase() || 'GET'}",
      path: "${api.path}",
      pathParams: ${
        pathParams.length > 0 ? `[${pathParams.join(', ')}]` : 'null'
      },
      queryParams: ${
        queryParams.length > 0 ? `[${queryParams.join(', ')}]` : 'null'
      },
      bodyParams: ${bodyParamsCode}
    }`;
    })
    .join(',\n\n');

  return `export const apiMeta = {
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

export type ApiMeta = typeof apiMeta;
`;
}
