# Pontx

[![Version](https://img.shields.io/visual-studio-marketplace/v/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)
[![Ratings](https://img.shields.io/visual-studio-marketplace/r/jasonhzq.vscode-pontx)](https://marketplace.visualstudio.com/items?itemName=jasonHzq.vscode-pontx)

[pontx](https://github.com/pontjs/pontx) is a lightweight API management tools. Supporting API searching, documentation, debug, design, changement analysis, mocks data auto generating and serving, SDK generating...

pontx provide different types of services: CLI、VSCode IDE Extension、Platform e.g.

pontx can be highly customed with full lifecle plugin. [Plugin development guide](https://github.com/pontjs/pontx/blob/main/PluginContribution.md)

## Quick Start
  Once the pontx configuration file named `pontx-config.json` is detected, Pontx will be automatic activated.

  ### Settings

  #### Settings Sample

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

## Features Overview

### API Fetching & Parse

With Pontx, you can fetch API meta data from different and parse to [`Pontx Spec`](https://github.com/pontjs/pontx/blob/main/packages/pontx-spec/docs/classes/PontSpec.md#properties-1).

### SDK Genenrating

you can generate different sdk code by Pontx generate plugin or your custom generate plugin.

### API Searching

search API by shortcut key `cmd + ctrl + p`. or click search icon in Pontx panel.

### API documentation

### API changing management

### API editing

### API mocks
