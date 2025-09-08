import * as pontx from "pontx";
import Fuse from "fuse.js";
import { PontxManager } from "pontx";
import { serializeRequestBody } from "@pontx/sdk-browser-client";
import fs from "fs";
import path from "path";

const fsLog = (info: string) => {
  fs.writeFileSync(path.join(process.cwd(), "debug.log"), info);
};

export function buildFuse(pontxManager: PontxManager) {
  const localOrigins = pontxManager?.resolvedConfig?.origins || [];
  const storages = [];
  const storageKeys = new Set();

  localOrigins.forEach((origin) => {
    if (!origin) {
      return;
    }

    const {
      name,
      url,
      localPath,
      remoteSpec,
      fetchedMeta,
      spec,
      envs,
      ...rest
    } = origin;
    if (!spec) {
      return;
    }

    Object.keys(spec.apis || {}).forEach((apiName) => {
      const api = spec.apis[apiName];
      let tagName = "";
      let pureApiName = apiName;

      if (apiName?.includes("/")) {
        tagName = apiName.split("/")[0];
        pureApiName = apiName.split("/")[1];
      }

      const storageValue = {
        ...rest,
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
              param.schema?.description || param.schema?.title
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
      };
    });
}

export function getApiMeta(
  pontxManager: PontxManager,
  specName: string,
  tagName: string,
  apiName: string
): any {
  const origin = (pontxManager?.resolvedConfig?.origins || []).find(
    (origin) => {
      return origin.name === specName;
    }
  );
  const pontSpec = origin?.spec;
  if (!pontSpec) {
    throw new Error(`找不到 specName: ${specName}`);
  }
  const apiKey = tagName ? `${tagName}/${apiName}` : apiName;
  const apiMeta = pontSpec.apis[apiKey];
  if (!apiMeta) {
    throw new Error(`找不到 API: ${apiKey}`);
  }
  return apiMeta;
}

export function getSchemaMeta(
  pontxManager: PontxManager,
  specName: string,
  schemaName: string
): any {
  const origin = (pontxManager?.resolvedConfig?.origins || []).find(
    (origin) => {
      return origin.name === specName;
    }
  );
  const pontSpec = origin?.spec;
  if (!pontSpec) {
    throw new Error(`找不到 schemaName: ${schemaName}`);
  }
  return pontSpec.components?.schemas?.[schemaName];
}

export async function makeCode(
  pontxManager: PontxManager,
  options: {
    case: string;
    specName: string;
    tagName: string;
    apiName: string;
    requestParams: any;
    bodyParams: any;
  }
) {
  const { specName, tagName, apiName, requestParams, bodyParams } = options;

  const samples = await PontxManager.listSamples(pontxManager);
  const sample = samples.find((sample) => sample.case === options.case);
  if (!sample) {
    switch (options.case) {
      case "request": {
        return pontx.generateApiRequestCode(
          specName,
          tagName,
          apiName,
          requestParams,
          bodyParams
        );
      }
      case "reactHooks": {
        return pontx.generateApiUseRequestCode(
          specName,
          tagName,
          apiName,
          requestParams
        );
      }
      default: {
        throw new Error(`找不到 case: ${options.case}`);
      }
    }
  }
  return await sample.generateSample(
    {
      specName,
      tagName,
      apiName,
    },
    {
      requestParams,
      bodyParams,
    }
  );
}

export function callTool(
  pontxManager: PontxManager,
  specName: string,
  tagName: string,
  apiName: string,
  params: any,
  bodyParams: any
) {
  const apiMeta = getApiMeta(pontxManager, specName, tagName, apiName);
  const produce = apiMeta.produces[0];
  const consume = apiMeta.consumes[0];

  return fetch(apiMeta.url, {
    method: apiMeta.method,
    body: bodyParams ? serializeRequestBody(bodyParams, consume) : undefined,
    headers: {
      "Content-Type": consume,
    },
  }).then((res) => {
    if (produce === "application/json") {
      return res.json();
    }
    if (produce === "text/plain") {
      return res.text();
    }

    if (produce === "application/octet-stream") {
      return res.blob();
    }

    if (produce === "multipart/form-data") {
      return res.formData();
    }

    if (produce === "text/html") {
      return res.text();
    }

    if (produce === "application/x-www-form-urlencoded") {
      return res.formData();
    }

    return res.text();
  });
}

export const buildPontxManager = async (projectRootPath: string) => {
  const pontxConfigPath = await pontx.lookForFiles(
    projectRootPath,
    "pontx.config.ts"
  );
  if (!pontxConfigPath) {
    throw new Error("找不到 pontx.config.ts");
  }

  return pontx.PontxManager.constructorFromPontxConfigPath(
    pontxConfigPath,
    projectRootPath
  );
};

export const updatePontxManager = async (pontxManager: PontxManager) => {
  await PontxManager.readLocalSpecs(pontxManager);
  await PontxManager.fetchRemotePontMeta(pontxManager);

  pontxManager.resolvedConfig.origins.forEach((origin) => {
    origin.spec = origin.remoteSpec;
  });

  // await PontxManager.generateCode(pontxManager);

  return pontxManager;
};
