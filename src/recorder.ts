import { spawn, execFile, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface MicOption { label: string; value: string; }

function inputArgs(device: string): string[] {
  switch (process.platform) {
    case 'win32':
      if (!device) {
        throw new Error('No microphone selected. Run "BolCode: Select Microphone" first.');
      }
      return ['-f', 'dshow', '-i', `audio=${device}`];
    case 'darwin':
      return ['-f', 'avfoundation', '-i', device || ':0'];
    default:
      return ['-f', 'pulse', '-i', device || 'default'];
  }
}

/** Records the mic with ffmpeg into a 16 kHz mono WAV (what Prisma converts to anyway). */
export class Recorder {
  private proc?: ChildProcessWithoutNullStreams;
  private done?: Promise<string>;
  private file = '';

  constructor(private ffmpeg: string, private device: string, private maxSeconds: number) {}

  start(): void {
    this.file = path.join(os.tmpdir(), `bolcode-${Date.now()}.wav`);
    const args = [
      '-hide_banner', '-loglevel', 'error', '-y',
      ...inputArgs(this.device),
      '-t', String(this.maxSeconds),
      '-ac', '1', '-ar', '16000',
      this.file
    ];
    const proc = spawn(this.ffmpeg, args);
    this.proc = proc;
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.stdin.on('error', () => { /* ffmpeg may already have exited */ });

    this.done = new Promise<string>((resolve, reject) => {
      proc.on('error', e => reject(new Error(
        `Could not start ffmpeg (${e.message}). Install ffmpeg and add it to PATH, or set bolcode.ffmpegPath.`)));
      proc.on('close', () => {
        if (fs.existsSync(this.file) && fs.statSync(this.file).size > 2000) {
          resolve(this.file);
        } else {
          reject(new Error(stderr.trim() || 'No audio captured. Check your microphone selection.'));
        }
      });
    });
    this.done.catch(() => { /* handled by whoever awaits stop() */ });
  }

  /** Ask ffmpeg to finish cleanly (writes a valid WAV header) and return the file path. */
  async stop(): Promise<string> {
    if (!this.proc || !this.done) { throw new Error('Recorder was not started.'); }
    if (this.proc.exitCode === null) {
      try { this.proc.stdin.write('q'); this.proc.stdin.end(); } catch { /* already closed */ }
    }
    return this.done;
  }
}

export function listMicrophones(ffmpeg: string): Promise<MicOption[]> {
  return new Promise(resolve => {
    if (process.platform === 'win32') {
      execFile(ffmpeg, ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'],
        { windowsHide: true }, (_err, _out, stderr) => {
          const mics: MicOption[] = [];
          for (const m of String(stderr).matchAll(/"([^"]+)"\s+\(audio\)/g)) {
            mics.push({ label: m[1], value: m[1] });
          }
          resolve(mics);
        });
    } else if (process.platform === 'darwin') {
      execFile(ffmpeg, ['-hide_banner', '-f', 'avfoundation', '-list_devices', 'true', '-i', ''],
        (_err, _out, stderr) => {
          const text = String(stderr);
          const mics: MicOption[] = [];
          const idx = text.indexOf('audio devices');
          for (const m of text.slice(idx < 0 ? 0 : idx).matchAll(/\[(\d+)\]\s+(.+)/g)) {
            mics.push({ label: m[2].trim(), value: `:${m[1]}` });
          }
          resolve(mics);
        });
    } else {
      resolve([{ label: 'Default (pulse)', value: 'default' }]);
    }
  });
}
