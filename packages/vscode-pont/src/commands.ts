import { PontManager } from "pont-manager";
import * as _ from "lodash";
import * as vscode from "vscode";
import { showProgress, VSCodeLogger, wait } from "./utils";
import { PontWebView } from "./webview";
import { pontService } from "./Service";
// import { PontService } from "./Service";
const fs = require("fs");
const path = require("path");

const insertCode = (code: string) => {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    editor.edit((builder) => {
      if (editor.selection.isEmpty) {
        const position = editor.selection.active;

        builder.insert(position, code);
      } else {
        builder.replace(editor.selection, code);
      }
    });
  }
};

export class PontCommands {
  static commands = {
    switchOrigin: "pont.switchOrigin",
    findInterface: "pont.findInterface",
    regenerate: "pont.regenerate",
  };

  static registerCommands(context) {
    const service = pontService;
    vscode.commands.registerCommand("pont.switchOrigin", () => {
      const origins = service.pontManager.innerManagerConfig.origins.map((conf) => {
        return {
          label: conf.name,
          description: conf.url,
        } as vscode.QuickPickItem;
      });

      vscode.window.showQuickPick(origins).then(
        async (item) => {
          vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "",
            },
            async (p) => {
              service.pontManager.logger.log = (info) => {
                p.report({ message: info });
              };

              try {
                service.updatePontManger(PontManager.switchOriginName(service.pontManager, item.label));
              } catch (e) {
                vscode.window.showErrorMessage(e.message);
              }
              service.pontManager.logger = new VSCodeLogger();
            },
          );
        },
        (e) => {
          vscode.window.showErrorMessage(e.message);
        },
      );
    });

    vscode.commands.registerCommand("pont.findInterface", () => {
      const pontSpec = PontManager.getCurrentSpec(service.pontManager);
      const items = pontSpec.mods
        .map((mod) => {
          return mod.interfaces.map((inter) => {
            return {
              label: `[${inter.method}] ${inter.path}`,
              detail: `${mod.name}.${inter.name}`,
              description: `${inter.description}`,
            };
          });
        })
        .reduce((pre, next) => pre.concat(next), []);

      return vscode.window
        .showQuickPick(items, {
          matchOnDescription: true,
          matchOnDetail: true,
        })
        .then((item: any) => {
          if (!item) {
            return;
          }
          const [modName, apiName] = item.detail.split(".");
          const modMeta = PontManager.getCurrentSpec(service.pontManager).mods.find((mod) => mod.name === modName);
          const apiMeta = modMeta?.interfaces?.find((api) => api.name === apiName);

          Promise.resolve(service.pontManager.innerManagerConfig.plugins.generate?.instance).then((generatePlugin) => {
            const snippets = generatePlugin?.providerSnippets?.(apiMeta, modName, pontSpec.name);

            if (snippets?.length) {
              if (snippets.length === 1) {
                insertCode[snippets[0].code];
              }

              return vscode.window
                .showQuickPick(
                  snippets.map((snippet) => {
                    return {
                      label: snippet.name,
                      description: snippet.description,
                    };
                  }),
                  {
                    matchOnDescription: true,
                    matchOnDetail: true,
                  },
                )
                .then((snippet) => {
                  const foundSnippet = snippets.find((inst) => inst.name === snippet.label);
                  if (foundSnippet) {
                    insertCode(foundSnippet.code);
                  }
                });
            }

            let code = `API.${item.detail}.`;
            if (pontSpec.name) {
              code = `API.${pontSpec.name}.${item.detail}`;
            }
            insertCode(code);
          });
        });
    });

    vscode.commands.registerCommand("pont.regenerate", () => {
      const pontManager = service.pontManager;
      showProgress("生成代码", pontManager, async (log) => {
        log("代码生成中...");
        await wait(100);

        await PontManager.generateCode(pontManager);

        log("代码生成成功！");
        vscode.window.showInformationMessage("文件生成成功！");
      });
    });

    vscode.commands.registerCommand("pont.openPontUI", () => {
      new PontWebView().openTab(context.extensionUri);
    });

    vscode.commands.registerCommand("pont.restart", async () => {
      vscode.window.showInformationMessage("pont 重启中...");
      const pontManager = await PontManager.constructorFromRootDir(vscode.workspace.rootPath, new VSCodeLogger());
      pontService.updatePontManger(pontManager);
    });
  }
}

