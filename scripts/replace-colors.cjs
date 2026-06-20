const fs = require('fs');
let content = fs.readFileSync('components/ui/StatusBadge.tsx', 'utf8');

const replacements = [
  { pattern: /dark:bg-sky-900\/50 dark:text-sky-300/g, replacement: 'dark:bg-sky-500/20 dark:text-sky-400' },
  { pattern: /dark:bg-green-900\/50/g, replacement: 'dark:bg-green-500/20' },
  { pattern: /dark:text-green-300/g, replacement: 'dark:text-green-400' },
  { pattern: /dark:text-green-200/g, replacement: 'dark:text-green-400' },
  { pattern: /dark:bg-amber-900\/50 dark:text-amber-300/g, replacement: 'dark:bg-amber-500/20 dark:text-amber-400' },
  { pattern: /dark:bg-red-900\/50 dark:text-red-200/g, replacement: 'dark:bg-red-500/20 dark:text-red-400' },
  { pattern: /dark:bg-blue-900\/50 dark:text-blue-200/g, replacement: 'dark:bg-blue-500/20 dark:text-blue-400' },
  { pattern: /dark:bg-slate-600 dark:text-slate-200/g, replacement: 'dark:bg-slate-500/20 dark:text-slate-300' }
];

for (const { pattern, replacement } of replacements) {
  content = content.replace(pattern, replacement);
}

fs.writeFileSync('components/ui/StatusBadge.tsx', content);
console.log("Replaced colors.");
