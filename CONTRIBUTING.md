# CONTRIBUTING

## GET START

```sh
git clone git@github.com:alibaba/pont.git

cd pont

lerna bootstrap

npm start

npm run vs-ui
```

## Debug with VSCode

Debug pont-cli by select "Debug Pont CLI" in VSCode Debug Panel.
Debug vscode-pont by select "Debug Extension" in VSCode Debug Panel.

## Code Style

## 为什么做 Pont2 升级

- 1、原 Pont Spec 设计不合理，Pont2 拥抱行业标准，在 Spec 设计上拥抱 JSON Schema 和 OAS，以降低 parser 和其它插件的开发成本。
- 2、Pont 在不同功能的定制化需求多样，社区需要一个插件化的 Pont，以低成本，标准化的方式，开发和贡献可贡献的 Pont 插件库。
- 3、升级 Pont 在部分技术细节上的设计。详情见各插件和模块说明。

## 设计理念

拥抱标准、插件化、合理分包，每个包可单独引用。

## 规划

## pont2 architecture

![architecture image](https://img.alicdn.com/imgextra/i2/O1CN01qfxgje261ldyXx5rl_!!6000000007602-2-tps-1504-370.png)

### kernel

- pont-spec
  描述 Pont 标准数据源的类型，提供 Pont 标准数据源的常用数据处理方法。
  新版 Pont 标准数据源做了升级，全面拥抱 JSON Schema 标准。

- pont-core
  pont 核心包，包括配置文件解析、不同生命周期的插件加载和执行

- pont-ui

以 pont-spec 元数据渲染的 API 工具页。 包括 API 搜素、目录、文档、试用&调试、mocks 编辑等基本组件。用以组装可部署的 pont-platform，或以 webview 为基础的 vscode、intellj idea 插件。

### plugins

pont 在不同生命周期提供的能力，目前都已进行插件化改造。其中常用插件，也将在 pont 代码库中维护，以把控质量，并为社区化开发提供样板。
插件类别如下：

- fetch 元数据请求插件

  内置插件：

  - pont-meta-fetch-plugin 通过接口请求元数据

- parser 元数据解析转换插件

  - pont-oas2-parser-plugin Swagger2 转换为 pont-spec 的插件

- generate

  - pont-generate-core
    提供 SDK 生成的基本方法，提供调用示例的 snippet。

  - pont-react-hooks-generate-plugin
    生成前端 SDK。包含 React Hooks 的调用方法（use-swr）。

- mocks
  提供 mocks 服务。

- report
  记录变更
