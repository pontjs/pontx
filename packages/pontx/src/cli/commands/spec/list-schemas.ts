/**
 * @author jasonHzq
 * @description Spec 作用域命令：列举 schemas
 */

import type { CliContext } from "../../context";

export interface ListSchemasOptions {
  useRemote?: boolean;
  json?: boolean;
}

function formatItem(name: string, description?: string): string {
  return description ? `${name} - ${description}` : name;
}

/**
 * 列举指定 spec 下的所有 schemas
 */
export async function listSchemasCommand(
  ctx: CliContext,
  specName: string,
  options: ListSchemasOptions = {}
): Promise<void> {
  const manager = await ctx.getManager();

  const origin = manager.resolvedConfig.origins.find(
    (o) => o.name === specName
  );

  if (!origin) {
    throw new Error(`Spec not found: ${specName}`);
  }

  const spec = options.useRemote ? origin.remoteSpec : origin.spec;

  if (!spec) {
    throw new Error(`Spec not found: ${specName}`);
  }

  const schemas = spec.components?.schemas || {};
  const schemaNames = Object.keys(schemas);

  if (schemaNames.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ type: "schemas", items: [] }, null, 2));
    } else {
      console.log(`No schemas in spec: ${specName}`);
    }
    return;
  }

  if (options.json) {
    const items = schemaNames.map((schemaName) => {
      const schema = schemas[schemaName];
      const description = schema.title || schema.description || "";

      return {
        name: schemaName,
        description,
        type: schema.type,
      };
    });

    console.log(
      JSON.stringify({ type: "schemas", specName, items }, null, 2)
    );
  } else {
    schemaNames.forEach((schemaName) => {
      const schema = schemas[schemaName];
      const description = schema.title || schema.description;
      console.log(formatItem(schemaName, description));
    });
  }
}
