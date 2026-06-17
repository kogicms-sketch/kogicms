const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // 1. Add "use client"; to .tsx files in pages and components if missing
  if (filePath.endsWith('.tsx') && !content.includes('"use client"') && !content.includes("'use client'")) {
    content = `"use client";\n` + content;
    changed = true;
  }

  // 2. import.meta.env.VITE_ -> process.env.NEXT_PUBLIC_
  if (content.includes('import.meta.env.VITE_')) {
    content = content.replace(/import\.meta\.env\.VITE_/g, 'process.env.NEXT_PUBLIC_');
    changed = true;
  }
  
  // 3. react-router-dom simple replacements
  if (content.includes('react-router-dom')) {
    // Replace useNavigate with useRouter
    if (content.includes('useNavigate')) {
      content = content.replace(/import\s+\{[^}]*useNavigate[^}]*\}\s+from\s+['"]react-router-dom['"];?/g, (match) => {
        return match.replace('useNavigate', '') + `\nimport { useRouter } from 'next/navigation';`;
      });
      content = content.replace(/const\s+(\w+)\s*=\s*useNavigate\(\)/g, 'const router = useRouter();\n  const $1 = (path, options) => { if (path === -1) router.back(); else router.push(path); }');
      changed = true;
    }
    
    // Replace useParams
    if (content.includes('useParams')) {
      content = content.replace(/import\s+\{[^}]*useParams[^}]*\}\s+from\s+['"]react-router-dom['"];?/g, (match) => {
        return match.replace('useParams', '') + `\nimport { useParams } from 'next/navigation';`;
      });
      changed = true;
    }

    // Replace Link
    if (content.includes('Link') && content.includes('react-router-dom')) {
      content = content.replace(/import\s+\{[^}]*Link[^}]*\}\s+from\s+['"]react-router-dom['"];?/g, (match) => {
        return match.replace('Link', '') + `\nimport Link from 'next/link';`;
      });
      // Next.js Link uses `href` instead of `to`
      content = content.replace(/<Link([^>]*)to=/g, '<Link$1href=');
      changed = true;
    }

    // Cleanup empty imports from react-router-dom
    content = content.replace(/import\s*\{\s*,\s*\}\s*from\s*['"]react-router-dom['"];?\n?/g, '');
    content = content.replace(/import\s*\{\s*\}\s*from\s*['"]react-router-dom['"];?\n?/g, '');
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

const srcDir = path.join(__dirname, '..', 'src');
walkDir(path.join(srcDir, 'components'), processFile);
walkDir(path.join(srcDir, 'pages'), processFile);
walkDir(path.join(srcDir, 'integrations'), processFile);
walkDir(path.join(srcDir, 'lib'), processFile);
walkDir(path.join(srcDir, 'utils'), processFile);
walkDir(path.join(srcDir, 'hooks'), processFile);
