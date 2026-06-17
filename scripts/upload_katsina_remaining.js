const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const baseDir = 'src/data/21_KATSINA';
const LGA = 'Katsina';

const wards = [
  { folder: '01_WAKILIN_GABAS_I', name: 'Wakilin Gabas I' },
  { folder: '02_WAKILIN_GABAS_II', name: 'Wakilin Gabas II' },
  { folder: '06_WAKILIN_KUDU_I', name: 'Wakilin Kudu I' }
];

async function run() {
  console.log(`🚀 Starting bulk upload for the remaining ${wards.length} wards of ${LGA} LGA...`);
  
  for (const ward of wards) {
    const folderPath = path.join(baseDir, ward.folder);
    console.log(`\n--------------------------------------------------`);
    console.log(`📂 Processing Ward: ${ward.name} (${ward.folder})`);
    console.log(`--------------------------------------------------`);
    
    if (!fs.existsSync(folderPath)) {
      console.log(`⚠️ Folder does not exist: ${folderPath}. Skipping...`);
      continue;
    }
    
    try {
      execSync(`node scripts/extract_ward_voters_text_only.js "${folderPath}" "${ward.name}" "${LGA}"`, { stdio: 'inherit' });
      console.log(`✅ Completed Ward: ${ward.name}`);
    } catch (err) {
      console.error(`❌ Failed Ward: ${ward.name}. Error: ${err.message}`);
    }
  }
  
  console.log('\n✨ All remaining Katsina LGA Wards completed!');
}

run().catch(console.error);
