/**
 * @author jasonHzq
 * @description 列举所有 specs 的命令
 */

import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";
import { PontxSpec } from "@pontx/spec";

/**
 * 列举 specs 的选项
 */
export interface ListSpecsOptions {
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
 * 列举所有 specs
 */
export async function listSpecsCommand(
  managerOrContext: PontxManager | CliContext,
  options: ListSpecsOptions = {}
): Promise<void> {
  const manager =
    "getManager" in managerOrContext
      ? await managerOrContext.getManager()
      : managerOrContext;

  const origins = manager.resolvedConfig.origins;

  if (!origins || origins.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ type: "specs", items: [] }, null, 2));
    } else {
      console.log("No specs available");
    }
    return;
  }

  if (options.json) {
    const items = origins.map((origin) => {
      const spec = options.useRemote ? origin.remoteSpec : origin.spec;
      if (!spec) {
        return null;
      }

      const tagGroups = PontxSpec.getTagGroups(spec);
      const apiCount = Object.keys(spec.apis || {}).length;
      const schemaCount = Object.keys(spec.components?.schemas || {}).length;

      return {
        name: origin.name,
        description: spec.info?.title || spec.info?.description || "",
        tagCount: tagGroups.length,
        apiCount,
        schemaCount,
      };
    }).filter(Boolean);

    console.log(JSON.stringify({ type: "specs", items }, null, 2));
  } else {
    origins.forEach((origin) => {
      const spec = options.useRemote ? origin.remoteSpec : origin.spec;
      if (!spec) {
        return;
      }

      const description = spec.info?.title || spec.info?.description;
      console.log(formatItem(origin.name, description));
    });
  }
}
