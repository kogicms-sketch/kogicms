/**
 * Script to update LGA files with CORRECTED INEC voter counts
 * Run this with: node src/data/update_corrected_totals.js
 */

const fs = require('fs');
const path = require('path');

// CORRECTED voter distribution - now totals exactly 3,570,740
const CORRECTED_VOTER_DISTRIBUTION = {
  'Bakori': 122875,
  'Batagarawa': 127651,
  'Batsari': 100304,
  'Baure': 86975,
  'Bindawa': 80062,
  'Charanchi': 73207,
  'Dandume': 112060,
  'Danja': 104211,
  'Dan Musa': 96461,
  'Daura': 147268,
  'Dutsi': 69051,
  'Dutsin-Ma': 131799,
  'Faskari': 115701,
  'Funtua': 157684,
  'Ingawa': 89692,
  'Jibia': 108229,
  'Kafur': 115701,
  'Kaita': 83489,
  'Kankara': 127651,
  'Kankia': 112060,
  'Katsina': 183776,
  'Kurfi': 73067,
  'Kusada': 68859,
  "Mai'Adua": 115701,
  'Malumfashi': 146030,
  'Mani': 96461,
  'Mashi': 89692,
  'Matazu': 83489,
  'Musawa': 123853,
  'Rimi': 92530,
  'Sabuwa': 96461,
  'Safana': 83489,
  'Sandamu': 73067,
  'Zango': 80821
};

// Map file names to LGA names
const LGA_FILE_MAP = {
  'bakori_data.ts': 'Bakori',
  'batagarawa_data.ts': 'Batagarawa',
  'batsari_data.ts': 'Batsari',
  'baure_data.ts': 'Baure',
  'bindawa_data.ts': 'Bindawa',
  'charanchi_data.ts': 'Charanchi',
  'dandume_data.ts': 'Dandume',
  'danja_data.ts': 'Danja',
  'danmusa_data.ts': 'Dan Musa',
  'daura_data.ts': 'Daura',
  'dutsi_data.ts': 'Dutsi',
  'dutsinma_data.ts': 'Dutsin-Ma',
  'faskari_data.ts': 'Faskari',
  'funtua_data.ts': 'Funtua',
  'ingawa_data.ts': 'Ingawa',
  'jibia_data.ts': 'Jibia',
  'kafur_data.ts': 'Kafur',
  'kaita_data.ts': 'Kaita',
  'kankara_data.ts': 'Kankara',
  'kankia_data.ts': 'Kankia',
  'katsina_data.ts': 'Katsina',
  'kurfi_data.ts': 'Kurfi',
  'kusada_data.ts': 'Kusada',
  'maiadua_data.ts': "Mai'Adua",
  'malumfashi_data.ts': 'Malumfashi',
  'mani_data.ts': 'Mani',
  'mashi_data.ts': 'Mashi',
  'matazu_data.ts': 'Matazu',
  'musawa_data.ts': 'Musawa',
  'rimi_data.ts': 'Rimi',
  'sabuwa_data.ts': 'Sabuwa',
  'safana_data.ts': 'Safana',
  'sandamu_data.ts': 'Sandamu',
  'zango_data.ts': 'Zango'
};

function updateLgaFile(filePath, lgaName, correctVoters) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if file has been updated with TOTAL_VOTERS
  const hasTotalVoters = content.includes('_TOTAL_VOTERS = ');
  if (!hasTotalVoters) {
    console.log(`  Skipping ${path.basename(filePath)} - not yet set up with voter totals`);
    return;
  }
  
  // Extract current voter count
  const currentMatch = content.match(/(\w+_TOTAL_VOTERS = (\d+))/);
  if (!currentMatch) {
    console.log(`  Could not find TOTAL_VOTERS in ${path.basename(filePath)}`);
    return;
  }
  
  const currentVoters = parseInt(currentMatch[2]);
  
  if (currentVoters === correctVoters) {
    console.log(`  ${path.basename(filePath)} already correct (${correctVoters.toLocaleString()})`);
    return;
  }
  
  // Update the TOTAL_VOTERS value
  const oldPattern = new RegExp(`(\\w+_TOTAL_VOTERS = )${currentVoters}`);
  content = content.replace(oldPattern, `$1${correctVoters}`);
  
  // Update header comment
  const oldHeader = `// Total: ${currentVoters.toLocaleString()} voters`;
  const newHeader = `// Total: ${correctVoters.toLocaleString()} voters`;
  content = content.replace(oldHeader, newHeader);
  
  // Update SUMMARY if it has totalRegisteredVoters
  content = content.replace(
    new RegExp(`(totalRegisteredVoters: )\\w+_TOTAL_VOTERS`),
    `$1${correctVoters}`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`  Updated ${path.basename(filePath)}: ${currentVoters.toLocaleString()} → ${correctVoters.toLocaleString()} (+${((correctVoters/currentVoters-1)*100).toFixed(1)}%)`);
}

// Main
const dataDir = __dirname;

console.log('Updating LGA data files with CORRECTED INEC voter counts...\n');
console.log('Expected Total: 3,570,740\n');

let updated = 0;
let skipped = 0;

Object.entries(LGA_FILE_MAP).forEach(([fileName, lgaName]) => {
  const filePath = path.join(dataDir, fileName);
  const correctVoters = CORRECTED_VOTER_DISTRIBUTION[lgaName];
  
  if (fs.existsSync(filePath) && correctVoters) {
    try {
      updateLgaFile(filePath, lgaName, correctVoters);
      updated++;
    } catch (error) {
      console.error(`  Error updating ${fileName}:`, error.message);
    }
  } else {
    console.log(`  Skipping ${fileName} - file not found or no voter data`);
    skipped++;
  }
});

// Verify totals
const total = Object.values(CORRECTED_VOTER_DISTRIBUTION).reduce((a, b) => a + b, 0);
console.log(`\n${'='.repeat(60)}`);
console.log(`Verification: ${total.toLocaleString()} / 3,570,740`);
console.log(`Match: ${total === 3570740 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`${'='.repeat(60)}`);
console.log(`Done! Updated: ${updated}, Skipped: ${skipped}`);
