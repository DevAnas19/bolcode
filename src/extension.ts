import * as vscode from 'vscode';
import { Recorder, listMicrophones } from './recorder';
import { transcribe } from './prisma';
import { proposeEdit, explainCode, spokenSummary, LlmConfig } from './llm';
import { speak } from './tts';
import { detectIntent } from './intent';
import { DiffReviewer } from './diff';
import { BIAS_WORDS } from './vocab';

type State = 'idle' | 'recording' | 'processing';

const GNANI_KEY = 'bolcode.gnaniKey';
const LLM_KEY = 'bolcode.llmKey';
const MAX_UNSELECTED_LINES = 300;

export function activate(ctx: vscode.ExtensionContext) {
  let state: State = 'idle';
  let recorder: Recorder | undefined;

  const cfg = () => vscode.workspace.getConfiguration('bolcode');
  const out = vscode.window.createOutputChannel('BolCode');
  const reviewer = new DiffReviewer(ctx);
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.command = 'bolcode.listen';
  status.show();
  ctx.subscriptions.push(status, out);

  const render = (text: string, tooltip = '', warn = false) => {
    status.text = text;
    status.tooltip = tooltip || 'BolCode: click or press Ctrl+Alt+B';
    status.backgroundColor = warn ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
  };
  const idle = () => { state = 'idle'; render('$(mic) BolCode'); };
  idle();

  let voiceWarned = false;
  async function say(text: string, force = false) {
    if (!force && !cfg().get<boolean>('voice.enabled')) { return; }
    try {
      const apiKey = (await ctx.secrets.get(GNANI_KEY)) ?? '';
      await speak({
        apiKey,
        model: String(cfg().get('voice.model') || 'timbre-v3.0'),
        voice: String(cfg().get('voice.name') || 'Avinash'),
        language: String(cfg().get('voice.language') || 'hi-IN'),
        ffmpegPath: String(cfg().get('ffmpegPath') || 'ffmpeg'),
        sampleRate: Number(cfg().get('voice.sampleRate') || 24000),
        log: m => out.appendLine(m)
      }, text);
    } catch (e: any) {
      out.appendLine(`! voice: ${e.message}`);
      if (!voiceWarned || force) {
        voiceWarned = true;
        vscode.window.showWarningMessage(`BolCode voice reply failed: ${e.message}`);
      }
    }
  }

  async function askKey(name: string, prompt: string): Promise<string | undefined> {
    const value = await vscode.window.showInputBox({ prompt, password: true, ignoreFocusOut: true });
    if (value) { await ctx.secrets.store(name, value.trim()); }
    return value?.trim();
  }

  async function getGnaniKey(): Promise<string | undefined> {
    return (await ctx.secrets.get(GNANI_KEY)) ?? askKey(GNANI_KEY, 'Gnani API key (from app.gnani.ai)');
  }

  async function getLlmConfig(): Promise<LlmConfig> {
    const baseUrl = String(cfg().get('llm.baseUrl') ?? '').trim();
    const model = String(cfg().get('llm.model') ?? '').trim();
    if (!baseUrl || !model) {
      throw new Error('Set bolcode.llm.baseUrl and bolcode.llm.model in Settings (any OpenAI-compatible endpoint).');
    }
    let apiKey = (await ctx.secrets.get(LLM_KEY)) ?? '';
    const isLocal = /localhost|127\.0\.0\.1/.test(baseUrl);
    if (!apiKey && !isLocal) {
      apiKey = (await askKey(LLM_KEY, 'LLM API key')) ?? '';
      if (!apiKey) { throw new Error('An LLM API key is required.'); }
    }
    return { baseUrl, model, apiKey };
  }

  async function handleTranscript(transcript: string) {
    vscode.window.showInformationMessage(`🎙 ${transcript}`);
    out.appendLine(`> ${transcript}`);
    const intent = detectIntent(transcript);

    if (intent === 'undo') {
      await vscode.commands.executeCommand('undo');
      void say('वापस कर दिया।');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) { throw new Error('Open a file and select some code first.'); }
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
      const answer = await explainCode(llm, transcript, original, fileName, doc.languageId);
      out.appendLine(answer);
      out.show(true);
      if (cfg().get<boolean>('voice.enabled')) {
        spokenSummary(llm, answer).then(t => say(t)).catch(e => out.appendLine(`! voice: ${e.message}`));
      }
      return;
    }

    const proposed = await proposeEdit(llm, transcript, original, fileName, doc.languageId);
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
    } else {
      void say('ठीक है, रद्द कर दिया।');
    }
  }

  ctx.subscriptions.push(
    vscode.commands.registerCommand('bolcode.listen', async () => {
      if (state === 'processing') { return; }

      if (state === 'idle') {
        try {
          const key = await getGnaniKey();
          if (!key) { return; }
          recorder = new Recorder(
            String(cfg().get('ffmpegPath') || 'ffmpeg'),
            String(cfg().get('micDevice') || ''),
            Number(cfg().get('maxRecordSeconds') ?? 20)
          );
          recorder.start();
          state = 'recording';
          render('$(record) BolCode: listening… (press again to stop)', '', true);
        } catch (e: any) {
          idle();
          vscode.window.showErrorMessage(`BolCode: ${e.message}`);
        }
        return;
      }

      // state === 'recording' → stop, transcribe, act
      state = 'processing';
      render('$(sync~spin) BolCode: transcribing…');
      try {
        const wav = await recorder!.stop();
        const key = (await ctx.secrets.get(GNANI_KEY)) ?? '';
        const transcript = await transcribe(wav, key, {
          language: String(cfg().get('language') || 'en-IN'),
          biasWords: BIAS_WORDS,
          substitutions: (cfg().get('substitutions') as any[]) ?? []
        });
        await handleTranscript(transcript);
      } catch (e: any) {
        vscode.window.showErrorMessage(`BolCode: ${e.message}`);
        out.appendLine(`! ${e.message}`);
      } finally {
        recorder = undefined;
        idle();
      }
    }),

    vscode.commands.registerCommand('bolcode.setGnaniKey', () => askKey(GNANI_KEY, 'Gnani API key (from app.gnani.ai)')),
    vscode.commands.registerCommand('bolcode.testVoice', () => say('नमस्ते, मैं बोल कोड हूँ। बोलो, कोड हो जाएगा।', true)),
    vscode.commands.registerCommand('bolcode.setLlmKey', () => askKey(LLM_KEY, 'LLM API key')),

    vscode.commands.registerCommand('bolcode.selectMic', async () => {
      const mics = await listMicrophones(String(cfg().get('ffmpegPath') || 'ffmpeg'));
      if (mics.length === 0) {
        vscode.window.showErrorMessage('BolCode: no microphones found. Is ffmpeg installed and on PATH?');
        return;
      }
      const pick = await vscode.window.showQuickPick(
        mics.map(m => ({ label: m.label, value: m.value })), { placeHolder: 'Choose your microphone' });
      if (pick) {
        await cfg().update('micDevice', pick.value, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`BolCode: using "${pick.label}".`);
      }
    })
  );
}

export function deactivate() {}