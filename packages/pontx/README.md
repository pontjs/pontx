# Pontx

[中文文档](./README.zh-CN.md)

API lifecycle management CLI — search, explore, generate code, and call APIs directly from the terminal.

Built on the Pontx-Spec protocol (compatible with OAS2/OAS3, supporting ROA/RPC).

## Install

```bash
npm install pontx -g
```

## Install AI Skill (Recommended)

Pontx provides an AI Skill that helps AI assistants (Claude Code, Gemini CLI, etc.) understand your API context and generate accurate code.

```bash
pontx skill
```

This installs a structured workflow guide into your project, enabling AI assistants to:

- Search and explore your APIs with full context
- Generate type-safe SDK code with correct parameters
- Call APIs directly with proper authentication
- Follow best practices (dry-run before mutations, `-h` for parameter discovery)

> **Tip**: Run `pontx skill` in every project that uses APIs — it's the fastest way to get AI-powered API development.

## Quick Start

### 1. Initialize

```bash
pontx init
```

Creates a `pontx.config.ts` in your project:

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

### 2. Explore APIs

```bash
pontx list apis              # List all APIs
pontx search <keyword>       # Fuzzy search
pontx show-api <tag> <api>   # View API details
```

### 3. Generate Code

```bash
pontx generate               # Generate all SDK code
pontx gen <tag> <api>        # Generate code for a single API
```

### 4. Call APIs

```bash
pontx call <tag> <api> --dry-run   # Preview request
pontx call <tag> <api> -p key=val  # Execute call
```

## CLI Commands

| Command | Description |
| --- | --- |
| `pontx init` | Initialize config file |
| `pontx list specs` | List all data sources |
| `pontx list tags` | List all API tags |
| `pontx list apis` | List all APIs |
| `pontx list schemas` | List all data models |
| `pontx search <keyword>` | Search APIs |
| `pontx show-api <tag> <api>` | View API details |
| `pontx show-schema <schema>` | View schema details |
| `pontx gen <tag> <api>` | Generate code for a single API |
| `pontx generate` | Generate all SDK code |
| `pontx call <tag> <api>` | Call an API (use `--dry-run` first) |
| `pontx cli init` | Initialize SDK CLI project |
| `pontx cli build` | Build SDK CLI |
| `pontx completion install` | Install shell completions |
| `pontx skill` | Install AI Skill |
| `pontx cache:clean` | Clear build cache |
| `pontx quality --spec <file>` | Score PontxSpec static metadata quality |
| `pontx eval --spec <file> --cases <path>` | Evaluate whether an Agent can call APIs through the CLI |

> Use `-h` at any level to discover subcommands and parameters: `pontx call -h`, `pontx call pet -h`, `pontx call pet getPetById -h`

## Metadata Quality Evaluation

Static evaluation scores PontxSpec structure, directory reachability, API contracts, descriptions, explicit leaf examples, runtime metadata, and locale alignment. Complex object/array/reference nodes do not need examples; their resolved leaf fields do.

```bash
pontx quality --spec ./api-lock.json --json
pontx quality --spec ./zh-CN.json --locales ./locales
```

Dynamic evaluation gives an Agent only the generated CLI and metadata-derived help. Calls run against an isolated `executeApi` fixture and never reach the real API. Successful fixture responses are also checked offline against the declared Pontx response schema; enum, type, required-field, object, array, local-reference, and common scalar-constraint mismatches fail the case, cap it at 35/50, and emit a machine-readable fixture JSON Pointer:

```bash
pontx eval --spec ./api-lock.json --cases ./eval-cases --agent codex --json
pontx eval --spec ./api-lock.json --cases ./eval-cases --runs 3 --json
```

Each case is independent of the metadata being tested:

```json
{
  "id": "get-pet",
  "task": "Find the name of pet p-1",
  "expected": {
    "api": "pet/getPet",
    "request": { "method": "GET", "path": "/pets/p-1" },
    "answerContains": ["Milo"]
  },
  "fixture": { "status": 200, "data": { "name": "Milo" } }
}
```

Quality findings do not change the process exit code. Invalid command configuration or evaluator failures still return non-zero, so CI can distinguish metadata scores from broken evaluation infrastructure.

## Build SDK CLI

Create a standalone, distributable CLI tool for your team's APIs:

```bash
mkdir my-api-cli && cd my-api-cli
npm init -y
npm install pontx

pontx cli init --name my-api-cli
pontx cli build
```

This generates:
- A ready-to-use CLI binary
- An AI Skill (`skills/<cli-name>/SKILL.md`) with real examples from your API spec

## Shell Completion

```bash
pontx completion install     # Auto-detect shell (zsh/bash/fish)
```

Provides tab completion for commands, API tags, API names, and parameters.

## Configuration

See [`pontx.config.ts` reference](https://github.com/pontjs/pontx) for full configuration options including:

- **origins** — API data sources (URL, local file, or custom fetcher)
- **outDir** — Output directory for generated code
- **plugins** — Code generation plugins
- **executeApi** — API call configuration (headers, auth, base URL)
- **translateConfig** — Chinese-to-English translation for identifiers

## Requirements

- Node.js >= 18.0.0

## License

MIT
