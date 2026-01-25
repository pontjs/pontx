import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";

/**
 * Check if a spec has tags (i.e., any API keys contain "/")
 */
export function specHasTags(pontSpec: any): boolean {
  if (!pontSpec?.apis) return false;
  return Object.keys(pontSpec.apis).some((key) => key.includes("/"));
}

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
 *
 * When only one spec exists, specName can be omitted:
 *   - pet.getPetById (when singleSpecName is provided and hasTags is true)
 *   - getPetById (when singleSpecName is provided and hasTags is false)
 *
 * @param apiPath - API path string
 * @param singleSpecName - The spec name when there's only one spec (for auto-completion)
 * @param hasTags - Whether the single spec has tags (used to resolve ambiguity)
 */
export function parseApiPath(
  apiPath: string,
  singleSpecName?: string,
  hasTags?: boolean
): {
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
      // Ambiguous case: could be specName.apiName or tagName.apiName
      if (singleSpecName) {
        // Single spec mode: determine based on hasTags
        if (hasTags) {
          // Has tags: treat as tagName.apiName
          return {
            specName: singleSpecName,
            tagName: parts[0],
            apiName: parts[1],
          };
        } else {
          // No tags: treat as specName.apiName (for backward compatibility)
          return {
            specName: parts[0],
            tagName: "",
            apiName: parts[1],
          };
        }
      } else {
        // Multi-spec mode: treat as specName.apiName (no tag)
        return {
          specName: parts[0],
          tagName: "",
          apiName: parts[1],
        };
      }
    } else if (parts.length === 1) {
      // Single segment: only valid in single-spec mode without tags
      if (singleSpecName && !hasTags) {
        return {
          specName: singleSpecName,
          tagName: "",
          apiName: parts[0],
        };
      } else {
        throw new Error(
          singleSpecName
            ? `Invalid API path format: ${apiPath}. Expected: tagName.apiName (spec has tags)`
            : `Invalid API path format: ${apiPath}. Expected: specName.tagName.apiName or specName.apiName`
        );
      }
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
    // Ambiguous case: could be specName/apiName or tagName/apiName
    if (singleSpecName) {
      // Single spec mode: determine based on hasTags
      if (hasTags) {
        // Has tags: treat as tagName/apiName
        return {
          specName: singleSpecName,
          tagName: parts[0],
          apiName: parts[1],
        };
      } else {
        // No tags: treat as specName/apiName (for backward compatibility)
        return {
          specName: parts[0],
          tagName: "",
          apiName: parts[1],
        };
      }
    } else {
      // Multi-spec mode: treat as specName/apiName (no tag)
      return {
        specName: parts[0],
        tagName: "",
        apiName: parts[1],
      };
    }
  } else if (parts.length === 1) {
    // Single segment: only valid in single-spec mode without tags
    if (singleSpecName && !hasTags) {
      return {
        specName: singleSpecName,
        tagName: "",
        apiName: parts[0],
      };
    } else {
      throw new Error(
        singleSpecName
          ? `Invalid API path format: ${apiPath}. Expected: tagName/apiName (spec has tags)`
          : `Invalid API path format: ${apiPath}. Expected: specName/tagName/apiName or specName/apiName`
      );
    }
  } else {
    throw new Error(
      `Invalid API path format: ${apiPath}. Expected: specName/tagName/apiName or specName.tagName.apiName`
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
  options: { useRemote?: boolean } = {}
) {
  // Determine if called from CLI or directly
  const isCliContext = "tryGetLocalManager" in managerOrContext;

  let manager: PontxManager;

  if (isCliContext) {
    // CLI call: use local manager
    manager = await managerOrContext.getManager();
  } else {
    // Direct call: maintain backward compatibility
    manager = managerOrContext;
  }

  // Determine single spec mode
  const origins = manager.resolvedConfig.origins;
  let singleSpecName: string | undefined;
  let hasTags: boolean | undefined;

  if (origins.length === 1) {
    singleSpecName = origins[0].name;
    const pontSpec = options.useRemote
      ? origins[0].remoteSpec
      : origins[0].spec;
    hasTags = specHasTags(pontSpec);
  }

  const { specName, tagName, apiName } = parseApiPath(
    apiPath,
    singleSpecName,
    hasTags
  );

  const apiMeta = getApiMeta(
    manager,
    specName,
    tagName,
    apiName,
    options.useRemote
  );

  console.log(JSON.stringify(apiMeta, null, 2));
}
