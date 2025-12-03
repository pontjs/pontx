import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";
import { resolveManagerForSpec } from "../global";

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

export function parseSchemaPath(schemaPath: string): {
  specName: string;
  schemaName: string;
} {
  const parts = schemaPath.split("/");
  if (parts.length === 2) {
    return {
      specName: parts[0],
      schemaName: parts[1],
    };
  } else {
    throw new Error(
      `Invalid schema path format: ${schemaPath}. Expected: specName/schemaName`
    );
  }
}

/**
 * Show Schema command: display schema metadata
 */
export async function showSchemaCommand(
  managerOrContext: PontxManager | CliContext,
  schemaPath: string,
  options: { useRemote?: boolean; global?: boolean } = {}
) {
  const { specName, schemaName } = parseSchemaPath(schemaPath);

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

  const schema = getSchemaMeta(manager, specName, schemaName, options.useRemote);

  console.log(JSON.stringify(schema, null, 2));
}
