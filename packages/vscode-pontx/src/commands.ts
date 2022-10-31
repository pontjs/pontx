import { PontManager } from "pontx-manager";
import * as _ from "lodash";
import * as vscode from "vscode";
import { findInterface, showProgress, viewMetaFile, VSCodeLogger, wait } from "./utils";
import { PontWebView } from "./webview";
import { pontService } from "./Service";
import { PontSpec } from "pontx-spec";
import * as fs from "fs-extra";

// import { PontService } from "./Service";
// const fs = require("fs");
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
  static getPickItems(pontSpec: PontSpec) {
    const hasSingleMod = PontSpec.getMods(pontSpec).length <= 1;
    const items = PontSpec.getMods(pontSpec)
      .map((mod) => {
        return mod.interfaces.map((inter) => {
          return {
            label: `${inter.method ? `[${inter.method}] ` : ""}${inter.path ? inter.path : inter.name}`,
            detail: `${pontSpec.name ? pontSpec.name + "." : ""}${hasSingleMod ? "" : mod.name + "."}${inter.name}`,
            description: `${inter.description}`,
          };
        });
      })
      .reduce((pre, next) => pre.concat(next), []);

    return items;
  }

  static registerCommands(context) {
    const service = pontService;

    vscode.commands.registerCommand("pontx.switchOrigin", () => {
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
              location: vscode.ProgressLocation.Window,
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

    vscode.commands.registerCommand("pontx.findInterface", () => {
      const hasSpecName = service.pontManager.localPontSpecs.some((spec) => spec.name);
      const items = service.pontManager.localPontSpecs
        .map((pontSpec) => {
          return PontCommands.getPickItems(pontSpec);
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
          let specName: string, modName: string, apiName: string;
          const detailItems = item.detail.split(".");

          if (hasSpecName) {
            specName = detailItems[0];
            const spec = service.pontManager.localPontSpecs.find((spec) => spec.name === specName);
            if (PontSpec.getMods(spec)?.length > 1) {
              modName = detailItems[1];
              apiName = detailItems[2];
            } else {
              apiName = detailItems[1];
            }
          } else {
            const spec = service.pontManager.localPontSpecs[0];
            if (PontSpec.getMods(spec)?.length > 1) {
              modName = detailItems[0];
              apiName = detailItems[1];
            } else {
              apiName = detailItems[0];
            }
          }
          const pontSpec =
            service.pontManager.localPontSpecs.find((spec) => spec.name === specName) ||
            service.pontManager.localPontSpecs[0];
          const modMeta =
            PontSpec.getMods(pontSpec)?.find((mod) => mod.name === modName) || PontSpec.getMods(pontSpec)?.[0];
          const apiMeta = modMeta?.interfaces?.find((api) => api.name === apiName);

          Promise.resolve(service.pontManager.innerManagerConfig.plugins.generate?.instance).then((generatePlugin) => {
            const snippets = generatePlugin?.providerSnippets?.(apiMeta, modName, pontSpec.name, {
              spec: pontSpec,
            });

            if (snippets?.length) {
              if (snippets.length === 1) {
                insertCode[snippets[0].code];
              }
              const VIEW_API_DOC_ID = "VSCODE_PONTX_SHOW_PICK_ITEM_VIEW_API_DOC";
              const pickItems = [
                {
                  label: "查看文档",
                  id: VIEW_API_DOC_ID,
                },
                ...snippets.map((snippet) => {
                  return {
                    label: "插入代码段: " + snippet.name,
                    id: snippet.name,
                    description: snippet.description,
                  };
                }),
              ];

              return vscode.window
                .showQuickPick(pickItems, {
                  matchOnDescription: true,
                  matchOnDetail: true,
                })
                .then((snippet) => {
                  const foundSnippet = snippets.find((inst) => inst.name === snippet?.id);
                  if (foundSnippet) {
                    insertCode(foundSnippet.code);
                  } else if (snippet.id === VIEW_API_DOC_ID) {
                    vscode.commands.executeCommand("pontx.openPontUI", {
                      specName,
                      modName,
                      name: apiName,
                      spec: apiMeta,
                      pageType: "document",
                      schemaType: "api",
                    });
                  }
                });
            }

            const code = `API.${item.detail}.`;
            insertCode(code);
          });
        });
    });

    vscode.commands.registerCommand("pontx.regenerate", () => {
      const pontManager = service.pontManager;
      showProgress("生成代码", pontManager, async (log) => {
        log("代码生成中...");
        await wait(100);

        await PontManager.generateCode(pontManager);

        log("代码生成成功！");
        vscode.window.showInformationMessage("文件生成成功！");
      });
    });
    vscode.commands.registerCommand("pontx.fetchRemote", (config) => {
      const pontManager = service.pontManager;

      showProgress("拉取远程元数据", pontManager, async (log) => {
        try {
          log("元数据拉取中...");
          await wait(100);

          const manager = await PontManager.fetchRemotePontMeta(pontManager);
          service.updatePontManger(manager);

          log("元数据拉取成功！");
          vscode.window.showInformationMessage("元数据拉取成功！");
        } catch (e) {
          vscode.window.showErrorMessage("元数据拉取失败：" + e.message);
        }
      });
    });

    vscode.commands.registerCommand("pontx.openPontUI", (config) => {
      new PontWebView().openTab(context.extensionUri, config);
    });

    vscode.commands.registerCommand("pontx.openPreviewToTheSide", async (config) => {
      const filePath = config.path;
      const fileContent = await fs.readFile(filePath, "utf8");
      try {
        const meta = JSON.parse(fileContent);
        new PontWebView().openAPIPreviewTab(context.extensionUri, meta, filePath);
      } catch (e) {
        vscode.window.showErrorMessage("文件不符合JSON格式: " + e.message);
      }
    });

    vscode.commands.registerCommand("pontx.restart", async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          cancellable: false,
          title: "pont",
        },
        async (progress, token) => {
          progress.report({ message: "pont 重启中...", increment: 0 });
          try {
            const pontManager = await PontManager.constructorFromRootDir(
              vscode.workspace.rootPath,
              VSCodeLogger.createFromProgress(progress),
            );

            pontService.updatePontManger(pontManager);
            progress.report({ message: "pont 启动成功", increment: 100 });
          } catch (e) {
            vscode.window.showErrorMessage("pont 启动失败: " + e.message);
          }
        },
      );
    });
    vscode.commands.registerCommand("pontx.openPontPanel", async () => {
      await vscode.commands.executeCommand("pontExplorer.focus");
    });
    vscode.commands.registerCommand("pontx.config", async () => {
      const innerConf = service.pontManager.innerManagerConfig;

      const textDocument = await vscode.workspace.openTextDocument(
        vscode.Uri.file(path.join(innerConf.configDir, "pontx-config.json")),
      );
      await vscode.window.showTextDocument(textDocument);
    });
    vscode.commands.registerCommand("pontx.addOrigin", async () => {
      try {
        const innerConf = service.pontManager.innerManagerConfig;
        const configPlugin = await innerConf.plugins.config?.instance;
        const configPath = path.join(innerConf.configDir, "pontx-config.json");

        if (configPlugin && configPlugin.getOrigins) {
          const origins = await configPlugin.getOrigins();

          if (origins.length) {
            await vscode.window
              .showQuickPick(
                origins.map((item) => {
                  return { label: item.label, value: item.value };
                }),
              )
              .then(async (item) => {
                const foundOrigin = origins.find((i) => i.value === item.value);
                if (foundOrigin) {
                  try {
                    const fileContent = fs.readFileSync(configPath, "utf8");
                    const json = JSON.parse(fileContent);

                    if (json.origins) {
                      json.origins.push(foundOrigin.config);
                    } else {
                      json.origins = [foundOrigin.config];
                    }
                    fs.writeFileSync(configPath, JSON.stringify(json, null, 2), "utf8");

                    const textDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(configPath));
                    await vscode.window.showTextDocument(textDocument);
                  } catch (e) {}
                }
              });
          }
        }
      } catch (e) {
        service.pontManager.logger.error(e.message, e.stack);
      }
    });
    vscode.commands.registerTextEditorCommand("pontx.openDocument", async (editor, edit) => {
      const isSingleSpec = PontManager.checkIsSingleSpec(service.pontManager);
      const { specName, apiName, modName } = findInterface(editor, !isSingleSpec) || ({} as any);
      const spec = PontManager.getSpec(service.pontManager, specName);
      const apiKey = modName ? `${modName}/${apiName}` : apiName;

      vscode.commands.executeCommand("pontx.openPontUI", {
        specName,
        modName,
        name: apiName,
        pageType: "document",
        schemaType: "api",
        spec: spec?.apis?.[`${apiKey}`],
      });
    });

    vscode.commands.registerCommand("pontx.openMeta", async (editor, edit) => {
      const isSingleSpec = PontManager.checkIsSingleSpec(service.pontManager);
      const { specName, apiName, modName } = findInterface(editor, !isSingleSpec) || ({} as any);

      viewMetaFile({
        specName,
        modName,
        apiName,
        specType: "API",
        pontManager: service.pontManager,
      });
    });

    // vscode.commands.registerCommand('pontx.refreshPontExplorer', () => {
    //   service.treeDataProvider.refresh();
    // });
  }
}

// export class Commands {
//   static pontManager: PontManager;

//   commands = {
//     switchOrigin: "pontx.switchOrigin",
//     // updateMod: 'pontx.updateMod',
//     // updateBo: 'pontx.updateBo',
//     // updateAll: 'pontx.updateAll',
//     // syncRemote: 'pontx.syncRemote',
//     findInterface: "pontx.findInterface",
//     // refreshMocks: 'pontx.refreshMocks',
//     regenerate: "pontx.regenerate",
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
