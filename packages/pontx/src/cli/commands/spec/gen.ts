/**
 * @author jasonHzq
 * @description Spec 作用域命令：生成 API 调用示例代码
 */

import type { PontxManager } from "../../../manager";
import type { CliContext } from "../../context";
import { PontxManager as PM } from "../../../manager";
import { generateApiRequestCode, generateApiUseRequestCode, generateApiCliCommandCode } from "../../../generate";
import { getApiMeta } from "./show-api";

export async function makeCode(
  pontxManager: PontxManager,
  options: {
    case: string;
    specName: string;
    tagName: string;
    apiName: string;
    requestParams: any;
    bodyParams: any;
  }
) {
  const { specName, tagName, apiName, requestParams, bodyParams } = options;

  const samples = await PM.listSamples(pontxManager);
  const sample = samples.find((sample) => sample.case === options.case);

  if (!sample) {
    switch (options.case) {
      case "request": {
        return generateApiRequestCode(
          specName,
          tagName,
          apiName,
          requestParams,
          bodyParams
        );
      }
      case "reactHooks": {
        return generateApiUseRequestCode(
          specName,
          tagName,
          apiName,
          requestParams
        );
      }
      case "cliCommand": {
        return generateApiCliCommandCode(
          specName,
          tagName,
          apiName,
          requestParams,
          bodyParams
        );
      }
      default: {
        throw new Error(`Template case not found: ${options.case}`);
      }
    }
  }

  return await sample.generateSample(
    {
      specName,
      tagName,
      apiName,
    },
    {
      requestParams,
      bodyParams,
    }
  );
}

/**
 * Gen command: generate API request code
 */
export async function genCommand(
  ctx: CliContext,
  specName: string,
  tagName: string,
  apiName: string,
  options: {
    case?: string;
    params?: string;
    body?: string;
    useRemote?: boolean;
  }
) {
  const manager = await ctx.getManager();

  /* 验证 API 存在 */
  getApiMeta(manager, specName, tagName, apiName, options.useRemote);

  let requestParams = {};
  let bodyParams = {};

  if (options.params) {
    try {
      requestParams = JSON.parse(options.params);
    } catch (e) {
      throw new Error(`Invalid params JSON: ${options.params}`);
    }
  }

  if (options.body) {
    try {
      bodyParams = JSON.parse(options.body);
    } catch (e) {
      throw new Error(`Invalid body JSON: ${options.body}`);
    }
  }

  const code = await makeCode(manager, {
    case: options.case || "request",
    specName,
    tagName,
    apiName,
    requestParams,
    bodyParams,
  });

  console.log(code);
}
