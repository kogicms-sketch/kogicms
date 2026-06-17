const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');

// List of LGA files to update (excluding already updated ones)
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
    'sandamu_data.ts'
];

function updateLGAFile(filePath) {
    console.log(`Processing: ${path.basename(filePath)}`);

    let content = fs.readFileSync(filePath, 'utf-8');

    // Check if already updated
    if (content.includes('getChairmanByLGA')) {
        console.log(`  ✓ Already has chairman import, skipping`);
        return;
    }

    // Step 1: Add import after the Ward/PollingUnit import
    const importRegex = /(import\s+{\s*Ward,\s*PollingUnit\s*}\s+from\s+['"]\.\/bakori_data['"];?\s*\n)/;
    if (importRegex.test(content)) {
        content = content.replace(
            importRegex,
            `$1import { getChairmanByLGA } from './lga_chairmen';\n`
        );
    }

    // Step 2: Add chairman variable in generatePollingUnits
    // Look for pattern where we initialize variables in the function
    const generateFunctionRegex = /(const generatePollingUnits = \(ward: Ward\): PollingUnit\[\] => \{\s*\n\s*const units: PollingUnit\[\] = \[\];\s*\n(?:\s*const \w+ = [^;]+;\s*\n)*)/;

    if (generateFunctionRegex.test(content)) {
        content = content.replace(
            generateFunctionRegex,
            (match) => {
                // Add chairman after other const declarations
                if (!match.includes('chairman')) {
                    const lastNewLine = match.lastIndexOf('\n');
                    return match.slice(0, lastNewLine) +
                        '\n    const chairman = getChairmanByLGA(ward.lga);' +
                        match.slice(lastNewLine);
                }
                return match;
            }
        );
    }

    // Step 3: Add lgaChairman field to units.push() calls
    // Pattern: lga: ward.lga,\n{spaces}registeredVoters: {value},\n{spaces}status:
    const pushRegex = /(lga:\s*ward\.lga,\s*\n)(\s*)(registeredVoters:\s*[^,]+,\s*\n)(\s*)(status:\s*'active')/g;

    content = content.replace(
        pushRegex,
        `$1$2$3$2lgaChairman: chairman?.chairman,\n$4$5`
    );

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ Updated successfully`);
}

console.log('Adding LGA Chairmen to remaining data files...\n');

let successCount = 0;
let errorCount = 0;

lgaFiles.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
        try {
            updateLGAFile(filePath);
            successCount++;
        } catch (error) {
            console.error(`  ✗ Error processing ${file}:`, error.message);
            errorCount++;
        }
    } else {
        console.log(`  ⚠ File not found: ${file}`);
    }
});

console.log(`\n✓ Done! Updated ${successCount} files.`);
if (errorCount > 0) {
    console.log(`✗ ${errorCount} files had errors.`);
}
