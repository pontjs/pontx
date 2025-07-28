import * as ts from "typescript";
import * as path from "path";
import { promises as fsp } from "fs";
import * as fs from "fs";

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

const windowsSlashRE = /\\/g;
export function slash(p: string): string {
  return p.replace(windowsSlashRE, "/");
}

export const isWindows =
  typeof process !== "undefined" && process.platform === "win32";

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id);
}

export function tryStatSync(file: string): fs.Stats | undefined {
  try {
    // The "throwIfNoEntry" is a performance optimization for cases where the file does not exist
    return fs.statSync(file, { throwIfNoEntry: false });
  } catch {
    // Ignore errors
  }
}

// strip UTF-8 BOM
export function stripBomTag(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }

  return content;
}

export function findNearestNodeModules(basedir: string): string | null {
  while (basedir) {
    const pkgPath = path.join(basedir, "node_modules");
    if (tryStatSync(pkgPath)?.isDirectory()) {
      return pkgPath;
    }

    const nextBasedir = path.dirname(basedir);
    if (nextBasedir === basedir) break;
    basedir = nextBasedir;
  }

  return null;
}

export async function fetchRemoteCacheSpecs(outDir: string) {
  const remotePath = path.join(outDir, ".remote");
  try {
    await fsp.access(remotePath);
  } catch {
    return null;
  }

  const state = await fsp.stat(remotePath);

  if (state.isDirectory()) {
    const files = await fsp.readdir(remotePath);
    const specs = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(remotePath, file);
        const jsonStr = await fsp.readFile(filePath, "utf8");

        try {
          return JSON.parse(jsonStr);
        } catch (e) {}
      })
    );

    return specs.filter((spec) => spec);
  } else {
    const jsonStr = await fsp.readFile(remotePath, "utf8");
    try {
      return JSON.parse(jsonStr);
    } catch (e) {}
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

export const loadPresetPluginPath = (
  presetPath: string,
  pluginPath: string
) => {
  return pluginPath.startsWith("./") || pluginPath.startsWith("../")
    ? path.join(presetPath, pluginPath)
    : findRealPath(presetPath, pluginPath);
};

export const requireUncached = async (module: string) => {
  // ESM 环境下没有 require
  const isRequireDefined = typeof require !== "undefined";

  try {
    if (isRequireDefined) {
      // Try to import as ESM first
      const modulePath = require.resolve(module);
      if (modulePath.endsWith(".cjs") || modulePath.endsWith(".js")) {
        delete require.cache[modulePath];
        const pkg = require(module);
        return pkg?.default || pkg;
      } else if (modulePath.endsWith(".mjs")) {
        const pkg = await import(modulePath);
        return pkg.default || pkg;
      }

      // Fallback to CommonJS
      delete require.cache[modulePath];
      return require(module);
    } else {
      // 仅 ESM 环境
      const pkg = await import(module);
      return pkg.default?.default || pkg.default || pkg;
    }
  } catch (e) {
    // If require.resolve fails, try direct import
    try {
      const pkg = await import(module);
      return pkg.default || pkg;
    } catch (e) {
      throw new Error(`Failed to load module: ${module}`);
    }
  }
};

type TsFileInfo = {
  filePath: string;
  fileName: string;
};

export function requireTsFile(rootDir: string, tsfile: TsFileInfo) {
  const templateFileName = `${tsfile.filePath}`;

  const outDir = path.join(rootDir, `node_modules/.pontx`);
  const relativePath = tsfile.filePath.split(rootDir)[1];
  const outFile = path.join(
    outDir,
    path.dirname(relativePath),
    tsfile.fileName
  );

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

export async function clearPath(basePath: string): Promise<void> {
  try {
    await fsp.access(basePath);
    await fsp.rm(basePath, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error(`Failed to clear path ${basePath}: ${error.message}`);
    }
  }
}

export async function lookForFiles(
  dir: string,
  fileName: string
): Promise<string> {
  const files = await fsp.readdir(dir);

  for (let file of files) {
    const currName = path.join(dir, file);

    const info = await fsp.lstat(currName);
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

export function noOp() {}
export async function asyncNoOp() {}
