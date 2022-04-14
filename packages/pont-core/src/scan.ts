import * as fs from "fs-extra";
import * as path from "path";

export async function lookForFiles(
  dir: string,
  fileName: string
): Promise<string> {
  const files = await fs.readdir(dir);

  for (let file of files) {
    const currName = path.join(dir, file);

    const info = await fs.lstat(currName);
    if (info.isDirectory()) {
      if (file === ".git" || file === "node_modules") {
        continue;
      }

      const foundFile = await lookForFiles(currName, fileName);
      if (foundFile) {
        return foundFile;
      }
    } else if (info.isFile() && file === fileName) {
      return currName;
    }
  }
}
