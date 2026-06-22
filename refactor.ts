import fs from 'fs';
import path from 'path';

const contextsDir = './packages/shared/src/contexts';

const files = fs.readdirSync(contextsDir).filter(f => f.endsWith('Context.tsx') && !['AuthContext.tsx', 'SupabaseContext.tsx', 'ToastContext.tsx', 'ThemeContext.tsx', 'SettingsContext.tsx', 'NavigationContext.tsx'].includes(f));

for (const file of files) {
  const filePath = path.join(contextsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  const providerName = file.replace('.tsx', '');
  
  // Example: export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Replace with: export const useTeamContext_INTERNAL = () => {
  const providerExportRegex = new RegExp(`export const ${providerName.replace('Context', 'Provider')}[\\s\\S]*?=>\\s*{`);
  
  if (content.match(providerExportRegex)) {
    console.log('Patching', file);
    
    content = content.replace(providerExportRegex, `export const use${providerName}_INTERNAL = () => {`);
    
    // Replace: return <XContext.Provider value={value}>{children}</XContext.Provider>;
    const returnRegex = new RegExp(`return\\s*<${providerName}\\.Provider value={([^}]+)}>[\\s\\S]*?<\\/${providerName}\\.Provider>;`, 'g');
    content = content.replace(returnRegex, `return $1;`);

    // Redefine the standard hook
    const hookRegexGeneric = new RegExp(`export const use[A-Za-z0-9_]+ = \\(\\)[\\s\\S]*?useContext\\(${providerName}\\);[\\s\\S]*?};`, 'g');
    content = content.replace(hookRegexGeneric, (match) => {
        const nameMatch = match.match(/export const (use[a-zA-Z0-9]+)/);
        if (!nameMatch) return match;
        return `export const ${nameMatch[1]} = () => use${providerName}_INTERNAL();`;
    });
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

