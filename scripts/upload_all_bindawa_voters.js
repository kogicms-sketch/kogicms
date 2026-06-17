const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const baseDir = 'src/data/05_BINDAWA-20260613T172819Z-3-001/05_BINDAWA';
const LGA = 'Bindawa';

const wards = [
  { folder: '01_KAMRI', name: 'Kamri' },
  { folder: '02_BINDAWA', name: 'Bindawa' },
  { folder: '03_TAMA_DAYE', name: 'Tama/Daye' },
  { folder: '04_FARU_DALLAJI', name: 'Faru/Dallaji' },
  { folder: '05_SHIBDAWA', name: 'Shibdawa' },
  { folder: '06_JIBAWA_R_BADE', name: 'Jibawa/R. Bade' },
  { folder: '07_DORO', name: 'Doro' },
  { folder: '08_BAURE', name: 'Baure' },
  { folder: '09_YANGORA', name: 'Yangora' },
  { folder: '10_GIREMAWA', name: 'Giremawa' },
  { folder: '11_GAIWA', name: 'Gaiwa' }
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
  
  console.log('\n✨ All Bindawa LGA Wards completed!');
}

run().catch(console.error);
