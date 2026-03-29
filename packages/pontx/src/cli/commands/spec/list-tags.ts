/**
 * @author jasonHzq
 * @description Spec 作用域命令：列举 tags
 */

import type { CliContext } from "../../context";
import { PontxSpec } from "@pontx/spec";

export interface ListTagsOptions {
  useRemote?: boolean;
  json?: boolean;
}

function formatItem(name: string, description?: string): string {
  return description ? `${name} - ${description}` : name;
}

/**
 * 列举指定 spec 下的所有 tags
 */
export async function listTagsCommand(
  ctx: CliContext,
  specName: string,
  options: ListTagsOptions = {}
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
