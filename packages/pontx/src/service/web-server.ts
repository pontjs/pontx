/**
 * @author: jasonHzq
 * @description: Web 服务器，提供 API 接口和调试界面
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { createLogger } from "../logger/logger";
import type { Logger } from "../logger/types";
import { PontxManager } from "../manager";

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

  constructor(port: number, logger: Logger) {
    this.port = port;
    this.logger = logger;
  }

  /**
   * 设置 PontxManager 实例
   */
  setManager(manager: PontxManager): void {
    this.manager = manager;
  }

  /**
   * 启动 Web 服务器
   */
  async start(): Promise<void> {
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
        }
      );

      this.server.listen(this.port, () => {
        this.logger.info(`Web 服务启动成功，端口: ${this.port}`);
        resolve();
      });

      this.server.on("error", (error: Error) => {
        this.logger.error("Web 服务启动失败", { error });
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
    res: ServerResponse
  ): Promise<void> {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const pathname = url.pathname;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
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

        default:
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Not found" }));
      }
    } catch (error) {
      this.logger.error("Web 请求处理错误", error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }

  /**
   * 处理根路径请求
   */
  private async handleRootRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
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
            <h1>🚀 Pontx Service</h1>
            <p>API 生命周期管理服务</p>
        </div>
        
        <div class="api-section">
            <h2>📊 API 接口</h2>
            
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
            <h2>🔧 快速测试</h2>
            <button onclick="testAPI('/api/status')">测试状态接口</button>
            <button onclick="testAPI('/api/specs')">测试 Specs 接口</button>
            <button onclick="testSync()">测试同步接口</button>
            <div id="result" style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 3px; display: none;"></div>
        </div>
    </div>
    
    <script>
        async function testAPI(url) {
            try {
                const response = await fetch(url);
                const data = await response.json();
                showResult(url, data);
            } catch (error) {
                showResult(url, { error: error.message });
            }
        }
        
        async function testSync() {
            try {
                const response = await fetch('/api/sync', { method: 'POST' });
                const data = await response.json();
                showResult('/api/sync', data);
            } catch (error) {
                showResult('/api/sync', { error: error.message });
            }
        }
        
        function showResult(url, data) {
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<strong>' + url + '</strong><br><pre>' + JSON.stringify(data, null, 2) + '</pre>';
        }
    </script>
</body>
</html>`;

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  }

  /**
   * 处理状态请求
   */
  private async handleStatusRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        service: "Pontx Service",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        port: this.port,
      })
    );
  }

  /**
   * 处理 Specs 请求
   */
  private async handleSpecsRequest(
    req: IncomingMessage,
    res: ServerResponse
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
    res: ServerResponse
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
    url: URL
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
}
