import { PontxJsonSchema } from "../schema.js";
import { PontxAPI } from "../api.js";
import { TagGroup } from "../spec.js";

/**
 * 转义注释文本中的markdown格式字符，防止破坏JSDoc注释结构
 * @param text - 需要转义的文本
 * @returns 转义后的文本
 */
export const escapeCommentText = (text: string): string => {
  if (!text) return text;

  return (
    text
      // 转义JSDoc注释结束符
      .replace(/\*\//g, "*\\/")
      // 转义JSDoc注释开始符
      .replace(/\/\*/g, "/\\*")
      // 转义markdown加粗格式（两个星号）
      .replace(/\*\*/g, "\\*\\*")
      // 转义markdown斜体格式（单个星号，但要避免影响已转义的双星号）
      .replace(/(?<!\\)\*(?!\*|\\)/g, "\\*")
  );
};

/**
 * 生成API注释
 * @param api - API对象
 * @returns API注释字符串
 */
export const generateApiComment = (api: PontxAPI) => {
  const path = api.path
    ? `\n * ${api.method?.toUpperCase?.() || ""} ${api.path}`
    : "";
  let desc = api.description
    ? `\n * ${escapeCommentText(api.description).split("\n").join("\n * ")}`
    : "";
  const title =
    api?.title && api.title !== desc
      ? `\n * @title: ${escapeCommentText(api.title)}`
      : "";
  const summary =
    api.summary && api.summary !== desc
      ? `\n * @summary: ${escapeCommentText(api.summary)}`
      : "";
  const deprecated = api.deprecated ? `\n * @deprecated` : "";

  if (api?.externalDocs?.url) {
    let externalComment = api.externalDocs.description
      ? `@see ${escapeCommentText(api.externalDocs.description)} ${
          api.externalDocs.url
        }`
      : `@see ${api.externalDocs.url}`;

    if (desc) {
      desc = `${desc}\n * ${externalComment}`;
    } else {
      desc = `\n * ${externalComment}`;
    }
  }

  if (!path && !desc && !title && !summary && !deprecated) {
    return "";
  }

  return `/**${path}${desc}${summary || title}${deprecated}\n */\n`;
};

/**
 * 生成 Schema 注释
 * @param schema - Schema 对象
 * @param name - Schema 名称
 * @returns Schema 注释字符串
 */
export const generateSchemaComment = (
  schema: PontxJsonSchema,
  invalidCommnet = ""
) => {
  const docs = ["title", "description"]
    .filter((key) => schema[key] && schema[key] !== invalidCommnet)
    .map((key) => ` * @${key} ${escapeCommentText(schema[key])}`);
  const schemaComment = docs?.length ? `/**\n${docs.join("\n")}\n */\n` : "";
  return schemaComment;
};

export function generateTagComment(tagGroup: TagGroup) {
  const tagComment = tagGroup.description
    ? `/** ${escapeCommentText(tagGroup.description)} */\n`
    : "";

  return tagComment;
}
