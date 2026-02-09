import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";

export function getSchemaMeta(
  pontxManager: PontxManager,
  specName: string,
  schemaName: string,
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
  const schema = pontSpec.components?.schemas?.[schemaName];
  if (!schema) {
    throw new Error(`Schema not found: ${schemaName}`);
  }
  return schema;
}

/**
 * Parse dot-separated path with support for quoted segments
 * Examples:
 *   - "a.b" => ["a", "b"]
 *   - 'a."b.c"' => ["a", "b.c"]
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

  if (current) {
    parts.push(current);
  }

  if (inQuotes) {
    throw new Error(`Unclosed quote in schema path: ${path}`);
  }

  return parts;
}

/**
 * Parse schema path with support for both dot and slash separators
 * Supports quoted segments for special characters:
 *   - petstore.Pet
 *   - petstore."com.example.DTO"
 *   - petstore/Pet (legacy format)
 *
 * When only one spec exists, specName can be omitted:
 *   - Pet (when singleSpecName is provided)
 *
 * @param schemaPath - Schema path string
 * @param singleSpecName - The spec name when there's only one spec (for auto-completion)
 */
export function parseSchemaPath(
  schemaPath: string,
  singleSpecName?: string
): {
  specName: string;
  schemaName: string;
} {
  // Try dot-separated format first (new format)
  if (schemaPath.includes(".") || schemaPath.includes('"')) {
    const parts = parseDotSeparatedPath(schemaPath);

    if (parts.length === 2) {
      return {
        specName: parts[0],
        schemaName: parts[1],
      };
    } else if (parts.length === 1) {
      if (singleSpecName) {
        return {
          specName: singleSpecName,
          schemaName: parts[0],
        };
      } else {
        throw new Error(
          `Invalid schema path format: ${schemaPath}. Expected: specName.schemaName`
        );
      }
    } else {
      throw new Error(
        `Invalid schema path format: ${schemaPath}. Expected: specName.schemaName，特殊字符用引号包裹`
      );
    }
  }

  // Fallback to slash-separated format (legacy format)
  const parts = schemaPath.split("/");
  if (parts.length === 2) {
    return {
      specName: parts[0],
      schemaName: parts[1],
    };
  } else if (parts.length === 1) {
    // Single segment: only valid in single-spec mode
    if (singleSpecName) {
      return {
        specName: singleSpecName,
        schemaName: parts[0],
      };
    } else {
      throw new Error(
        `Invalid schema path format: ${schemaPath}. Expected: specName.schemaName`
      );
    }
  } else {
    throw new Error(
      `Invalid schema path format: ${schemaPath}. Expected: specName.schemaName，特殊字符用引号包裹`
    );
  }
}

/**
 * Show Schema command: display schema metadata
 */
export async function showSchemaCommand(
  managerOrContext: PontxManager | CliContext,
  schemaPath: string,
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
  const singleSpecName = origins.length === 1 ? origins[0].name : undefined;

  const { specName, schemaName } = parseSchemaPath(schemaPath, singleSpecName);

  const schema = getSchemaMeta(manager, specName, schemaName, options.useRemote);

  console.log(JSON.stringify(schema, null, 2));
}
