# CONTRIBUTING

## GET START

```sh
git clone git@github.com:alibaba/pont.git

cd pont

lerna bootstrap

npm run watch
```

## Debug with VSCode

Select "Debug Pont CLI" in VSCode Debug Panel, and click Debug button.

## pont architecture

![architecture image](https://img.alicdn.com/imgextra/i2/O1CN01qfxgje261ldyXx5rl_!!6000000007602-2-tps-1504-370.png)

### kernel

* pont-spec
描述 Pont 标准数据源的类型，提供 Pont 标准数据源的常用数据处理方法。
新版 Pont 标准数据源做了升级，全面拥抱 JSON Schema 标准。

* pont-core
pont 核心包，包括配置文件解析、不同生命周期的插件加载和执行

### plugins

pont 在不同生命周期提供的能力，目前都已进行插件化改造。其中常用插件，也将在 pont 代码库中维护，以把控质量，并为社区化开发提供样板。
插件类别如下：

* fetch 元数据请求插件

    内置插件：

    * pont-meta-fetch-plugin 通过接口请求元数据

* parser 元数据解析转换插件
  * pont-oas2-parser-plugin  Swagger2 转换为 pont-spec 的插件

* generate
  * pont-generate-core
		提供 SDK 生成的基本方法

  * pont-react-hooks-generate-plugin
		生成前端 SDK。包含 React Hooks 的调用方法（use-swr）。

* mocks
		提供 mocks 服务。

* report
		记录变更