// export class Commands {
//   static pontManager: PontManager;

//   commands = {
//     switchOrigin: "pont.switchOrigin",
//     // updateMod: 'pont.updateMod',
//     // updateBo: 'pont.updateBo',
//     // updateAll: 'pont.updateAll',
//     // syncRemote: 'pont.syncRemote',
//     findInterface: "pont.findInterface",
//     // refreshMocks: 'pont.refreshMocks',
//     regenerate: "pont.regenerate",
//   };
//   dispose: Function;

//   watchLocalFile() {
//     const config = this.manager.currConfig;
//     const lockWatcher = vscode.workspace.createFileSystemWatcher(
//       path.join(config.outDir, this.manager.lockFilename),
//       true,
//       false,
//       true
//     );
//     let lockDispose = lockWatcher.onDidChange(async () => {
//       await this.manager.readLocalDataSource();
//       this.manager.calDiffs();
//       this.ui.reRender();
//     });

//     this.dispose = () => {
//       lockDispose.dispose();
//     };
//   }

//   constructor(manager: Manager) {
//     this.createCommands();

//     this.manager = manager;

//     this.watchLocalFile();
//     createMenuCommand(this.manager);
//   }

//   get isMultiple() {
//     return this.manager.allConfigs.length > 1;
//   }

//   createCommands() {
//     _.forEach(this.commands, (value, key) => {
//       vscode.commands.registerCommand(value, this[key].bind(this));
//     });
//   }

//   refreshMocks() {
//     if (MocksServer.singleInstance) {
//       MocksServer.singleInstance.refreshMocksCode();
//     }
//   }

//   findInterface(ignoreEdit = false) {
//     const items = this.manager.currLocalDataSource.mods
//       .map((mod) => {
//         return mod.interfaces.map((inter) => {
//           return {
//             label: `[${inter.method}] ${inter.path}`,
//             detail: `${mod.name}.${inter.name}`,
//             description: `${inter.description}`,
//           } as vscode.QuickPickItem;
//         });
//       })
//       .reduce((pre, next) => pre.concat(next), []);

//     return vscode.window
//       .showQuickPick(items, {
//         matchOnDescription: true,
//         matchOnDetail: true,
//       })
//       .then((item) => {
//         if (!item) {
//           return;
//         }

//         let code = `API.${item.detail}.`;

//         if (this.manager.allLocalDataSources.length > 1) {
//           code = `API.${this.manager.currLocalDataSource.name}.${item.detail}.`;
//         }

//         const editor = vscode.window.activeTextEditor;

//         if (!ignoreEdit) {
//           editor.edit((builder) => {
//             if (editor.selection.isEmpty) {
//               const position = editor.selection.active;

//               builder.insert(position, code);
//             } else {
//               builder.replace(editor.selection, code);
//             }
//           });
//         }

//         return code.split(".").filter((id) => id);
//       });
//   }

//   switchOrigin() {
//     const origins = this.manager.allConfigs.map((conf) => {
//       return {
//         label: conf.name,
//         description: conf.originUrl,
//       } as vscode.QuickPickItem;
//     });

//     vscode.window.showQuickPick(origins).then(
//       async (item) => {
//         vscode.window.withProgress(
//           {
//             location: vscode.ProgressLocation.Notification,
//             title: "",
//           },
//           async (p) => {
//             this.manager.setReport((info) => {
//               p.report({ message: info });
//             });
//             try {
//               await this.manager.selectDataSource(item.label);
//               this.manager.calDiffs();
//               this.ui.reRender();

//               MocksServer.getSingleInstance(this.manager).checkMocksPath();
//             } catch (e) {
//               vscode.window.showErrorMessage(e.message);
//             }
//           }
//         );
//       },
//       (e) => {
//         vscode.window.showErrorMessage(e.message);
//       }
//     );
//   }

