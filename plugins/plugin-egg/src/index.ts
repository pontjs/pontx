import * as path from "path";
import type { Plugin } from "pontx";
import { map, upperFirst } from "lodash";
import {
  generateApiComment,
  generateApiRequestCode,
  generateParametersTsCode,
  generateSchemaCode,
  generateSchemas,
  PontxAPI,
  PontxSpec,
  indentation,
  generateTagComment,
} from "@pontx/spec";
import { reGenerateFiles } from "pontx";

/**
 * 生成单个 API 方法的 TypeScript 接口定义
 * @param api API 元数据
 * @returns TypeScript 方法定义字符串
 */
function generateApiMethod(api: PontxAPI, fullApiName: string) {
  const pureApiName = fullApiName?.includes("/")
    ? fullApiName.split("/").pop()
    : fullApiName;
  const bodySchema = api?.parameters?.find((p) => p.in === "body")?.schema;
  const params = indentation(2)(generateParametersTsCode(api, false)).slice(2);
  const bodyParams = generateSchemaCode(bodySchema, "schemas.");
  const response = generateSchemaCode(api.responses[200]?.schema, "schemas.");
  const apiComment = generateApiComment(api);

  if (bodyParams) {
    return indentation(2)(`
${apiComment}${pureApiName}(
  params: ${params},
  body: ${bodyParams}
): Promise<${response}>;`);
  }

  return indentation(2)(`
${apiComment}${pureApiName}(
  params: ${params}
): Promise<${response}>;`);
}

/**
 * 生成控制器接口定义
 * @param controllerName 控制器名称
 * @param apis API 列表
 * @returns TypeScript 接口定义字符串
 */
function generateControllerInterface(
  controllerName: string,
  apis: Record<string, PontxAPI>
) {
  const methods = map(apis, (api, fullApiName) =>
    generateApiMethod(api, fullApiName)
  ).join("\n");

  return `export interface ${controllerName}Controller {${methods}
}`;
}

/**
 * 生成所有控制器定义
 */
function generateControllers(spec: PontxSpec) {
  const tagGroups = PontxSpec.getTagGroups(spec);
  const prefix = `import type * as schemas from './schemas';\n\n`;

  if (!tagGroups.length) {
    return (
      prefix + generateControllerInterface(upperFirst(spec.name), spec.apis)
    );
  }

  return (
    prefix +
    tagGroups
      .map((tagGroup) => {
        const controllerName = upperFirst(tagGroup.name);
        const tagComment = generateTagComment(tagGroup);

        return (
          tagComment +
          generateControllerInterface(controllerName, tagGroup.apis)
        );
      })
      .join("\n\n")
  );
}

export function pontxEggPlugin() {
  return {
    name: "pontx-egg-plugin",
    generate: async (spec, options) => {
      const { resolvedConfig, originConfig } = options;
      const { outDir } = resolvedConfig;

      const fileStructure = {
        "schemas.ts": generateSchemas(originConfig.spec),
        "controllers.ts": generateControllers(originConfig.spec),
      };

      return fileStructure;
    },
  } as Plugin;
}
