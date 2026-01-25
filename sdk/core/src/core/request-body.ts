/**
 * @author jasonHzq
 * @description 请求体序列化模块
 *
 * 本模块提供基于 Content-Type 的请求体序列化功能。
 * 支持 JSON、URLSearchParams、FormData 和 text/plain 序列化。
 */

import type { ContentType } from '../types/base';
import type { PontxAPI } from '@pontx/spec';

/**
 * 请求体序列化函数类型
 * @param body - 原始请求体
 * @returns 序列化后的请求体
 */
export type BodySerializer = (body: unknown) => string | URLSearchParams | FormData;

/**
 * 按 Content-Type 注册的序列化器映射
 * @example
 * const serializers: BodySerializers = {
 *   'application/json': (body) => JSON.stringify(body, null, 2),
 *   'application/x-custom': (body) => customSerialize(body)
 * };
 */
export type BodySerializers = {
  [contentType: string]: BodySerializer;
};

/**
 * 检查值是否为 null 或 undefined
 * @internal
 */
function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 根据 Content-Type 序列化请求体
 *
 * @param body - 要序列化的请求体
 * @param contentType - Content-Type 请求头的值
 * @param customSerializers - 自定义序列化器映射，优先级高于默认序列化器
 * @returns 序列化后的请求体 (string, URLSearchParams 或 FormData)
 *
 * @example
 * // 使用默认序列化器
 * const serialized = serializeRequestBody({ name: 'test' }, 'application/json');
 *
 * @example
 * // 使用自定义序列化器
 * const serialized = serializeRequestBody(
 *   { name: 'test' },
 *   'application/json',
 *   {
 *     'application/json': (body) => JSON.stringify(body, null, 2)
 *   }
 * );
 */
export function serializeRequestBody(
  body: unknown,
  contentType: ContentType,
  customSerializers?: BodySerializers,
): string | URLSearchParams | FormData {
  // 优先使用自定义序列化器
  if (customSerializers?.[contentType]) {
    return customSerializers[contentType](body);
  }

  // 使用默认序列化器
  if (contentType === 'application/json') {
    return JSON.stringify(body);
  }

  if (contentType === 'application/x-www-form-urlencoded') {
    return serializeToUrlSearchParams(body);
  }

  if (contentType === 'multipart/form-data') {
    return serializeToFormData(body);
  }

  if (contentType === 'text/plain') {
    if (typeof body === 'string') {
      return body;
    }
    return String(body);
  }

  throw new Error(
    `Unsupported Content-Type: ${contentType}. ` +
      `Supported types: application/json, application/x-www-form-urlencoded, multipart/form-data, text/plain`,
  );
}

/**
 * Serializes body to URLSearchParams
 *
 * @param body - Body object to serialize
 * @returns URLSearchParams instance
 *
 * @internal
 */
function serializeToUrlSearchParams(body: unknown): URLSearchParams {
  const params = new URLSearchParams();

  if (typeof body !== 'object' || body === null) {
    return params;
  }

  const bodyObj = body as Record<string, unknown>;

  for (const [key, value] of Object.entries(bodyObj)) {
    // Skip undefined and null values
    if (isNullOrUndefined(value)) {
      continue;
    }

    // Handle array values - append each item with the same key
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!isNullOrUndefined(item)) {
          params.append(key, String(item));
        }
      }
      continue;
    }

    // Handle object values - serialize as JSON
    if (typeof value === 'object') {
      params.append(key, JSON.stringify(value));
      continue;
    }

    // Handle primitive values
    params.append(key, String(value));
  }

  return params;
}

/**
 * Serializes body to FormData
 *
 * @param body - Body object to serialize
 * @returns FormData instance
 *
 * @internal
 */
function serializeToFormData(body: unknown): FormData {
  const formData = new FormData();

  if (typeof body !== 'object' || body === null) {
    return formData;
  }

  const bodyObj = body as Record<string, unknown>;

  for (const [key, value] of Object.entries(bodyObj)) {
    // Skip undefined and null values
    if (isNullOrUndefined(value)) {
      continue;
    }

    // Handle array values - append each item with the same key
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!isNullOrUndefined(item)) {
          appendToFormData(formData, key, item);
        }
      }
      continue;
    }

    // Append single value
    appendToFormData(formData, key, value);
  }

  return formData;
}

/**
 * Appends a value to FormData, handling different value types
 *
 * @param formData - FormData instance
 * @param key - Field name
 * @param value - Value to append
 *
 * @internal
 */
function appendToFormData(
  formData: FormData,
  key: string,
  value: unknown,
): void {
  // Handle File objects
  if (value instanceof File) {
    formData.append(key, value);
    return;
  }

  // Handle Blob objects
  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }

  // Handle object values - serialize as JSON
  if (typeof value === 'object' && value !== null) {
    formData.append(key, JSON.stringify(value));
    return;
  }

  // Handle primitive values
  formData.append(key, String(value));
}

/**
 * 从 API 元数据中获取 Content-Type
 *
 * 返回 API 元数据中 consumes 数组的第一个 Content-Type。
 * 如果未提供 consumes 或为空，则返回 undefined。
 *
 * @param apiMeta - 来自 PontxSpecMeta 的 API 元数据
 * @returns Content-Type 字符串或 undefined
 *
 * @example
 * const apiMeta = {
 *   path: '/api/user',
 *   method: 'POST',
 *   consumes: ['application/json', 'application/xml']
 * };
 * const contentType = getContentType(apiMeta);
 * // 返回: 'application/json'
 */
export function getContentType(apiMeta: Partial<PontxAPI>): string | undefined {
  if (!apiMeta.consumes || apiMeta.consumes.length === 0) {
    return undefined;
  }

  return apiMeta.consumes[0];
}
