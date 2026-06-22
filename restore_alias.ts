import fs from 'fs';
import path from 'path';

const contextsDir = './packages/shared/src/contexts';
const files = fs.readdirSync(contextsDir).filter(f => f.endsWith('Context.tsx') && !['AuthContext.tsx', 'SupabaseContext.tsx', 'ToastContext.tsx', 'ThemeContext.tsx', 'SettingsContext.tsx', 'NavigationContext.tsx'].includes(f));

for (const file of files) {
  const filePath = path.join(contextsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  const interfaceMatch = content.match(/export interface ([A-Za-z0-9_]+Type)/);
  if (!interfaceMatch) continue;
  
  const interfaceName = interfaceMatch[1];
  const providerName = file.replace('.tsx', '');
  const prefix = providerName.replace('Context', '');

  // Add useNameContext alias to useName
  if (!content.includes(`export const use${providerName}`)) {
    content += `\nexport const use${providerName} = use${prefix};\n`;
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
}
