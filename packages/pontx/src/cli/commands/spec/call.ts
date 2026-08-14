/**
 * @author jasonHzq
 * @description Spec 作用域命令：调用 API 接口
 */

import * as fs from "fs";
import * as path from "path";
import * as jmespath from "jmespath";
import type { PontxManager } from "../../../manager";
import type { CliContext } from "../../context";
import type { ApiExecutorContext } from "../../../type";
import type { ApiExecutionContext } from "../../../types";
import { getApiMeta } from "./show-api";
import { createLogger } from "../../../logger/logger";
import { buildApiRequest, requestToCurl } from "../../../builtin/apiExecutor";
import {
  createMutationConfirmation,
  isMutationMethod,
  redactForPreview,
  redactSensitiveValue,
  serializeCliResponse,
  verifyMutationConfirmation,
} from "../../../builtin/cliSafety";

export interface CallCommandOptions {
  env?: string;
  header?: string[];
  output?: string;
  debug?: boolean;
  curl?: boolean;
  dryRun?: boolean;
  useRemote?: boolean;
  query?: string;
  confirm?: string;
}

/* 已知 CLI 选项，不应被当作 API 参数 */
export const CLI_OPTIONS = new Set([
  "env",
  "e",
  "header",
  "H",
  "output",
  "o",
  "debug",
  "curl",
  "dry-run",
  "use-remote",
  "query",
  "q",
  "confirm",
  "help",
  "h",
]);

/**
 * 判断字符串是否像 CLI flag（--flag 或 -f）而非负数
 */
