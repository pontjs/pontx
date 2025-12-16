/**
 * @author jasonHzq
 * @description 构建 HTTP 请求头模块
 *
 * 根据 API 元数据和用户配置构建完整的请求头。
 * 优先级：用户提供的 headers > API 元数据中的 headers
 */

import { PontxAPIMeta } from '../types';

/**
 * 从 API 元数据和请求选项构建 HTTP 请求头
 *
 * 处理逻辑：
 * 1. 从 apiMeta.consumes 中提取 Content-Type (取第一个)
 * 2. 从 apiMeta.produces 中提取 Accept (取第一个)
 * 3. 合并用户提供的 headers (用户 headers 优先级更高)
 *
 * @param apiMeta - API 元数据，包含 consumes 和 produces 信息
 * @param options - 请求选项，可选的用户自定义 headers
 * @returns 合并后的 headers 对象
 *
 * @example
 * ```typescript
 * const headers = buildHeaders(
 *   {
 *     consumes: ['application/json'],
 *     produces: ['application/json'],
 *     // ...
 *   },
 *   {
 *     headers: { 'Authorization': 'Bearer token' }
 *   }
 * );
 * // 返回: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': 'Bearer token' }
 * ```
 */
export function buildHeaders(
  apiMeta: PontxAPIMeta,
  options?: RequestInit,
): Record<string, string> {
  const headers: Record<string, string> = {};

  // 从 consumes 设置 Content-Type (取第一个元素)
  if (apiMeta.consumes && apiMeta.consumes.length > 0) {
    headers['Content-Type'] = apiMeta.consumes[0];
  }

  // 从 produces 设置 Accept (取第一个元素)
  if (apiMeta.produces && apiMeta.produces.length > 0) {
    headers['Accept'] = apiMeta.produces[0];
  }

  // 合并用户提供的 headers (用户 headers 覆盖默认值)
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  return headers;
}
