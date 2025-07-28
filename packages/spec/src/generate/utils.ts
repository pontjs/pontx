/**
 * 创建一个指定长度的空数组
 * @param cnt - 数组长度
 */
const makeArray = (cnt: number) => Array.from(new Array(cnt));

/**
 * 为单行文本添加指定数量的缩进空格
 * @param cnt - 缩进空格数，默认为2
 */
const indentationLine = (cnt: number) => (line: string) =>
  line?.length
    ? makeArray(cnt)
        .map(() => " ")
        .join("") + line
    : "";

/**
 * 为多行文本添加缩进
 * @param cnt - 缩进空格数，默认为2
 */
export const indentation = (cnt = 2) => {
  return (code: string) => {
    const lines = code?.split("\n") || ([] as string[]);
    return lines.map(indentationLine(cnt)).join("\n");
  };
};

/**
 * 判断字符串是否需要添加引号
 * 如果字符串不符合JavaScript标识符命名规则，则需要添加引号
 */
export const checkNeedQuotationMark = (name: string) => {
  return !name.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/);
};
