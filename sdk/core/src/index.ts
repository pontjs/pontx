/**
 * @author jasonHzq
 * @description Pontx SDK Core - 主入口文件
 *
 * 导出所有核心功能和类型
 */

// 核心功能
export * from "./core";

// 类型定义
export * from "./types";

// 功能模块
export * from "./features";

// Graceful Client
export * from "./graceful-client";

// Streaming Client - transport-neutral WebSocket runtime for generated SDKs
export * from "./streaming";

// Graceful Client 标准别名 - 推荐使用的客户端
export { createGracefulClient as createClient } from "./graceful-client";
export { createGracefulRequester as createRequester } from "./graceful-client/requester";

// Fetch Client - 与标准 Fetch API 调用方式基本相同的客户端
export { createFetchClient, createFetchRequester } from "./core";

// 导出有用的工具函数和类型
export { extractParams } from "./graceful-client/extract-params";
export type { ExtractedParams } from "./graceful-client/extract-params";
export type { GracefulApiMeta } from "./graceful-client/requester";
export type { BodySerializer, BodySerializers } from "./core/request-body";
