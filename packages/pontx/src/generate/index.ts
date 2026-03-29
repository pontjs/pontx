import { clearPath } from "../utils";
import * as path from "path";
import { promises as fsp } from "fs";
import { PontxAPI, PontxSpec } from "@pontx/spec";
import _ from "lodash";

export type FileStructure = {
  [fileName: string]: string | FileStructure;
};

export async function generateFiles(
  fileStructure: FileStructure,
  basePath: string
) {
  const promises = _.map(fileStructure, async (value: string | {}, name) => {
    const currPath = path.join(basePath, name);

    if (typeof value === "string") {
      return fsp.writeFile(currPath, value, "utf8");
    } else {
      await fsp.mkdir(currPath);

      return generateFiles(value, currPath);
    }
  });

  return Promise.all(promises);
}

export async function reGenerateFiles(
  fileStructure: FileStructure,
  basePath: string
) {
  await clearPath(basePath);
  await fsp.mkdir(basePath, { recursive: true });
  await generateFiles(fileStructure, basePath);
}

export async function generateRemoteCache(
  remoteCacheDir: string,
  specs: PontxSpec[]
) {
  if (specs?.length && specs.some((spec) => spec?.name)) {
    const fileStructure = {};
    specs.forEach((spec) => {
      if (spec?.name) {
        fileStructure[spec.name + ".json"] = JSON.stringify(spec, null, 2);
      }
    });

    return generateFiles(fileStructure, remoteCacheDir);
  }
}

/**
 * 生成 API 请求代码
 * @param api
 * @returns
 * try {
 *   const response = await pontx.api.request(api, params, bodyParams);
 * } catch (error) {
 * }
 */
export function generateApiRequestCode(
  originName: string,
  controllerName: string,
  apiName: string,
  params: Record<string, any>,
  bodyParams: Record<string, any>
) {
  const paramsCode = Object.entries(params)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(",\n    ");
  const bodyParamsCode = Object.entries(bodyParams)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(",\n      ");
  const bodyCode = bodyParamsCode
    ? `, {
    body: {
      ${bodyParamsCode}
    }
  }`
    : "";

  return `try {
  const response = await pontxClient.${originName}.${controllerName}.${apiName}.request({
    ${paramsCode}
  }${bodyCode});
} catch (error) {
}`;
}

/**
 * 生成 CLI 调用命令
 * @returns
 * pontx call specName.tagName.apiName --param1 value1 --body '{"key": "value"}'
 */
export function generateApiCliCommandCode(
  originName: string,
  controllerName: string,
  apiName: string,
  params: Record<string, any>,
  bodyParams: Record<string, any>
) {
  const apiPath = `${originName}.${controllerName}.${apiName}`;

  const paramParts = Object.entries(params).map(
    ([key, value]) => `--${key} ${typeof value === "string" ? value : JSON.stringify(value)}`
  );

  if (Object.keys(bodyParams).length > 0) {
    paramParts.push(`--body '${JSON.stringify(bodyParams)}'`);
  }

  const argsStr = paramParts.length > 0 ? " " + paramParts.join(" ") : "";

  return `pontx call ${apiPath}${argsStr}`;
}

export function generateApiUseRequestCode(
  originName: string,
  controllerName: string,
  apiName: string,
  params: Record<string, any>
) {
  const paramsCode = Object.entries(params)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(",\n    ");

  return `const { data, loading, error } = useQuery(pontxClient.${originName}.${controllerName}.${apiName}.queryOptions({
  ${paramsCode}
});`;
}
