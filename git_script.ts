import { execSync } from 'child_process';
try {
  execSync('git checkout HEAD -- packages/shared/src/contexts/', { stdio: 'inherit' });
  execSync('git checkout HEAD -- App.tsx', { stdio: 'inherit' });
  execSync('git checkout HEAD -- AppContent.tsx', { stdio: 'inherit' });
  console.log("Restored!");
} catch (e) {
  console.error("Error:", e);
}
