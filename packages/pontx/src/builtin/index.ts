import type { Plugin, ResolvedConfig, ResolvedOriginConfig } from "../type";
import path from "node:path";
import fsp from "node:fs/promises";
import https from "node:https";
import http from "node:http";
import _ from "lodash";
const { uniq } = _;
import { translateTexts, TranslateConfig, translate } from "./translate";
import { LOCK_FILENAME } from "../const";
import {
  parseOAS2,
  parseOAS3,
  parseAsyncApi3,
  checkIsOas2,
  checkIsOas3,
  checkIsAsyncApi3,
  generateSpecApis,
  generateSchemas,
  generateSpecMeta,
  generateAsyncApiTypes,
  generateAsyncApiClient,
  generateSseClient,
  generateSseTypes,
  PontxSpec,
  fixOASTagsByTranslate,
} from "@pontx/spec";
import { createLogger } from "../logger/logger";
import { builtinCheck } from "./check";
import { builtinExecuteApi } from "./apiExecutor";

export function getBuiltinPlugin(): Plugin {
  return {
    name: "builtin-pontx-plugin",
    configResolved: (resolvedConfig: ResolvedConfig) => {
      return;
    },
    fetch: async (url, options) => {
      let localPath = options.originConfig?.localPath;
      if (!url && !localPath) {
        throw new Error("url 或 localPath 不能为空");
      }

      if (!localPath && (url?.startsWith("./") || url?.startsWith("../"))) {
        localPath = url;
      }

      if (localPath) {
        const isAbsolute = path.isAbsolute(localPath);
        const filePath = isAbsolute
          ? localPath
          : path.join(options.resolvedConfig.configDir, localPath);
        const fileContent = await fsp.readFile(filePath, "utf-8");
        return fileContent;
      }

      if (!url) {
        throw new Error("URL is required for remote fetching");
      }

      try {
        const fileContent = await new Promise<string>((resolve, reject) => {
          const doRequest = (reqUrl: string, redirectCount = 0) => {
            if (redirectCount > 5) {
              reject(new Error("Too many redirects"));
              return;
            }
            const parsedUrl = new URL(reqUrl);
            const isHttps = parsedUrl.protocol === "https:";
            const requestFn = isHttps ? https.get : http.get;
            const reqOptions: https.RequestOptions = {
              ...(isHttps ? { rejectUnauthorized: false } : {}),
            };

            requestFn(reqUrl, reqOptions, (res) => {
              /* 处理重定向 */
              if (
                res.statusCode &&
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
              ) {
                const redirectUrl = new URL(
                  res.headers.location,
                  reqUrl
                ).toString();
                doRequest(redirectUrl, redirectCount + 1);
                return;
              }
              if (
                res.statusCode &&
                (res.statusCode < 200 || res.statusCode >= 300)
              ) {
                reject(new Error(`HTTP error! status: ${res.statusCode}`));
                return;
              }
              const chunks: Buffer[] = [];
              res.on("data", (chunk) => chunks.push(chunk));
              res.on("end", () =>
                resolve(Buffer.concat(chunks).toString("utf-8"))
              );
              res.on("error", reject);
            }).on("error", reject);
          };
          doRequest(url);
        });
        return fileContent;
      } catch (e) {
        if (e instanceof TypeError) {
          throw new Error(`Network error while fetching ${url}: ${e.message}`);
        } else if (e instanceof Error) {
          throw new Error(`Failed to fetch ${url}: ${e.message}`);
        }
        throw new Error(`Unknown error while fetching ${url}: ${e}`);
      }
    },
    transformMeta: async (metaString: string, options) => {
      const translateConfig = options.resolvedConfig.translateConfig;
      let translatedMeta = metaString;

      const translateText = async (text: string) => {
        return translate(translateConfig, text);
      };

      try {
        const json = JSON.parse(metaString);
        if (checkIsOas2(json) || checkIsOas3(json)) {
          const fixedMeta = await fixOASTagsByTranslate(json, translateText);

          translatedMeta = JSON.stringify(fixedMeta);
        }
      } catch (e) {}

      if (translateConfig) {
        translatedMeta = await translateCnMeta(translatedMeta, translateConfig);
      }

      return translatedMeta;
    },
    parseMeta: async (metaString: string, options) => {
      const json = JSON.parse(metaString);

      let spec: PontxSpec;

      if (checkIsOas2(json)) {
        spec = parseOAS2(json, options.originConfig.name);
      } else if (checkIsOas3(json)) {
        spec = parseOAS3(json, options.originConfig.name);
      } else if (checkIsAsyncApi3(json)) {
        spec = parseAsyncApi3(json, options.originConfig.name);
      } else {
        // 已经是 PontxSpec 或其他对象，直接返回
        return json as PontxSpec;
      }

      // 当 includeTags === false 时，移除 oas 中无效的 tags，并将 apis 从 "tag/api" 扁平化为 "api"
      if (
        options?.originConfig &&
        Object.prototype.hasOwnProperty.call(
          options.originConfig,
          "includeTags"
        ) &&
        options.originConfig.includeTags === false
      ) {
        const logger = createLogger(
          options?.resolvedConfig?.service?.logLevel || "info"
        );

        const flatApis: Record<string, any> = {};
        const duplicated: string[] = [];

        Object.keys(spec?.apis || {}).forEach((fullName) => {
          const name = fullName?.includes?.("/")
            ? fullName.split("/").pop()
            : fullName;
          if (!name) return;
          if (flatApis[name]) {
            duplicated.push(name);
          } else {
            flatApis[name] = spec.apis[fullName];
          }
        });

        if (duplicated.length) {
          logger.warn(
            `Spec "${
              spec?.name || ""
            }" 因配置 includeTags: false。pontx 在移除命名空间后，存在重复 API 名称: ${duplicated.join(
              ", "
            )}`
          );
        }

        spec = {
          ...spec,
          apis: flatApis,
        } as PontxSpec;
        delete spec.tags;
      }

      return spec;
    },
    transform: async (spec: PontxSpec, options) => {
      return spec;
    },
    generate: async (spec: PontxSpec, options) => {
      const fileStructure = {
        [LOCK_FILENAME]: JSON.stringify(spec, null, 2),
        ["apis.ts"]: generateSpecApis(spec),
        ["apiMeta.ts"]: generateSpecMeta(spec),
      };
      if (
        spec?.components?.schemas &&
        Object.keys(spec.components.schemas).length
      ) {
        fileStructure["schemas.ts"] = generateSchemas(spec);
      }
      if (spec.asyncapi) {
        fileStructure["streams.ts"] = generateAsyncApiTypes(spec.asyncapi);
        fileStructure["stream-client.ts"] = generateAsyncApiClient(spec.asyncapi);
      }
      if (Object.values(spec.apis).some((api) => api.sse)) {
        fileStructure["sse.ts"] = generateSseTypes(spec);
        fileStructure["sse-client.ts"] = generateSseClient();
      }

      return fileStructure;
    },
    generateEntry: async (options) => {
      const { resolvedConfig } = options;

      const fileStructure = {};

      // 过滤掉外置 specs（仅用于查询，不生成代码）
      const writableOrigins = resolvedConfig.origins.filter(
        (origin) => !origin.external
      );

      if (writableOrigins.length === 0 && resolvedConfig.origins.length > 0) {
        const externalNames = resolvedConfig.origins
          .filter((o) => o.external)
          .map((o) => o.name)
          .join(", ");
        throw new Error(
          `无可生成的 origin：所有 origins 均为外置 spec (${externalNames})\n\n` +
            `外置 spec 仅用于查询和调用，不支持代码生成\n` +
            `提示：请在 pontx.config.ts 中添加本地 spec 配置`
        );
      }

      const promises = writableOrigins.map(async (origin) => {
        const originSpec = origin.spec;
        const originFileStructure =
          await options.resolvedConfig.resolvedPlugin.generate(
            originSpec,
            options
          );

        fileStructure[origin.name] = originFileStructure;

        return originFileStructure;
      });

      await Promise.all(promises);

      return fileStructure;
    },
    check: builtinCheck,
    executeApi: builtinExecuteApi,
  };
}

