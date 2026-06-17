/**
 * extract_ward_voters_text_only.js
 * 
 * Extracts voter registration data (TEXT ONLY, no images) from all PDFs in a ward folder
 * and upserts them into the voter_registry table in Supabase.
 * 
 * Usage:
 *   node scripts/extract_ward_voters_text_only.js <WARD_FOLDER> <WARD_DB_NAME>
 * 
 * Example:
 *   node scripts/extract_ward_voters_text_only.js "src/data/21_KATSINA/08_WAKILIN_AREWA_A" "WAKILIN AREWA 'A'"
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ============ CONFIG ============
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ltpsylgqcwxaprsvabap.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const BATCH_SIZE = 200;

// Parse args
const WARD_FOLDER = process.argv[2] || 'src/data/21_KATSINA/08_WAKILIN_AREWA_A';
const WARD_NAME = process.argv[3] || "WAKILIN AREWA 'A'";
const LGA = process.argv[4] || 'Katsina';

const PDF_DIR = path.resolve(WARD_FOLDER);

// ============ SUPABASE CLIENT ============
if (!SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============ PDF PARSING HELPERS ============

/**
 * Extract the polling unit DELIM code from page footer text.
 * Footer: "Valid Registrations | DELIM: 20-21-08-001 | 08-01-2023"
 */
function extractDelimCode(textItems) {
  for (const item of textItems) {
    if (item.str && item.str.includes('DELIM:')) {
      const match = item.str.match(/DELIM:\s*(\d{2}-\d{2}-\d{2}-\d{3})/);
      if (match) return match[1];
    }
  }
  return null;
}

/**
 * Extract the PU name from the page header.
 * Header has: "PU:" label then PU name text
 */
function extractPUName(textItems) {
  for (let i = 0; i < textItems.length; i++) {
    const s = textItems[i].str;
    if (s === 'PU:' || s === 'PU') {
      for (let j = i + 1; j < Math.min(i + 6, textItems.length); j++) {
        const next = textItems[j].str.trim();
        if (next && next !== ' ' && next.length > 1) {
          return next;
        }
      }
    }
  }
  return null;
}

/**
 * Parse voter records from a voter data page.
 * 
 * Layout (A4 portrait):
 *  - 2 columns, 8 voters per column (16 per page on full pages)
 *  - Left column: serial at x~8.84, name at x~147.84
 *  - Right column: serial at x~303.83, name at x~442.83
 *  - Name: font-size 8 (transform[0] === 8)
 *  - VIN: ~23.7 pts below name, matches [A-Z0-9]{15,25}
 *  - DOB-Y and Gender: ~35.7 pts below name, "DOB-Y: YYYY" and "Gender: M/F"
 */
function parseVotersFromPage(textItems) {
  const voters = [];

  // Detect page type: if it contains "Valid Registrations" heading with no voter names
  // (cover page), skip it.
  const hasVoterNames = textItems.some(item => {
    return item.str && item.str.includes(',') && item.transform[0] === 8 &&
      (Math.abs(item.transform[4] - 147.84) < 15 || Math.abs(item.transform[4] - 442.83) < 15);
  });
  if (!hasVoterNames) return voters;

  // Find all name items (font-size 8, in left or right column x positions)
  const nameItems = textItems.filter(item => {
    if (!item.str || !item.str.trim()) return false;
    if (item.transform[0] !== 8) return false;
    const x = item.transform[4];
    // Left column ~147.84, Right column ~442.83 (tolerance ±20)
    return (Math.abs(x - 147.84) < 20 || Math.abs(x - 442.83) < 20);
  });

  for (const nameItem of nameItems) {
    const name = nameItem.str.trim();
    if (!name || name.length < 3 || !name.includes(',')) continue;

    const nameX = nameItem.transform[4];
    const nameY = nameItem.transform[5];

    // Look for VIN: y ≈ nameY - 23.7, same x column ± 200
    let vin = null;
    let dobYear = null;
    let gender = null;

    for (const item of textItems) {
      if (!item.str || !item.str.trim()) continue;
      const dx = Math.abs(item.transform[4] - nameX);

      // VIN line
      const dyVin = Math.abs(item.transform[5] - (nameY - 23.7));
      if (dyVin < 10 && dx < 250) {
        const s = item.str.trim();
        if (/^[A-Z0-9]{15,25}$/.test(s)) {
          vin = s;
        }
      }

      // DOB-Y and Gender line
      const dyDob = Math.abs(item.transform[5] - (nameY - 35.7));
      if (dyDob < 10 && dx < 280) {
        const s = item.str.trim();
        const dobMatch = s.match(/DOB-Y:\s*(\d{4})/);
        if (dobMatch) dobYear = parseInt(dobMatch[1]);
        const genderMatch = s.match(/Gender:\s*([MF])/i);
        if (genderMatch) gender = genderMatch[1].toUpperCase();
      }
    }

    if (name && vin) {
      voters.push({
        name,
        vin,
        dobYear: dobYear || null,
        gender: gender || null,
        _x: nameX,
        _y: nameY
      });
    }
  }

  // Sort: left column first (x < 300), then right column; within each column, top to bottom (y descending)
  voters.sort((a, b) => {
    const colA = a._x < 300 ? 0 : 1;
    const colB = b._x < 300 ? 0 : 1;
    if (colA !== colB) return colA - colB;
    return b._y - a._y;
  });

  return voters;
}

// ============ PROCESS A SINGLE PDF ============

