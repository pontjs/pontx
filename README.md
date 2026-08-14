# Pontx

[中文文档](./README.zh-CN.md)

**Website and curated API catalog:** [pontx.dev](https://pontx.dev/en)

API lifecycle management tool built on the Pontx-Spec protocol (compatible with OAS2/OAS3, supporting ROA/RPC). Provides API search, documentation generation, code generation, and SDK management.

## Features

- **Protocol Compatible** — Extended Pontx-Spec protocol based on OAS2/OAS3, supporting both ROA and RPC styles
- **Code Generation** — Generate type-safe client code from API definitions, multi-language support
- **VSCode Extension** — API explorer, smart search, documentation viewer, one-click code generation
- **MCP Server** — API search and code generation capabilities for AI tools
- **Multi-platform SDK** — Browser and Node.js SDKs, ready to use out of the box
- **CLI Tool** — Manage API metadata, validation, diff analysis, and code generation from the command line

## Packages

### Core

| Package | Version | Description |
| --- | --- | --- |
| [pontx](./packages/pontx) | 1.0.0-beta.1 | CLI tool & core engine |
| [@pontx/spec](./packages/spec) | 1.0.0-beta.1 | Pontx-Spec protocol definitions |
| [@pontx/mcp](./packages/mcp) | 1.0.0-beta.0 | MCP Server implementation |
| [vscode-pontx](./packages/vscode) | 2.0.8 | VSCode extension |
| [oas-spec-ts](./packages/oas-spec-ts) | 0.6.4 | OAS2/OAS3 TypeScript types |

### SDK

| Package | Version | Description |
| --- | --- | --- |
| [@pontx/sdk](./sdk/core) | 1.0.0-beta.1 | Shared core utilities (Browser & Node.js) |
| [@pontx/sdk-browser-client](./sdk/browser) | 0.0.11 | Browser SDK |
| [@pontx/nodejs-sdk](./sdk/nodejs-sdk) | 0.1.0 | Node.js SDK (>= 18) |

### Plugins

| Package | Description |
| --- | --- |
| [plugin-egg](./plugins/plugin-egg) | Egg.js framework plugin |

## Getting Started

### Installation

```bash
npm install pontx -g
```

### Install AI Skill (Recommended)

Pontx provides an **AI Skill** that helps AI assistants (Claude Code, Gemini CLI, etc.) understand your APIs and generate accurate code.

```bash
pontx skill
npx skills add https://github.com/pontjs/pontx --skill pontx
```

This installs a structured workflow guide into your project, enabling AI assistants to search APIs, generate type-safe code, and call APIs with full context — no manual prompting needed.

> **Tip**: Run `pontx skill` in every project that uses APIs — it's the fastest way to get AI-powered API development.

### Configuration

Create a `pontx.config.ts` in your project root:

```typescript
import { PontxConfig } from "pontx";

export default {
  origins: [
    {
      name: "petstore",
      url: "https://petstore.swagger.io/v2/swagger.json",
    },
  ],
} as PontxConfig;
```

### Generate Code

```bash
pontx generate
```

### Using the SDK

```typescript
import { createClient } from "@pontx/nodejs-sdk";

const client = createClient({
  baseURL: "https://api.example.com",
});
```

## Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Install Dependencies

```bash
pnpm install
```

### Build All Packages

```bash
pnpm build:all
```

### Run Tests

```bash
pnpm test
```

### Release

```bash
# Create a changeset
pnpm changeset

# Update versions
pnpm changeset:version

# Publish to npm
pnpm changeset:publish
```

## Tech Stack

- **Language**: TypeScript 5+
- **Build**: Rollup / esbuild / tsup / webpack
- **Testing**: Vitest
- **Frontend**: React + Vite + TailwindCSS
- **Package Management**: pnpm workspace + Changesets

## License

MIT
