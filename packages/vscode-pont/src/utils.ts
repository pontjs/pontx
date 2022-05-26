import { PontLogger, PontManager } from "pont-manager";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function showProgress(
  title: string,
  manager: PontManager,
  task: (report?: (info: string) => any) => Thenable<any>,
) {
  return vscode.window.withProgress(
    {
      title,
      location: vscode.ProgressLocation.Notification,
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
  log(message: string, logType?: string): void {
    if (logType === "error") {
      vscode.window.showErrorMessage(message);
    } else {
      vscode.window.showInformationMessage(message);
    }
  }
}

export const getHTMLForVSCode = (urlJoin: Function, cspSource) => {
  const scriptUri = urlJoin("assets/index.js");
  const styleResetUri = urlJoin("assets/index.css");
  const html = fs.readFileSync(path.join(__dirname, "../media/index.html"), "utf8");

  const htmlResult = html
    .replace("/assets/index.js", scriptUri)
    .replace("/assets/index.css", styleResetUri)
    .replace(
      /\$\{cspSource\}/g,
      `<meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${cspSource} https:; script-src ${cspSource}; style-src ${cspSource};"
  />`,
    );

  return htmlResult;
};

export const getRootUri = () => {
  return path.join(__dirname, "../media/assets");
};
