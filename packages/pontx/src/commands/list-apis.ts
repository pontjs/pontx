/**
 * @author jasonHzq
 * @description 列举指定 spec 下 APIs 的命令
 */

import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";
import { PontxSpec } from "@pontx/spec";

/**
 * 列举 APIs 的选项
 */
export interface ListApisOptions {
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
 * 列举指定 spec 下的 APIs
 * @param managerOrContext PontxManager 或 CliContext
 * @param specName spec 名称
 * @param tagName 可选的 tag 名称，如果指定则只列举该 tag 下的 APIs
 * @param options 选项
 */
export async function listApisCommand(
  managerOrContext: PontxManager | CliContext,
  specName: string,
  tagName?: string,
  options: ListApisOptions = {}
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

  let apiKeys: string[] = [];

  if (tagName) {
    // 列举指定 tag 下的 APIs
    const tagGroups = PontxSpec.getTagGroups(spec);
    const tagExists = tagGroups.some((tg) => tg.name === tagName);

    if (!tagExists) {
      throw new Error(`Tag not found: ${tagName}`);
    }

    apiKeys = PontxSpec.getApisInNamespace(spec, tagName);
  } else {
    // 列举所有 APIs
    apiKeys = Object.keys(spec.apis || {});
  }

  if (!apiKeys || apiKeys.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ type: "apis", items: [] }, null, 2));
    } else {
      const message = tagName
        ? `No APIs in tag: ${tagName}`
        : `No APIs in spec: ${specName}`;
      console.log(message);
    }
    return;
  }

  if (options.json) {
    const items = apiKeys.map((apiKey) => {
      const api = spec.apis?.[apiKey];
      if (!api) {
        return null;
      }

      const pureApiName = apiKey.includes("/") ? apiKey.split("/")[1] : apiKey;
      const description = api.title || api.summary || api.description || "";

      return {
        name: pureApiName,
        fullName: apiKey,
        description,
        method: api.method,
        path: api.path,
      };
    }).filter(Boolean);

    console.log(
      JSON.stringify(
        {
          type: "apis",
          specName,
          tagName: tagName || null,
          items,
        },
        null,
        2
      )
    );
  } else {
    apiKeys.forEach((apiKey) => {
      const api = spec.apis?.[apiKey];
      if (!api) {
        return;
      }

      const displayName = apiKey.includes("/") ? apiKey.replace("/", ".") : apiKey;
      const description = api.title || api.summary || api.description;
      console.log(formatItem(displayName, description));
    });
  }
}
