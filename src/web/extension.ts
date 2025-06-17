import * as vscode from "vscode";
import { registerDotSvgPreviewSupport } from "./dotSvgPreview";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(registerDotSvgPreviewSupport(context));
}

export function deactivate() {}
