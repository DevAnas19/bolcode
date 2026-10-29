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
exports.transcribe = transcribe;
const fs = __importStar(require("fs"));
const STT_URL = 'https://api.vachana.ai/stt/v3';
/** Gnani Prisma v2.5 REST speech-to-text. Clips up to 60s (ideal <= 30s). */
async function transcribe(wavPath, apiKey, opts) {
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
    let json = null;
    try {
        json = await res.json();
    }
    catch { /* non-JSON error body */ }
    if (!res.ok || !json || json.success === false) {
        const msg = json?.error?.message ?? `Prisma request failed (HTTP ${res.status}).`;
        throw new Error(msg);
    }
    const text = String(json.transcript ?? '').trim();
    if (!text) {
        throw new Error('No speech detected. Try again, closer to the mic.');
    }
    return text;
}
//# sourceMappingURL=prisma.js.map