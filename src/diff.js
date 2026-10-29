"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffReviewer = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const SCHEME = 'bolcode';
/** Shows original vs proposed code in VS Code's diff editor and asks Accept / Reject. */
class DiffReviewer {
    docs = new Map();
    constructor(ctx) {
        ctx.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(SCHEME, {
            provideTextDocumentContent: uri => this.docs.get(uri.path) ?? ''
        }));
    }
    async review(original, proposed, fileName) {
        const id = Date.now();
        const ext = path.extname(fileName);
        const beforePath = `/${id}/before${ext}`;
        const afterPath = `/${id}/after${ext}`;
        this.docs.set(beforePath, original);
        this.docs.set(afterPath, proposed);
        const before = vscode.Uri.from({ scheme: SCHEME, path: beforePath });
        const after = vscode.Uri.from({ scheme: SCHEME, path: afterPath });
        await vscode.commands.executeCommand('vscode.diff', before, after, 'BolCode: proposed change', { preview: true, preserveFocus: true });
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
exports.DiffReviewer = DiffReviewer;
//# sourceMappingURL=diff.js.map