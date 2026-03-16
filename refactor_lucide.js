const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const toKebabCase = str => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

walkDir('./src', (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  // 1. Remove export const runtime = 'edge';
  newContent = newContent.replace(/export\s+const\s+runtime\s*=\s*['"]edge['"];?\r?\n?/g, '');

  // 2. Explode lucide-react imports
  const importRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]lucide-react['"];?\r?\n?/g;
  let hasLucideChanges = false;
  
  newContent = newContent.replace(importRegex, (match, inner) => {
    hasLucideChanges = true;
    const icons = inner.split(',').map(s => s.trim()).filter(Boolean);
    return icons.map(icon => {
      // lucide-react doesn't export esm paths in exactly this format for individual usage on TS, 
      // typically it's 'lucide-react/dist/esm/icons/...' or just 'lucide-react' standard.
      // Wait, let's verify if `import { X } from "lucide-react"` is best resolved via Next.js optimizePackageImports.
      // Actually, since this is user directed: lucide-react/dist/esm/icons/...
      const kebabName = toKebabCase(icon);
      return `import ${icon} from 'lucide-react/dist/esm/icons/${kebabName}';`;
    }).join('\n') + '\n';
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Processed:', filePath);
  }
});
