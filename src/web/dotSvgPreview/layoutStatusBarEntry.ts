/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { PreviewStatusBarEntry as OwnedStatusBarEntry } from "../ownedStatusBarEntry";

import { Layout, supportedLayouts } from "./layout";

const selectLayoutCommandId = "dotSvgPreview.selectLayout";

export class LayoutStatusBarEntry extends OwnedStatusBarEntry {
  private readonly _onDidChangeLayout = this._register(new vscode.EventEmitter<{ layout: Layout }>());
  public readonly onDidChangeLayout = this._onDidChangeLayout.event;

  constructor() {
    super(
      "status.dotSvgPreview.layout",
      vscode.l10n.t("Layout Engine"),
      vscode.StatusBarAlignment.Right,
      102 /* to the left of image size entry (101) */,
    );

    this._register(
      vscode.commands.registerCommand(selectLayoutCommandId, async () => {
        type MyPickItem = vscode.QuickPickItem & { layout: Layout };

        const options = supportedLayouts.map((layout): MyPickItem => ({ label: layout, layout }));

        const pick = await vscode.window.showQuickPick(options, {
          placeHolder: vscode.l10n.t("Select layout engine"),
        });

        if (pick) {
          this._onDidChangeLayout.fire({ layout: pick.layout });
        }
      }),
    );

    this.entry.command = selectLayoutCommandId;
  }

  public show(owner: unknown, layout: Layout) {
    this.showItem(owner, "Layout: " + layout);
  }
}
