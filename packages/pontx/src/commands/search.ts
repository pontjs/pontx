import Fuse from "fuse.js";
import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";
import { resolveManagerForSpec } from "../global";

/**
 * 如果名称包含特殊字符（如 .），则用引号括起来
 */
export function quoteIfNeeded(name: string): string {
  if (name.includes(".")) {
    return `"${name}"`;
  }
  return name;
}

export function buildFuse(
  pontxManager: PontxManager,
  useRemote?: boolean,
  filterSpecName?: string
) {
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

    // 如果指定了 specName，只处理匹配的 spec
    if (filterSpecName && spec.name !== filterSpecName) {
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
        summary: item?.item?.summary,
        description: item?.item?.description,
      };
    });
}

/**
 * Search command: search APIs by keyword
 */
export async function searchCommand(
  managerOrContext: PontxManager | CliContext,
  keyword: string,
  options: {
    max?: number;
    useRemote?: boolean;
    spec?: string;
    global?: string;
  } = {}
) {
  // Determine if called from CLI or directly
  const isCliContext = "tryGetLocalManager" in managerOrContext;

  let manager: PontxManager;
  let filterSpecName: string | undefined = options.spec;

  if (isCliContext) {
    // CLI call: support spec resolution
    if (options.spec) {
      // 使用 --spec 指定 specName，自动查找本地或 global
      const resolved = await resolveManagerForSpec(
        options.spec,
        managerOrContext
      );
      manager = resolved.manager;
      filterSpecName = options.spec;
    } else if (options.global) {
      // 兼容旧的 --global 选项
      console.error(
        `[warn] --global is deprecated, use --spec instead`
      );
      manager = await managerOrContext.getGlobalManager(options.global);
    } else {
      // 默认使用本地 manager
      manager = await managerOrContext.getManager();
    }
  } else {
    // Direct call: maintain backward compatibility
    manager = managerOrContext;
  }

  const fuse = buildFuse(manager, options.useRemote, filterSpecName);
  const results = searchApis(keyword, fuse, options.max || 6);

  if (results.length === 0) {
    const specHint = filterSpecName ? ` in spec "${filterSpecName}"` : "";
    console.log(`No APIs found for keyword: "${keyword}"${specHint}`);
    return;
  }

  const specHint = filterSpecName ? ` in spec "${filterSpecName}"` : "";
  console.log(`Found ${results.length} API(s)${specHint}:\n`);

  results.forEach((result, index) => {
    const specPart = quoteIfNeeded(result.specName);
    const tagPart = result.tagName ? quoteIfNeeded(result.tagName) : "";
    const apiPart = quoteIfNeeded(result.apiName);
    const apiPath = tagPart
      ? `${specPart}.${tagPart}.${apiPart}`
      : `${specPart}.${apiPart}`;

    const desc = result.title || result.summary || result.description || "";
    const firstLine = desc ? `${apiPath} - ${desc}` : apiPath;
    console.log(`${index + 1}. ${firstLine}`);
    console.log(`   ${result.method?.toUpperCase() || "GET"} ${result.path}`);
    console.log();
  });
}
