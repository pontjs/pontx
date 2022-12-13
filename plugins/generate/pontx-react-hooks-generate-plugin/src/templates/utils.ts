import * as path from "path";
import * as fs from "fs-extra";
import * as _ from "lodash";

const builtinStructure = {};

export async function getBuiltinStructure() {
  if (!_.isEmpty(builtinStructure)) {
    return builtinStructure;
  }
  const dir = await fs.readdir(path.join(__dirname, "../../builtinSrc"));
  const promises = dir.map(async (filename) => {
    const content = await fs.readFile(path.join(__dirname, "../../builtinSrc", filename), "utf8");

    return {
      content,
      name: filename,
    };
  });
  const files = await Promise.all(promises);
  files.forEach((file) => {
    builtinStructure[file.name] = file.content;
  });

  return builtinStructure;
}
