import { lookForFiles, PontInnerManagerConfig, PontLogger, PontManager, PontxConfigPlugin } from "pontx-manager";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { PontJsonPointer, PontSpec, PontSpecs } from "pontx-spec";
const configSchema = require("pontx-spec/schemas/pontx-config-schema.json");

const { createServerContent } = require("../media/lib/index");

export const pontConsole = vscode.window.createOutputChannel("Pontx");

export const findPontxConfig = async () => {
  try {
    const pontxConfigPath = await lookForFiles(vscode.workspace.rootPath, "pontx-config.json");
    await vscode.workspace.findFiles("pontx-config.json", "node_modules", 1);
    const pontxConfigStr = await fs.readFile(pontxConfigPath, "utf8");
    const publicConfig = JSON.parse(pontxConfigStr);
    publicConfig.rootDir = vscode.workspace.rootPath;

    return [path.join(pontxConfigPath, ".."), publicConfig];
  } catch (e) {}
};

export const registerConfigSchema = async (context: vscode.ExtensionContext) => {
  try {
    const myProvider = new (class implements vscode.TextDocumentContentProvider {
      onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
      onDidChange = this.onDidChangeEmitter.event;
      provideTextDocumentContent(uri: vscode.Uri): string {
        return this.schema;
      }

      async getPluginSchema() {
        try {
          const [configDir, pontPublicConfig] = await findPontxConfig();
          const pontxConfig = PontInnerManagerConfig.constructorFromPublicConfig(
            pontPublicConfig,
            new PontLogger(),
            configDir,
          );
          const configPlugin = await pontxConfig.plugins.config?.instance;

          if (configPlugin) {
            this.registerCommand(configPlugin);
            return await configPlugin.getSchema();
          }
        } catch (e) {}
      }

      async registerCommand(configPlugin: PontxConfigPlugin) {
        try {
          const origins = await configPlugin.getOrigins();

          if (origins.length) {
            vscode.commands.executeCommand("setContext", "pontx.hasPontxOrigins", true);
          }
        } catch (e) {}
      }

      schema = JSON.stringify(configSchema, null, 2);

      constructor() {
        this.getPluginSchema().then((value) => {
          if (value) {
            this.schema = value;
            // this.onDidChangeEmitter.fire();
            this.onDidChangeEmitter.fire(vscode.Uri.parse("pontx://schemas/config-plugin-schema"));
          }
        });
      }
    })();
    context.subscriptions.push(
      vscode.Disposable.from(vscode.workspace.registerTextDocumentContentProvider("pontx", myProvider)),
    );
  } catch (e) {}
};

export function showProgress(
  title: string,
  manager: PontManager,
  task: (report?: (info: string) => any) => Thenable<any>,
) {
  return vscode.window.withProgress(
    {
      title,
      location: vscode.ProgressLocation.Window,
    },
    async (p) => {
      try {
        manager.logger.log = (info) => {
          p.report({
            message: info,
          });
        };

        await task((info) => p.report({ message: info }));
      } catch (e) {
        vscode.window.showErrorMessage(e.toString());
      }
    },
  );
}

export function wait(ttl = 500) {
  return new Promise((resolve) => {
    setTimeout(resolve, ttl);
  });
}

export class VSCodeLogger extends PontLogger {
  constructor(private attachLogger?: VSCodeLogger["log"]) {
    super();
  }

  log(message: string, logType?: string, stack?: any): void {
    if (logType === "error") {
      pontConsole.appendLine(message);
      pontConsole.appendLine(stack);
      vscode.window.showErrorMessage(message);
    } else {
      vscode.window.showInformationMessage(message);
    }
    if (this.attachLogger) {
      this.attachLogger(message, logType, stack);
    }
  }

  static createFromProgress(progress: vscode.Progress<{ message?: string; increment?: number }>) {
    return new VSCodeLogger((message: string, logType?: string, stack?) => {
      // if (logType === "info") {
      //   progress.report({ message });
      // }

      progress.report({ message });
    });
  }
}

