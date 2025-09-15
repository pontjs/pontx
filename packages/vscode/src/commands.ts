import { PontxManager, PontxService } from "pontx";
import path from "path";
import * as vscode from "vscode";
import { PontxTreeItem, PontxTreeItemType } from "./type";
import {
  getJsonPathLocation,
  getSpecPickItems,
  isApiPickItem,
  convertPickItemToTreeItem,
  generateSampleCode,
} from "./utils";

export const findMeta = async (
  service: PontxService,
  extensionUri: vscode.Uri
) => {
  const manager = service?.getManager?.();
  if (!manager) {
    return;
  }

  // 在 showQuickPick 之前保存当前编辑器的位置信息
  const currentEditor = vscode.window.activeTextEditor;
  const savedSelection = currentEditor?.selection;

  const pickItems = (manager?.resolvedConfig?.origins || [])
    .map((origin) => {
      return getSpecPickItems(origin.spec, extensionUri);
    })
    .reduce((acc, curr) => {
      return [...acc, ...curr];
    }, []);

  if (!pickItems?.length) {
    return;
  }

  const pickItem = await vscode.window.showQuickPick(pickItems, {
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!pickItem) {
    return;
  }

  /**
   * 让用户选择后续操作：1. 查看文档 2. 插入 XX 代码
   */
  // 判断当前 pickItem 是否为 API（只有 API 才能查看文档）
  const isApiItem = isApiPickItem(pickItem, manager);
  // 获取所有可插入代码的类型
  const generateSamples =
    (await manager?.resolvedConfig?.resolvedPlugin?.generateSamples?.({
      resolvedConfig: manager.resolvedConfig,
    })) || [];

  // 构造操作选项
  const actionOptions: vscode.QuickPickItem[] = [];
  if (isApiItem) {
    actionOptions.push({
      label: "查看文档",
      description: "在 WebView 中查看该 API 的文档",
    });
  }
  if (generateSamples?.length > 0) {
    generateSamples.forEach((sample) => {
      actionOptions.push({
        label: `插入${sample.case}代码`,
        description: `将 ${sample.case} 示例代码插入到当前编辑器`,
        detail: sample.case,
      });
    });
  }

  if (!actionOptions.length) {
    vscode.window.showWarningMessage("没有可用的操作选项。");
    return;
  }

  // 让用户选择操作
  const actionPick = await vscode.window.showQuickPick(actionOptions, {
    placeHolder: "请选择操作",
  });
  if (!actionPick) {
    return;
  }

  // 处理"查看文档"
  if (actionPick.label === "查看文档") {
    const pontxTreeItem = convertPickItemToTreeItem(pickItem, manager);
    if (!pontxTreeItem) {
      vscode.window.showWarningMessage("未找到对应的 API 信息。");
      return;
    }

    // 触发 pontx.openDoc 命令，传递 PontxTreeItem
    await vscode.commands.executeCommand("pontx.openDoc", pontxTreeItem);
    return;
  }

  // 处理"插入 XX 代码"
  if (actionPick.label.startsWith("插入")) {
    const sampleType = actionPick.detail;

    // 使用之前保存的编辑器信息，如果没有则尝试获取当前编辑器
    const editor = currentEditor || vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("未找到可用的编辑器。");
      return;
    }

    // 生成示例代码
    const code = await generateSampleCode(pickItem, sampleType, manager);
    if (!code) {
      vscode.window.showWarningMessage("未生成示例代码。");
      return;
    }

    // 使用保存的选择区域，如果没有则使用当前选择区域
    const selection = savedSelection || editor.selection;

    editor.edit((editBuilder) => {
      // 如果有选中的文本，则替换选中的内容；否则在光标位置插入
      if (selection && !selection.isEmpty) {
        editBuilder.replace(selection, code);
      } else {
        editBuilder.insert(selection?.active || editor.selection.active, code);
      }
    });
    vscode.window.showInformationMessage(`已插入${sampleType}代码。`);
    return;
  }
};

/**
 * 打开元数据文件，并定位到对应位置
 */
export async function revealMetaFile(
  pontxManager: PontxManager,
  item: PontxTreeItem
) {
  const outDir = pontxManager?.resolvedConfig?.outDir;
  const specName = item?.specName;
  if (!outDir || !specName) {
    return;
  }
  const lockFilePath = path.join(outDir, specName, PontxManager.lockFilename);

  // 打开文件
  const textDocument = await vscode.workspace.openTextDocument(
    vscode.Uri.file(lockFilePath)
  );
  const activeEditor = await vscode.window.showTextDocument(textDocument);
  const fileContent = textDocument.getText();
  const location = getJsonPathLocation(fileContent, item.jsonPath);
  if (
    location &&
    location?.range?.start &&
    location?.range?.end &&
    activeEditor
  ) {
    activeEditor.revealRange(
      new vscode.Range(
        location.range.start.line,
        location.range.start.character,
        location.range.end.line,
        location.range.end.character
      )
    );
    activeEditor.selection = new vscode.Selection(
      location.range.start.line,
      location.range.start.character,
      location.range.end.line,
      location.range.end.character
    );
  }
}

/** regenerate */
export async function regenerate(pontxService: PontxService) {
  const pontxManager = pontxService?.getManager?.();
  if (!pontxManager) {
    return;
  }

  try {
    await PontxManager.generateCode(pontxManager);
    vscode.window.showInformationMessage("Regenerate completed.");
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Regenerate failed: ${error?.message || error.toString()}`
    );
  }
}

/** fetch remote */
export async function fetchRemote(pontxService: PontxService) {
  const pontxManager = pontxService?.getManager?.();
  if (!pontxManager) {
    return;
  }

  try {
    await PontxManager.fetchRemotePontMeta(pontxManager);
    await PontxManager.generateCode(pontxManager);

    vscode.window.showInformationMessage("Fetch remote specs completed.");
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Fetch remote specs failed: ${error?.message || error.toString()}`
    );
  }
}
