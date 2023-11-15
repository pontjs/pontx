# Pontx

<p align="center">
    <img width="200" src="https://img.alicdn.com/imgextra/i1/O1CN01DfTvFn1MjlQ9g9Dmn_!!6000000001471-2-tps-200-200.png">
</p>

<h1 align="center">Pontx</h1>

[Pontx](https://github.com/pontjs/pontx) 是一个轻量的插件化的 API 生命周期管理工具，以 [Pontx API Spec](https://github.com/pontjs/pontx/blob/main/packages/pontx-spec/docs/classes/PontSpec.md) 为标准提供 API 生命周期管理能力。

[Pontx API Spec](https://github.com/pontjs/pontx/blob/main/packages/pontx-spec/docs/classes/PontSpec.md) 是一个支持 RESTful、RPC 等不同风格的 OpenAPI 设计规范，继承且兼容 [OAS2](https://swagger.io/specification/v2/) 和 [JSONSchema](https://json-schema.org/)。

Pontx 通过 Pontx CLI、[Pontx VSCode IDE Extension](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx) 和 Pontx Web 平台(WIP) 来提供服务。

简体中文 | [English](./README.md)

## 特性

* <strong>SDK 生成</strong> Pontx 内置多种热门 API 调用风格的 SDK 生成插件，如 [SWR](https://github.com/vercel/swr)、标准 fetch 等。Pontx SDK 全面拥抱 Typescript，API Spec 中所有配置，都会转换成 Typescript 特性，帮助开发者更好地编写 OpenAPI 调用程序。
* <strong>API Mocks</strong> Pontx 内置自动化生成 Mocks 数据的能力，结合 SDK 插件，开发者可按需配置让接口直接返回 Mocks 数据。
* <strong>API 变更管理</strong> Pontx 通过详细的 API 变更分析，将为您生成详细的 API 变更报表。您也可以通过细粒度的 API 变更管理，有选择的更新您的本地 API 数据。这在多人协作的项目中尤其需要。
* <strong>API 文档</strong> 通过 Pontx IDE Extension，您可以便捷的查看代码中 API 的文档，了解出入参结构及相关约束信息。
* <strong>API 设计</strong> 通过实时的 API 文档预览，智能的 Pontx API Spec Editor，资源优先的API设计理念，Pontx 帮助你更高效的设计高质量 API。
* <strong>API 调试</strong> 在 IDE 中进行便捷的 API 调试。

## 快速开始

在您的项目中，配置有效的 `pontx-config.json` 文件，Pontx 将立即启动。

`pontx-config.json` 配置详情请查阅下文。

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


#### VSCode 插件使用指南

[插件地址](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)

[![Version](https://img.shields.io/visual-studio-marketplace/v/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)
[![Ratings](https://img.shields.io/visual-studio-marketplace/r/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)

 * <strong>功能布局</strong>

![VSCode Extension Guide](https://img.alicdn.com/imgextra/i3/O1CN01AWodzd1KMkHYgvhiW_!!6000000001150-2-tps-1854-1396.png)

 * <strong>API 变更分析及管理</strong>

如果您的项目涉及多人协作，在数据源不断变化的同时，建议您只更新自己有关的 API，避免整个 SDK 的更新，导致非相关模块类型报错。

如下图，类似 VSCode Git 管理。Pontx 将数据源的变更列在 Changes 菜单中，添加相关变更至 Staged Change，点击 ✅ 后，Pontx 将更新这些数据源。

![API changement manage](https://img.alicdn.com/imgextra/i4/O1CN01CJgI7L1Q2wr6VsN3r_!!6000000001919-2-tps-882-366.png)

 * </strong>API 搜索</strong>

在 VScode Extension 中，默认 API 搜索的 快捷键为 cmd + ctrl + p. 搜索到 API 后，您可以参阅 API 文档，或快速插入该 API 调用的不同类型的代码段。

![API Serching](https://img.alicdn.com/imgextra/i3/O1CN01gcgW4z1iVUcgbdpNK_!!6000000004418-2-tps-1750-532.png)

 * <strong>API Mocks</strong>

Pontx 默认在 outDir 下生成 mocks 文件夹。Pontx 根据 API 的出参结构，自动为您生成所有 API 的 mocks 数据。
您可以在 PontSDK Core 中，修改 fetch 方法，根据当前环境和调用配置，判断是否返回 mocks 数据。

如果您对 mocks 文件进行修改，当 Pontx 重新生成 Mocks 数据时，您的修改会被保留。此外，每个 API 的 mocks 数据都可以重新生成，您可以点击 API mocks 文件右上角 mock icon，重新生成当前 API 的 Mocks 数据。

更多 Pontx VSCode Extension 细节, 请参阅 [Pontx VSCode Extension Guide](./packages/vscode-pontx/README.md).

#### Pontx CLI 使用指南

##### 安装

```sh
npm i pontx-cli -g
```

##### 使用

* <strong>`pontx generate`</strong> 拉取并更新API元数据，生成最新的SDK代码。
