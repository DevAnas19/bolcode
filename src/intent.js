"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectIntent = detectIntent;
// Works for Latin-script (en-IN) and Devanagari (hi-IN) transcripts.
function detectIntent(transcript) {
    const t = transcript.toLowerCase();
    const undoLatin = /\b(undo|wapas|vapas|pichla|pichhla|revert)\b/;
    const undoDeva = ['वापस', 'अनडू', 'पिछला'];
    if (undoLatin.test(t) || undoDeva.some(w => t.includes(w))) {
        return 'undo';
    }
    const explainLatin = /\b(explain|samjhao|samjha|samjhana|batao|kya karta|kya kar raha|kya ho raha)\b/;
    const explainDeva = ['समझाओ', 'समझा', 'बताओ', 'क्या करता', 'क्या हो रहा'];
    if (explainLatin.test(t) || explainDeva.some(w => t.includes(w))) {
        return 'explain';
    }
    return 'edit';
}
//# sourceMappingURL=intent.js.map