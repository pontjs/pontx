import { promises as fs } from "fs";
import baiduTranslateService from "baidu-translate-service";

/** 翻译 API 类型 */
export type TranslateApiType = "baidu";

/** 翻译 API 配置 */
export interface TranslateConfig {
  /** 翻译 API 类型 */
  type: TranslateApiType;
  /** API 密钥 */
  appId: string;
  /** API 密钥 */
  secretKey?: string;
  /** 缓存路径 */
  cachePath: string;
}

/** 翻译缓存 */
export interface TranslateCache {
  [key: string]: string;
}

/** 加载缓存 */
export const loadCache = async (cachePath: string): Promise<TranslateCache> => {
  try {
    try {
      await fs.access(cachePath);
      const cacheContent = await fs.readFile(cachePath, "utf-8");
      return JSON.parse(cacheContent);
    } catch {
      return {};
    }
  } catch (error) {
    console.error("加载翻译缓存失败:", error);
    return {};
  }
};

/** 保存缓存 */
export const saveCache = async (
  cachePath: string,
  cache: TranslateCache
): Promise<void> => {
  try {
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch (error) {
    console.error("保存翻译缓存失败:", error);
  }
};

/** 纯翻译功能，不涉及缓存 */
export const pureTranslate = async (
  config: TranslateConfig,
  text: string,
  from: string = "auto",
  to: string = "en"
): Promise<string> => {
  let result: string;
  switch (config.type) {
    case "baidu":
      const response = await baiduTranslateService({
        appid: config.appId,
        key: config.secretKey,
        from,
        to,
        q: text,
      });
      result = response?.trans_result?.[0]?.dst || "";
      break;
    // 可以添加其他翻译 API 的实现
    default:
      throw new Error(`不支持的翻译 API 类型: ${config.type}`);
  }
  return result;
};

/** 翻译文本 */
export const translate = async (
  config: TranslateConfig,
  text: string,
  from: string = "auto",
  to: string = "en"
): Promise<string> => {
  // 加载缓存
  const cache = await loadCache(config.cachePath);

  // 检查缓存
  const cachedResult = cache[text];
  if (cachedResult) {
    return cachedResult;
  }

  // 调用翻译 API
  const result = await pureTranslate(config, text, from, to);

  // 保存到缓存
  cache[text] = result;
  await saveCache(config.cachePath, cache);

  return result;
};

/** 批量翻译文本 */
export const translateTexts = async (
  config: TranslateConfig,
  texts: string[],
  from: string = "auto",
  to: string = "en"
): Promise<string[]> => {
  const cache = await loadCache(config.cachePath);

  const promises = texts.map(async (text) => {
    if (cache[text]) {
      return cache[text];
    }

    const result = await pureTranslate(config, text, from, to);

    // 保存到缓存
    cache[text] = result;
    await saveCache(config.cachePath, cache);

    return result;
  });

  return await Promise.all(promises);
};
