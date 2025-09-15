/**
 * @author: jasonHzq
 * @description: 模拟 VSCode API，用于调试环境
 */

// 模拟数据
const mockApiData = {
  id: "mock-api-1",
  title: "调试模式 - API 文档",
  specName: "mock-spec",
  contentType: "api" as const,
  nodeName: "GetUserInfo",
  jsonPath: ["paths", "/api/user/info", "get"],
  data: {
    name: "GetUserInfo",
    method: "GET",
    path: "/api/user/info",
    description: "获取用户信息",
    parameters: [
      {
        name: "userId",
        in: "query",
        schema: {
          type: "string",
          description: "用户ID",
        },
        required: true,
      },
    ],
    responses: {
      "200": {
        description: "成功",
        schema: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    },
  },
};

const mockSchemaData = {
  id: "mock-schema-1",
  title: "调试模式 - Schema 文档",
  specName: "mock-spec",
  contentType: "schema" as const,
  nodeName: "UserSchema",
  jsonPath: ["components", "schemas", "User"],
  data: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "用户ID",
      },
      name: {
        type: "string",
        description: "用户姓名",
      },
      email: {
        type: "string",
        format: "email",
        description: "用户邮箱",
      },
      age: {
        type: "integer",
        minimum: 0,
        maximum: 120,
        description: "用户年龄",
      },
      address: {
        type: "object",
        properties: {
          street: { type: "string", description: "街道地址" },
          city: { type: "string", description: "城市" },
          country: { type: "string", description: "国家" },
        },
        required: ["street", "city"],
        description: "用户地址",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "用户标签",
      },
    },
    required: ["id", "name", "email"],
  },
};

// 模拟 VSCode API
export const mockVSCodeAPI = {
  postMessage: (message: any) => {
    console.log("📤 Mock VSCode API - Post Message:", message);

    // 模拟接收消息的响应
    setTimeout(() => {
      // 根据消息类型返回不同的数据
      let mockResponse;

      if (message.type === "loadSchema") {
        mockResponse = {
          type: "data",
          data: mockSchemaData,
        };
      } else {
        // 默认返回 API 数据
        mockResponse = {
          type: "data",
          data: mockApiData,
        };
      }

      // 触发消息事件
      window.dispatchEvent(
        new MessageEvent("message", {
          data: mockResponse,
        })
      );
    }, 100);
  },

  setState: (state: any) => {
    console.log("💾 Mock VSCode API - Set State:", state);
    localStorage.setItem("vscode-webview-state", JSON.stringify(state));
  },

  getState: () => {
    const state = localStorage.getItem("vscode-webview-state");
    console.log("📥 Mock VSCode API - Get State:", state);
    return state ? JSON.parse(state) : undefined;
  },
};

// 模拟 acquireVsCodeApi 函数
export const acquireVsCodeApi = () => {
  console.log("🔧 Mock VSCode API - acquireVsCodeApi called");
  return mockVSCodeAPI;
};

// 在全局对象上设置模拟的 VSCode API
if (typeof window !== "undefined") {
  (window as any).acquireVsCodeApi = acquireVsCodeApi;
  console.log("✅ Mock VSCode API initialized for debug environment");
}
