export type Intent = 'edit' | 'explain' | 'undo';

// Handles Latin-script (en-IN), Devanagari (hi-IN) and Gujarati-script (gu-IN) transcripts,
// and the spelling variants Prisma produces (samjhao / samjhaao, batao / bataao, ...).
export function detectIntent(transcript: string): Intent {
  const t = transcript.toLowerCase();

  const undoLatin = /\b(undo|ando|andu|undu|revert|w?v?aa?pas|vaa?pas|waa?pas|pichh?al?a\w*|pichh?la\w*|pachh?u)\b/;
  const undoNative = ['वापस', 'अनडू', 'पिछला', 'પાછું', 'પાછુ', 'અનડુ'];
  if (undoLatin.test(t) || undoNative.some(w => t.includes(w))) { return 'undo'; }

  const explainLatin = /\b(explain|samj\w*|bata\w*|kaho|kya karta|kya kar raha|kya ho raha|su kare che)\b/;
  const explainNative = ['समझाओ', 'समझा', 'बताओ', 'क्या करता', 'क्या हो रहा', 'સમજાવ', 'કહો', 'શું કરે છે'];
  if (explainLatin.test(t) || explainNative.some(w => t.includes(w))) { return 'explain'; }

  return 'edit';
}