import { PontxSpec, PontxAPI } from "@pontx/spec";
import type { CheckResult, PluginHookOptions } from "../type";

/**
 * Built-in check implementation
 * Validates compatibility between local and remote metadata
 *
 * Checks performed:
 * 1. Breaking changes: If an API with the same method+path has a different apiKey (name) in remote
 * 2. Deleted APIs: Local APIs that no longer exist in remote metadata
 */
export async function builtinCheck(
  localSpec: PontxSpec | null,
  remoteSpec: PontxSpec,
  options: PluginHookOptions
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // If no local spec exists, skip checks
  if (!localSpec) {
    return results;
  }

  // 1. Check for breaking changes: apiKey (API name) changed for same method+path
  results.push(...checkBreakingChanges(localSpec, remoteSpec));

  // 2. Check for deleted APIs
  results.push(...checkDeletedApis(localSpec, remoteSpec));

  return results;
}

/**
 * Check for breaking changes: same method+path API with different apiKey (name)
 * In Pontx metadata, the API name is the key of the apis object, not a separate operationId field
 */
function checkBreakingChanges(
  localSpec: PontxSpec,
  remoteSpec: PontxSpec
): CheckResult[] {
  const results: CheckResult[] = [];

  // Build remote API index by method+path
  const remoteApiIndex = buildApiIndex(remoteSpec);

  // Iterate through local APIs
  for (const [localApiKey, localApi] of Object.entries(localSpec.apis || {})) {
    const { method, path } = localApi;
    const key = `${method}:${path}`;
    const remoteApiInfo = remoteApiIndex.get(key);

    // If same method+path exists in remote, check if apiKey changed
    if (remoteApiInfo && localApiKey !== remoteApiInfo.apiKey) {
      const { tagName: localTag, apiName: localName } =
        parseApiKey(localApiKey);
      const { tagName: remoteTag, apiName: remoteName } = parseApiKey(
        remoteApiInfo.apiKey
      );

      results.push({
        level: "error",
        type: "breaking-change",
        message: `API name changed: "${localApiKey}" → "${remoteApiInfo.apiKey}"`,
        api: {
          tagName: localTag,
          apiName: localName,
          method,
          path,
        },
        details: {
          oldApiKey: localApiKey,
          newApiKey: remoteApiInfo.apiKey,
          oldTag: localTag,
          newTag: remoteTag,
          oldApiName: localName,
          newApiName: remoteName,
        },
      });
    }
  }

  return results;
}

/**
 * Check for deleted APIs
 */
function checkDeletedApis(
  localSpec: PontxSpec,
  remoteSpec: PontxSpec
): CheckResult[] {
  const results: CheckResult[] = [];

  // Build remote API index by method+path
  const remoteApiIndex = buildApiIndex(remoteSpec);

  // Iterate through local APIs and check if they exist in remote
  for (const [apiKey, localApi] of Object.entries(localSpec.apis || {})) {
    const { method, path } = localApi;
    const key = `${method}:${path}`;

    if (!remoteApiIndex.has(key)) {
      const { tagName, apiName } = parseApiKey(apiKey);

      results.push({
        level: "warning",
        type: "api-deleted",
        message: `API has been deleted from remote`,
        api: {
          tagName,
          apiName,
          method,
          path,
        },
      });
    }
  }

  return results;
}

/**
 * Build API index: method+path → { tagName, apiName, apiKey }
 */
function buildApiIndex(
  spec: PontxSpec
): Map<string, { tagName: string; apiName: string; apiKey: string }> {
  const index = new Map();

  for (const [apiKey, api] of Object.entries(spec.apis || {})) {
    const { method, path } = api;
    const key = `${method}:${path}`;
    const { tagName, apiName } = parseApiKey(apiKey);

    index.set(key, { tagName, apiName, apiKey });
  }

  return index;
}

/**
 * Parse apiKey into tagName and apiName
 * Examples:
 * - "getUserById" → { tagName: "", apiName: "getUserById" }
 * - "user.getUserById" → { tagName: "user", apiName: "getUserById" }
 * - "user.service.getUserById" → { tagName: "user", apiName: "service.getUserById" }
 */
export function parseApiKey(apiKey: string): {
  tagName: string;
  apiName: string;
} {
  const dotIndex = apiKey.indexOf(".");
  if (dotIndex === -1) {
    return { tagName: "", apiName: apiKey };
  }
  return {
    tagName: apiKey.substring(0, dotIndex),
    apiName: apiKey.substring(dotIndex + 1),
  };
}
