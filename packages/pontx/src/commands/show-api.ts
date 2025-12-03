import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";
import { resolveManagerForSpec } from "../global";

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

/**
 * Parse API path with support for both dot and slash separators
 * Supports quoted segments for special characters:
 *   - petstore.pet.getPetById
 *   - petstore.pet."get.pet.by.id"
 *   - petstore."my-tag"."api/name"
 *   - petstore/pet/getPetById (legacy format)
 */
export function parseApiPath(apiPath: string): {
  specName: string;
  tagName: string;
  apiName: string;
} {
  // Try dot-separated format first (new format)
  if (apiPath.includes(".") || apiPath.includes('"')) {
    const parts = parseDotSeparatedPath(apiPath);
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
        `Invalid API path format: ${apiPath}. Expected: specName.tagName.apiName or specName.tagName."apiName"`
      );
    }
  }

  // Fallback to slash-separated format (legacy format)
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
      `Invalid API path format: ${apiPath}. Expected: specName.tagName.apiName or specName/tagName/apiName`
    );
  }
}

/**
 * Parse dot-separated path with support for quoted segments
 * Examples:
 *   - "a.b.c" => ["a", "b", "c"]
 *   - 'a."b.c".d' => ["a", "b.c", "d"]
 *   - 'a."b/c"."d.e"' => ["a", "b/c", "d.e"]
 */
function parseDotSeparatedPath(path: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < path.length) {
    const char = path[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === "." && !inQuotes) {
      if (current) {
        parts.push(current);
        current = "";
      }
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Add the last segment
  if (current) {
    parts.push(current);
  }

  if (inQuotes) {
    throw new Error(`Unclosed quote in API path: ${path}`);
  }

  return parts;
}

/**
 * Show API command: display API metadata
 */
export async function showApiCommand(
  managerOrContext: PontxManager | CliContext,
  apiPath: string,
  options: { useRemote?: boolean; global?: boolean } = {}
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

  const apiMeta = getApiMeta(
    manager,
    specName,
    tagName,
    apiName,
    options.useRemote
  );

  console.log(JSON.stringify(apiMeta, null, 2));
}
