import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";
import { PontxManager as PM } from "../manager";
import { generateApiRequestCode, generateApiUseRequestCode } from "../generate";
import { parseApiPath, getApiMeta } from "./show-api";
import { resolveManagerForSpec } from "../global";

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
  managerOrContext: PontxManager | CliContext,
  apiPath: string,
  options: {
    case?: string;
    params?: string;
    body?: string;
    useRemote?: boolean;
    global?: boolean;
  }
) {
  const { specName, tagName, apiName } = parseApiPath(apiPath);

  // Determine if called from CLI or directly
  const isCliContext = "tryGetLocalManager" in managerOrContext;

  let manager: PontxManager;

  if (isCliContext) {
    // CLI call: support auto-discovery
    const resolved = await resolveManagerForSpec(specName, managerOrContext, {
      forceGlobal: options.global,
    });
    manager = resolved.manager;
  } else {
    // Direct call: maintain backward compatibility
    manager = managerOrContext;
  }

  // Validate API exists
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
