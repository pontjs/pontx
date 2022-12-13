import * as fs from "fs-extra";

export function clearPath(basePath: string) {
  const isExists = fs.existsSync(basePath);

  if (isExists) {
    return fs.removeSync(basePath);
  }
}

const makeArray = (cnt: number) => Array.from(new Array(cnt));
const indentationLine = (cnt: number) => (line: string) =>
  line?.length
    ? makeArray(cnt)
        .map(() => " ")
        .join("") + line
    : "";
export const indentation = (cnt = 2) => {
  return (code: string) => {
    const lines = code?.split("\n") || ([] as string[]);
    return lines.map(indentationLine(cnt)).join("\n");
  };
};

export const needQuotationMark = (name: string) => {
  return !name.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/);
};
