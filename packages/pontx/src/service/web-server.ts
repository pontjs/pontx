/**
 * @author: jasonHzq
 * @description: Web 服务器，提供 API 接口和调试界面
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import { join, extname } from "path";
import type { Logger } from "../logger/types";
import { PontxManager } from "../manager";
import { PontxManager as PM } from "../manager";
import { makeCode } from "../commands/gen";

/**
 * Web 服务器
 */
export class WebServer {
  /** 日志记录器 */
  private logger: Logger;

  /** 服务器端口 */
  private port: number;

  /** 服务器实例 */
  private server: any = null;

  /** PontxManager 实例 */
  private manager: PontxManager | null = null;

  /** CDN 上的 app.html 缓存 */
  private appHtmlCache: string | null = null;

  /** 本地 @pontx/shadcn-ui dist/app 目录路径缓存 */
  private localAppDir: string | null | undefined = undefined;

  /** @pontx/shadcn-ui CDN 基础地址 */
  private static CDN_BASE =
    "https://unpkg.com/@pontx/shadcn-ui@latest/dist/app";

  /** 内置 SDK 代码生成 case（无插件时使用） */
  private static SDK_BUILTIN_CASES = [
    { id: "request", label: "TypeScript SDK", language: "typescript" },
    { id: "reactHooks", label: "React Hooks", language: "typescript" },
  ];

  /** CLI 代码生成 case（始终包含，不会从插件 listSamples 返回） */
  private static CLI_CASE = {
    id: "cliCommand",
    label: "CLI (pontx call)",
    language: "shell",
  };

  constructor(port: number, logger: Logger) {
    this.port = port;
    this.logger = logger;
  }

  /**
   * 获取实际使用的端口
   */
  getPort(): number {
    return this.port;
  }

  /**
   * 设置 PontxManager 实例
   */
  setManager(manager: PontxManager): void {
    this.manager = manager;
  }

  /** 最大端口重试次数 */
  private static MAX_PORT_RETRIES = 20;

  /**
   * 启动 Web 服务器（端口冲突时自动尝试下一个端口）
   */
  async start(): Promise<void> {
    const startPort = this.port;

    for (let i = 0; i <= WebServer.MAX_PORT_RETRIES; i++) {
      try {
        await this.tryListen(startPort + i);
        this.port = startPort + i;
        if (i > 0) {
          this.logger.warn(
            `端口 ${startPort} 被占用，已自动切换到端口 ${this.port}`,
          );
        }
        this.logger.info(`Web 服务启动成功，端口: ${this.port}`);
        return;
      } catch (error: any) {
        if (error.code === "EADDRINUSE" && i < WebServer.MAX_PORT_RETRIES) {
          continue;
        }
        this.logger.error("Web 服务启动失败", { error });
        throw error;
      }
    }
  }

