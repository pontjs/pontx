# Pontx

<p align="center">
    <img width="200" src="https://img.alicdn.com/imgextra/i1/O1CN01DfTvFn1MjlQ9g9Dmn_!!6000000001471-2-tps-200-200.png">
</p>

<h1 align="center">Pontx</h1>


[Pontx](https://github.com/pontjs/pontx) is a lightweight API management tools. Supporting API searching, documentation, debug, design, changement analysis, mocks data auto generating and serving, SDK generating...

pontx provide different types of services: CLI、VSCode IDE Extension、Platform e.g.

pontx can be highly customed with full lifecle plugin. [Plugin development guide](https://github.com/pontjs/pontx/blob/main/PluginContribution.md)

简体中文 | [English](./README.en-US.md)

## Installing

## Quick Start
  Once the pontx configuration file named `pontx-config.json` is detected, Pontx will be automatic activated.

### Pontx Configuration

pontx-config.json 

#### Configuration Sample

  ```json
  {
    "outDir": "",
    "plugins": {
      // pontx plugin or your custom plugin
    },
    "origins": [{
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
  
  For more Pontx Configuration detail, see the [Pontx Configuration Guide](./Configuration.md).


#### VSCode Extension Guide

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

## Plugins & Tools

### API Fetching & Parse

With Pontx, you can fetch API meta data from different and parse to [`Pontx Spec`](https://github.com/pontjs/pontx/blob/main/packages/pontx-spec/docs/classes/PontSpec.md#properties-1).

### SDK Genenrating

You can generate SDK codes in different languages by using different Pontx generate plugin, or your can writing your custom SDK generate plugin.

### API Searching

Searching API by shortcut key `cmd + ctrl + p`. Or click search icon in Pontx panel.

### Other Features

* API documentation

* API changes management

* API design

* API mocks

* ...
