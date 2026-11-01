// Fixes words Prisma commonly mishears in coding commands. Applied to the transcript
// before intent detection and before the text goes to the LLM.
// Tuned from the 40-command accuracy test; add more rules as you find mishearings.
const RULES: Array<[RegExp, string]> = [
  [/\b(asinc|asink|assync|asynk|esink)\b/gi, 'async'],
  [/\b(avaidh|awaite|aweight)\b/gi, 'await'],
  [/\buse state\b/gi, 'useState'],
  [/\buse effect\b/gi, 'useEffect'],
  [/\bon click\b/gi, 'onClick'],
  [/\bcall back\b/gi, 'callback'],
  [/\bupper case\b/gi, 'uppercase'],
  [/\blower case\b/gi, 'lowercase'],
  [/\buser id\b/gi, 'userId'],
  [/\bye ra ko\b/gi, 'ye array ko'],
  [/\b(ando|andu|undu)\b/gi, 'undo']
];

export function normalizeTranscript(text: string): string {
  return RULES.reduce((t, [pattern, replacement]) => t.replace(pattern, replacement), text);
}