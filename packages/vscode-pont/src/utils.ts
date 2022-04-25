import { PontManager } from "pont-core";
import * as vscode from "vscode";

export function showProgress(
  title: string,
  manager: PontManager,
  task: (report?: (info: string) => any) => Thenable<any>
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
    }
  );
}

export function wait(ttl = 500) {
  return new Promise((resolve) => {
    setTimeout(resolve, ttl);
  });
}
