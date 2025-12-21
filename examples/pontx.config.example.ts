/**
 * Pontx 配置示例
 * 展示配置式和插件式两种 API 执行方式
 */

import { defineConfig } from 'pontx';
import type { Plugin } from 'pontx';
import type { ExecuteApiConfig, ApiExecutionContext } from 'pontx/types';

// ==================== 方式一：配置式（推荐用于常见场景） ====================

export default defineConfig({
  outDir: './src/api',

  specs: [
    {
      name: 'user-api',
      url: 'https://api.example.com/swagger.json'
    }
  ],

  // API 调用配置 - 用于 pontx call 命令和 API Debugger
  executeApi: {
    // 1. 基础配置
    baseURL: 'https://api.example.com',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'X-Client': 'pontx'
    },

    // 2. 多环境配置
    environments: {
      dev: {
        baseURL: 'https://dev-api.example.com',
        headers: { 'X-Env': 'dev' },
        timeout: 15000  // 开发环境可以设置更长的超时
      },
      test: {
        baseURL: 'https://test-api.example.com',
        headers: { 'X-Env': 'test' }
      },
      prod: {
        baseURL: 'https://api.example.com',
        headers: { 'X-Env': 'prod' }
      }
    },

    // 3. 请求前钩子 - 可用于添加认证、日志等
    beforeRequest: async (request) => {
      // 示例1：添加认证 token
      const token = await getAuthToken();
      request.init.headers = {
        ...request.init.headers,
        'Authorization': `Bearer ${token}`
      };

      // 示例2：添加请求日志
      console.log(`[API Request] ${request.meta.method} ${request.url}`);

      return request;
    },

    // 4. 响应后钩子 - 可用于统一解包、错误处理等
    afterResponse: (response) => {
      const data = response.data as any;

      // 统一的响应格式处理
      if (data.code === 0) {
        return data.data;  // 解包成功响应
      }

      // 业务错误
      throw new Error(data.message || '请求失败');
    },

    // 5. 错误处理钩子
    onError: async (error) => {
      console.error(`[API Error] ${error.type}:`, error.message);

      // 特殊错误处理
      if (error.type === 'http' && error.response?.status === 401) {
        console.error('认证失败，请重新登录');
        // 可以在这里触发登录流程
      }
    }
  }
});

// ==================== 方式二：插件式（高级场景） ====================

// 示例：自定义执行器插件
const customExecutorPlugin: Plugin = {
  name: 'my-custom-executor',

  executeApi: async (context: ApiExecutionContext) => {
    // 完全自定义的 API 调用逻辑
    console.log(`Executing: ${context.api.specName}.${context.api.apiName}`);

    // 你可以使用任何 HTTP 客户端，例如 axios、fetch 等
    const axios = require('axios');

    try {
      const response = await axios({
        method: context.meta.method,
        url: `${context.env?.baseURL}${context.meta.path}`,
        data: context.params,
        timeout: 10000
      });

      return {
        data: response.data,
        status: response.status,
        headers: response.headers
      };
    } catch (error: any) {
      throw new Error(`Custom executor failed: ${error.message}`);
    }
  }
};

// 使用插件式配置
export const pluginConfig = defineConfig({
  outDir: './src/api',
  specs: [
    { name: 'user-api', url: 'https://api.example.com/swagger.json' }
  ],

  plugins: [
    customExecutorPlugin
  ]
});

// ==================== 辅助函数 ====================

/**
 * 获取认证 token 的示例函数
 */
async function getAuthToken(): Promise<string> {
  // 从环境变量、本地存储或其他来源获取 token
  return process.env.API_TOKEN || 'default-token';
}
