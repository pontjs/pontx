import { PontLogger, PontManager } from "pont-manager";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { pontUI } from "./UI";

const pontConsole = vscode.window.createOutputChannel("Pont2");

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
    <link href="${context.getUri("media/src/icon.css")}" rel="stylesheet" />
    <script type="module" crossorigin src="${context.getUri("media/dist/assets/index.js")}"></script>
    <link rel="stylesheet" href="${context.getUri("media/dist/assets/index.css")}">
    <link href="${context.getUri("node_modules/@vscode/codicons/dist/codicon.css")}" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
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

export async function findInterface(editor: vscode.TextEditor, hasMultiOrigins: boolean) {
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

  if (hasMultiOrigins) {
    return {
      specName: wordsWithOrigin[0],
      modName: wordsWithOrigin[1],
      apiName: wordsWithOrigin[2],
    };
  }
  return {
    modName: wordsWithOrigin[1],
    apiName: wordsWithOrigin[2],
  };
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
  let outDir = path.join(innerConf.configDir, innerConf.outDir);
  let outFile;

  if (isSingleSpec) {
    outFile = path.join(outDir, PontManager.lockFilename);
  } else {
    const specName = meta.specName;
    outFile = path.join(outDir, specName, PontManager.lockFilename);
  }
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
  } else if (meta.specType === "API" && meta.modName && meta.apiName) {
    const beginOffset = textCode.indexOf(`"${meta.modName}/${meta.apiName}": {`);
    const beginLine = textCode.slice(0, beginOffset).split("\n").length - 1;
    const beginCol = beginOffset - textCode.slice(0, beginOffset).lastIndexOf("\n");
    const startPos = new vscode.Position(beginLine, beginCol);
    const endPos = new vscode.Position(beginLine, beginCol + `"${meta.modName}/${meta.apiName}": {`.length);
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
