import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs-extra";
import { PontLogger } from "./logger";
import { conflictDetectItem } from "./manager";
import { PontSpec } from "pontx-spec";

export const createTsProgram = (includePaths: string[], options = {} as ts.CompilerOptions) => {
  const { outDir, rootDir } = options;
  const program = ts.createProgram(includePaths, {
    outDir,
    rootDir,
    noEmit: false,
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    experimentalDecorators: true,
    allowJs: true,
    ...options,
  });

  program.emit();
  return program;
};

export async function fetchRemoteCacheSpecs(outDir: string) {
  const remotePath = path.join(outDir, ".remote");
  const isExists = await fs.pathExists(remotePath);
  if (!isExists) {
    return null;
  }
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

export const findRealPath = (configDir: string, pluginPath: string) => {
  // 已经遍历到根目录，仍然找不到 node_modules 中的相关插件，则直接返回插件路径
  if (path.dirname(configDir) === configDir) {
    return pluginPath;
  }
  let retPath = path.join(configDir, "node_modules", pluginPath);

  if (fs.existsSync(retPath)) {
    return retPath;
  }

  return findRealPath(path.join(configDir, ".."), pluginPath);
};

export const loadPresetPluginPath = (presetPath: string, pluginPath: string) => {
  return pluginPath.startsWith("./") || pluginPath.startsWith("../")
    ? path.join(presetPath, pluginPath)
    : findRealPath(presetPath, pluginPath);
};

export const requireUncached = (module: string) => {
  try {
    delete require.cache[require.resolve(module)];
  } catch (e) {}
  return require(module);
};

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
  const outFile = path.join(outDir, path.dirname(relativePath), tsfile.fileName);

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

  return requireUncached(outFile);
}
/**
 * @name 检查本地元数据和远程元数据是否有修改
 * @params localPontSpecs 本地元数据
 * @params remotePontSpecs 远程元数据
 * @return PontSpec[]
 * */
export function checkLocalRemote(localPontSpecs: PontSpec[], remotePontSpecs: PontSpec[]): conflictDetectItem[] {
  let conflict: { [key: string]: string[] } = {};
  let result: conflictDetectItem[] = [];
  [...(localPontSpecs || []), ...(remotePontSpecs || [])]?.forEach((spec) => {
    const originName = spec.name;
    const specApis = spec.apis || {};
    Object.entries(specApis).forEach(([apiName, api]) => {
      const conflictKey = `${originName}:::${api.path}:::${api.method}`;
      if (conflict[conflictKey]?.length) {
        if (!conflict[conflictKey]?.includes(apiName)) {
          conflict[conflictKey].push(apiName);
        }
      } else {
        conflict[conflictKey] = [apiName];
      }
    });
  });
  Object.entries(conflict)?.forEach(([key, value]) => {
    if (value.length > 1) {
      const [originName, path, method] = key.split(":::");
      const [localName, remoteName] = value;
      result.push({
        originName,
        path,
        method,
        namespace: {
          localName,
          remoteName,
        },
      });
    }
  });
  return result;
}
