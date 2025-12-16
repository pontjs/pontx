/**
 * @author jasonHzq
 * @description Graceful API Client - 优雅的 API 调用客户端
 *
 * 设计思路：
 * 1. 复用 buildApiCaller 进行请求构建和发送
 * 2. extractParams 负责将优雅的参数格式转换为标准格式
 * 3. 通过类型转换适配 GracefulApiMeta 和 PontxAPIMeta
 */

import { GracefulClient } from "./type";
import { FetchSDKClientConfig } from "../core/create-client";
import { createBaseClient } from "../core/create-client";
import { createGracefulRequester } from "./requester";

// export type CreateGracefulClientConfig =

/**
 * 创建 Graceful API 客户端
 *
 * 优化后的实现：
 * 1. 复用 buildApiCaller 的核心逻辑（URL 构建、Body 序列化、请求发送）
 * 2. extractParams 处理优雅的参数格式转换
 * 3. 避免重复实现请求逻辑
 */
export function createGracefulClient<T>(
  config: FetchSDKClientConfig
): GracefulClient<T> {
  const clientConfig = { ...config };
  if (!config.createRequester) {
    clientConfig.createRequester = createGracefulRequester(config);
  }

  return createBaseClient(clientConfig) as any;
}

export type { GracefulClient };
