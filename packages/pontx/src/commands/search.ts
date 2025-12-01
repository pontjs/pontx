import Fuse from "fuse.js";
import type { PontxManager } from "../manager";

export function buildFuse(pontxManager: PontxManager, useRemote?: boolean) {
  const origins = pontxManager?.resolvedConfig?.origins || [];
  const storages = [];
  const storageKeys = new Set<string>();

  origins.forEach((origin) => {
    if (!origin) {
      return;
    }

    const spec = useRemote ? origin.remoteSpec : origin.spec;
    if (!spec) {
      return;
    }

    Object.keys(spec.apis || {}).forEach((apiKey) => {
      const api = spec.apis[apiKey];
      let tagName = "";
      let pureApiName = apiKey;

      if (apiKey?.includes("/")) {
        tagName = apiKey.split("/")[0];
        pureApiName = apiKey.split("/")[1];
      }

      const storageValue = {
        name: pureApiName,
        tagName,
        specName: spec.name,
        title: api.title || "",
        description: api.description || "",
        summary: api.summary || "",
        consumes: api.consumes || [],
        produces: api.produces || [],
        method: api.method || "",
        path: api.path || "",
        params: (api.parameters || [])
          .map((param) => {
            return `${param.name} (${param.in}) ${param.schema?.type || ""} ${
              param.schema?.description || param.schema?.title || ""
            }`;
          })
          .join("\n"),
      };
      const keys = Object.keys(storageValue);
      keys.forEach((key) => {
        storageKeys.add(key);
      });

      storages.push(storageValue);
    });
  });

  const weightedKeys = [
    {
      name: "name",
      weight: 3,
    },
  ];

  const otherKeys = Array.from(storageKeys).filter(
    (key) => !weightedKeys.some((item) => item.name === key)
  );

  return new Fuse(storages, {
    keys: [...weightedKeys, ...otherKeys] as any,
    shouldSort: true,
    includeScore: true,
    includeMatches: true,
    ignoreLocation: true,
    threshold: 0.7,
    location: 10,
    distance: 1000,
  });
}

export function searchApis(
  keyword: string,
  fuse: Fuse<any>,
  maxCount: number = 6
) {
  return fuse
    .search(keyword)
    .slice(0, maxCount || 6)
    .map((item) => {
      return {
        tagName: item?.item?.tagName,
        specName: item?.item?.specName,
        apiName: item?.item?.name,
        method: item?.item?.method,
        path: item?.item?.path,
        title: item?.item?.title,
      };
    });
}

/**
 * Search command: search APIs by keyword
 */
export async function searchCommand(
  manager: PontxManager,
  keyword: string,
  options: { max?: number; useRemote?: boolean }
) {
  const fuse = buildFuse(manager, options.useRemote);
  const results = searchApis(keyword, fuse, options.max || 6);

  if (results.length === 0) {
    console.log(`No APIs found for keyword: "${keyword}"`);
    return;
  }

  console.log(`Found ${results.length} API(s):\n`);

  results.forEach((result, index) => {
    const apiPath = result.tagName
      ? `${result.specName}/${result.tagName}/${result.apiName}`
      : `${result.specName}/${result.apiName}`;

    console.log(`${index + 1}. ${apiPath}`);
    console.log(`   ${result.method?.toUpperCase() || "GET"} ${result.path}`);
    if (result.title) {
      console.log(`   ${result.title}`);
    }
    console.log();
  });
}
