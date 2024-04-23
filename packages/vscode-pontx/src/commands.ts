import { PontManager } from "pontx-manager";
import * as _ from "lodash";
import * as vscode from "vscode";
import { findInterface, showProgress, viewMetaFile, VSCodeLogger, wait } from "./utils";
import { PontWebView } from "./webview";
import { pontService } from "./Service";
import { PontSpec } from "pontx-spec";
import * as fs from "fs-extra";
import { GenerateResponse } from "pontx-manager/src/generateAICode";

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

const insertStreamingCode = async (codeGenerator: Promise<GenerateResponse>) => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("没有打开的文件，无法输出代码");
    return;
  }
  const position = editor.selection.active;
  // const selection = editor.selection;
  let insertedCode = "";
  let writedCode = "";

  let replaceCode = async (newCode: string) => {
    return editor
      .edit((builder) => {
        const lineCnt = writedCode?.split("\n").length - 1;
        const lastLineCharCnt = writedCode?.split("\n")?.[writedCode?.split("\n").length - 1]?.length;
        let newLine = position.line + lineCnt;
        let newCharactor = lineCnt ? lastLineCharCnt : position.character + lastLineCharCnt;
        let newPos = new vscode.Position(newLine, newCharactor);
        const selection = new vscode.Selection(position, newPos);
        try {
          builder.replace(selection, newCode);
        } catch (e) {
          console.log(e.message, e.stack);
        }
      })
      .then(
        (success, ...args) => {
          if (!success) {
            console.log(...args);
          } else {
            insertedCode = newCode;
          }
        },
        (e) => {
          console.log(e.message, e.stack);
        },
      );
  };
  let writeStreamCode = async (newCode: string) => {
    return editor
      .edit((builder) => {
        const lineCnt = writedCode?.split("\n").length - 1;
        const lastLineCharCnt = writedCode?.split("\n")?.[writedCode?.split("\n").length - 1]?.length;
        let newLine = position.line + lineCnt;
        let newCharactor = lineCnt ? lastLineCharCnt : position.character + lastLineCharCnt;
        let newPos = new vscode.Position(newLine, newCharactor);
        try {
          builder.insert(newPos, newCode);
        } catch (e) {
          console.log(e.message, e.stack);
        }
      })
      .then(
        (success, ...args) => {
          if (!success) {
            console.log(...args);
          } else {
            writedCode += newCode;
          }
        },
        (e) => {
          console.log(e.message, e.stack);
        },
      );
  };
  let prefixCode = "// 以下代码通过 Pontx AI 生成... \n";
  await writeStreamCode(prefixCode);
  await wait(100);

  let generator = await codeGenerator;

  while (true) {
    generator = await generator.next();
    const { code, isDone, codeAdded, errorMessage } = generator;

    if (isDone) {
      await replaceCode(prefixCode + code);
      vscode.window.showInformationMessage("代码生成成功！");
      return;
    }
    if (errorMessage) {
      vscode.window.showErrorMessage(errorMessage);
      return;
    }

    await writeStreamCode(codeAdded);
  }
};
export class PontCommands {
  static getPickItems(pontSpec: PontSpec) {
    const hasMod = PontSpec.checkHasMods(pontSpec);
    const hasSingleMod = PontSpec.getMods(pontSpec).length <= 1;
    const items = PontSpec.getMods(pontSpec)
      .map((mod) => {
        const modItem = hasMod
          ? [
              {
                label: mod.name,
                detail: pontSpec.name ? `${pontSpec.name}.${mod.name}` : mod.name,
                description: mod.description,
              },
            ]
          : [];
        const apiItems = mod.interfaces.map((inter) => {
          return {
            label: `${inter.method ? `[${inter.method}] ` : ""}${inter.path ? inter.path : inter.name}`,
            detail: `${pontSpec.name ? pontSpec.name + "." : ""}${hasSingleMod ? "" : mod.name + "."}${inter.name}`,
            description: `${inter.description || inter.summary || ""}`,
          };
        });

        return [...modItem, ...apiItems];
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
        .showQuickPick(items as any, {
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
            if (PontSpec.checkHasMods(spec)) {
              modName = detailItems[1];
              apiName = detailItems[2];
            } else {
              apiName = detailItems[1];
            }
          } else {
            const spec = service.pontManager.localPontSpecs[0];
            if (PontSpec.checkHasMods(spec)) {
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
            let snippets = [];
            let specType = "";

            if (!apiName && modName) {
              specType = "controller";
              snippets = generatePlugin?.providerControllerSnippets?.(modName, specName, {
                spec: pontSpec,
              });
            } else {
              snippets = generatePlugin?.providerSnippets?.(apiMeta, modName, pontSpec.name, {
                spec: pontSpec,
              });
            }

            if (apiName) {
              specType = "api";
            }

            const aiPrompts = PontManager.listPromptsBySpecType(service.pontManager, specName, specType as any);

            if (aiPrompts?.length) {
              snippets.push(
                ...aiPrompts
                  .map((prompt) => {
                    let description = "";
                    if (prompt.sceneType === "frontend") {
                      description = "[前端场景]";
                    } else if (prompt.sceneType === "backend") {
                      description = "[后端场景]";
                    } else if (prompt.sceneType === "sql") {
                      description = "[SQL场景]";
                    } else if (prompt.sceneType === "pontx") {
                      return null;
                    }
                    return {
                      name: prompt.name,
                      id: prompt.id,
                      isPromptSnippet: true,
                      description,
                    };
                  })
                  .filter((id) => id),
              );
            }

            if (snippets?.length) {
              if (snippets.length === 1) {
                insertCode[snippets[0].code];
              }
              const VIEW_API_DOC_ID = "VSCODE_PONTX_SHOW_PICK_ITEM_VIEW_API_DOC";
              const snippetItems = snippets.map((snippet) => {
                if (snippet?.isPromptSnippet) {
                  return {
                    label: "通过 AI 生成代码: " + snippet.name,
                    id: snippet.id,
                    description: snippet.description || "",
                    isPromptSnippet: true,
                  };
                }

                return {
                  label: "插入代码段: " + snippet.name,
                  id: snippet.name,
                  description: snippet.description,
                };
              });

              let pickItems = snippetItems;
              if (apiName) {
                pickItems = [
                  {
                    label: "查看文档",
                    id: VIEW_API_DOC_ID,
                    description: "",
                  },
                  ...snippetItems,
                ];
              }

              return vscode.window
                .showQuickPick(pickItems, {
                  matchOnDescription: true,
                  matchOnDetail: true,
                })
                .then(async (snippet) => {
                  const foundSnippet = snippets.find((inst) => inst?.id === snippet?.id || inst.name === snippet?.id);
                  if (foundSnippet) {
                    if (foundSnippet?.isPromptSnippet) {
                      let config = vscode.workspace.getConfiguration("pontx");
                      let variables = { ...((config.get("ai.variables") as any) || {}) };

                      if (apiName) {
                        if (modName) {
                          variables.apiName = [modName, apiName].join("/");
                        } else {
                          variables.apiName = apiName;
                        }
                      } else if (!apiName && modName && typeof modName === "string") {
                        variables.controllerName = modName;
                      }
                      variables.specName = specName || "";

                      const codeGenerator = PontManager.generateAICode(service.pontManager, {
                        promptId: foundSnippet.id,
                        variables,
                        specName: variables?.specName,
                        userPrompt: "",
                      } as any);
                      insertStreamingCode(codeGenerator);
                    } else {
                      insertCode(foundSnippet.code);
                    }
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

    vscode.commands.registerCommand("pontx.generateMocks", () => {
      const pontManager = service.pontManager;

      showProgress("生成Mocks", pontManager, async (log) => {
        log("代码生成中...");
        await wait(100);

        await PontManager.generateMocks(pontManager);

        log("mocks 生成成功！");
        vscode.window.showInformationMessage("Mocks生成成功！");
      });
    });

    vscode.commands.registerCommand("pontx.regenerateAPIMocks", async (event) => {
      const filePaths: string[] = (event.path || "")?.split("/");
      const lastMocksIndex = filePaths.lastIndexOf("mocks");
      const names = filePaths.slice(lastMocksIndex + 1);
      names.push(names.pop().replace(".ts", ""));

      if (service.pontManager.localPontSpecs?.[0]?.name) {
        showProgress("重新生成 API Mocks", service.pontManager, async (log) => {
          log("代码生成中...");
          await wait(100);

          let specName, modName, apiName;
          if (names.length === 3) {
            [specName, modName, apiName] = names;
          } else {
            [specName, apiName] = names;
          }
          const mocksPlugin = await service.pontManager.innerManagerConfig.plugins.mocks?.instance;
          const mocksOptions = await service.pontManager.innerManagerConfig.plugins.mocks?.options;
          const mocksCode = await mocksPlugin.getAPIMockCode(
            service.pontManager,
            mocksOptions,
            apiName,
            modName,
            specName,
          );
          fs.writeFileSync(event.path, mocksCode, "utf-8");

          log("API Mocks 生成成功！");
          vscode.window.showInformationMessage("API Mocks生成成功！");
        });
      }
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
      const result = (await findInterface(editor, !isSingleSpec, service.pontManager)) || ({} as any);
      const spec = PontManager.getSpec(service.pontManager, result.specName);

      if (!result.apiName) {
        vscode.window.showErrorMessage("未找到该 OpenAPI");
        return;
      }

      vscode.commands.executeCommand("pontx.openPontUI", {
        specName: result.specName,
        modName: result.modName,
        name: result.apiName,
        pageType: "document",
        schemaType: "api",
        spec: spec?.apis?.[`${result.apiKey}`],
      });
    });
    vscode.commands.registerTextEditorCommand("pontx.viewMocks", async (editor, edit) => {
      const isSingleSpec = PontManager.checkIsSingleSpec(service.pontManager);
      const result = (await findInterface(editor, !isSingleSpec, service.pontManager)) || ({} as any);
      const spec = PontManager.getSpec(service.pontManager, result.specName);

      if (!result.apiName) {
        vscode.window.showErrorMessage("未找到该 OpenAPI");
        return;
      }

      const namespace = [result.specName, result.modName, result.apiName].filter((id) => id).join("/");
      const mocksFilePath = path.join(service.pontManager.innerManagerConfig.outDir, "mocks", namespace + ".ts");
      vscode.commands.executeCommand("vscode.open", vscode.Uri.file(mocksFilePath));
    });

    vscode.commands.registerTextEditorCommand("pontx.openMeta", async (editor, edit) => {
      const isSingleSpec = PontManager.checkIsSingleSpec(service.pontManager);
      const { specName, apiName, modName } =
        (await findInterface(editor, !isSingleSpec, service.pontManager)) || ({} as any);

      if (!apiName) {
        vscode.window.showErrorMessage("未找到该 OpenAPI");
        return;
      }

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
