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

export const htmlTemplate = (context: { cspSource: string; getUri: (uri: string) => any }) => {
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
  }; style-src ${context.cspSource};"
    />
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
