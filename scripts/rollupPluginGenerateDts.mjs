import fs from "fs";
import path from "path";

export default function rollupPluginGenerateDts(currentPath) {
  return {
    name: "rollup-plugin-genenrate-dts",
    writeBundle() {
      const cjsDir = path.resolve(currentPath, "cjs-types");
      if (fs.existsSync(cjsDir)) {
        const files = fs.readdirSync(cjsDir);

        if (files.includes("index.d.ts")) {
          const oldPath = path.join(cjsDir, "index.d.ts");
          const newPath = path.join(cjsDir, "index.d.cts");
          fs.renameSync(oldPath, newPath);
          console.log(`重命名声明文件: index.d.ts -> index.d.cts`);
        }

        deleteCjsFile(cjsDir);
      }
    },
    generateBundle(_, bundle) {
      for (const fileName of Object.keys(bundle)) {
        // 只处理 .d.ts 或 .d.cts 文件
        if (fileName.endsWith(".d.ts") || fileName.endsWith(".d.cts")) {
          const asset = bundle[fileName];
          // asset 类型有 source 字段
          if (asset && typeof asset.source === "string") {
            asset.source = asset.source.replace(
              // 匹配 ./xx、../xx、../../xx 等所有相对路径
              /((import|export)\s+[^'"]+from\s+['"]((\.\.\/)+|\.\/)([^'"]+)['"])/g,
              (match, p1, p2, p3, p4, p5) => {
                if (p5.endsWith(".d.ts")) return match;

                if (p5.endsWith(".js")) {
                  const newP5 = p5.replace(".js", ".d.ts");
                  return match.replace(`${p3}${p5}`, `${p3}${newP5}`);
                }
                return match.replace(`${p3}${p5}`, `${p3}${p5}.d.ts`);
              }
            );
          }
        }
      }
    },
  };
}

function deleteCjsFile(filePath) {
  const fileInfo = fs.statSync(filePath);
  if (fileInfo.isDirectory()) {
    const files = fs.readdirSync(filePath);
    files.forEach((file) => {
      const newFilePath = path.join(filePath, file);
      deleteCjsFile(newFilePath);
    });
  } else if (fileInfo.isFile() && filePath.endsWith(".cjs")) {
    fs.rmSync(filePath, { recursive: true });
    console.log(`删除文件: ${filePath}`);
  }
}
