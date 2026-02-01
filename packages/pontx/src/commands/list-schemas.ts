/**
 * @author jasonHzq
 * @description 列举指定 spec 下所有 schemas 的命令
 */

import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";

/**
 * 列举 schemas 的选项
 */
export interface ListSchemasOptions {
  /** 使用远程元数据 */
  useRemote?: boolean;
  /** 以 JSON 格式输出 */
  json?: boolean;
}

/**
 * 格式化单个条目
 */
function formatItem(name: string, description?: string): string {
  return description ? `${name} - ${description}` : name;
}

/**
 * 列举指定 spec 下的所有 schemas
 */
export async function listSchemasCommand(
  managerOrContext: PontxManager | CliContext,
  specName: string,
  options: ListSchemasOptions = {}
): Promise<void> {
  const manager =
    "getManager" in managerOrContext
      ? await managerOrContext.getManager()
      : managerOrContext;

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
