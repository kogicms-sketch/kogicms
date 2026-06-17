const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const baseDir = 'src/data/26_MANI-20260613T172803Z-3-001/26_MANI';
const LGA = 'Mani';

const wards = [
  { folder: '01_BUJAWA_GEWAYAU', name: 'Bujawa/Gewayau' },
  { folder: '02_DUWAN_MAKAU', name: 'Duwan/Makau' },
  { folder: '03_MANI', name: 'Mani' },
  { folder: '04_BAGIWA', name: 'Bagiwa' },
  { folder: '05_TSAGEM_TAKUSHEYI', name: 'Tsagem/Takusheyi' },
  { folder: '06_HAMCHETA', name: 'Hamcheta' },
  { folder: '07_KWATTA', name: 'Kwatta' },
  { folder: '08_MACHIKA', name: 'Machika' },
  { folder: '09_MUDURU', name: 'Muduru' },
  { folder: '10_MAGAMI', name: 'Magami' },
  { folder: '11_JANI', name: 'Jani' }
];

async function run() {
  console.log(`🚀 Starting bulk upload for all 11 wards of ${LGA} LGA...`);
  
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
  
  console.log('\n✨ All Mani LGA Wards completed!');
}

run().catch(console.error);
