/**
 * Update all LGA data files with INEC voter counts - FINAL VERSION
 * Handles files with or without the comment before generatePollingUnits
 * Run: node src/data/update_lga_voters_final.js
 */

const fs = require('fs');
const path = require('path');

const LGA_VOTER_DISTRIBUTION = {
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

function updateLgaFile(filePath, lgaName, totalVoters) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if already has TOTAL_VOTERS defined
  if (content.match(/const \w+_TOTAL_VOTERS = \d+/)) {
    console.log(`  ✓ ${path.basename(filePath)} already has voter data`);
    return true;
  }
  
  // Extract constant name from wards export
  const constMatch = content.match(/export const (\w+)_WARDS: Ward/);
  if (!constMatch) {
    console.log(`  ✗ ${path.basename(filePath)} - could not find constant name`);
    return false;
  }
  
  const baseName = constMatch[1];
  
  // Extract wards to count polling units
  const wardsSectionMatch = content.match(/export const \w+_WARDS: Ward\[\] = \[([\s\S]*?)\n\];/);
  if (!wardsSectionMatch) {
    console.log(`  ✗ ${path.basename(filePath)} - could not find wards section`);
    return false;
  }
  
  const wardsStr = wardsSectionMatch[1];
  const unitMatches = wardsStr.match(/pollingUnitsCount: (\d+)/g);
  if (!unitMatches) {
    console.log(`  ✗ ${path.basename(filePath)} - could not count units`);
    return false;
  }
  
  const unitCounts = unitMatches.map(m => parseInt(m.replace('pollingUnitsCount: ', '')));
  const totalUnits = unitCounts.reduce((a, b) => a + b, 0);
  const avgVoters = Math.round(totalVoters / totalUnits);
  
  // Update header comment
  content = content.replace(
    /(\/\/ \w+ LGA Election Data - INEC Official Data\n)(\/\/ \d+ Wards, \d+ Total Polling Units)/,
    `$1// Total Registered Voters: ${totalVoters.toLocaleString()}\n// Total Polling Units: ${totalUnits}`
  );
  
  // Build voter calculation code block
  const voterCode = `// Calculate voter distribution for ${lgaName} LGA
// Total: ${totalVoters.toLocaleString()} voters across ${totalUnits} polling units (~${avgVoters} avg)
const ${baseName}_TOTAL_VOTERS = ${totalVoters};

// Ward-level voter distribution (weighted by polling unit count)
const calculateWardVoters = (ward: Ward): number => {
    const totalUnits = ${unitCounts.join(' + ')};
    const weight = ward.pollingUnitsCount / totalUnits;
    return Math.floor(${baseName}_TOTAL_VOTERS * weight);
};

// Add registeredVoters to each ward
export const ${baseName}_WARDS_WITH_VOTERS: Ward[] = ${baseName}_WARDS.map(ward => ({
    ...ward,
    registeredVoters: calculateWardVoters(ward)
}));

`;
  
  // Find generatePollingUnits function - look for the function signature
  const funcSignature = 'const generatePollingUnits = (ward: Ward): PollingUnit[] => {';
  const funcStart = content.indexOf(funcSignature);
  
  if (funcStart === -1) {
    console.log(`  ✗ ${path.basename(filePath)} - could not find generatePollingUnits function`);
    return false;
  }
  
  // Find the end of the function (closing brace at same indentation level)
  let braceCount = 0;
  let funcEnd = funcStart;
  let foundFirstBrace = false;
  
  for (let i = funcStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      foundFirstBrace = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (foundFirstBrace && braceCount === 0) {
        funcEnd = i + 1;
        break;
      }
    }
  }
  
  const oldFunc = content.substring(funcStart, funcEnd);
  
  // Build new function
  const newFunc = voterCode + `// Generate polling units for each ward with voter distribution
const generatePollingUnits = (ward: Ward): PollingUnit[] => {
    const units: PollingUnit[] = [];
    const wardVoters = calculateWardVoters(ward);
    const baseVotersPerUnit = Math.floor(wardVoters / ward.pollingUnitsCount);
    let remainingVoters = wardVoters;

    for (let i = 1; i <= ward.pollingUnitsCount; i++) {
        const puNumber = i.toString().padStart(3, '0');
        
        // Add variance for realistic distribution (-15% to +15%)
        const variance = (Math.random() * 0.3) - 0.15;
        const voters = Math.max(50, Math.min(1200, 
            Math.floor(baseVotersPerUnit * (1 + variance))
        ));
        
        remainingVoters -= voters;
        
        units.push({
            id: \`\${ward.id}-PU\${puNumber}\`,
            code: \`\${ward.code}-\${puNumber}\`,
            name: \`\${ward.name} - PU \${puNumber}\`,
            wardId: ward.id,
            wardName: ward.name,
            lga: ward.lga,
            registeredVoters: voters,
            status: 'active'
        });
    }
    
    // Distribute any remaining voters
    if (remainingVoters > 0) {
        for (let i = 0; i < units.length && remainingVoters > 0; i++) {
            units[i].registeredVoters = (units[i].registeredVoters || 0) + 1;
            remainingVoters--;
        }
    }

    return units;
}`;
  
  content = content.substring(0, funcStart) + newFunc + content.substring(funcEnd);
  
  // Update SUMMARY - find the line with totalPollingUnits and add after it
  content = content.replace(
    /(export const \w+_SUMMARY = \{[\s\S]*?totalPollingUnits: \w+_POLLING_UNITS\.length,)/,
    `$1\n    totalRegisteredVoters: ${baseName}_TOTAL_VOTERS,\n    averageVotersPerUnit: Math.round(${baseName}_TOTAL_VOTERS / ${baseName}_POLLING_UNITS.length),`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`  ✓ ${path.basename(filePath)}: ${totalVoters.toLocaleString()} voters, ${totalUnits} units`);
  return true;
}

// Main
const dataDir = __dirname;

console.log('Updating LGA data files with INEC voter counts...\n');

let success = 0;
let failed = 0;
let skipped = 0;

Object.entries(LGA_FILE_MAP).forEach(([fileName, lgaName]) => {
  if (fileName === 'bakori_data.ts') {
    console.log(`  ✓ ${fileName} - manually updated`);
    skipped++;
    return;
  }
  
  const filePath = path.join(dataDir, fileName);
  const totalVoters = LGA_VOTER_DISTRIBUTION[lgaName];
  
  if (!fs.existsSync(filePath) || !totalVoters) {
    console.log(`  ✗ ${fileName} - file not found or no voter data`);
    failed++;
    return;
  }
  
  try {
    if (updateLgaFile(filePath, lgaName, totalVoters)) {
      success++;
    } else {
      failed++;
    }
  } catch (error) {
    console.error(`  ✗ ${fileName}: ${error.message}`);
    failed++;
  }
});

const total = Object.values(LGA_VOTER_DISTRIBUTION).reduce((a, b) => a + b, 0);
console.log(`\n${'='.repeat(70)}`);
console.log(`Results: ${success} updated, ${skipped} skipped, ${failed} failed`);
console.log(`Total Voters: ${total.toLocaleString()} / 3,570,740 ${total === 3570740 ? '✓' : '✗'}`);
console.log('='.repeat(70));
