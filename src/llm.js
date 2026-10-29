"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposeEdit = proposeEdit;
exports.explainCode = explainCode;
exports.spokenSummary = spokenSummary;
async function chat(cfg, system, user) {
    const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const headers = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) {
        headers['Authorization'] = `Bearer ${cfg.apiKey}`;
    }
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: cfg.model,
            temperature: 0,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ]
        })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(json?.error?.message ?? `LLM request failed (HTTP ${res.status}).`);
    }
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
        throw new Error('LLM returned an empty response.');
    }
    // Some reasoning models inline their thinking; remove it.
    return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}
function stripFences(text) {
    const m = text.match(/^\s*```[\w-]*\n([\s\S]*?)\n```\s*$/);
    return m ? m[1] : text;
}
const EDIT_SYSTEM = [
    'You are a precise code-editing engine inside an editor.',
    'The user speaks commands in Hinglish (a Hindi and English mix, sometimes in Devanagari). Understand the intent.',
    'You receive a command and a code snippet. Apply the command to the snippet.',
    'Return ONLY the complete modified snippet. No markdown fences, no explanations.',
    'Keep the same indentation style, language and unrelated code unchanged.'
].join(' ');
const EXPLAIN_SYSTEM = [
    'You explain code to Indian developers in simple Hinglish (Hindi written in Latin script mixed with English technical terms).',
    'Be short: at most 6 lines. No markdown headings.'
].join(' ');
async function proposeEdit(cfg, command, code, fileName, languageId) {
    const user = `Command: ${command}\nFile: ${fileName} (${languageId})\n\nCode:\n${code}`;
    return stripFences(await chat(cfg, EDIT_SYSTEM, user));
}
async function explainCode(cfg, command, code, fileName, languageId) {
    const user = `Request: ${command}\nFile: ${fileName} (${languageId})\n\nCode:\n${code}`;
    return (await chat(cfg, EXPLAIN_SYSTEM, user)).trim();
}
const SUMMARY_SYSTEM = [
    'Summarize the given explanation as ONE short spoken sentence in Hindi, written in Devanagari script.',
    'At most 20 words. No code, no digits, no symbols. Plain spoken words only.'
].join(' ');
/** A short Devanagari sentence suitable for Timbre to read aloud. */
async function spokenSummary(cfg, explanation) {
    return (await chat(cfg, SUMMARY_SYSTEM, explanation)).trim();
}
//# sourceMappingURL=llm.js.map