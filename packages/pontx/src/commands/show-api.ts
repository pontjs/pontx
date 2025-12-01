import type { PontxManager } from "../manager";

export function getApiMeta(
  pontxManager: PontxManager,
  specName: string,
  tagName: string,
  apiName: string,
  useRemote?: boolean
): any {
  const origin = (pontxManager?.resolvedConfig?.origins || []).find(
    (origin) => {
      return origin.name === specName;
    }
  );
  const pontSpec = useRemote ? origin?.remoteSpec : origin?.spec;
  if (!pontSpec) {
    throw new Error(`Spec not found: ${specName}`);
  }
  const apiKey = tagName ? `${tagName}/${apiName}` : apiName;
  const apiMeta = pontSpec.apis[apiKey];
  if (!apiMeta) {
    throw new Error(`API not found: ${apiKey}`);
  }
  return apiMeta;
}

export function parseApiPath(apiPath: string): {
  specName: string;
  tagName: string;
  apiName: string;
} {
  const parts = apiPath.split("/");
  if (parts.length === 3) {
    return {
      specName: parts[0],
      tagName: parts[1],
      apiName: parts[2],
    };
  } else if (parts.length === 2) {
    return {
      specName: parts[0],
      tagName: "",
      apiName: parts[1],
    };
  } else {
    throw new Error(
      `Invalid API path format: ${apiPath}. Expected: specName/tagName/apiName or specName/apiName`
    );
  }
}

/**
 * Show API command: display API metadata
 */
export async function showApiCommand(
  manager: PontxManager,
  apiPath: string,
  options: { useRemote?: boolean } = {}
) {
  const { specName, tagName, apiName } = parseApiPath(apiPath);
  const apiMeta = getApiMeta(
    manager,
    specName,
    tagName,
    apiName,
    options.useRemote
  );

  console.log(JSON.stringify(apiMeta, null, 2));
}
