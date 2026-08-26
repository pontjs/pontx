import { Command, Option } from "commander";
import { access, mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, resolve, sep } from "node:path";
import type {
  HubOperationDetail,
  HubRequestInput,
} from "./catalog-source";
import { RemoteHubCatalogSource } from "./remote-source";

type HubCommandOptions = {
  json?: boolean;
  locale?: "zh" | "en";
  param?: string[];
  header?: string[];
  body?: string;
  yes?: boolean;
};

function collect(value: string, previous: string[]): string[] {
  return previous.concat(value);
}

function sourceFor(command: Command): RemoteHubCatalogSource {
  const hub = command.parent;
  return new RemoteHubCatalogSource(hub?.opts().url);
}

function parseValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function keyValues(values: string[] = []): Record<string, any> {
  return Object.fromEntries(
    values.map((item) => {
      const separator = item.indexOf("=");
      if (separator < 1) {
        throw new Error(`Expected key=value, received: ${item}`);
      }
      return [item.slice(0, separator), parseValue(item.slice(separator + 1))];
    }),
  );
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function buildRequest(
  detail: HubOperationDetail,
  options: HubCommandOptions,
): Promise<HubRequestInput> {
  const values = keyValues(options.param);
  const path: Record<string, unknown> = {};
  const query: Record<string, unknown> = {};
  const headers = Object.fromEntries(
    (options.header ?? []).map((item) => {
      const separator = item.indexOf(":");
      if (separator < 1) throw new Error(`Expected Header: value, received: ${item}`);
      return [item.slice(0, separator).trim(), item.slice(separator + 1).trim()];
    }),
  );

  for (const parameter of detail.operation.parameters) {
    if (!(parameter.name in values)) continue;
    if (parameter.in === "path") path[parameter.name] = values[parameter.name];
    if (parameter.in === "query") query[parameter.name] = values[parameter.name];
    if (parameter.in === "header") {
      headers[parameter.name] = String(values[parameter.name]);
    }
  }

  const scheme = detail.api.auth[0];
  let auth: HubRequestInput["auth"];
  if (scheme?.type === "basic") {
    const username = process.env[scheme.usernameEnvVar ?? ""];
    const password = process.env[scheme.passwordEnvVar ?? ""];
    if (username && password) {
      auth = { type: "basic", schemeId: scheme.id, username, password };
    }
  } else if (scheme?.envVar && process.env[scheme.envVar]) {
    const credential = process.env[scheme.envVar]!;
    if (scheme.type === "apiKey") {
      auth = { type: "apiKey", schemeId: scheme.id, value: credential };
    } else {
      auth = { type: scheme.type, schemeId: scheme.id, token: credential };
    }
  }

  return {
    apiSlug: detail.api.slug,
    operationSlug: detail.operation.slug,
    serverId: detail.api.servers[0].id,
    path,
    query,
    headers,
    ...(options.body ? { body: parseValue(options.body) } : {}),
    ...(auth ? { auth } : {}),
  };
}

function addRequestOptions(command: Command): Command {
  return command
    .option("-p, --param <key=value>", "请求参数，可重复", collect, [])
    .option("-H, --header <header>", "请求头，可重复", collect, [])
    .option(
      "--body <json>",
      "JSON 请求体（凭证只从 operation 指定的环境变量读取）",
    );
}

export function registerHubCommands(program: Command): void {
  const hub = program
    .command("hub")
    .description("搜索、预演和调用 Pontx API Hub 中的精选 API")
    .option(
      "--url <url>",
      "Hub 地址",
      process.env.PONTX_HUB_URL || "https://hub.pontx.dev",
    );

  hub
    .command("list")
    .description("列出 Hub API 目录")
    .option("--json", "输出 JSON")
    .option("--locale <locale>", "zh | en", "en")
    .action(async (options: HubCommandOptions, command: Command) => {
      const apis = await sourceFor(command).list();
      if (options.json) return print(apis);
      for (const api of apis) {
        console.log(
          `${api.slug.padEnd(14)} ${api.name} · ${api.operationCount} operations · ${api.packageName}`,
        );
      }
    });

  hub
    .command("search <query>")
    .description("搜索 Hub API 与操作")
    .addOption(
      new Option("--locale <locale>", "zh | en")
        .choices(["zh", "en"])
        .default("en"),
    )
    .option("--json", "输出 JSON")
    .action(
      async (
        query: string,
        options: HubCommandOptions,
        command: Command,
      ) => {
        const results = await sourceFor(command).search(query, options.locale);
        if (options.json) return print(results);
        for (const result of results) {
          console.log(
            `${result.apiSlug}/${result.operationSlug} — ${result.method} ${result.path} — ${result.title}`,
          );
        }
      },
    );

  hub
    .command("show <api> <operation>")
    .description("查看一个 Hub operation 的结构化元数据")
    .option("--json", "输出 JSON", true)
    .action(
      async (
        api: string,
        operation: string,
        _options: HubCommandOptions,
        command: Command,
      ) => print(await sourceFor(command).operation(api, operation)),
    );

  addRequestOptions(
    hub
      .command("preview <api> <operation>")
      .description("生成脱敏请求预演，不访问供应商"),
  ).action(
    async (
      api: string,
      operation: string,
      options: HubCommandOptions,
      command: Command,
    ) => {
      const source = sourceFor(command);
      const detail = await source.operation(api, operation);
      print(await source.preview(await buildRequest(detail, options)));
    },
  );

  addRequestOptions(
    hub
      .command("call <api> <operation>")
      .description("经 Hub 安全代理调用 API（写操作必须显式 --yes）")
      .option("--yes", "确认发送已预演的写操作"),
  ).action(
    async (
      api: string,
      operation: string,
      options: HubCommandOptions,
      command: Command,
    ) => {
      const source = sourceFor(command);
      const detail = await source.operation(api, operation);
      const request = await buildRequest(detail, options);
      const preview = await source.preview(request);
      print({ preview });
      if (preview.requiresConfirmation && !options.yes) {
        throw new Error("Write operation stopped after preview. Re-run with --yes.");
      }
      print(
        await source.execute({
          ...request,
          confirmationToken: preview.confirmationToken,
        }),
      );
    },
  );

  hub
    .command("sdk <api>")
    .description("查看预发布 Node.js/TypeScript SDK 信息")
    .action(async (api: string, _options: unknown, command: Command) => {
      print(await sourceFor(command).sdk(api));
    });

  hub
    .command("skill")
    .description("安装通用 Pontx Hub Agent Skill")
    .argument("[action]", "install", "install")
    .option(
      "--output <directory>",
      "Skill 安装目录",
      ".agents/skills/pontx-hub",
    )
    .option("--force", "覆盖已有 Skill 文件")
    .action(
      async (
        action: string,
        options: { output: string; force?: boolean },
        command: Command,
      ) => {
        if (action !== "install") {
          throw new Error(`Unsupported skill action: ${action}`);
        }
        const target = resolve(process.cwd(), options.output);
        if (!options.force) {
          try {
            await access(target);
            throw new Error(
              `Skill directory already exists: ${target}. Use --force to update it.`,
            );
          } catch (error: any) {
            if (error?.code !== "ENOENT") throw error;
          }
        }
        const bundle = await sourceFor(command).skill();
        for (const [name, content] of Object.entries(bundle.files)) {
          if (isAbsolute(name) || name.split(/[\\/]/).includes("..")) {
            throw new Error(`Unsafe skill file path: ${name}`);
          }
          const destination = resolve(target, name);
          if (
            destination !== target &&
            !destination.startsWith(`${target}${sep}`)
          ) {
            throw new Error(`Unsafe skill file path: ${name}`);
          }
          await mkdir(resolve(destination, ".."), { recursive: true });
          await writeFile(destination, content, "utf8");
        }
        console.log(`Installed ${bundle.name}@${bundle.version} to ${target}`);
      },
    );
}
