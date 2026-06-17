const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src');
const appDir = path.resolve(__dirname, '..', 'src', 'app');
const scriptsDir = path.resolve(__dirname, '..', 'scripts');

// 1. Rename src/pages to src/views
const oldPagesDir = path.join(srcDir, 'pages');
const newViewsDir = path.join(srcDir, 'views');

if (fs.existsSync(oldPagesDir)) {
  console.log(`📂 Renaming ${oldPagesDir} to ${newViewsDir}...`);
  fs.renameSync(oldPagesDir, newViewsDir);
  console.log(`✅ Directory renamed!`);
} else {
  console.log(`⚠️ Directory src/pages does not exist or has already been renamed.`);
}

// 2. Function to recursively find files and replace import strings
function replaceInFiles(dirPath, extFilter, searchReg, replaceStr) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        replaceInFiles(filePath, extFilter, searchReg, replaceStr);
      }
    } else if (extFilter.some(ext => file.endsWith(ext))) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (searchReg.test(content)) {
        console.log(`✏️ Updating imports in: ${filePath}`);
        content = content.replace(searchReg, replaceStr);
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }
}

// Replace aliases and relative imports
const filters = ['.ts', '.tsx', '.js', '.jsx', '.json'];

// Replace @/views/ with @/views/
console.log('\n🔄 Updating @/views/ imports to @/views/...');
replaceInFiles(srcDir, filters, /@\/pages\//g, '@/views/');
replaceInFiles(scriptsDir, filters, /@\/pages\//g, '@/views/');

// Replace ../pages/ with ../views/
console.log('\n🔄 Updating ../pages/ imports to ../views/...');
replaceInFiles(srcDir, filters, /\.\.\/pages\//g, '../views/');

// Replace ./pages/ with ./views/
console.log('\n🔄 Updating ./pages/ imports to ./views/...');
replaceInFiles(srcDir, filters, /\.\/pages\//g, './views/');

console.log('\n✨ Rename and import updates complete!');
