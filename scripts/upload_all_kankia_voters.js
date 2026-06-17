const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const baseDir = 'src/data/20_KANKIA';
const LGA = 'Kankia';

const wards = [
  { folder: '01_GALADIMA_A', name: 'Galadima A' },
  { folder: '02_GALADIMA_B', name: 'Galadima B' },
  { folder: '03_KAFINSOLI', name: 'Kafinsoli' },
  { folder: '04_TAFASHIYA_NASARAWA', name: 'Tafashiya/Nasarawa' },
  { folder: '05_KUNDURU_GYAZA', name: 'Kunduru/Gyaza' },
  { folder: '06_KAFIN_DANGI_FAKUWA', name: 'Kafin Dangi/Fakuwa' },
  { folder: '07_SUKUNTUNI', name: 'Sukuntuni' },
  { folder: '08_RIMAYE', name: 'Rimaye' },
  { folder: '09_GACHI', name: 'Gachi' },
  { folder: '10_MAGAM_TSA', name: 'Magam/Tsa' }
];

async function run() {
  console.log(`🚀 Starting bulk upload for all 10 wards of ${LGA} LGA...`);
  
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
  
  console.log('\n✨ All Kankia LGA Wards completed!');
}

run().catch(console.error);
