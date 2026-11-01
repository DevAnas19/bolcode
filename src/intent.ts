export type Intent = 'edit' | 'explain' | 'undo';

// Works for Latin-script (en-IN), Devanagari (hi-IN) and Gujarati-script (gu-IN) transcripts.
export function detectIntent(transcript: string): Intent {
  const t = transcript.toLowerCase();

  const undoLatin = /\b(undo|wapas|vapas|pichla|pichhla|pachhu|pachu|revert)\b/;
  const undoNative = ['वापस', 'अनडू', 'पिछला', 'પાછું', 'પાછુ', 'અનડુ'];
  if (undoLatin.test(t) || undoNative.some(w => t.includes(w))) { return 'undo'; }

  const explainLatin = /\b(explain|samjhao|samjha|samjhana|samjavo|samjav|batao|kaho|kya karta|kya kar raha|kya ho raha|su kare che)\b/;
  const explainNative = ['समझाओ', 'समझा', 'बताओ', 'क्या करता', 'क्या हो रहा', 'સમજાવ', 'કહો', 'શું કરે છે'];
  if (explainLatin.test(t) || explainNative.some(w => t.includes(w))) { return 'explain'; }

  return 'edit';
}