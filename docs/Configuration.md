# Pontx Configuration Guide

## 简介

`pontx-config.json` 可以配置在项目中任何位置 ，Pontx 将从你的项目递归寻找该文件。建议您配置在项目 config/ 目录下，和其它配置文件一起存放。

如果您安装了 vscode-pontx，`pontx-config.json` 的配置项是支持智能填写的，每个字段的含义和填写说明，IDE 也都将提示出来。

## pontx 配置字段说明

* outDir: SDK 生成位置，使用相对路径。如 "../src/pontx-services"

* origins: 数据源列表，每个数据源配置请参看 PontxOrigin 配置
* plugins: 插件配置，目前支持以下不同生命周期的插件配置。
  * fetch：元数据拉取。默认插件为 pontx-meta-fetch-plugin。拉取 origin.url 指定资源的文本内容。
  * parser: 元数据转换插件。将拉取的文本内容转换为 Pontx Spec。默认插件为 pontx-oas2-parser-plugin(Swagger2) 插件，Pontx 也内置 pontx-oas3-parser-plugin.
  * generate: SDK 生成插件。生成 Pontx SDK。默认插件为 pontx-react-hooks-generate-plugin.
  * mocks: Mocks 数据生成插件，通过 OpenAPI responses 指定的 JSONSchema，自动生成接口 Mocks 数据。Pontx Mocks 功能使用请参阅 [VSCode Pontx Mocks 使用指南]()
* translate: 翻译插件配置。

    翻译插件用来解决数据源不正确的问题，如某字段名为中文。翻译插件可将中文变量名经过翻译转换为 camelCase 的英文变量名。翻译插件配置示例：

  ```json
  {
        "outDir": "../src/pontx-services",
        "translate": {
            "cacheFilePath": "translateCache.json",
            "baidu": {// 内置百度翻译插件
                "appId": "your app id",
                "secret": "your secret"
            }
        }
}
  ```

    目前翻译器内置百度翻译。您也可以开发自定义的翻译器插件。

* prettierConfig： prettier 配置


### PontxOrigin 配置

* name: 必填字段，建议命名为首字母小写的 camelCase 。该字段用于命名当前数据源的，将用作 SDK 生成依据。
* url:  Pontx 默认的 fetch 插件，将通过 url 字段配置拉取元数据。
* envs: 您可以通过 envs 字段配置多个数据来源，并通过 env 字段进行切换，如：

```
{
  "name": "petStore",
  "envs": {
    "online": "http://pet.com/v2/api-docs.json",
    "pre": "http://pre.pet.com/v2/api-docs.json",
    "pre-2": "http://pre2.pet.com/v2/api-docs.json"
  },
  "env": "online"
}
```
* plugins：可定制当前数据源的插件，配置项与全局 plugins 配置相同。如某个数据源比较特殊，数据来源为 OAS3，其它数据来源为 OAS2。则可以通过数据源插件进行覆盖配置。
