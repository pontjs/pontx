# Pontx

<p align="center">
    <img width="200" src="https://img.alicdn.com/imgextra/i1/O1CN01DfTvFn1MjlQ9g9Dmn_!!6000000001471-2-tps-200-200.png">
</p>

<h1 align="center">Pontx</h1>

[Pontx](https://github.com/pontjs/pontx) is a lightweight pluggable API management tools by [Pontx API Spec](https://github.com/pontjs/pontx/blob/main/packages/pontx-spec/docs/classes/PontSpec.md), which inherit [OAS2](https://swagger.io/specification/v2/) compatibility.

Pontx provides service by Pontx CLI、[Pontx VSCode IDE Extension](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx) and Web Platform(WIP).

## Features

* <strong>SDK generating</strong>. Pontx generate most popular style SDK like SWR by built-in SDK generate plugin.
* <strong>API Mocks</strong>. Pontx will generate mocking data automatically. Pontx SDK will return mocks data through Pontx configuration.
* <strong>API changement manage</strong>. Pontx will generate API changement report in detail, and you can update your local `Pontx API Spec` by select granularly changement.
* <strong>API documentation</strong>. View clearest and elaborate API documentation in IDE.
* <strong>API searching</strong>. Searching API in IDE and then insert snippets or view documentation.
* <strong>API design</strong>. Writing Pontx API Spec with real-time documentation preview. Pontx API Spec can be managed by `git` automatically.
* <strong>API debug</strong> Support API Debugger in IDE

All lifecle features can be highly customed with Pontx plugin. [Pontx Plugin Development Guide](https://github.com/pontjs/pontx/blob/main/PluginContribution.md)

English | [简体中文](./README.zh-CN.md)

## Quick Start

Config a valid `pontx-config.json` in your project, and pontx will automatically activated.

### Pontx Configuration


#### Configuration Sample

  ```js
  // pontx-config.json
  {
    "outDir": "../src/pontx-services",
    "plugins": {
      // pontx built-in plugin or your custom plugin
    },
    "origins": [{
      // Pontx support mulitple origins in one project.
      // Pontx support OAS2、OAS3 origin by default. You can contribute Pontx Parse Plugin to support other type of origin.
      "name": "name1",
      "url": "myhost/v2/api-docs.json"
    }, {
      "name": "name2",
      "envs": {
        "daily": "my-daily-host/v2/api-docs.json",
        "pre": "my-pre-host/v2/api-docs.json",
        "prod": "myhost/v2/api-docs.json",
      },
      "env": "prod"
    }]
  }
  ```

  For more Pontx Configuration detail, see the [Pontx Configuration Guide](./docs/Configuration.md).

### Usage

#### VSCode Extension Guide

[Pontx VSCode Extension](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)

[![Version](https://img.shields.io/visual-studio-marketplace/v/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)
[![Ratings](https://img.shields.io/visual-studio-marketplace/r/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)

 * Extension UI Guide

![VSCode Extension Guide](https://img.alicdn.com/imgextra/i3/O1CN01AWodzd1KMkHYgvhiW_!!6000000001150-2-tps-1854-1396.png)

 * API changes management

![API changement manage](https://img.alicdn.com/imgextra/i4/O1CN01CJgI7L1Q2wr6VsN3r_!!6000000001919-2-tps-882-366.png)

 * API Searching

![API Serching](https://img.alicdn.com/imgextra/i3/O1CN01gcgW4z1iVUcgbdpNK_!!6000000004418-2-tps-1750-532.png)

For more Pontx VSCode Extension details, see the [Pontx VSCode Extension Guide](./VSCodeExtensionGuide.md).

#### Pontx CLI Guide

##### Installation

```sh
npm i pontx-cli -g
```

##### Guide

* <strong>pontx generate</strong> Fetch Origin API Spec and generate SDK.

