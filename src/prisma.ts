import * as fs from 'fs';

const STT_URL = 'https://api.vachana.ai/stt/v3';

export interface SubstitutionRule { patterns: string[]; replacement: string; }

export interface TranscribeOptions {
  language: string;
  biasWords?: string[];
  substitutions?: SubstitutionRule[];
}

/** Gnani Prisma v2.5 REST speech-to-text. Clips up to 60s (ideal <= 30s). */
export async function transcribe(wavPath: string, apiKey: string, opts: TranscribeOptions): Promise<string> {
  const audio = await fs.promises.readFile(wavPath);
  const form = new FormData();
  form.append('audio_file', new Blob([audio], { type: 'audio/wav' }), 'command.wav');
  form.append('language_code', opts.language);
  form.append('format', 'verbatim'); // word boosting works with verbatim output

  const bias = (opts.biasWords ?? []).filter(w => /^\p{L}+$/u.test(w)).slice(0, 100);
  if (bias.length > 0) {
    form.append('bias_list', JSON.stringify(bias));
    form.append('bias_score', '1.0');
  }
  const subs = (opts.substitutions ?? []).slice(0, 10);
  if (subs.length > 0) {
    form.append('enable_substitution', 'true');
    form.append('substitution_map', JSON.stringify(subs));
  }

  const res = await fetch(STT_URL, { method: 'POST', headers: { 'X-API-Key-ID': apiKey }, body: form });
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON error body */ }

  if (!res.ok || !json || json.success === false) {
    const msg = json?.error?.message ?? `Prisma request failed (HTTP ${res.status}).`;
    throw new Error(msg);
  }
  const text = String(json.transcript ?? '').trim();
  if (!text) { throw new Error('No speech detected. Try again, closer to the mic.'); }
  return text;
}
