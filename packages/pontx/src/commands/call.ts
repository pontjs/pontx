import * as fs from "fs";
import * as path from "path";
import type { PontxManager } from "../manager";
import type { ApiExecutorContext } from "../type";
import { parseApiPath, getApiMeta } from "./show-api";

export interface CallCommandOptions {
  env?: string;
  header?: string[];
  output?: string;
  debug?: boolean;
  dryRun?: boolean;
  useRemote?: boolean;
}

// Known CLI options that should not be treated as API parameters
const CLI_OPTIONS = new Set([
  "env",
  "e",
  "header",
  "H",
  "output",
  "o",
  "debug",
  "dry-run",
  "use-remote",
  "help",
  "h",
]);

/**
 * Parse command line arguments to extract API parameters
 * Supports:
 *   --paramName=value
 *   --body='{"key":"value"}'
 *   --body=@./file.json
 *   @./file.json (shorthand for body)
 */
function parseToolParams(args: string[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (const arg of args) {
    // Handle @file shorthand for body
    if (arg.startsWith("@") && !arg.startsWith("--")) {
      const filePath = arg.slice(1);
      params["body"] = readBodyFromFile(filePath);
      continue;
    }

    // Skip non-parameter arguments
    if (!arg.startsWith("--") && !arg.startsWith("-")) {
      continue;
    }

    // Skip short options like -e, -H, -o
    if (arg.startsWith("-") && !arg.startsWith("--")) {
      continue;
    }

    // Parse --key=value format
    const eqIndex = arg.indexOf("=");
    let key: string;
    let value: unknown;

    if (eqIndex === -1) {
      // Boolean flag like --flag
      key = arg.slice(2);
      value = true;
    } else {
      key = arg.slice(2, eqIndex);
      value = arg.slice(eqIndex + 1);
    }

    // Skip known CLI options
    if (CLI_OPTIONS.has(key)) {
      continue;
    }

    // Handle @file syntax for body parameter
    if (typeof value === "string" && value.startsWith("@")) {
      const filePath = value.slice(1);
      value = readBodyFromFile(filePath);
    } else if (typeof value === "string") {
      // Try to parse JSON values
      value = tryParseJson(value);
    }

    // Handle body parameter specially - merge into params
    if (key === "body" && typeof value === "object" && value !== null) {
      Object.assign(params, value);
    } else {
      params[key] = value;
    }
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
function tryParseJson(value: string): unknown {
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
  context: ApiExecutorContext,
  extraHeaders: Record<string, string>
): string {
  const { apiSelector, apiMeta, toolParams, baseUrl } = context;
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push(`API: ${apiSelector.specName}/${apiSelector.tagName}/${apiSelector.apiName}`);
  lines.push(`Method: ${apiMeta.method.toUpperCase()}`);
  lines.push(`Path: ${apiMeta.path}`);
  lines.push(`Base URL: ${baseUrl || "(not set)"}`);
  lines.push("-".repeat(60));

  if (Object.keys(toolParams).length > 0) {
    lines.push("Parameters:");
    for (const [key, value] of Object.entries(toolParams)) {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    }
  }

  if (Object.keys(extraHeaders).length > 0) {
    lines.push("Extra Headers:");
    for (const [key, value] of Object.entries(extraHeaders)) {
      lines.push(`  ${key}: ${value}`);
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
 */
function extractParamInfo(apiMeta: ApiExecutorContext["apiMeta"]): ParamInfo[] {
  const params: ParamInfo[] = [];
  let hasBodyParam = false;

  // Extract from parameters
  if (apiMeta.parameters) {
    for (const param of apiMeta.parameters) {
      if (param.in === "body") {
        hasBodyParam = true;
      }
      params.push({
        name: param.name,
        in: param.in,
        required: param.required ?? false,
        type: param.schema?.type || (param.in === "body" ? "object" : undefined),
        description:
          param.schema?.description ||
          (param as any).description ||
          (param.in === "body"
            ? "Request body (use --body='{...}' or --body=@file.json)"
            : undefined),
      });
    }
  }

  // Extract from requestBody (OpenAPI 3.0 style) only if no body param exists
  if (apiMeta.requestBody && !hasBodyParam) {
    params.push({
      name: "body",
      in: "body",
      required: apiMeta.requestBody.required ?? false,
      type: "object",
      description: "Request body (use --body='{...}' or --body=@file.json)",
    });
  }

  return params;
}

/**
 * Validate parameters and return missing/invalid ones
 */
function validateParams(
  apiMeta: ApiExecutorContext["apiMeta"],
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
  apiMeta: ApiExecutorContext["apiMeta"]
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
  apiMeta: ApiExecutorContext["apiMeta"],
  missing: ParamInfo[]
): string {
  const lines: string[] = [];

  lines.push("Error: Missing required parameter(s)");
  lines.push("");

  for (const param of missing) {
    const desc = param.description ? ` - ${param.description}` : "";
    lines.push(`  --${param.name} (${param.in}, ${param.type || "any"})${desc}`);
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
      throw new Error(`Invalid header format: ${h}. Expected: "Header-Name: value"`);
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
  manager: PontxManager,
  apiPath: string,
  rawArgs: string[],
  options: CallCommandOptions = {}
) {
  const { specName, tagName, apiName } = parseApiPath(apiPath);
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

  // Determine baseUrl
  let baseUrl = origin.spec?.servers?.[0]?.url;
  if (options.env) {
    // Try to get baseUrl from envs config
    const envUrl = origin.envs?.[options.env];
    if (envUrl) {
      baseUrl = envUrl;
    } else {
      // Treat env as direct URL
      baseUrl = options.env;
    }
  }

  // Parse tool parameters from remaining args
  const toolParams = parseToolParams(rawArgs);

  // Parse extra headers
  const extraHeaders = parseExtraHeaders(options.header);

  // Build apiMeta for context
  const apiMetaContext: ApiExecutorContext["apiMeta"] = {
    path: apiMeta.path,
    method: apiMeta.method,
    description: apiMeta.description || apiMeta.summary,
    parameters: apiMeta.parameters,
    requestBody: apiMeta.requestBody,
    responses: apiMeta.responses,
  };

  // Validate required parameters
  const { missing } = validateParams(apiMetaContext, toolParams);
  if (missing.length > 0) {
    console.error(formatMissingParamsError(apiPath, apiMetaContext, missing));
    process.exit(1);
  }

  // Build executor context
  const context: ApiExecutorContext = {
    apiSelector: { specName, tagName, apiName },
    apiMeta: apiMetaContext,
    toolParams: { ...toolParams, ...extraHeaders },
    baseUrl,
    options: {
      originConfig: origin,
      resolvedConfig: config,
    },
  };

  // Debug/dry-run: show request info
  if (options.debug || options.dryRun) {
    console.log(formatRequestInfo(context, extraHeaders));
  }

  // Dry-run: exit without executing
  if (options.dryRun) {
    console.log("(Dry run - request not sent)");
    return;
  }

  // Execute API call
  if (!plugin?.apiExecutor) {
    throw new Error("No apiExecutor plugin configured");
  }

  try {
    const result = await plugin.apiExecutor(context);

    // Format output
    const output =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);

    // Write to file or stdout
    if (options.output) {
      const outputPath = path.isAbsolute(options.output)
        ? options.output
        : path.resolve(process.cwd(), options.output);
      fs.writeFileSync(outputPath, output, "utf-8");
      console.log(`Response saved to: ${outputPath}`);
    } else {
      console.log(output);
    }

    if (options.debug) {
      console.log("-".repeat(60));
      console.log("Request completed successfully");
    }
  } catch (error) {
    if (options.debug) {
      console.error("-".repeat(60));
      console.error("Request failed:");
    }
    throw error;
  }
}