export { builtinExecuteApi };

async function translateCnMeta(
  metaStr: string,
  translateConfig: TranslateConfig
) {
  let transformedStr = metaStr;

  const matchItems = metaStr
    // 匹配中英文混合及包含 空格，«，»，-, (,)的情况
    .match(/"[a-z0-9\s-]*[\u4e00-\u9fa5]+[a-z0-9\s-«»()\u4e00-\u9fa5]*":/gi);
  if (!matchItems) {
    return transformedStr;
  }

  let cnTexts = matchItems.map((item) => item.replace(/["":]/g, ""));

  // 去重
  cnTexts = uniq(
    cnTexts.map((item) => (item.includes("«") ? item.split("«")[0] : item))
  );

  // 按长度倒序排序，防止替换时中文名部分重名
  // 例如: 请求参数vo, 请求参数, 替换时先替换 请求参数vo, 后替换请求参数
  cnTexts.sort((pre, next) => next.length - pre.length);

  const enNames = await translateTexts(translateConfig, cnTexts);

  const camelEnNames = enNames.map((enName) => {
    return _.startCase(enName).split(" ").join("");
  });

  if (camelEnNames?.length !== cnTexts.length) {
    throw new Error("翻译失败");
  }

  const toRegStr = (str) => str.replace(/(\W)/g, "\\$1");
  camelEnNames.forEach((enName: string, index) => {
    const cnText = cnTexts[index];

    if (enName) {
      transformedStr = transformedStr.replace(
        new RegExp(`${toRegStr(cnText)}`, "g"),
        enName
      );
    }
  });

  return transformedStr;
}
