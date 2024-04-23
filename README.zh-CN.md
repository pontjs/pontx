# Pontx

<p align="center">
    <img width="200" src="https://img.alicdn.com/imgextra/i1/O1CN01e19ZVX1FIYhY9k2Gt_!!6000000000464-2-tps-200-200.png">
</p>

<h1 align="center">Pontx</h1>

Pontx 是一个轻量的插件化的 API 生命周期管理工具，遵循 [Pontx API Spec](https://github.com/pontjs/pontx/blob/main/packages/pontx-spec/docs/classes/PontSpec.md) 标准，具备 AI 辅助功能，支持 API 设计、变更管理、文档生成，API 调试、SDK 生成、Mocks 生成、API 实现和调用代码生成等生命周期管理能力。

[Pontx API Spec](https://github.com/pontjs/pontx/blob/main/packages/pontx-spec/docs/classes/PontSpec.md) 是一个支持 RESTful、RPC 等不同风格的 OpenAPI 设计规范，支持泛型类的表达，继承 [OAS2](https://swagger.io/specification/v2/) 和 [JSONSchema](https://json-schema.org/) 规范。

Pontx 通过提供多种形式的 API 管理服务。

* [Pontx 平台](https://www.pontxapi.com/)

* [Pontx VSCode IDE Extension](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)

* [Pontx CLI](./packages/pontx-cli/)

简体中文 | [English](./README.en-US.md)

## 特性

* <strong>API 设计</strong>：通过 AI 帮助进行 [API 设计](https://www.pontxapi.com/)。Pontx 平台利用 ChatGPT 等大型模型，结合模型优先的 API 设计理念，同时提供便利的智能代码编辑器、实时文档预览等工具，帮助设计高质量 API。
* <strong>SDK 生成</strong>：Pontx 内置多种热门的 API 调用风格的 SDK 生成插件，如 [SWR](https://github.com/vercel/swr)风格、Nodejs、标准 fetch 等。支持 SSE 流式接口。Pontx SDK 全面拥抱 Typescript，帮助开发者生成高体验、自文档的 SDK。
* <strong>API Mocks</strong>：Pontx 内置自动生成 Mocks 数据的功能，结合 SDK 插件，开发者可以配置使接口直接返回 Mocks 数据。
* <strong>API 变更管理</strong>：Pontx 通过详细的 API 变更分析，为您生成详细的 API 变更报表。您可以选择更新所关心的 API 的 SDK。
* <strong>API 文档</strong>：可以通过 Pontx 平台、Pontx IDE Extension、Pontx UI 等多种途径实时查阅 API 文档。
* <strong>API 调试</strong>：一键快速调试。
* <strong>AI 代码生成</strong>：Pontx 内置丰富的提示词，根据您的 API 元数据生成不同端、不同框架、不同语言、不同场景的 API 使用代码。
* <strong>API 开发</strong> 根据 API 设计元数据，通过 AI 帮助生成数据库设计、后端 Controller 定义SDK、后端 Service 实现代码。目前已支持 Eggjs 框架。

## 快速开始

如果您使用的是 VSCode 插件或 CLI。只需配置合法的 pontx-config.json 文件，Pontx 的 VSCode 插件和 CLI 就会自动启动。

> 注意，IDE 的 AI 能力，需要将您的 API 元数据管理在 [Pontx 平台](https://www.pontxapi.com/)中。

### Pontx 配置示例

  ```json
  {
    // SDK 生成路径（相对路径）
    "outDir": "",
    "plugins": {
      // 插件配置，默认使用 async-sdk，
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
    }, {
      "name": "dashscope",
      // 使用 pontx 平台数据源，IDE 插件将开启 AI 能力。
      "url": "https://www.pontxapi.com/openapi/projects/dashscope/spec",
    }]
  }
  ```

Pontx 内置插件如下：

* fetch
  * pontx-meta-fetch-plugin(内置的元数据获取插件): 通过 HTTP 请求获取元数据。
* parser
	* 内置 Parser 插件: 支持 OAS2/OAS3（Swagger2/Swagger3）元数据的解析和转换。
* generate
	* 内置的 SDK 生成插件: 目前支持异步接口请求、React Hooks、Nodejs http 请求等。且支持 SSE 流式返回。
* mocks
  * pontx-mocks-plugin: 内置的 Mocks 插件。

了解更多 Pontx 配置细节，请参阅 [Pontx 配置指南](./docs/Configuration.md)。

### Pontx 使用指南

Pontx 提供服务的方式包括 Pontx 平台、VSCode 插件和 CLI。

#### VSCode Pontx 插件使用指南

[VSCode Pontx 地址](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)

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

 * <strong>AI 代码生成</strong>
	AI 生成代码，在结合你的 API 元数据，以及技术栈、组件库和框架后，生成的代码高度可用。尤其是中后台产品的前后端代码，基本可以直接使用。

	前提条件：您的元数据管理在 [Pontx 平台](https://www.pontxapi.com/)

	1、`cmd + ,` （或 Preferences -> Settigns ）打开 VSCode Settings。

	2、搜索找到 Pontx 配置项

	3、打开 AI Enable 配置项，配置组件库（ui-library）如 antd、@arco-design/web-react、@alifd/next（fusion）等。

	4、通过 API 搜索找到对应的 API（或 Controller 和数据结构），在选项中选择 AI 生成代码对应场景。即可为您流式生成代码

	5、您可以在 Pontx 平台中自定义更多场景的提示词。

 * <strong>API 文档</strong>

	点击左侧目录中的 API，或搜索 API 后，都可以查阅 API 文档。

 * <strong>API Mocks</strong>

Pontx 默认在 outDir 下生成 mocks 文件夹。Pontx 根据 API 的出参结构，自动为您生成所有 API 的 mocks 数据。
您可以在 PontSDK Core 中，修改 fetch 方法，根据当前环境和调用配置，判断是否返回 mocks 数据。

如果您对 mocks 文件进行修改，当 Pontx 重新生成 Mocks 数据时，您的修改会被保留。此外，每个 API 的 mocks 数据都可以重新生成，您可以点击 API mocks 文件右上角 mock icon，重新生成当前 API 的 Mocks 数据。

了解更多 Pontx VSCode Extension 细节，请参阅 [Pontx VSCode Extension Guide](./packages/vscode-pontx/README.md).

#### Pontx CLI 使用指南

##### 安装

```sh
npm i pontx-cli -g
```

##### 使用

* <strong>`pontx generate`</strong> 拉取 API 元数据，生成 SDK 代码。
