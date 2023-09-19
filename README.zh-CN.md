# Pontx

<p align="center">
    <img width="200" src="https://img.alicdn.com/imgextra/i1/O1CN01DfTvFn1MjlQ9g9Dmn_!!6000000001471-2-tps-200-200.png">
</p>

<h1 align="center">Pontx</h1>

[Pontx](https://github.com/pontjs/pontx) 是一个轻量的 API 生命周期管理工具。支持 API 设计、变更分析、自动化 Mocks、SDK 代码生成、API 文档及调试、API 搜索等功能。

Pontx 支持不同的 CLI、VSCode IDE Extension、平台服务等方式来提供 API 管理及消费能力。

Pontx 采用插件化的机制进行开发。每个 API 管理生命周期，您都根据使用场景，开发高度定制化的插件。插件开发请查阅[插件开发指南](https://github.com/pontjs/pontx/blob/main/PluginContribution.md)

简体中文 | [English](./README.md)

## 安装

安装 VSCode 插件： [vscode-pontx](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)

安装 CLI：
```sh
npm i -g pontx-cli
```

[Pontx 相关工具及插件](https://www.npmjs.com/search?q=pontx-)

## 快速开始

在您的项目中，如检测到有效的 `pontx-config.json` 文件，Pontx 将立即启动。`pontx-config.json` 配置方式请查看下文。

### Pontx 配置

#### 配置示例

  ```json
  {
		// SDK 生成路径（相对路径）
    "outDir": "",
    "plugins": {
      // 插件配置
    },
    "origins": [{
      // 数据源配置，每个数据源需要单独命名。
      "name": "name1",
			// 数据源地址，如 Swagger 数据源地址
      "url": "myhost/v2/api-docs.json"
    }, {
      "name": "name2",
      "envs": {
				// 多环境配置
        "daily": "my-daily-host/v2/api-docs.json",
        "pre": "my-pre-host/v2/api-docs.json",
        "prod": "myhost/v2/api-docs.json",
      },
      "env": "prod"
    }]
  }
  ```

查阅更多 Pontx 配置细节，请参阅 [Pontx 配置指南](./Configuration.md)。


#### VSCode Extension 使用指南

[![Version](https://img.shields.io/visual-studio-marketplace/v/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)
[![Ratings](https://img.shields.io/visual-studio-marketplace/r/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)

 * VSCode Extension UI 布局

![VSCode Extension Guide](https://img.alicdn.com/imgextra/i3/O1CN01AWodzd1KMkHYgvhiW_!!6000000001150-2-tps-1854-1396.png)

 * API 变更分析及管理

如果您的项目涉及多人协作，在数据源不断变化的同时，建议您只更新自己有关的 API，避免整个 SDK 的更新，导致非相关模块类型报错。

如下图，类似 VSCode Git 管理。Pontx 将数据源的变更列在 Changes 菜单中，添加相关变更至 Staged Change，点击 ✅ 后，Pontx 将更新这些数据源。

![API changement manage](https://img.alicdn.com/imgextra/i4/O1CN01CJgI7L1Q2wr6VsN3r_!!6000000001919-2-tps-882-366.png)

 * API 搜索

在 VScode Extension 中，默认 API 搜索的 快捷键为 cmd + ctrl + p. 搜索到 API 后，您可以参阅 API 文档，或快速插入该 API 调用的不同类型的代码段。

![API Serching](https://img.alicdn.com/imgextra/i3/O1CN01gcgW4z1iVUcgbdpNK_!!6000000004418-2-tps-1750-532.png)

 * API Mocks

Pontx 默认在 outDir 下生成 mocks 文件夹。Pontx 根据 API 的出参结构，自动为您生成所有 API 的 mocks 数据。
您可以在 PontSDK Core 中，修改 fetch 方法，根据当前环境和调用配置，判断是否返回 mocks 数据。

如果您对 mocks 文件进行修改，当 Pontx 重新生成 Mocks 数据时，您的修改会被保留。此外，每个 API 的 mocks 数据都可以重新生成，您可以点击 API mocks 文件右上角 mock icon，重新生成当前 API 的 Mocks 数据。

更多 Pontx VSCode Extension 细节, 请参阅 [Pontx VSCode Extension Guide](./packages/vscode-pontx/README.md).
