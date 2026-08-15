/*
 * @author: jasonHzq
 * @description: 导出所有解析相关的工具函数和类型
 */

// 从 parseOAS3.ts 导出
export {
  parseOAS3Interface,
  parseSwagger2APIs,
  parseOAS3,
  checkIsOas3,
} from "./parseOAS3.js";

// 从 parseOAS2.ts 导出
export {
  parseOAS2Interface,
  parseSwagger2APIs as parseSwagger2APIsV2,
  parseOAS2,
  checkIsOas2,
} from "./parseOAS2.js";

export { checkIsAsyncApi3, parseAsyncApi3 } from "./parseAsyncApi3.js";

// 从 utils.ts 导出
export {
  PrimitiveTypeMap,
  toUpperFirstLetter,
  getIdentifierFromUrl,
  getIdentifierFromOperatorId,
  toDashCase,
  getMaxSamePath,
  hasChinese,
  checkHasNonVarialbeCh,
  transformTagName,
  processDuplicateNameSpaceName,
  makeNamesUnique,
} from "./utils.js";

// 从 schemas.ts 导出
export { parseOAS2Schemas } from "./schemas.js";

// 从 schema.ts 导出
export {
  OAS2JsonSchemaContext,
  parseOAS2Ast2PontJsonSchema,
  parseOAS2JsonSchema,
} from "./schema.js";

// 从 compiler.ts 导出
export { AstNode, compileTemplate } from "./compiler.js";
