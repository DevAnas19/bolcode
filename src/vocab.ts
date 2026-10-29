// Words Prisma tends to miss in Hinglish coding commands. Letters only (API rule), max 100.
// Tune this list after your day-1 accuracy test.
export const BIAS_WORDS: string[] = [
  'async', 'await', 'function', 'arrow', 'const', 'variable', 'array', 'object', 'string',
  'loop', 'map', 'filter', 'promise', 'callback', 'error', 'handling', 'catch', 'try',
  'console', 'log', 'null', 'default', 'export', 'import', 'class', 'constructor', 'route',
  'query', 'limit', 'validation', 'email', 'optimize', 'recursive', 'timeout', 'sorting',
  'ascending', 'descending', 'uppercase', 'lowercase', 'rename', 'refactor', 'useState',
  'useEffect', 'onClick', 'component', 'props', 'hook', 'bug', 'fix', 'test', 'comments',
  'type', 'hints', 'undo'
];
