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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const recorder_1 = require("./recorder");
const prisma_1 = require("./prisma");
const llm_1 = require("./llm");
const tts_1 = require("./tts");
const intent_1 = require("./intent");
const diff_1 = require("./diff");
const vocab_1 = require("./vocab");
const GNANI_KEY = 'bolcode.gnaniKey';
const LLM_KEY = 'bolcode.llmKey';
const MAX_UNSELECTED_LINES = 300;
function activate(ctx) {
    let state = 'idle';
    let recorder;
    const cfg = () => vscode.workspace.getConfiguration('bolcode');
    const out = vscode.window.createOutputChannel('BolCode');
    const reviewer = new diff_1.DiffReviewer(ctx);
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    status.command = 'bolcode.listen';
    status.show();
    ctx.subscriptions.push(status, out);
    const render = (text, tooltip = '', warn = false) => {
        status.text = text;
        status.tooltip = tooltip || 'BolCode: click or press Ctrl+Alt+B';
        status.backgroundColor = warn ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
    };
    const idle = () => { state = 'idle'; render('$(mic) BolCode'); };
    idle();
    let voiceWarned = false;
    async function say(text, force = false) {
        if (!force && !cfg().get('voice.enabled')) {
            return;
        }
        try {
            const apiKey = (await ctx.secrets.get(GNANI_KEY)) ?? '';
            await (0, tts_1.speak)({
                apiKey,
                model: String(cfg().get('voice.model') || 'vachana-voice-v3'),
                voice: String(cfg().get('voice.name') || 'Karan'),
                language: String(cfg().get('voice.language') || 'hi-IN')
            }, text);
        }
        catch (e) {
            out.appendLine(`! voice: ${e.message}`);
            if (!voiceWarned || force) {
                voiceWarned = true;
                vscode.window.showWarningMessage(`BolCode voice reply failed: ${e.message}`);
            }
        }
    }
    async function askKey(name, prompt) {
        const value = await vscode.window.showInputBox({ prompt, password: true, ignoreFocusOut: true });
        if (value) {
            await ctx.secrets.store(name, value.trim());
        }
        return value?.trim();
    }
    async function getGnaniKey() {
        return (await ctx.secrets.get(GNANI_KEY)) ?? askKey(GNANI_KEY, 'Gnani API key (from app.gnani.ai)');
    }
    async function getLlmConfig() {
        const baseUrl = String(cfg().get('llm.baseUrl') ?? '').trim();
        const model = String(cfg().get('llm.model') ?? '').trim();
        if (!baseUrl || !model) {
            throw new Error('Set bolcode.llm.baseUrl and bolcode.llm.model in Settings (any OpenAI-compatible endpoint).');
        }
        let apiKey = (await ctx.secrets.get(LLM_KEY)) ?? '';
        const isLocal = /localhost|127\.0\.0\.1/.test(baseUrl);
        if (!apiKey && !isLocal) {
            apiKey = (await askKey(LLM_KEY, 'LLM API key')) ?? '';
            if (!apiKey) {
                throw new Error('An LLM API key is required.');
            }
        }
        return { baseUrl, model, apiKey };
    }
    async function handleTranscript(transcript) {
        vscode.window.showInformationMessage(`🎙 ${transcript}`);
        out.appendLine(`> ${transcript}`);
        const intent = (0, intent_1.detectIntent)(transcript);
        if (intent === 'undo') {
            await vscode.commands.executeCommand('undo');
            void say('वापस कर दिया।');
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('Open a file and select some code first.');
        }
        const doc = editor.document;
        const hasSelection = !editor.selection.isEmpty;
        if (!hasSelection && doc.lineCount > MAX_UNSELECTED_LINES) {
            throw new Error('Select the code you want to change first (file is too large to send whole).');
        }
        const range = hasSelection
            ? new vscode.Range(editor.selection.start, editor.selection.end)
            : new vscode.Range(0, 0, doc.lineCount, 0);
        const original = doc.getText(range);
        const fileName = doc.fileName.split(/[\\/]/).pop() ?? 'file';
        const llm = await getLlmConfig();
        render('$(sync~spin) BolCode: thinking…');
        if (intent === 'explain') {
            const answer = await (0, llm_1.explainCode)(llm, transcript, original, fileName, doc.languageId);
            out.appendLine(answer);
            out.show(true);
            if (cfg().get('voice.enabled')) {
                (0, llm_1.spokenSummary)(llm, answer).then(t => say(t)).catch(e => out.appendLine(`! voice: ${e.message}`));
            }
            return;
        }
        const proposed = await (0, llm_1.proposeEdit)(llm, transcript, original, fileName, doc.languageId);
        if (proposed.trim() === original.trim()) {
            vscode.window.showInformationMessage('BolCode: no changes were needed.');
            return;
        }
        void say('बदलाव तैयार है, देख लीजिए।');
        if (await reviewer.review(original, proposed, fileName)) {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(doc.uri, range, proposed);
            await vscode.workspace.applyEdit(edit);
            void say('हो गया।');
        }
        else {
            void say('ठीक है, रद्द कर दिया।');
        }
    }
    ctx.subscriptions.push(vscode.commands.registerCommand('bolcode.listen', async () => {
        if (state === 'processing') {
            return;
        }
        if (state === 'idle') {
            try {
                const key = await getGnaniKey();
                if (!key) {
                    return;
                }
                recorder = new recorder_1.Recorder(String(cfg().get('ffmpegPath') || 'ffmpeg'), String(cfg().get('micDevice') || ''), Number(cfg().get('maxRecordSeconds') ?? 20));
                recorder.start();
                state = 'recording';
                render('$(record) BolCode: listening… (press again to stop)', '', true);
            }
            catch (e) {
                idle();
                vscode.window.showErrorMessage(`BolCode: ${e.message}`);
            }
            return;
        }
        // state === 'recording' → stop, transcribe, act
        state = 'processing';
        render('$(sync~spin) BolCode: transcribing…');
        try {
            const wav = await recorder.stop();
            const key = (await ctx.secrets.get(GNANI_KEY)) ?? '';
            const transcript = await (0, prisma_1.transcribe)(wav, key, {
                language: String(cfg().get('language') || 'en-IN'),
                biasWords: vocab_1.BIAS_WORDS,
                substitutions: cfg().get('substitutions') ?? []
            });
            await handleTranscript(transcript);
        }
        catch (e) {
            vscode.window.showErrorMessage(`BolCode: ${e.message}`);
            out.appendLine(`! ${e.message}`);
        }
        finally {
            recorder = undefined;
            idle();
        }
    }), vscode.commands.registerCommand('bolcode.setGnaniKey', () => askKey(GNANI_KEY, 'Gnani API key (from app.gnani.ai)')), vscode.commands.registerCommand('bolcode.testVoice', () => say('नमस्ते, मैं बोल कोड हूँ। बोलो, कोड हो जाएगा।', true)), vscode.commands.registerCommand('bolcode.setLlmKey', () => askKey(LLM_KEY, 'LLM API key')), vscode.commands.registerCommand('bolcode.selectMic', async () => {
        const mics = await (0, recorder_1.listMicrophones)(String(cfg().get('ffmpegPath') || 'ffmpeg'));
        if (mics.length === 0) {
            vscode.window.showErrorMessage('BolCode: no microphones found. Is ffmpeg installed and on PATH?');
            return;
        }
        const pick = await vscode.window.showQuickPick(mics.map(m => ({ label: m.label, value: m.value })), { placeHolder: 'Choose your microphone' });
        if (pick) {
            await cfg().update('micDevice', pick.value, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`BolCode: using "${pick.label}".`);
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map