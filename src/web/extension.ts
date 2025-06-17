import * as vscode from "vscode";
import { registerDotSvgPreviewSupport } from "./dotSvgPreview";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "dot-preview" is now active in the web extension host!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand("dot-preview.helloWorld", () => {
    // The code you place here will be executed every time your command is executed

    // Display a message box to the user
    vscode.window.showInformationMessage("Hello World from dot-preview in a web extension host!");
  });

  context.subscriptions.push(disposable);

  context.subscriptions.push(registerDotSvgPreviewSupport(context));
}

// This method is called when your extension is deactivated
export function deactivate() {}
