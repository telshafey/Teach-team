const fs = require('fs');
const path = require('path');

const srcDirs = ['contexts', 'hooks', 'services', 'utils', 'data'];
const sharedDest = 'packages/shared/src';

for (const dir of srcDirs) {
    if (!fs.existsSync(dir)) continue;
    const destDir = path.join(sharedDest, dir);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const srcPath = path.join(dir, file);
        if (fs.statSync(srcPath).isDirectory()) continue;
        const destPath = path.join(destDir, file);
        
        // If dest doesn't exist, or it is empty, or we just want to sync any non-empty source
        if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied ${srcPath} to ${destPath}`);
        }
    }
}

// Copy root types.ts, constants.ts, permissions.ts, mockData.ts if missing or empty
const rootFiles = ['types.ts', 'constants.ts', 'permissions.ts', 'mockData.ts'];
for (const file of rootFiles) {
    if (!fs.existsSync(file)) continue;
    const destPath = path.join(sharedDest, file);
    if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
        fs.copyFileSync(file, destPath);
        console.log(`Copied ${file} to ${destPath}`);
    }
}
