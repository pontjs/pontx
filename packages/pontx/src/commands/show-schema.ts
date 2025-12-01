import type { PontxManager } from "../manager";

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
  manager: PontxManager,
  schemaPath: string,
  options: { useRemote?: boolean } = {}
) {
  const { specName, schemaName } = parseSchemaPath(schemaPath);
  const schema = getSchemaMeta(manager, specName, schemaName, options.useRemote);

  console.log(JSON.stringify(schema, null, 2));
}
