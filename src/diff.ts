import * as path from 'path';
import * as vscode from 'vscode';

const SCHEME = 'bolcode';

/** Shows original vs proposed code in VS Code's diff editor and asks Accept / Reject. */
export class DiffReviewer {
  private docs = new Map<string, string>();

  constructor(ctx: vscode.ExtensionContext) {
    ctx.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(SCHEME, {
        provideTextDocumentContent: uri => this.docs.get(uri.path) ?? ''
      })
    );
  }

  async review(original: string, proposed: string, fileName: string): Promise<boolean> {
    const id = Date.now();
    const ext = path.extname(fileName);
    const beforePath = `/${id}/before${ext}`;
    const afterPath = `/${id}/after${ext}`;
    this.docs.set(beforePath, original);
    this.docs.set(afterPath, proposed);

    const before = vscode.Uri.from({ scheme: SCHEME, path: beforePath });
    const after = vscode.Uri.from({ scheme: SCHEME, path: afterPath });
    await vscode.commands.executeCommand('vscode.diff', before, after, 'BolCode: proposed change',
      { preview: true, preserveFocus: true });

    const choice = await vscode.window.showInformationMessage('BolCode: apply this change?', 'Accept', 'Reject');

    const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (tab?.input instanceof vscode.TabInputTextDiff) {
      await vscode.window.tabGroups.close(tab);
    }
    this.docs.delete(beforePath);
    this.docs.delete(afterPath);
    return choice === 'Accept';
  }
}
