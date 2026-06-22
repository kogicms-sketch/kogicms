const fs = require('fs');
const path = require('path');

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

function extractWards(content) {
  // Find the block export const XXX_WARDS: Ward[] = [ ... ]
  const wardsMatch = content.match(/export const \w+_WARDS: Ward\[\] = (\[[\s\S]*?\]);/);
  if (!wardsMatch) return null;
  
  const wardsStr = wardsMatch[1];
  const wards = [];
  
  // Robust match for each ward object
  // Matches { id: '...', code: '...', name: '...', lga: '...' } with flexible quotes and spaces
  const wardBlockRegex = /\{[\s\S]*?\}/g;
  const blocks = wardsStr.match(wardBlockRegex) || [];
  
  for (const block of blocks) {
    const idMatch = block.match(/id:\s*(?:'([^']*)'|"([^"]*)")/);
    const codeMatch = block.match(/code:\s*(?:'([^']*)'|"([^"]*)")/);
    const nameMatch = block.match(/name:\s*(?:'([^']*)'|"([^"]*)")/);
    const lgaMatch = block.match(/lga:\s*(?:'([^']*)'|"([^"]*)")/);
    
    if (nameMatch && lgaMatch) {
      const id = idMatch ? (idMatch[1] || idMatch[2]) : '';
      const code = codeMatch ? (codeMatch[1] || codeMatch[2]) : '';
      const name = nameMatch ? (nameMatch[1] || nameMatch[2]) : '';
      const lga = lgaMatch ? (lgaMatch[1] || lgaMatch[2]) : '';
      
      wards.push({
        id,
        code,
        name,
        lga
      });
    }
  }
  
  return wards;
}

function main() {
  const dataDir = __dirname;
  let allWards = [];
  
  Object.entries(LGA_FILE_MAP).forEach(([fileName, lgaName]) => {
    const filePath = path.join(dataDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${fileName}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const wards = extractWards(content);
    
    if (wards) {
      // Clean LGA name mapping if needed (e.g. Dan Musa vs Danmusa)
      wards.forEach(w => {
        w.dbLgaName = lgaName; // use the DB mapped name
      });
      allWards = allWards.concat(wards);
    } else {
      console.log(`Failed to extract wards from: ${fileName}`);
    }
  });
  
  console.log(`Extracted ${allWards.length} total wards.`);
  
  // Generate SQL script
  let sql = `-- SQL to seed real INEC wards in Katsina State\n`;
  sql += `TRUNCATE TABLE public.wards CASCADE;\n\n`;
  sql += `INSERT INTO public.wards (name, lga_id, code) VALUES\n`;
  
  const valueRows = allWards.map(w => {
    // Escape single quotes in ward names
    const escapedWardName = w.name.replace(/'/g, "''");
    const escapedLgaName = w.dbLgaName.replace(/'/g, "''");
    const escapedCode = w.code.replace(/'/g, "''");
    
    return `('${escapedWardName}', (SELECT id FROM public.lgas WHERE name = '${escapedLgaName}'), '${escapedCode}')`;
  });
  
  sql += valueRows.join(',\n') + ';\n';
  
  const outputPath = path.join(dataDir, 'insert_real_wards.sql');
  fs.writeFileSync(outputPath, sql);
  console.log(`SQL script generated successfully at: ${outputPath}`);
}

main();
