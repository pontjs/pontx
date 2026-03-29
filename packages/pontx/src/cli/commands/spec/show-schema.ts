/**
 * @author jasonHzq
 * @description Spec 作用域命令：查看 Schema 元数据
 */

import type { PontxManager } from "../../../manager";
import type { CliContext } from "../../context";

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
 * Show Schema command: display schema metadata
 */
export async function showSchemaCommand(
  ctx: CliContext,
  specName: string,
  schemaName: string,
  options: { useRemote?: boolean } = {}
) {
  const manager = await ctx.getManager();

  const schema = getSchemaMeta(manager, specName, schemaName, options.useRemote);

  console.log(JSON.stringify(schema, null, 2));
}
