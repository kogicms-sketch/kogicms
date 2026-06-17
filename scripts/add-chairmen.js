// Script to add LGA Chairman to all data files
// Run with: node scripts/add-chairmen.js

import * as fs from 'fs';
import * as path from 'path';

const dataDir = path.join(process.cwd(), 'src', 'data');

// List of all LGA data files (excluding bakori and batagarawa which are already updated)
const lgaFiles = [
    'batsari_data.ts',
    'baure_data.ts',
    'bindawa_data.ts',
    'charanchi_data.ts',
    'dandume_data.ts',
    'danja_data.ts',
    'danmusa_data.ts',
    'daura_data.ts',
    'dutsi_data.ts',
    'dutsinma_data.ts',
    'faskari_data.ts',
    'funtua_data.ts',
    'ingawa_data.ts',
    'jibia_data.ts',
    'kafur_data.ts',
    'kaita_data.ts',
    'kankara_data.ts',
    'kankia_data.ts',
    'katsina_data.ts',
    'kurfi_data.ts',
    'kusada_data.ts',
    'maiadua_data.ts',
    'malumfashi_data.ts',
    'mani_data.ts',
    'mashi_data.ts',
    'matazu_data.ts',
    'musawa_data.ts',
    'rimi_data.ts',
    'sabuwa_data.ts',
    'safana_data.ts',
    'sandamu_data.ts',
    'zango_data.ts'
];

function addChairmanToFile(filePath: string) {
    console.log(`Processing: ${filePath}`);

    let content = fs.readFileSync(filePath, 'utf-8');

    // Skip if already has chairman import
    if (content.includes('getChairmanByLGA')) {
        console.log(`  ✓ Already has chairman import, skipping`);
        return;
    }

    // Add import after first import statement
    const importMatch = content.match(/(import.*from.*['"];?\s*\n)/);
    if (importMatch) {
        const insertIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
        content = content.slice(0, insertIndex) +
            `import { getChairmanByLGA } from './lga_chairmen';\n` +
            content.slice(insertIndex);
    }

    // Add chairman to generatePollingUnits function
    // Find the function and add chairman variable
    content = content.replace(
        /(const generatePollingUnits = \(ward: Ward\): PollingUnit\[\] => \{\s*\n\s*const units: PollingUnit\[\] = \[\];)/,
        `$1\n    const chairman = getChairmanByLGA(ward.lga);`
    );

    // Add lgaChairman field to units.push()
    content = content.replace(
        /(lga: ward\.lga,\s*\n)(\s*)(registeredVoters:)/,
        `$1$2$3\n$2lgaChairman: chairman?.chairman,`
    );

    // Also handle case where registeredVoters is not present
    content = content.replace(
        /(lga: ward\.lga,\s*\n)(\s*)(status: 'active')/,
        `$1$2lgaChairman: chairman?.chairman,\n$2$3`
    );

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ Updated successfully`);
}

console.log('Adding LGA Chairmen to data files...\n');

lgaFiles.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
        try {
            addChairmanToFile(filePath);
        } catch (error) {
            console.error(`  ✗ Error processing ${file}:`, error.message);
        }
    } else {
        console.log(`  ⚠ File not found: ${file}`);
    }
});

console.log('\n✓ Done! All files have been updated.');
