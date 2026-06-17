/**
 * Update all LGA files to use constant voter distribution (no random)
 * Run: node src/data/fix_constant_voters.js
 */

const fs = require('fs');
const path = require('path');

const dataDir = __dirname;

// Get all LGA data files
const lgaFiles = fs.readdirSync(dataDir).filter(f => 
  f.endsWith('_data.ts') && 
  !f.includes('update') && 
  !f.includes('inec') && 
  !f.includes('voter') && 
  !f.includes('aggregated') &&
  f !== 'bakori_data.ts' // Skip bakori - already fixed
);

console.log(`Fixing ${lgaFiles.length} LGA files to use constant voter distribution...\n`);

lgaFiles.forEach(fileName => {
  const filePath = path.join(dataDir, fileName);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if file has the random variance code
  if (!content.includes('Math.random()')) {
    console.log(`  ✓ ${fileName} - no random variance found`);
    return;
  }
  
  // Replace random variance with deterministic calculation
  const oldCode = `// Add variance for realistic distribution (-15% to +15%)
        const variance = (Math.random() * 0.3) - 0.15;`;
  
  const newCode = `// Use deterministic variance based on unit index (-10% to +10% for realism)
        const variance = ((i * 7) % 21 - 10) / 100; // -0.10 to +0.10`;
  
  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    
    // Also update the comment about voter distribution
    content = content.replace(
      '// Generate polling units for each ward with voter distribution',
      '// Generate polling units for each ward with constant voter distribution'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ ${fileName} - fixed`);
  } else {
    console.log(`  ⚠ ${fileName} - pattern not found, may need manual fix`);
  }
});

console.log('\n✅ All LGA files updated to use constant voter distribution!');
console.log('The voter counts will now remain the same on every page refresh.');
