import * as fs from "fs";
import * as path from "path";
import * as jmespath from "jmespath";
import type { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";
import type { ApiExecutorContext } from "../type";
import type { ApiExecutionContext } from "../types";
import { parseApiPath, getApiMeta, specHasTags } from "./show-api";
import { createLogger } from "../logger/logger";
import { buildApiRequest, requestToCurl } from "../builtin/apiExecutor";
import {
  createMutationConfirmation,
  isMutationMethod,
  redactForPreview,
  redactSensitiveValue,
  serializeCliResponse,
  verifyMutationConfirmation,
} from "../builtin/cliSafety";

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

// Known CLI options that should not be treated as API parameters
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
 * Check if a string looks like a CLI flag (--flag or -f)
 * but NOT a negative number like -123 or -3.14
 */
function looksLikeFlag(str: string): boolean {
  if (str.startsWith("--")) {
    return true;
  }
  if (str.startsWith("-")) {
    // Check if it's a negative number
    const rest = str.slice(1);
    if (rest && /^\d/.test(rest)) {
      return false; // It's a negative number like -123
    }
    return true; // It's a short flag like -e
  }
  return false;
}

/**
 * Parse command line arguments to extract API parameters
 * Supports:
 *   --paramName value
 *   --paramName=value
 *   --body '{"key":"value"}'
 *   --body={"key":"value"}
 *   --body @./file.json
 *   --body=@./file.json
 *   @./file.json (shorthand for body)
 *
 * Note: Values starting with dash are treated as values (not flags) when they
 * are negative numbers (e.g., -123) or follow a known parameter.
 *
 * @param args - Array of command line arguments
 * @returns Record of parameter name to value
 */
export function parseToolParams(args: string[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Handle @file shorthand for body
    if (arg.startsWith("@") && !arg.startsWith("--")) {
      const filePath = arg.slice(1);
      params["body"] = readBodyFromFile(filePath);
      continue;
    }

    // Skip non-parameter arguments
    if (!arg.startsWith("--")) {
      continue;
    }

    // Handle --param=value format
    if (arg.includes("=")) {
      const equalIndex = arg.indexOf("=");
      const key = arg.slice(2, equalIndex);
      const value = arg.slice(equalIndex + 1);

      // Skip known CLI options
      if (CLI_OPTIONS.has(key)) {
        continue;
      }

      // Handle empty value: --param= → ''
      if (value === "") {
        params[key] = "";
      } else if (value.startsWith("@")) {
        // Handle @file syntax: --body=@./file.json
        params[key] = readBodyFromFile(value.slice(1));
      } else {
        // Try to parse JSON values
        params[key] = tryParseJson(value);
      }

      continue; // Done processing this argument
    }

    const key = arg.slice(2);

    // Skip known CLI options
    if (CLI_OPTIONS.has(key)) {
      // Skip the next argument if it's a value for this CLI option
      const nextArg = args[i + 1];
      if (nextArg && !looksLikeFlag(nextArg)) {
        i++;
      }
      continue;
    }

    // Get the next argument as value
    const nextArg = args[i + 1];
    let value: unknown;

    if (!nextArg || looksLikeFlag(nextArg)) {
      // Boolean flag like --flag, or next arg is another flag
      value = true;
    } else {
      // Consume the next argument as value
      i++;

      // Handle @file syntax for body parameter
      if (nextArg.startsWith("@")) {
        const filePath = nextArg.slice(1);
        value = readBodyFromFile(filePath);
      } else {
        // Try to parse JSON values
        value = tryParseJson(nextArg);
      }
    }

    params[key] = value;
  }

  return params;
}

/**
 * Read body content from a file
 */
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

/**
 * Try to parse a string as JSON, return original string if failed
 */
export function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Format request info for debug/dry-run output
 */
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
  // 解析实际的 baseURL，与 apiExecutor.resolveBaseUrl 逻辑一致
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

/**
 * Extract parameter info from API metadata
 * Body parameters are identified by in: "body" in the parameters array
 */
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

/**
 * Validate parameters and return missing/invalid ones
 */
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

/**
 * Format parameter for usage hint
 */
function formatParamUsage(param: ParamInfo): string {
  const typeHint = param.type ? `<${param.type}>` : "<value>";
  return `--${param.name}=${typeHint}`;
}

/**
 * Generate usage hint for the API call
 */
function generateUsageHint(
  apiPath: string,
  apiMeta: ApiExecutionContext["meta"]
): string {
  const paramInfo = extractParamInfo(apiMeta);
  const requiredParams = paramInfo.filter((p) => p.required);
  const optionalParams = paramInfo.filter((p) => !p.required);

  const parts = ["pontx call", apiPath];

  for (const param of requiredParams) {
    parts.push(formatParamUsage(param));
  }

  if (optionalParams.length > 0) {
    parts.push("[options]");
  }

  return parts.join(" ");
}

/**
 * Format error message for missing parameters
 */
function formatMissingParamsError(
  apiPath: string,
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
  lines.push(`  ${generateUsageHint(apiPath, apiMeta)}`);

  // Show all available parameters
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

/**
 * Parse extra headers from -H options
 */
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
  managerOrContext: PontxManager | CliContext,
  apiPath: string,
  rawArgs: string[],
  options: CallCommandOptions = {}
) {
  // Get logger from context if available
  const logger = ('logger' in managerOrContext) ? managerOrContext.logger : undefined;

  // Determine if called from CLI or directly
  const isCliContext = "tryGetLocalManager" in managerOrContext;

  let manager: PontxManager;

  if (isCliContext) {
    // CLI call: use local manager
    manager = await managerOrContext.getManager();
  } else {
    // Direct call: maintain backward compatibility
    manager = managerOrContext;
  }

  // Determine single spec mode
  const origins = manager.resolvedConfig.origins;
  let singleSpecName: string | undefined;
  let hasTags: boolean | undefined;

  if (origins.length === 1) {
    singleSpecName = origins[0].name;
    const pontSpec = options.useRemote
      ? origins[0].remoteSpec
      : origins[0].spec;
    hasTags = specHasTags(pontSpec);
  }

  const { specName, tagName, apiName } = parseApiPath(
    apiPath,
    singleSpecName,
    hasTags
  );

  const config = manager.resolvedConfig;
  const plugin = config.resolvedPlugin;

  // Get API metadata
  const apiMeta = getApiMeta(
    manager,
    specName,
    tagName,
    apiName,
    options.useRemote
  );

  // Find origin config to get baseUrl
  const origin = config.origins.find((o) => o.name === specName);
  if (!origin) {
    throw new Error(`Spec not found: ${specName}`);
  }

  // Parse tool parameters from remaining args
  const toolParams = parseToolParams(rawArgs);

  // Parse extra headers
  const extraHeaders = parseExtraHeaders(options.header);

  // Build meta for context
  const apiMetaForContext: ApiExecutionContext["meta"] = {
    path: apiMeta.path,
    method: apiMeta.method,
    description: apiMeta.description || apiMeta.summary,
    parameters: apiMeta.parameters,
    responses: apiMeta.responses,
    consumes: apiMeta.consumes,
    produces: apiMeta.produces,
  };

  // Validate required parameters
  const { missing } = validateParams(apiMetaForContext, toolParams);
  if (missing.length > 0) {
    console.error(formatMissingParamsError(apiPath, apiMetaForContext, missing));
    process.exit(1);
  }

  // 解析环境配置
  let envConfig: ApiExecutionContext["env"] | undefined;
  if (options.env) {
    // 检查是否是 URL
    if (options.env.startsWith("http://") || options.env.startsWith("https://")) {
      envConfig = { baseURL: options.env };
    } else {
      // 作为环境名称
      const envUrl = origin.envs?.[options.env] || config.executeApiConfig?.environments?.[options.env];
      if (envUrl) {
        envConfig = {
          name: options.env,
          baseURL: typeof envUrl === 'string' ? envUrl : envUrl.baseURL
        };
      } else {
        // 尝试作为直接 URL
        envConfig = { baseURL: options.env };
      }
    }
  }

  // Build execution context using new API
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

  // Debug/dry-run: show request info
  if (options.debug || options.dryRun) {
    const requestInfo = formatRequestInfo(context, extraHeaders);
    if (logger) {
      logger.info(requestInfo);
    } else {
      process.stderr.write(requestInfo + '\n');
    }
  }

  if (options.curl) {
    const curlCommand = requestToCurl(preparedRequest!);
    if (logger) {
      logger.info(curlCommand);
    } else {
      process.stderr.write(curlCommand + '\n');
    }
  }

  // Dry-run: exit without executing
  if (options.dryRun) {
    if (mutation) {
      const confirmation = await createMutationConfirmation(preparedRequest!);
      const confirmationMsg =
        `Mutation confirmation (valid for 5 minutes and bound to this exact request): ${confirmation}`;
      if (logger) logger.info(confirmationMsg);
      else process.stderr.write(confirmationMsg + "\n");
    }
    const dryRunMsg = "(Dry run - request not sent)";
    if (logger) {
      logger.info(dryRunMsg);
    } else {
      process.stderr.write(dryRunMsg + '\n');
    }
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

  // Execute API call
  if (!plugin?.executeApi) {
    throw new Error("No executeApi plugin configured");
  }

  try {
    // Call the new executeApi hook
    const response = await plugin.executeApi(context);

    if (!response) {
      throw new Error("No response from API executor");
    }

    let result = response.data;

    // Apply JMESPath query if specified
    if (options.query) {
      const serialized = await serializeCliResponse(result);
      if (serialized.binary) {
        throw new Error("JMESPath queries cannot be applied to binary responses");
      }
      try {
        // Ensure result is an object for JMESPath query
        const data = typeof result === "string" ? JSON.parse(result as string) : result;
        result = jmespath.search(data, options.query);
      } catch (queryError: any) {
        throw new Error(
          `JMESPath query error: ${queryError.message}\nQuery: ${options.query}`
        );
      }
    }

    const output = await serializeCliResponse(result);

    // Write to file or stdout
    if (options.output) {
      const outputPath = path.isAbsolute(options.output)
        ? options.output
        : path.resolve(process.cwd(), options.output);
      fs.writeFileSync(outputPath, output.data);
      // Log to stderr
      const savedMsg = `Response saved to: ${outputPath}`;
      if (logger) {
        logger.info(savedMsg);
      } else {
        process.stderr.write(savedMsg + '\n');
      }
    } else {
      if (output.binary) {
        throw new Error("Binary response not printed to the terminal; use --output <path>");
      }
      // Output JSON to stdout (clean output for piping)
      console.log(output.data);
    }

    if (options.debug) {
      const debugMsgs = ["-".repeat(60), `Request completed successfully (status: ${response.status})`].join('\n');
      if (logger) {
        logger.info(debugMsgs);
      } else {
        process.stderr.write(debugMsgs + '\n');
      }
    }
  } catch (error) {
    if (options.debug) {
      const errorMsgs = ["-".repeat(60), "Request failed:"].join('\n');
      if (logger) {
        logger.error(errorMsgs);
      } else {
        process.stderr.write(errorMsgs + '\n');
      }
    }
    throw error;
  }
}
