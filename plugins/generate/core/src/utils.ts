import * as fs from "fs-extra";

export function clearPath(basePath: string) {
  const isExists = fs.existsSync(basePath);

  if (isExists) {
    return fs.removeSync(basePath);
  }
}
export function getModName(mod) {
  if (typeof mod.name === "string") {
    return mod.name;
  }
  return "main";
}
