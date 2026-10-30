import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const TTS_URL = 'https://api.vachana.ai/api/v1/tts/inference';

export interface TtsConfig {
  apiKey: string;
  model: string;
  voice: string;
  language: string;
  ffmpegPath: string;
  sampleRate: number; // only used if Timbre returns headerless raw PCM
  log?: (message: string) => void;
}

interface TtsResponse { audio: Buffer; contentType: string; }

/** Gnani Timbre REST text-to-speech. */
async function synthesize(cfg: TtsConfig, text: string): Promise<TtsResponse> {
  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key-ID': cfg.apiKey },
    body: JSON.stringify({
      text,
      model: cfg.model,
      voice: cfg.voice,
      language: cfg.language,
      audio_config: { num_channels: 1, sample_width: 2, encoding: 'linear_pcm', container: 'wav' }
    })
  });
  if (!res.ok) {
    let msg = `Timbre request failed (HTTP ${res.status}).`;
    try {
      const j: any = await res.json();
      msg = j?.error?.message ?? j?.message ?? j?.detail ?? msg;
    } catch { /* body was not JSON */ }
    throw new Error(msg);
  }
  return {
    audio: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') ?? ''
  };
}

const hex = (b: Buffer, n = 16) =>
  [...b.subarray(0, n)].map(x => x.toString(16).padStart(2, '0')).join(' ');

/** True when the bytes start with a known audio container (WAV, MP3, OGG, FLAC). */
function looksLikeContainer(b: Buffer): boolean {
  const h4 = b.subarray(0, 4).toString('latin1');
  if (h4 === 'RIFF' || h4 === 'OggS' || h4 === 'fLaC' || b.subarray(0, 3).toString('latin1') === 'ID3') { return true; }
  return b.length > 1 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0; // MP3 frame sync
}

/** Wraps headerless 16-bit mono PCM in a WAV header. */
function wrapPcm(pcm: Buffer, sampleRate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'latin1');
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8, 'latin1');
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);            // PCM
  h.writeUInt16LE(1, 22);            // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36, 'latin1');
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** If the response is JSON carrying base64 audio, decode it. */
function audioFromJson(buf: Buffer): Buffer | undefined {
  let found: string | undefined;
  const walk = (v: unknown) => {
    if (found) { return; }
    if (typeof v === 'string' && v.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(v)) { found = v; }
    else if (v && typeof v === 'object') { Object.values(v as object).forEach(walk); }
  };
  try { walk(JSON.parse(buf.toString('utf8'))); } catch { return undefined; }
  return found ? Buffer.from(found.replace(/\s/g, ''), 'base64') : undefined;
}

function toCleanWav(ffmpeg: string, input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-acodec', 'pcm_s16le', output],
      { windowsHide: true }, (err, _out, stderr) => {
        if (err) { reject(new Error(`ffmpeg could not read the Timbre audio: ${String(stderr).trim() || err.message}`)); }
        else { resolve(); }
      });
  });
}

function playWav(file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (err: Error | null) => (err ? reject(err) : resolve());
    if (process.platform === 'win32') {
      const safe = file.replace(/'/g, "''");
      execFile('powershell', ['-NoProfile', '-Command', `(New-Object Media.SoundPlayer '${safe}').PlaySync()`],
        { windowsHide: true }, err => done(err));
    } else if (process.platform === 'darwin') {
      execFile('afplay', [file], err => done(err));
    } else {
      execFile('aplay', ['-q', file], err => done(err));
    }
  });
}

/** Synthesizes the text and plays it through the speakers. */
export async function speak(cfg: TtsConfig, text: string): Promise<void> {
  let { audio, contentType } = await synthesize(cfg, text);
  cfg.log?.(`voice: got ${audio.length} bytes, content-type "${contentType}", first bytes: ${hex(audio)}`);

  if (contentType.includes('json') || audio[0] === 0x7b) {
    const decoded = audioFromJson(audio);
    if (!decoded) { throw new Error(`Timbre returned JSON without audio: ${audio.toString('utf8').slice(0, 200)}`); }
    audio = decoded;
    cfg.log?.(`voice: decoded base64 audio, ${audio.length} bytes, first bytes: ${hex(audio)}`);
  }
  if (!looksLikeContainer(audio)) {
    cfg.log?.(`voice: no audio header found, treating as raw 16-bit mono PCM at ${cfg.sampleRate} Hz`);
    audio = wrapPcm(audio, cfg.sampleRate);
  }

  const stamp = Date.now();
  const rawFile = path.join(os.tmpdir(), `bolcode-tts-${stamp}-in.wav`);
  const cleanFile = path.join(os.tmpdir(), `bolcode-tts-${stamp}.wav`);
  await fs.promises.writeFile(rawFile, audio);
  try {
    await toCleanWav(cfg.ffmpegPath, rawFile, cleanFile); // normalizes odd headers/formats
    await playWav(cleanFile);
    await fs.promises.unlink(rawFile).catch(() => { /* ignore */ });
  } catch (e) {
    cfg.log?.(`voice: kept the raw file for inspection: ${rawFile}`);
    throw e;
  } finally {
    fs.promises.unlink(cleanFile).catch(() => { /* ignore */ });
  }
}