function looksLikeFlag(str: string): boolean {
  if (str.startsWith("--")) {
    return true;
  }
  if (str.startsWith("-")) {
    const rest = str.slice(1);
    if (rest && /^\d/.test(rest)) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * 从命令行参数中解析 API 请求参数
 */
export function parseToolParams(args: string[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("@") && !arg.startsWith("--")) {
      const filePath = arg.slice(1);
      params["body"] = readBodyFromFile(filePath);
      continue;
    }

    if (!arg.startsWith("--")) {
      continue;
    }

    if (arg.includes("=")) {
      const equalIndex = arg.indexOf("=");
      const key = arg.slice(2, equalIndex);
      const value = arg.slice(equalIndex + 1);

      if (CLI_OPTIONS.has(key)) {
        continue;
      }

      if (value === "") {
        params[key] = "";
      } else if (value.startsWith("@")) {
        params[key] = readBodyFromFile(value.slice(1));
      } else {
        params[key] = tryParseJson(value);
      }

      continue;
    }

    const key = arg.slice(2);

    if (CLI_OPTIONS.has(key)) {
      const nextArg = args[i + 1];
      if (nextArg && !looksLikeFlag(nextArg)) {
        i++;
      }
      continue;
    }

    const nextArg = args[i + 1];
    let value: unknown;

    if (!nextArg || looksLikeFlag(nextArg)) {
      value = true;
    } else {
      i++;
      if (nextArg.startsWith("@")) {
        const filePath = nextArg.slice(1);
        value = readBodyFromFile(filePath);
      } else {
        value = tryParseJson(nextArg);
      }
    }

    params[key] = value;
  }

  return params;
}

function readBodyFromFile(filePath: string): Record<string, unknown> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in file: ${absolutePath}`);
  }
}

export function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatRequestInfo(
  context: ApiExecutionContext,
  extraHeaders: Record<string, string>
): string {
  const { api, meta, params, env } = context;
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push(
    `API: ${api.specName}/${api.tagName}/${api.apiName}`
  );
  lines.push(`Method: ${meta.method.toUpperCase()}`);
  lines.push(`Path: ${meta.path}`);
  const resolvedBaseURL = (() => {
    if (env?.baseURL) return env.baseURL;
    if (env?.name && context.executeApiConfig?.environments?.[env.name]) {
      return context.executeApiConfig.environments[env.name].baseURL;
    }
    if (context.executeApiConfig?.baseURL) return context.executeApiConfig.baseURL;
    const origin = context.resolvedConfig?.origins?.find((o) => o.name === context.api.specName);
    const serverUrl = origin?.spec?.servers?.[0]?.url;
    if (serverUrl) return serverUrl;
    return "(未配置)";
  })();
  lines.push(`Base URL: ${resolvedBaseURL}`);
  if (env?.name) {
    lines.push(`Environment: ${env.name}`);
  }
  lines.push("-".repeat(60));

  if (Object.keys(params).length > 0) {
    lines.push("Parameters:");
    for (const [key, value] of Object.entries(params)) {
      lines.push(`  ${key}: ${JSON.stringify(redactForPreview(key, value))}`);
    }
  }

  if (Object.keys(extraHeaders).length > 0) {
    lines.push("Extra Headers:");
    for (const [key, value] of Object.entries(extraHeaders)) {
      lines.push(`  ${key}: ${redactSensitiveValue(key, value)}`);
    }
  }

  lines.push("=".repeat(60));
  return lines.join("\n");
}

interface ParamInfo {
  name: string;
  in: string;
  required: boolean;
  type?: string;
  description?: string;
}

function extractParamInfo(apiMeta: ApiExecutionContext["meta"]): ParamInfo[] {
  const params: ParamInfo[] = [];

  if (apiMeta.parameters) {
    for (const param of apiMeta.parameters) {
      params.push({
        name: param.name,
        in: param.in,
        required: param.required || false,
        type:
          param.schema?.type || (param.in === "body" ? "object" : undefined),
        description:
          param.schema?.description ||
          (param as any).description ||
          (param.in === "body"
            ? "Request body (use --body '{...}' or --body @file.json)"
            : undefined),
      });
    }
  }

  return params;
}

function validateParams(
  apiMeta: ApiExecutionContext["meta"],
  toolParams: Record<string, unknown>
): { missing: ParamInfo[]; provided: string[] } {
  const paramInfo = extractParamInfo(apiMeta);
  const missing: ParamInfo[] = [];
  const provided = Object.keys(toolParams);

  for (const param of paramInfo) {
    if (param.required && toolParams[param.name] === undefined) {
      missing.push(param);
    }
  }

  return { missing, provided };
}

function formatParamUsage(param: ParamInfo): string {
  const typeHint = param.type ? `<${param.type}>` : "<value>";
  return `--${param.name}=${typeHint}`;
}

function generateUsageHint(
  specName: string,
  tagName: string,
  apiName: string,
  apiMeta: ApiExecutionContext["meta"]
): string {
  const paramInfo = extractParamInfo(apiMeta);
  const requiredParams = paramInfo.filter((p) => p.required);
  const optionalParams = paramInfo.filter((p) => !p.required);

  const parts = ["pontx", specName, "call"];
  if (tagName) {
    parts.push(tagName);
  }
  parts.push(apiName);

  for (const param of requiredParams) {
    parts.push(formatParamUsage(param));
  }

  if (optionalParams.length > 0) {
    parts.push("[options]");
  }

  return parts.join(" ");
}

function formatMissingParamsError(
  specName: string,
  tagName: string,
  apiName: string,
  apiMeta: ApiExecutionContext["meta"],
  missing: ParamInfo[]
): string {
  const lines: string[] = [];

  lines.push("Error: Missing required parameter(s)");
  lines.push("");

  for (const param of missing) {
    const desc = param.description ? ` - ${param.description}` : "";
    lines.push(
      `  --${param.name} (${param.in}, ${param.type || "any"})${desc}`
    );
  }

  lines.push("");
  lines.push("Usage:");
  lines.push(`  ${generateUsageHint(specName, tagName, apiName, apiMeta)}`);

  const allParams = extractParamInfo(apiMeta);
  if (allParams.length > 0) {
    lines.push("");
    lines.push("Available parameters:");
    for (const param of allParams) {
      const required = param.required ? " (required)" : "";
      const desc = param.description ? ` - ${param.description}` : "";
      lines.push(`  --${param.name}${required}: ${param.type || "any"}${desc}`);
    }
  }

  return lines.join("\n");
}

function parseExtraHeaders(headerArgs?: string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!headerArgs) return headers;

  for (const h of headerArgs) {
    const colonIndex = h.indexOf(":");
    if (colonIndex === -1) {
      throw new Error(
        `Invalid header format: ${h}. Expected: "Header-Name: value"`
      );
    }
    const key = h.slice(0, colonIndex).trim();
    const value = h.slice(colonIndex + 1).trim();
    headers[key] = value;
  }

  return headers;
}

/**
 * Call command: execute an API call
 */
export async function callCommand(
  ctx: CliContext,
  specName: string,
  tagName: string,
  apiName: string,
  rawArgs: string[],
  options: CallCommandOptions = {}
) {
  const logger = ctx.logger;
  const manager = await ctx.getManager();

  const config = manager.resolvedConfig;
  const plugin = config.resolvedPlugin;

  /* 获取 API 元数据 */
  const apiMeta = getApiMeta(
    manager,
    specName,
    tagName,
    apiName,
    options.useRemote
  );

  const origin = config.origins.find((o) => o.name === specName);
  if (!origin) {
    throw new Error(`Spec not found: ${specName}`);
  }

  /* 解析请求参数 */
  const toolParams = parseToolParams(rawArgs);
  const extraHeaders = parseExtraHeaders(options.header);

  const apiMetaForContext: ApiExecutionContext["meta"] = {
    path: apiMeta.path,
    method: apiMeta.method,
    description: apiMeta.description || apiMeta.summary,
    parameters: apiMeta.parameters,
    responses: apiMeta.responses,
    consumes: apiMeta.consumes,
    produces: apiMeta.produces,
  };

  /* 校验必填参数 */
  const { missing } = validateParams(apiMetaForContext, toolParams);
  if (missing.length > 0) {
    console.error(formatMissingParamsError(specName, tagName, apiName, apiMetaForContext, missing));
    process.exit(1);
  }

  /* 解析环境配置 */
  let envConfig: ApiExecutionContext["env"] | undefined;
  if (options.env) {
    if (options.env.startsWith("http://") || options.env.startsWith("https://")) {
      envConfig = { baseURL: options.env };
    } else {
      const envUrl = origin.envs?.[options.env] || config.executeApiConfig?.environments?.[options.env];
      if (envUrl) {
        envConfig = {
          name: options.env,
          baseURL: typeof envUrl === 'string' ? envUrl : envUrl.baseURL
        };
      } else {
        envConfig = { baseURL: options.env };
      }
    }
  }

  const context: ApiExecutionContext = {
    api: { specName, tagName, apiName },
    meta: apiMetaForContext,
    params: { ...toolParams, ...extraHeaders },
    env: envConfig,
    executeApiConfig: config.executeApiConfig,
    resolvedConfig: config,
    logger: logger || createLogger('info'),
  };

  const mutation = isMutationMethod(apiMetaForContext.method);
  const preparedRequest = options.dryRun || options.curl || mutation
    ? await buildApiRequest(context)
    : undefined;

  if (options.debug || options.dryRun) {
    const requestInfo = formatRequestInfo(context, extraHeaders);
    process.stderr.write(requestInfo + '\n');
  }

  if (options.curl) {
    process.stderr.write(requestToCurl(preparedRequest!) + '\n');
  }

  if (options.dryRun) {
    if (mutation) {
      const confirmation = await createMutationConfirmation(preparedRequest!);
      process.stderr.write(
        `Mutation confirmation (valid for 5 minutes and bound to this exact request): ${confirmation}\n`
      );
    }
    process.stderr.write("(Dry run - request not sent)\n");
    return;
  }

  if (mutation && (
    !options.confirm ||
    !await verifyMutationConfirmation(preparedRequest!, options.confirm)
  )) {
    throw new Error(
      "Mutation blocked: run the same command with --dry-run, review the redacted request, " +
      "then repeat it with --confirm <token> within 5 minutes."
    );
  }

  if (!plugin?.executeApi) {
    throw new Error("No executeApi plugin configured");
  }

  try {
    const response = await plugin.executeApi(context);

    if (!response) {
      throw new Error("No response from API executor");
    }

    let result = response.data;

    if (options.query) {
      const serialized = await serializeCliResponse(result);
      if (serialized.binary) {
        throw new Error("JMESPath queries cannot be applied to binary responses");
      }
      try {
        const data = typeof result === "string" ? JSON.parse(result as string) : result;
        result = jmespath.search(data, options.query);
      } catch (queryError: any) {
        throw new Error(
          `JMESPath query error: ${queryError.message}\nQuery: ${options.query}`
        );
      }
    }

    const output = await serializeCliResponse(result);

    if (options.output) {
      const outputPath = path.isAbsolute(options.output)
        ? options.output
        : path.resolve(process.cwd(), options.output);
      fs.writeFileSync(outputPath, output.data);
      process.stderr.write(`Response saved to: ${outputPath}\n`);
    } else {
      if (output.binary) {
        throw new Error("Binary response not printed to the terminal; use --output <path>");
      }
      console.log(output.data);
    }

    if (options.debug) {
      process.stderr.write(`${"-".repeat(60)}\nRequest completed successfully (status: ${response.status})\n`);
    }
  } catch (error) {
    if (options.debug) {
      process.stderr.write(`${"-".repeat(60)}\nRequest failed:\n`);
    }
    throw error;
  }
}