async function processPDF(pdfPath, pdfjsLib) {
  const fileName = path.basename(pdfPath, '.pdf');

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (err) {
    console.error(`   ❌ Failed to load PDF: ${err.message}`);
    return [];
  }

  let delimCode = null;
  let puName = null;
  const allVoters = [];

  // Page 1 is cover page. Voter pages start from page 2.
  for (let pageNum = 2; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems = textContent.items;

    // Get PU info from first voter page
    if (pageNum === 2) {
      delimCode = extractDelimCode(textItems);
      puName = extractPUName(textItems);
    }

    const voters = parseVotersFromPage(textItems);
    allVoters.push(...voters);
  }

  // Attach PU info to all voters
  return allVoters.map(v => ({
    vin: v.vin,
    full_name: v.name,
    dob_year: v.dobYear,
    gender: v.gender,
    lga: LGA,
    ward: WARD_NAME,
    polling_unit_code: delimCode,
    polling_unit_name: puName,
    photo_url: null
  }));
}

async function upsertBatch(records) {
  const maxRetries = 5;
  let delay = 1000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabase
        .from('voter_registry')
        .upsert(records, { onConflict: 'vin' });
      if (!error) {
        return null;
      }
      if (attempt === maxRetries) {
        return error;
      }
      console.log(`\n    ⚠️ Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
    } catch (err) {
      if (attempt === maxRetries) {
        return err;
      }
      console.log(`\n    ⚠️ Attempt ${attempt} threw error: ${err.message}. Retrying in ${delay}ms...`);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2;
  }
}

// ============ MAIN ============

async function main() {
  console.log('🗳️  Ward Voter Text-Only Extraction & Upload');
  console.log(`🎯 Target: ${SUPABASE_URL}`);
  console.log(`📁 Source: ${PDF_DIR}`);
  console.log(`🏙️  LGA: ${LGA}`);
  console.log(`🏛️  Ward: ${WARD_NAME}`);
  console.log('');

  if (!fs.existsSync(PDF_DIR)) {
    console.error(`❌ PDF directory not found: ${PDF_DIR}`);
    process.exit(1);
  }

  // Load pdfjs-dist
  console.log('📦 Loading pdfjs-dist...');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  console.log('✅ pdfjs-dist loaded\n');

  // Get sorted PDF file list (skip " - Copy" duplicates)
  const pdfFiles = fs.readdirSync(PDF_DIR)
    .filter(f => f.endsWith('.pdf') && !f.includes(' - Copy'))
    .sort()
    .map(f => path.join(PDF_DIR, f));

  console.log(`📚 Found ${pdfFiles.length} PDF files\n`);

  const allRecords = [];
  let puSummary = [];

  // Process each PDF
  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfPath = pdfFiles[i];
    const fileName = path.basename(pdfPath, '.pdf');
    process.stdout.write(`[${i + 1}/${pdfFiles.length}] ${fileName}... `);

    try {
      const records = await processPDF(pdfPath, pdfjsLib);
      const puCode = records.length > 0 ? records[0].polling_unit_code : 'unknown';
      const puName = records.length > 0 ? records[0].polling_unit_name : 'unknown';
      console.log(`${records.length} voters (PU: ${puCode})`);
      allRecords.push(...records);
      if (records.length > 0) {
        puSummary.push({ file: fileName, puCode, puName, count: records.length });
      }
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
    }
  }

  console.log(`\n📊 Extraction Summary:`);
  console.log(`   Total voters extracted: ${allRecords.length}`);

  // Deduplicate by VIN (keep last occurrence)
  const vinMap = new Map();
  for (const r of allRecords) {
    vinMap.set(r.vin, r);
  }
  const uniqueRecords = Array.from(vinMap.values());
  console.log(`   Unique VINs: ${uniqueRecords.length}`);

  if (uniqueRecords.length === 0) {
    console.error('\n❌ No voters extracted. Check PDF format.');
    process.exit(1);
  }

  // Show sample
  console.log('\n📋 Sample voters (first 5):');
  uniqueRecords.slice(0, 5).forEach((v, i) => {
    console.log(`  [${i + 1}] ${v.full_name} | ${v.vin} | DOB: ${v.dob_year} | ${v.gender} | PU: ${v.polling_unit_code}`);
  });

  // Upsert in batches
  console.log(`\n💾 Upserting ${uniqueRecords.length} records in batches of ${BATCH_SIZE}...`);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
    const batch = uniqueRecords.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(uniqueRecords.length / BATCH_SIZE);

    const error = await upsertBatch(batch);
    if (error) {
      console.error(`  ❌ Batch ${batchNum}/${totalBatches} failed: ${error.message}`);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
      process.stdout.write(`\r  ✅ Batch ${batchNum}/${totalBatches} done (${successCount}/${uniqueRecords.length})`);
    }

    // Small pause to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n');

  // Final count verification
  const { count: finalCount, error: countErr } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true })
    .eq('lga', LGA)
    .eq('ward', WARD_NAME);

  console.log('✨ Migration Complete!');
  console.log(`   ✅ Voters upserted: ${successCount}`);
  if (errorCount > 0) console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   🔍 Total ${WARD_NAME} voters now in DB: ${countErr ? 'Error checking' : finalCount}`);

  // PU summary table
  console.log('\n📊 Polling Unit Summary:');
  puSummary.forEach(pu => {
    console.log(`  ${pu.puCode.padEnd(15)} | ${pu.count.toString().padStart(4)} voters | ${pu.puName}`);
  });

  // Save extracted VINs
  const sanitizedWard = WARD_NAME.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const vinFile = `scripts/${sanitizedWard}_vins.txt`;
  fs.writeFileSync(vinFile, uniqueRecords.map(v => v.vin).join('\n'));
  console.log(`\n📋 VIN list saved to ${vinFile}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
