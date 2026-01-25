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
 * Parse schema path with support for single-spec mode
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
        `Invalid schema path format: ${schemaPath}. Expected: specName/schemaName`
      );
    }
  } else {
    throw new Error(
      `Invalid schema path format: ${schemaPath}. Expected: specName/schemaName or schemaName (single-spec mode)`
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
