/**
 * @author jasonHzq
 * @description 列举指定 spec 下所有 tags 的命令
 */

import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";
import { PontxSpec } from "@pontx/spec";

/**
 * 列举 tags 的选项
 */
export interface ListTagsOptions {
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
 * 列举指定 spec 下的所有 tags
 */
export async function listTagsCommand(
  managerOrContext: PontxManager | CliContext,
  specName: string,
  options: ListTagsOptions = {}
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

  const tagGroups = PontxSpec.getTagGroups(spec);

  if (!tagGroups || tagGroups.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ type: "tags", items: [] }, null, 2));
    } else {
      console.log(`No tags in spec: ${specName}`);
    }
    return;
  }

  if (options.json) {
    const items = tagGroups.map((tagGroup) => {
      const apiKeys = PontxSpec.getApisInNamespace(spec, tagGroup.name);
      return {
        name: tagGroup.name,
        description: tagGroup.description || "",
        apiCount: apiKeys.length,
      };
    });

    console.log(JSON.stringify({ type: "tags", items }, null, 2));
  } else {
    tagGroups.forEach((tagGroup) => {
      console.log(formatItem(tagGroup.name, tagGroup.description));
    });
  }
}
