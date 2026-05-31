const fs = require('fs');
const path = require('path');

const targetDirs = ['components'];
const rootFiles = ['App.tsx', 'AppContent.tsx', 'App.initialData.ts', 'index.tsx'];

const sharedModules = ['contexts', 'hooks', 'services', 'utils', 'data', 'types', 'constants', 'permissions', 'mockData'];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Match all imports
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    
    content = content.replace(importRegex, (match, importPath) => {
        // If it's a relative path
        if (importPath.startsWith('.')) {
            // Check if what it resolves to matches one of our target shared modules
            for (const mod of sharedModules) {
                // E.g., ./contexts/AuthContext or ../../types
                const regex = new RegExp(`^\\.\\.?/(?:.*/)*(${mod})(?:/.*)?$|^\\.\\.?/(${mod})$`);
                
                // Let's do a simpler approach: check if the string contains the module name
                // E.g. '../contexts/TimeLogContext' -> '@shared/contexts/TimeLogContext'
                // E.g. '../../types' -> '@shared/types'
                const parts = importPath.split('/');
                const idx = parts.findIndex(p => sharedModules.includes(p) || p === 'types' || p === 'constants' || p === 'permissions' || p === 'mockData');
                
                if (idx !== -1 && parts.every((p, i) => i >= idx || p === '.' || p === '..')) {
                    const newPath = '@shared/' + parts.slice(idx).join('/');
                    return `from '${newPath}'`;
                }
            }
        }
        return match;
    });

    if (content !== fs.readFileSync(filePath, 'utf8')) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            processFile(fullPath);
        }
    }
}

for (const dir of targetDirs) {
    if (fs.existsSync(dir)) processDirectory(dir);
}

for (const file of rootFiles) {
    if (fs.existsSync(file)) processFile(file);
}
