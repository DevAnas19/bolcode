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
exports.synthesize = synthesize;
exports.speak = speak;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const TTS_URL = 'https://api.vachana.ai/api/v1/tts/inference';
/** Gnani Timbre REST text-to-speech. Returns a complete WAV file as bytes. */
async function synthesize(cfg, text) {
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
            const j = await res.json();
            msg = j?.error?.message ?? j?.message ?? msg;
        }
        catch { /* body was not JSON */ }
        throw new Error(msg);
    }
    return Buffer.from(await res.arrayBuffer());
}
function playWav(file) {
    return new Promise((resolve, reject) => {
        const done = (err) => (err ? reject(err) : resolve());
        if (process.platform === 'win32') {
            const safe = file.replace(/'/g, "''");
            (0, child_process_1.execFile)('powershell', ['-NoProfile', '-Command', `(New-Object Media.SoundPlayer '${safe}').PlaySync()`], { windowsHide: true }, err => done(err));
        }
        else if (process.platform === 'darwin') {
            (0, child_process_1.execFile)('afplay', [file], err => done(err));
        }
        else {
            (0, child_process_1.execFile)('aplay', ['-q', file], err => done(err));
        }
    });
}
/** Synthesizes the text and plays it through the speakers. */
async function speak(cfg, text) {
    const audio = await synthesize(cfg, text);
    const file = path.join(os.tmpdir(), `bolcode-tts-${Date.now()}.wav`);
    await fs.promises.writeFile(file, audio);
    try {
        await playWav(file);
    }
    finally {
        fs.promises.unlink(file).catch(() => { });
    }
}
//# sourceMappingURL=tts.js.map