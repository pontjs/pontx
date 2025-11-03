/**
 * Pontx Node.js SDK 基础类型
 *
 * 本文件定义了 SDK 中使用的核心类型
 * 这些类型独立于配置，代表 API 客户端的基础构建块
 */

import type { PontxSpec, PontxAPI } from '@pontx/spec';

// 为方便起见重新导出 @pontx/spec 的类型
export type { PontxSpec as PontxSpecMeta, PontxAPI };

/**
 * 表示具有类型化参数、请求体和响应的 API 方法
 *
 * @template TParams - 查询/路径参数类型
 * @template TBody - 请求体类型
 * @template TResponse - 响应数据类型
 */
export type APIMethod<TParams = any, TBody = any, TResponse = any> = {
  params: TParams;
  body: TBody;
  response: TResponse;
};

/**
 * 表示控制器（相关 API 方法的集合）
 *
 * @template T - 方法名到 APIMethod 类型的映射记录
 */
export type Controller<T extends Record<string, APIMethod>> = T;

/**
 * 表示完整的 API 客户端
 *
 * @template T - 控制器名到 Controller 类型的映射记录
 */
export type Client<T extends Record<string, Record<string, APIMethod>>> = T;

/**
 * HTTP 请求头作为键值对记录
 */
export type RequestHeaders = Record<string, string>;

/**
 * 请求序列化支持的 Content-Type 值
 */
export type ContentType =
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain'
  | string;

/**
 * 标准 fetch 函数签名
 * 兼容原生 fetch 和自定义实现
 */
export type RequestFn = (url: string, init: RequestInit) => Promise<Response>;