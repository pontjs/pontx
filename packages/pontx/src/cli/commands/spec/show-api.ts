/**
 * @author jasonHzq
 * @description Spec 作用域命令：查看 API 元数据
 */

import type { PontxManager } from "../../../manager";
import type { CliContext } from "../../context";

/**
 * 检查 spec 是否有 tags（即是否有 API key 包含 "/"）
 */
export function specHasTags(pontSpec: any): boolean {
  if (!pontSpec?.apis) return false;
  return Object.keys(pontSpec.apis).some((key) => key.includes("/"));
}

/**
 * 获取 API 元数据
 */
export function getApiMeta(
  pontxManager: PontxManager,
  specName: string,
  tagName: string,
  apiName: string,
  useRemote?: boolean
): any {
  const origin = (pontxManager?.resolvedConfig?.origins || []).find(
    (origin) => {
      return origin.name === specName;
    }
  );
  const pontSpec = useRemote ? origin?.remoteSpec : origin?.spec;
  if (!pontSpec) {
    throw new Error(`Spec not found: ${specName}`);
  }
  const apiKey = tagName ? `${tagName}/${apiName}` : apiName;
  const apiMeta = pontSpec.apis[apiKey];
  if (!apiMeta) {
    throw new Error(`API not found: ${apiKey}`);
  }
  return apiMeta;
}

/**
 * Show API command: display API metadata
 */
export async function showApiCommand(
  ctx: CliContext,
  specName: string,
  tagName: string,
  apiName: string,
  options: { useRemote?: boolean } = {}
) {
  const manager = await ctx.getManager();

  const apiMeta = getApiMeta(
    manager,
    specName,
    tagName,
    apiName,
    options.useRemote
  );

  console.log(JSON.stringify(apiMeta, null, 2));
}
