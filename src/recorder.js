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
exports.Recorder = void 0;
exports.listMicrophones = listMicrophones;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
function inputArgs(device) {
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
class Recorder {
    ffmpeg;
    device;
    maxSeconds;
    proc;
    done;
    file = '';
    constructor(ffmpeg, device, maxSeconds) {
        this.ffmpeg = ffmpeg;
        this.device = device;
        this.maxSeconds = maxSeconds;
    }
    start() {
        this.file = path.join(os.tmpdir(), `bolcode-${Date.now()}.wav`);
        const args = [
            '-hide_banner', '-loglevel', 'error', '-y',
            ...inputArgs(this.device),
            '-t', String(this.maxSeconds),
            '-ac', '1', '-ar', '16000',
            this.file
        ];
        const proc = (0, child_process_1.spawn)(this.ffmpeg, args);
        this.proc = proc;
        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.stdin.on('error', () => { });
        this.done = new Promise((resolve, reject) => {
            proc.on('error', e => reject(new Error(`Could not start ffmpeg (${e.message}). Install ffmpeg and add it to PATH, or set bolcode.ffmpegPath.`)));
            proc.on('close', () => {
                if (fs.existsSync(this.file) && fs.statSync(this.file).size > 2000) {
                    resolve(this.file);
                }
                else {
                    reject(new Error(stderr.trim() || 'No audio captured. Check your microphone selection.'));
                }
            });
        });
        this.done.catch(() => { });
    }
    /** Ask ffmpeg to finish cleanly (writes a valid WAV header) and return the file path. */
    async stop() {
        if (!this.proc || !this.done) {
            throw new Error('Recorder was not started.');
        }
        if (this.proc.exitCode === null) {
            try {
                this.proc.stdin.write('q');
                this.proc.stdin.end();
            }
            catch { /* already closed */ }
        }
        return this.done;
    }
}
exports.Recorder = Recorder;
function listMicrophones(ffmpeg) {
    return new Promise(resolve => {
        if (process.platform === 'win32') {
            (0, child_process_1.execFile)(ffmpeg, ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], { windowsHide: true }, (_err, _out, stderr) => {
                const mics = [];
                for (const m of String(stderr).matchAll(/"([^"]+)"\s+\(audio\)/g)) {
                    mics.push({ label: m[1], value: m[1] });
                }
                resolve(mics);
            });
        }
        else if (process.platform === 'darwin') {
            (0, child_process_1.execFile)(ffmpeg, ['-hide_banner', '-f', 'avfoundation', '-list_devices', 'true', '-i', ''], (_err, _out, stderr) => {
                const text = String(stderr);
                const mics = [];
                const idx = text.indexOf('audio devices');
                for (const m of text.slice(idx < 0 ? 0 : idx).matchAll(/\[(\d+)\]\s+(.+)/g)) {
                    mics.push({ label: m[2].trim(), value: `:${m[1]}` });
                }
                resolve(mics);
            });
        }
        else {
            resolve([{ label: 'Default (pulse)', value: 'default' }]);
        }
    });
}
//# sourceMappingURL=recorder.js.map