  /**
   * 尝试在指定端口启动监听
   */
  private tryListen(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(
        async (req: IncomingMessage, res: ServerResponse) => {
          try {
            await this.handleRequest(req, res);
          } catch (error) {
            this.logger.error("Web 请求处理失败", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
          }
        },
      );

      this.server.listen(port, () => {
        resolve();
      });

      this.server.on("error", (error: NodeJS.ErrnoException) => {
        this.server = null;
        reject(error);
      });
    });
  }

  /**
   * 停止 Web 服务器
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.closeAllConnections();
        this.server.close(() => {
          this.server = null;
          this.logger.info("Web 服务已停止");
          resolve();
        });
      });
    }
  }

  /**
   * 处理 Web 请求
   */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const pathname = url.pathname;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      switch (pathname) {
        case "/":
          await this.handleRootRequest(req, res);
          break;

        case "/api/status":
          await this.handleStatusRequest(req, res);
          break;

        case "/api/specs":
          await this.handleSpecsRequest(req, res);
          break;

        case "/api/sync":
          await this.handleSyncRequest(req, res);
          break;

        case "/api/spec":
          await this.handleSpecRequest(req, res, url);
          break;

        case "/api/code-gen/scenarios":
          await this.handleCodeGenScenariosRequest(req, res);
          break;

        case "/api/code-gen/generate":
          await this.handleCodeGenGenerateRequest(req, res);
          break;

        default:
          if (
            pathname.startsWith("/assets/") &&
            this.handleLocalAssetRequest(pathname, res)
          ) {
            return;
          }
          if (pathname.startsWith("/api/")) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: "Not found" }));
            return;
          }
          /* SPA fallback — 非 API、非 asset 路径返回 app HTML */
          await this.handleRootRequest(req, res);
      }
    } catch (error) {
      this.logger.error("Web 请求处理错误", error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }

  /**
   * 处理根路径请求 - 从 CDN 加载 @pontx/shadcn-ui SPA
   */
  private async handleRootRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const html = await this.getAppHtml();
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch (error) {
      this.logger.warn("CDN 加载 UI 失败，使用降级页面", error);
      this.handleFallbackHtml(res);
    }
  }

  /**
   * 获取 SPA HTML（带缓存）
   */
  private async getAppHtml(): Promise<string> {
    if (this.appHtmlCache) {
      return this.appHtmlCache;
    }

    /* 优先从本地 node_modules 获取 */
    const localHtml = this.getLocalAppHtml();
    if (localHtml) {
      this.appHtmlCache = localHtml;
      return localHtml;
    }

    /* 本地不可用时降级到 CDN */
    try {
      const cdnHtml = await this.fetchCdnAppHtml();
      this.appHtmlCache = cdnHtml;
      return cdnHtml;
    } catch (cdnError) {
      this.logger.warn("CDN 加载 UI 也失败", cdnError);
    }

    throw new Error("本地 node_modules 和 CDN 均无法加载 @pontx/shadcn-ui");
  }

  /**
   * 从 CDN 获取 app.html
   */
  private async fetchCdnAppHtml(): Promise<string> {
    const cdnUrl = `${WebServer.CDN_BASE}/app.html`;
    this.logger.debug(`从 CDN 获取 UI: ${cdnUrl}`);

    const response = await fetch(cdnUrl);
    if (!response.ok) {
      throw new Error(`CDN 响应: ${response.status} ${response.statusText}`);
    }

    let html = await response.text();

    /* 将相对路径资源转为 CDN 绝对路径 */
    html = html.replace(/(?:src|href)="\.\/assets\//g, (match) =>
      match.replace("./assets/", `${WebServer.CDN_BASE}/assets/`),
    );

    /* 注入 pontx 配置 */
    const configScript = `<script>window.__PONTX_CONFIG__={apiBaseUrl:""};</script>`;
    html = html.replace("<head>", `<head>\n    ${configScript}`);

    return html;
  }

  /**
   * 从本地 node_modules 获取 app.html
   */
  private getLocalAppHtml(): string | null {
    const appDir = this.resolveLocalAppDir();
    if (!appDir) return null;

    const htmlPath = join(appDir, "app.html");
    if (!existsSync(htmlPath)) return null;

    this.logger.info(`从本地加载 UI: ${htmlPath}`);
    let html = readFileSync(htmlPath, "utf-8");

    /* 保留相对路径，由本地静态文件路由 serve */
    const configScript = `<script>window.__PONTX_CONFIG__={apiBaseUrl:""};</script>`;
    html = html.replace("<head>", `<head>\n    ${configScript}`);

    return html;
  }

  /**
   * 解析本地 @pontx/shadcn-ui 包的 dist/app 目录
   */
  private resolveLocalAppDir(): string | null {
    if (this.localAppDir !== undefined) return this.localAppDir;

    try {
      const require = createRequire(process.cwd() + "/");
      /* @pontx/shadcn-ui 的 exports map 中 "./app" 指向 dist/app/app.html */
      const appHtmlPath = require.resolve("@pontx/shadcn-ui/app");
      const appDir = join(appHtmlPath, "..");
      if (existsSync(join(appDir, "app.html"))) {
        this.localAppDir = appDir;
        return appDir;
      }
    } catch {}

    this.localAppDir = null;
    return null;
  }

  /**
   * MIME type 映射
   */
  private static MIME_TYPES: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".json": "application/json; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
  };

  /**
   * 处理本地静态资源请求（/assets/*）
   */
  private handleLocalAssetRequest(
    pathname: string,
    res: ServerResponse,
  ): boolean {
    const appDir = this.resolveLocalAppDir();
    if (!appDir) return false;

    const filePath = join(appDir, pathname);

    /* 防止路径穿越 */
    if (!filePath.startsWith(appDir)) {
      return false;
    }

    if (!existsSync(filePath)) return false;

    const ext = extname(filePath);
    const contentType = WebServer.MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(readFileSync(filePath));
    return true;
  }

  /**
   * 降级 HTML 页面（CDN 不可用时）
   */
  private handleFallbackHtml(res: ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Pontx Service</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .api-section { margin: 20px 0; }
        .api-endpoint { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .method { font-weight: bold; color: #007bff; }
        .url { font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Pontx Service</h1>
            <p>API 生命周期管理服务</p>
            <p style="color: #666; font-size: 14px;">提示：安装 @pontx/shadcn-ui 并确保网络连接以启用完整 API 文档 UI</p>
        </div>
        <div class="api-section">
            <h2>API 接口</h2>
            <div class="api-endpoint">
                <span class="method">GET</span> <span class="url">/api/status</span>
                <p>获取服务状态信息</p>
            </div>
            <div class="api-endpoint">
                <span class="method">GET</span> <span class="url">/api/specs</span>
                <p>获取所有 API Spec 信息</p>
            </div>
            <div class="api-endpoint">
                <span class="method">POST</span> <span class="url">/api/sync</span>
                <p>手动触发同步操作</p>
            </div>
            <div class="api-endpoint">
                <span class="method">GET</span> <span class="url">/api/spec?name=&lt;specName&gt;</span>
                <p>获取指定 Spec 的详细信息</p>
            </div>
        </div>
        <div class="api-section">
            <h2>快速测试</h2>
            <button onclick="testAPI('/api/status')">测试状态接口</button>
            <button onclick="testAPI('/api/specs')">测试 Specs 接口</button>
            <div id="result" style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 3px; display: none;"></div>
        </div>
    </div>
    <script>
        async function testAPI(url) {
            try {
                const response = await fetch(url);
                const data = await response.json();
                const resultDiv = document.getElementById('result');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<strong>' + url + '</strong><br><pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
                const resultDiv = document.getElementById('result');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<strong>' + url + '</strong><br><pre>' + JSON.stringify({ error: error.message }, null, 2) + '</pre>';
            }
        }
    </script>
</body>
</html>`;

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  }

  /**
   * 处理状态请求
   */
  private async handleStatusRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        service: "Pontx Service",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        port: this.port,
      }),
    );
  }

  /**
   * 处理 Specs 请求
   */
  private async handleSpecsRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (!this.manager?.resolvedConfig) {
      res.writeHead(200);
      res.end(JSON.stringify([]));
      return;
    }

    const config = this.manager.resolvedConfig;
    const specs = [];

    for (const origin of config.origins) {
      if (origin.spec) {
        specs.push({
          name: origin.name,
          url: origin.url,
          localPath: origin.localPath,
          apiCount: Object.keys(origin.spec.apis || {}).length,
          hasRemoteSpec: !!origin.remoteSpec,
        });
      }
    }

    res.writeHead(200);
    res.end(JSON.stringify(specs));
  }

  /**
   * 处理同步请求
   */
  private async handleSyncRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (req.method === "POST") {
      // 这里需要触发同步，但需要从外部传入回调
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: "同步请求已接收" }));
    } else {
      res.writeHead(405);
      res.end(JSON.stringify({ error: "Method not allowed" }));
    }
  }

  /**
   * 处理 Spec 请求
   */
  private async handleSpecRequest(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    const specName = url.searchParams.get("name");

    if (!specName) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Missing spec name" }));
      return;
    }

    if (!this.manager?.resolvedConfig) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Spec not found" }));
      return;
    }

    const config = this.manager.resolvedConfig;
    const origin = config.origins.find((o) => o.name === specName);

    if (origin?.spec) {
      res.writeHead(200);
      res.end(JSON.stringify(origin.spec));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Spec not found" }));
    }
  }

  /**
   * 解析 POST 请求的 JSON Body
   */
  private parseJsonBody<T = any>(req: IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk: string) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("Invalid JSON body"));
        }
      });
      req.on("error", reject);
    });
  }

  /**
   * 处理代码生成场景列表请求
   */
  private async handleCodeGenScenariosRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (!this.manager) {
      res.writeHead(200);
      res.end(JSON.stringify({ scenarios: [] }));
      return;
    }

    const samples = await PM.listSamples(this.manager);

    /* 插件 sample 映射为 scenario */
    const pluginScenarios = samples.map((sample) => ({
      id: sample.case,
      label: sample.description,
      language: "typescript",
    }));

    /* 有插件时用插件 scenarios，否则用内置 SDK cases；CLI case 始终包含 */
    let scenarios: Array<{ id: string; label: string; language: string }>;
    if (pluginScenarios.length > 0) {
      scenarios = [...pluginScenarios, WebServer.CLI_CASE];
    } else {
      scenarios = [...WebServer.SDK_BUILTIN_CASES, WebServer.CLI_CASE];
    }

    res.writeHead(200);
    res.end(JSON.stringify({ scenarios }));
  }

  /**
   * 处理代码生成请求
   */
  private async handleCodeGenGenerateRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    if (!this.manager) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: "Manager not initialized" }));
      return;
    }

    try {
      const body = await this.parseJsonBody<{
        scenarioId: string;
        specName: string;
        tagName: string;
        apiName: string;
        requestParams?: Record<string, any>;
        bodyParams?: Record<string, any>;
      }>(req);

      if (
        !body.scenarioId ||
        !body.specName ||
        !body.tagName ||
        !body.apiName
      ) {
        res.writeHead(400);
        res.end(
          JSON.stringify({
            error:
              "Missing required fields: scenarioId, specName, tagName, apiName",
          }),
        );
        return;
      }

      const code = await makeCode(this.manager, {
        case: body.scenarioId,
        specName: body.specName,
        tagName: body.tagName,
        apiName: body.apiName,
        requestParams: body.requestParams || {},
        bodyParams: body.bodyParams || {},
      });

      res.writeHead(200);
      res.end(JSON.stringify({ code }));
    } catch (error: any) {
      this.logger.error("代码生成失败", error);
      res.writeHead(400);
      res.end(
        JSON.stringify({ error: error?.message || "Code generation failed" }),
      );
    }
  }
}