export const htmlTemplate = (context: { cspSource: string; getUri: (uri: string) => any }, pageConfig: any) => {
  const initContent = createServerContent(pageConfig);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pont UI</title>
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${context.cspSource} https:;font-src ${context.cspSource}; script-src ${
        context.cspSource
      }; style-src ${context.cspSource} 'self' 'unsafe-inline';"
    />
    <input type="hidden" id="router-meta-data" value="${encodeURI(JSON.stringify(pageConfig))}"></input>
    </script>
    <link rel="stylesheet" href="${context.getUri("media/dist/assets/index.css")}">
  </head>
  <body>
    <div id="root">${initContent}</div>
    <link href="${context.getUri("media/src/icon.css")}" rel="stylesheet" />
    <link href="${context.getUri("node_modules/@vscode/codicons/dist/codicon.css")}" rel="stylesheet" />
    <script defer type="module" crossorigin src="${context.getUri("media/dist/assets/index.js")}"></script>
  </body>
</html>`;
};

export function batchDispose(disposables: vscode.Disposable[]) {
  if (disposables?.length) {
    disposables.forEach((disposable) => {
      if (disposable && disposable.dispose) {
        disposable.dispose();
      }
    });
  }
}

export async function findInterface(editor: vscode.TextEditor, hasMultiOrigins: boolean, pontManager: PontManager) {
  const pos = editor.selection.start;
  const codeAtLine = editor.document.getText().split("\n")[pos.line];

  if (!codeAtLine) {
    return Promise.reject(new Error(`[findInterface]:找不到接口 ${codeAtLine}`));
  }

  const words = codeAtLine.split(".");

  if (words.length < 2) {
    return Promise.reject(new Error(`[findInterface]:找不到接口 ${words}`));
  }

  let wordIndex = 0;
  let chPos = 0;

  for (let index = 0; index < words.length; ++index) {
    const word = words[index];

    if (chPos + word.length > pos.character) {
      wordIndex = index;

      break;
    }

    chPos += word.length;
    // add . length
    chPos++;
  }

  if (wordIndex === 0) {
    return;
  }

  const wordsWithOrigin = [words[wordIndex - 2], words[wordIndex - 1], words[wordIndex]];
  const localSpecs = pontManager.localPontSpecs;

  let offsetIndex = 1;
  let specIndex = 0;
  if (hasMultiOrigins) {
    offsetIndex = 0;
    specIndex = localSpecs?.findIndex((spec) => spec.name === wordsWithOrigin[offsetIndex]);

    if (specIndex < 0) {
      offsetIndex = 1;
      specIndex = localSpecs?.findIndex((spec) => spec.name === wordsWithOrigin[offsetIndex]);
    }
    if (specIndex < 0) {
      offsetIndex = 1;
      specIndex = 0;
    }
  }

  const apiKey = wordsWithOrigin.slice(offsetIndex + 1).join("/");
  const nameWords = wordsWithOrigin.slice(offsetIndex + 1);
  const api = PontJsonPointer.get(localSpecs, `${specIndex}.apis.[${apiKey}]`);
  if (api) {
    return {
      specName: localSpecs[specIndex]?.name || "",
      apiName: api?.name,
      apiKey,
      modName: nameWords?.length > 1 ? nameWords[0] : "",
    };
  }
}

export async function viewMetaFile(meta: {
  specName: string;
  modName: string;
  specType: "Spec" | "Mod" | "API" | "Struct";
  apiName?: string;
  structName?: string;
  pontManager: PontManager;
}) {
  const innerConf = meta.pontManager.innerManagerConfig;
  const isSingleSpec = PontManager.checkIsSingleSpec(meta.pontManager);
  let outDir = path.join(innerConf.outDir, "sdk");
  let outFile;
  const specName = meta.specName;
  let lockPath = path.join(outDir, specName, PontManager.lockFilename);
  const hasLockPath = fs.existsSync(lockPath);

  if (!hasLockPath) {
    const newLockPath = path.join(outDir, PontManager.lockFilename);
    if (fs.existsSync(newLockPath)) {
      lockPath = newLockPath;
    }
  }

  outFile = lockPath;
  const textDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(outFile));
  const activeEditor = await vscode.window.showTextDocument(textDocument);
  const textCode = textDocument.getText();
  if (meta.specType === "Mod" && meta.modName) {
    const beginOffset = textCode.indexOf(`"namespace": "${meta.modName}"`);
    const beginLine = textCode.slice(0, beginOffset).split("\n").length - 1;
    const beginCol = beginOffset - textCode.slice(0, beginOffset).lastIndexOf("\n");
    const startPos = new vscode.Position(beginLine, beginCol);
    const endPos = new vscode.Position(beginLine, beginCol + `"${meta.modName}": `.length);

    activeEditor.revealRange(new vscode.Range(startPos, endPos));
    activeEditor.selection = new vscode.Selection(startPos, endPos);
  } else if (meta.specType === "API" && meta.apiName) {
    const apiKey = meta.modName ? `${meta.modName}/${meta.apiName}` : meta.apiName;
    const beginOffset = textCode.indexOf(`"${apiKey}": {`);
    const beginLine = textCode.slice(0, beginOffset).split("\n").length - 1;
    const beginCol = beginOffset - textCode.slice(0, beginOffset).lastIndexOf("\n");
    const startPos = new vscode.Position(beginLine, beginCol);
    const endPos = new vscode.Position(beginLine, beginCol + `"${apiKey}": {`.length);
    activeEditor.revealRange(new vscode.Range(startPos, endPos));
    activeEditor.selection = new vscode.Selection(startPos, endPos);
  } else if (meta.specType === "Struct" && meta.structName) {
    const beginOffset = textCode.indexOf(`"${meta.structName}": {`);
    const beginLine = textCode.slice(0, beginOffset).split("\n").length - 1;
    const beginCol = beginOffset - textCode.slice(0, beginOffset).lastIndexOf("\n");
    const startPos = new vscode.Position(beginLine, beginCol);
    const endPos = new vscode.Position(beginLine, beginCol + `"${meta.structName}": {`.length);
    activeEditor.revealRange(new vscode.Range(startPos, endPos));
    activeEditor.selection = new vscode.Selection(startPos, endPos);
  }
}
