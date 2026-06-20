const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== 'dist' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      if (dirPath.endsWith('.tsx')) {
        callback(dirPath);
      }
    }
  });
}

walkDir('components', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const tagsRegex = /<textarea[^>]*className="([^"]+)"[^>]*>/g;
  let newContent = content;
  
  let match;
  while ((match = tagsRegex.exec(content)) !== null) {
    const fullTag = match[0];
    const className = match[1];

    if (!className.includes('dark:text-') && !className.includes('text-slate-900')) {
      // Add text color
      const newClassName = className + ' text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500';
      const newTag = fullTag.replace(`className="${className}"`, `className="${newClassName}"`);
      newContent = newContent.replace(fullTag, newTag);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, newContent);
    console.log("Updated textareas in", filePath);
  }
});
