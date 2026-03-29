/**
 * @author jasonHzq
 * @description Spec 作用域命令：列举 APIs
 */

import type { CliContext } from "../../context";
import { PontxSpec } from "@pontx/spec";

export interface ListApisOptions {
  useRemote?: boolean;
  json?: boolean;
  tag?: string;
}

function formatItem(name: string, description?: string): string {
  return description ? `${name} - ${description}` : name;
}

/**
 * 列举指定 spec 下的 APIs
 */
export async function listApisCommand(
  ctx: CliContext,
  specName: string,
  tagName?: string,
  options: ListApisOptions = {}
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

  let apiKeys: string[] = [];

  if (tagName) {
    const tagGroups = PontxSpec.getTagGroups(spec);
    const tagExists = tagGroups.some((tg) => tg.name === tagName);

    if (!tagExists) {
      throw new Error(`Tag not found: ${tagName}`);
    }

    apiKeys = PontxSpec.getApisInNamespace(spec, tagName);
  } else {
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
