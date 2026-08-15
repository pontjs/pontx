/**
 * @author jasonHzq
 * @description Graceful Client 类型定义 - 优雅的 API 调用方式
 */

/**
 * 提取 API 方法类型（过滤掉非函数类型）
 */
export type ExtractApiMethods<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K];
};

/**
 * API 客户端类型
 * 支持 namespace 和 Record 类型
 */
export type GracefulClient<T> = {
  [Controller in keyof T]: T[Controller] extends (...args: any[]) => any
    ? T[Controller]
    : ExtractApiMethods<T[Controller]>;
};