//   updateMod() {
//     const modDiffs = this.manager.diffs.modDiffs;
//     const items = modDiffs.map((item) => {
//       return {
//         label: item.name,
//         description: `${item.details[0]}等 ${item.details.length} 条更新`,
//       } as vscode.QuickPickItem;
//     });
//     const oldFiles = this.manager.getGeneratedFiles();

//     vscode.window.showQuickPick(items).then(
//       (thenItems) => {
//         if (!thenItems) {
//           return;
//         }

//         const modName = thenItems.label;

//         vscode.window.withProgress(
//           {
//             location: vscode.ProgressLocation.Notification,
//             title: "updateMod",
//           },
//           (p) => {
//             return new Promise<void>(async (resolve, reject) => {
//               try {
//                 p.report({ message: "开始更新..." });

//                 this.manager.makeSameMod(modName);
//                 await this.manager.lock();

//                 this.manager.calDiffs();
//                 this.ui.reRender();
//                 await this.manager.update(oldFiles);

//                 p.report({ message: "更新成功！" });
//                 vscode.window.showInformationMessage(modName + "更新成功!");
//                 resolve();
//               } catch (e) {
//                 reject(e);
//               }
//             });
//           }
//         );
//       },
//       (e) => {}
//     );
//   }

//   updateBo() {
//     const boDiffs = this.manager.diffs.boDiffs;
//     const oldFiles = this.manager.getGeneratedFiles();

//     const items = boDiffs.map((item) => {
//       return {
//         label: item.name,
//         description: item.details.join(", "),
//       } as vscode.QuickPickItem;
//     });

//     vscode.window.showQuickPick(items).then(
//       (item) => {
//         if (!item) {
//           return;
//         }

//         let boName = item.label;

//         vscode.window.withProgress(
//           {
//             location: vscode.ProgressLocation.Notification,
//             title: "updateBo",
//           },
//           (p) => {
//             return new Promise<void>(async (resolve, reject) => {
//               try {
//                 p.report({ message: "开始更新..." });

//                 this.manager.makeSameBase(boName);
//                 await this.manager.lock();

//                 this.manager.calDiffs();
//                 this.ui.reRender();
//                 await this.manager.update(oldFiles);

//                 p.report({ message: "更新成功！" });
//                 vscode.window.showInformationMessage(boName + "更新成功!");
//                 resolve();
//               } catch (e) {
//                 reject(e);
//               }
//             });
//           }
//         );
//       },
//       (e) => {}
//     );
//   }

//   updateAll() {
//     vscode.window.showInformationMessage("确定全量更新吗？", "确定").then(
//       (text) => {
//         if (!text) {
//           return;
//         }

//         vscode.window.withProgress(
//           {
//             location: vscode.ProgressLocation.Notification,
//             title: "updateAll",
//           },
//           (p) => {
//             return new Promise<void>(async (resolve, reject) => {
//               try {
//                 p.report({ message: "开始更新..." });

//                 this.manager.makeAllSame();

//                 await this.manager.lock();

//                 this.manager.calDiffs();
//                 this.ui.reRender();

//                 p.report({ message: "更新成功！" });
//                 vscode.window.showInformationMessage("更新成功!");

//                 resolve();
//               } catch (e) {
//                 reject(e);
//               }
//             });
//           }
//         );
//       },
//       (e) => {}
//     );
//   }

//   syncRemote() {
//     showProgress("syncRemote", this.manager, async (report) => {
//       report("远程更新中...");

//       try {
//         await this.manager.readRemoteDataSource();

//         report("同步成功！");
//         report("差异比对中...");
//         this.manager.calDiffs();

//         report("同步完成！");
//         this.ui.reRender();
//       } catch (e) {
//         vscode.window.showErrorMessage(e.message);
//       }
//     });
//   }

//   async regenerate() {
//     const e = new events.EventEmitter();

//     showProgress("生成代码", this.manager, async (report) => {
//       report("代码生成中...");
//       await wait(100);

//       await this.manager.regenerateFiles();

//       report("代码生成成功！");
//       vscode.window.showInformationMessage("文件生成成功！");
//     });
//   }

//   async syncNpm() {
//     await syncNpm();
//   }
// }
