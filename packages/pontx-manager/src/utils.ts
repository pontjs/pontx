import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs-extra";
import { PontLogger } from "./logger";

type TsFileInfo = {
  filePath: string;
  fileName: string;
};

export function requireTsFile(rootDir: string, tsfile: TsFileInfo) {
  const templateFileName = `${tsfile.filePath}`;

  //   if (!fs.existsSync(templateFileName)) {
  //     fs.writeFileSync(templateFileName, defaultCode);
  //   }

  const outDir = path.join(rootDir, `node_modules/.pontx`);
  const relativePath = tsfile.filePath.split(rootDir)[1];
  const outFile = `${outDir}${path.dirname(relativePath)}/${tsfile.fileName}`;

  const program = ts.createProgram([templateFileName], {
    outDir,
    rootDir,
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    experimentalDecorators: true,
    allowJs: true,
  });

  program.emit();

  return require(outFile);
}

export async function fetchRemoteCacheSpecs(outDir: string) {
  const remotePath = path.join(outDir, ".remote");
  const state = await fs.stat(remotePath);
  if (state.isDirectory()) {
    const files = await fs.readdir(remotePath);
    const specs = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(remotePath, file);
        const jsonStr = await fs.readFile(filePath, "utf8");

        try {
          return JSON.parse(jsonStr);
        } catch (e) {}
      }),
    );

    return specs.filter((spec) => spec);
  } else {
    const jsonStr = await fs.readFile(remotePath, "utf8");
    try {
      return JSON.parse(jsonStr);
    } catch (e) {}
  }
}

export async function fetchRemoteCacheSpec(logger: PontLogger, outDir: string, originName = "") {
  let cacheSpec = null;
  const specs = await fetchRemoteCacheSpecs(outDir);
  if (specs?.length) {
    const spec = specs?.find((spec) => spec.name === originName);
    if (spec) {
      cacheSpec = spec;
    }
  } else if (specs?.apis) {
    cacheSpec = specs;
  }

  if (cacheSpec) {
    logger.error({
      originName,
      message: `未获取远程数据，pont 自动获取远程缓存数据。`,
      processType: "fetch",
    });
    return cacheSpec;
  }
}
