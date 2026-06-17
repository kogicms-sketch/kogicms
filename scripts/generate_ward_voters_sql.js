/**
 * generate_ward_voters_sql.js
 * 
 * Extracts voter data from PDFs and generates a SQL migration file
 * that can be applied via Supabase MCP tool.
 * 
 * Usage:
 *   node scripts/generate_ward_voters_sql.js <WARD_FOLDER> <WARD_DB_NAME> <OUTPUT_SQL>
 * 
 * Example:
 *   node scripts/generate_ward_voters_sql.js "src/data/21_KATSINA/08_WAKILIN_AREWA_A" "WAKILIN AREWA (A)" "scripts/wakilin_arewa_a_voters.sql"
 */

const fs = require('fs');
const path = require('path');

const WARD_FOLDER = process.argv[2] || 'src/data/21_KATSINA/08_WAKILIN_AREWA_A';
const WARD_NAME = process.argv[3] || "WAKILIN AREWA (A)";
const OUTPUT_SQL = process.argv[4] || 'scripts/wakilin_arewa_a_voters.sql';
const LGA = 'KATSINA';
const PDF_DIR = path.resolve(WARD_FOLDER);

function esc(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function extractDelimCode(textItems) {
  for (const item of textItems) {
    if (item.str && item.str.includes('DELIM:')) {
      const match = item.str.match(/DELIM:\s*(\d{2}-\d{2}-\d{2}-\d{3})/);
      if (match) return match[1];
    }
  }
  return null;
}

function extractPUName(textItems) {
  for (let i = 0; i < textItems.length; i++) {
    const s = textItems[i].str;
    if (s === 'PU:' || s === 'PU') {
      for (let j = i + 1; j < Math.min(i + 6, textItems.length); j++) {
        const next = textItems[j].str.trim();
        if (next && next !== ' ' && next.length > 1) return next;
      }
    }
  }
  return null;
}

function parseVotersFromPage(textItems) {
  const voters = [];
  const hasVoterNames = textItems.some(item =>
    item.str && item.str.includes(',') && item.transform[0] === 8 &&
    (Math.abs(item.transform[4] - 147.84) < 20 || Math.abs(item.transform[4] - 442.83) < 20)
  );
  if (!hasVoterNames) return voters;

  const nameItems = textItems.filter(item => {
    if (!item.str || !item.str.trim()) return false;
    if (item.transform[0] !== 8) return false;
    const x = item.transform[4];
    return (Math.abs(x - 147.84) < 20 || Math.abs(x - 442.83) < 20);
  });

  for (const nameItem of nameItems) {
    const name = nameItem.str.trim();
    if (!name || name.length < 3 || !name.includes(',')) continue;

    const nameX = nameItem.transform[4];
    const nameY = nameItem.transform[5];
    let vin = null, dobYear = null, gender = null;

    for (const item of textItems) {
      if (!item.str || !item.str.trim()) continue;
      const dx = Math.abs(item.transform[4] - nameX);

      const dyVin = Math.abs(item.transform[5] - (nameY - 23.7));
      if (dyVin < 10 && dx < 250) {
        const s = item.str.trim();
        if (/^[A-Z0-9]{15,25}$/.test(s)) vin = s;
      }

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
      voters.push({ name, vin, dobYear: dobYear || null, gender: gender || null, _x: nameX, _y: nameY });
    }
  }

  voters.sort((a, b) => {
    const colA = a._x < 300 ? 0 : 1;
    const colB = b._x < 300 ? 0 : 1;
    if (colA !== colB) return colA - colB;
    return b._y - a._y;
  });

  return voters;
}

async function processPDF(pdfPath, pdfjsLib) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (err) {
    console.error(`   ❌ Failed to load: ${err.message}`);
    return [];
  }

  let delimCode = null, puName = null;
  const allVoters = [];

  for (let pageNum = 2; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems = textContent.items;
    if (pageNum === 2) {
      delimCode = extractDelimCode(textItems);
      puName = extractPUName(textItems);
    }
    const voters = parseVotersFromPage(textItems);
    allVoters.push(...voters);
  }

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

async function main() {
  console.log(`📄 Generating SQL for ward: ${WARD_NAME}`);
  console.log(`📁 Source: ${PDF_DIR}`);
  console.log(`💾 Output: ${OUTPUT_SQL}\n`);

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const pdfFiles = fs.readdirSync(PDF_DIR)
    .filter(f => f.endsWith('.pdf') && !f.includes(' - Copy'))
    .sort()
    .map(f => path.join(PDF_DIR, f));

  console.log(`Found ${pdfFiles.length} PDFs\n`);

  const allRecords = [];
  const puSummary = [];

  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfPath = pdfFiles[i];
    const fileName = path.basename(pdfPath, '.pdf');
    process.stdout.write(`[${i+1}/${pdfFiles.length}] ${fileName}... `);
    try {
      const records = await processPDF(pdfPath, pdfjsLib);
      const puCode = records[0]?.polling_unit_code || 'unknown';
      const puName = records[0]?.polling_unit_name || 'unknown';
      console.log(`${records.length} voters (${puCode})`);
      allRecords.push(...records);
      if (records.length > 0) puSummary.push({ puCode, puName, count: records.length });
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }
  }

  // Deduplicate by VIN
  const vinMap = new Map();
  for (const r of allRecords) vinMap.set(r.vin, r);
  const uniqueRecords = Array.from(vinMap.values());

  console.log(`\n📊 Total voters: ${allRecords.length}, Unique VINs: ${uniqueRecords.length}`);

  // Generate SQL
  const CHUNK = 500; // rows per INSERT statement
  let sql = `-- ============================================================================
-- VOTER REGISTRY: ${WARD_NAME} Ward, ${LGA} LGA
-- Generated: ${new Date().toISOString()}
-- Total voters: ${uniqueRecords.length}
-- ============================================================================

`;

  for (let i = 0; i < uniqueRecords.length; i += CHUNK) {
    const chunk = uniqueRecords.slice(i, i + CHUNK);
    const values = chunk.map(r =>
      `(${esc(r.vin)}, ${esc(r.full_name)}, ${r.dob_year ?? 'NULL'}, ${esc(r.gender)}, ${esc(r.lga)}, ${esc(r.ward)}, ${esc(r.polling_unit_code)}, ${esc(r.polling_unit_name)}, NULL)`
    ).join(',\n  ');

    sql += `INSERT INTO public.voter_registry (vin, full_name, dob_year, gender, lga, ward, polling_unit_code, polling_unit_name, photo_url)\nVALUES\n  ${values}\nON CONFLICT (vin) DO UPDATE SET\n  full_name = EXCLUDED.full_name,\n  dob_year = EXCLUDED.dob_year,\n  gender = EXCLUDED.gender,\n  lga = EXCLUDED.lga,\n  ward = EXCLUDED.ward,\n  polling_unit_code = EXCLUDED.polling_unit_code,\n  polling_unit_name = EXCLUDED.polling_unit_name;\n\n`;
  }

  // Summary comment at end
  sql += `-- PU Summary:\n`;
  for (const pu of puSummary) {
    sql += `--   ${pu.puCode.padEnd(15)} ${pu.count.toString().padStart(5)} voters  ${pu.puName}\n`;
  }

  fs.writeFileSync(OUTPUT_SQL, sql, 'utf8');
  const sqlSize = (fs.statSync(OUTPUT_SQL).size / 1024 / 1024).toFixed(2);
  console.log(`✅ SQL file generated: ${OUTPUT_SQL} (${sqlSize} MB)`);
  console.log(`   ${Math.ceil(uniqueRecords.length / CHUNK)} INSERT statements, ${CHUNK} rows each`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
