/**
 * @author jasonHzq
 * @description 参数提取和转换工具
 *
 * 核心功能：
 * - 将优雅的调用参数格式转换为标准的 path/query/body 参数
 * - 处理参数合并策略（query + body 合并）
 * - 处理参数映射（解决参数冲突）
 */

import type { GracefulApiMeta } from "./requester";

/**
 * 提取后的参数结构
 */
export type ExtractedParams = {
  pathParams: Record<string, any>;
  queryParams: Record<string, any>;
  bodyParams: any;
  requestInit?: RequestInit;
};

/**
 * 参数提取策略
 */
type ParamExtractionStrategy = {
  hasPath: boolean;
  hasQuery: boolean;
  hasBody: boolean;
  canMerge: boolean;
};

/**
 * 分析参数提取策略
 * 根据 API 元数据判断如何提取参数
 */
function analyzeExtractionStrategy(
  meta: GracefulApiMeta
): ParamExtractionStrategy {
  return {
    hasPath: Boolean(meta.pathParams && meta.pathParams.length > 0),
    hasQuery: Boolean(meta.queryParams && meta.queryParams.length > 0),
    hasBody: meta.bodyParams !== null,
    canMerge: meta.bodyParams?.canMerge ?? false,
  };
}

/**
 * 提取 Path 参数
 * Path 参数总是在参数列表的最前面，按顺序提取
 */
function extractPathParams(
  args: any[],
  meta: GracefulApiMeta,
  startIndex: number
): { params: Record<string, any>; nextIndex: number } {
  const params: Record<string, any> = {};

  if (!meta.pathParams || meta.pathParams.length === 0) {
    return { params, nextIndex: startIndex };
  }

  let index = startIndex;
  meta.pathParams.forEach((paramName) => {
    params[paramName] = args[index++];
  });

  return { params, nextIndex: index };
}

/**
 * 从合并的参数对象中分离 query 和 body 参数
 * 当 query 和 body 合并时，需要根据字段列表或映射信息分离
 */
function separateMergedParams(
  mergedParams: Record<string, any>,
  meta: GracefulApiMeta
): { queryParams: Record<string, any>; bodyParams: Record<string, any> } {
  const queryParams: Record<string, any> = {};
  const bodyParams: Record<string, any> = {};

  /* 如果有参数映射（用于解决参数冲突），使用映射信息 */
  if (meta.paramMapping) {
    Object.entries(mergedParams).forEach(([key, value]) => {
      const mapping = meta.paramMapping![key];
      if (mapping) {
        if (mapping.source === "query") {
          queryParams[mapping.field] = value;
        } else {
          bodyParams[mapping.field] = value;
        }
      } else {
        /* 没有映射信息，根据字段列表判断 */
        assignParamByFieldList(key, value, meta, queryParams, bodyParams);
      }
    });
  } else {
    /* 没有冲突，直接根据字段列表分配 */
    Object.entries(mergedParams).forEach(([key, value]) => {
      assignParamByFieldList(key, value, meta, queryParams, bodyParams);
    });
  }

  return { queryParams, bodyParams };
}

/**
 * 根据字段列表分配参数到 query 或 body
 */
function assignParamByFieldList(
  key: string,
  value: any,
  meta: GracefulApiMeta,
  queryParams: Record<string, any>,
  bodyParams: Record<string, any>
): void {
  if (meta.queryParams?.includes(key)) {
    queryParams[key] = value;
  } else if (meta.bodyParams?.fields?.includes(key)) {
    bodyParams[key] = value;
  }
}

/**
 * 提取 Query 和 Body 参数
 * 根据参数策略决定如何提取
 */
function extractQueryAndBodyParams(
  args: any[],
  meta: GracefulApiMeta,
  strategy: ParamExtractionStrategy,
  startIndex: number
): {
  queryParams: Record<string, any>;
  bodyParams: any;
  nextIndex: number;
} {
  let index = startIndex;
  let queryParams: Record<string, any> = {};
  let bodyParams: any = undefined;

  if (strategy.hasQuery && strategy.hasBody && strategy.canMerge) {
    /* 策略 1: Query 和 Body 合并 */
    const mergedParams = args[index++] || {};
    const separated = separateMergedParams(mergedParams, meta);
    queryParams = separated.queryParams;
    bodyParams = separated.bodyParams;
  } else if (strategy.hasQuery && !strategy.hasBody) {
    /* 策略 2: 只有 Query 参数 */
    const queryParamsObj = args[index++] || {};
    queryParams = { ...queryParamsObj };
  } else if (strategy.hasBody && !strategy.canMerge) {
    /* 策略 3: Body 不能合并（如 FormData, Array 等） */
    /* 可能先有 Query 参数 */
    if (strategy.hasQuery) {
      const queryParamsObj = args[index++] || {};
      queryParams = { ...queryParamsObj };
    }
    /* 然后是 Body */
    bodyParams = args[index++];
  } else if (strategy.hasBody && strategy.canMerge && !strategy.hasQuery) {
    /* 策略 4: 只有 Body，且可以合并（但实际没有 Query） */
    bodyParams = args[index++];
  }

  return { queryParams, bodyParams, nextIndex: index };
}

/**
 * 提取 RequestInit 参数
 * RequestInit 总是在参数列表的最后
 */
function extractRequestInit(
  args: any[],
  startIndex: number
): RequestInit | undefined {
  if (startIndex < args.length) {
    return args[startIndex];
  }
  return undefined;
}

/**
 * 从参数中提取 path、query、body
 *
 * 参数顺序规则：
 * 1. Path 参数（按路径中出现顺序）
 * 2. Query + Body 合并参数（条件性）或独立参数
 * 3. RequestInit（可选，始终最后）
 *
 * 参数合并策略：
 * - 当 hasQuery && hasBody && canMerge 时，query 和 body 合并为一个 params 对象
 * - 当 hasBody && !canMerge 时，body 作为独立参数
 * - 其他情况按实际参数类型提取
 *
 * @example
 * // Path + Query
 * getPetById(123, { status: 'available' })
 * // → { pathParams: { petId: 123 }, queryParams: { status: 'available' } }
 *
 * @example
 * // Path + Body (不合并)
 * uploadFile(123, { file: fileObject })
 * // → { pathParams: { petId: 123 }, bodyParams: { file: fileObject } }
 *
 * @example
 * // Query + Body (合并)
 * updateUser('john', { notify: true, email: 'new@example.com' })
 * // → { pathParams: { username: 'john' }, queryParams: { notify: true }, bodyParams: { email: 'new@example.com' } }
 */
export function extractParams(
  args: any[],
  meta: GracefulApiMeta
): ExtractedParams {
  let currentIndex = 0;

  /* 1. 分析参数提取策略 */
  const strategy = analyzeExtractionStrategy(meta);

  /* 2. 提取 Path 参数 */
  const pathResult = extractPathParams(args, meta, currentIndex);
  currentIndex = pathResult.nextIndex;

  /* 3. 提取 Query 和 Body 参数 */
  const queryBodyResult = extractQueryAndBodyParams(
    args,
    meta,
    strategy,
    currentIndex
  );
  currentIndex = queryBodyResult.nextIndex;

  /* 4. 提取 RequestInit */
  const requestInit = extractRequestInit(args, currentIndex);

  return {
    pathParams: pathResult.params,
    queryParams: queryBodyResult.queryParams,
    bodyParams: queryBodyResult.bodyParams,
    requestInit,
  };
}
