/**
 * test_extract_single_pdf.js
 * 
 * Tests voter extraction from a single small PDF (014 has only 49 voters, 5 pages).
 * Does NOT upload to Supabase, just prints extracted data.
 */

const fs = require('fs');
const path = require('path');

const PDF_PATH = path.resolve('src/data/21_KATSINA/10_SHINKAFI_A/014_K_GIDAN_AUDU_DANDA_SHINKAFI.pdf');

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
    if (textItems[i].str === 'PU:' || textItems[i].str === 'PU') {
      for (let j = i + 1; j < textItems.length && j < i + 5; j++) {
        const s = textItems[j].str.trim();
        if (s && s !== ' ') return s;
      }
    }
  }
  return null;
}

function parseVoters(textItems) {
  const voters = [];

  const nameItems = textItems.filter(item => {
    return item.str && item.str.trim() && item.transform[0] === 8 &&
      (Math.abs(item.transform[4] - 147.84) < 10 || Math.abs(item.transform[4] - 442.83) < 10);
  });

  for (const nameItem of nameItems) {
    const name = nameItem.str.trim();
    if (!name || name.length < 2) continue;

    const nameX = nameItem.transform[4];
    const nameY = nameItem.transform[5];
    const vinLineY = nameY - 23.7;
    const dobLineY = nameY - 35.7;

    let vin = null;
    let dobYear = null;
    let gender = null;

    for (const item of textItems) {
      if (!item.str) continue;
      const dx = Math.abs(item.transform[4] - nameX);
      const dy = Math.abs(item.transform[5] - vinLineY);

      if (dy < 8 && dx < 200) {
        const s = item.str.trim();
        if (/^[A-Z0-9]{15,25}$/.test(s)) vin = s;
      }

      const dyDob = Math.abs(item.transform[5] - dobLineY);
      if (dyDob < 8 && dx < 250) {
        const s = item.str.trim();
        const dobMatch = s.match(/DOB-Y:\s*(\d{4})/);
        if (dobMatch) dobYear = parseInt(dobMatch[1]);
        const genderMatch = s.match(/Gender:\s*([MF])/i);
        if (genderMatch) gender = genderMatch[1].toUpperCase();
      }
    }

    if (name && vin) {
      voters.push({ name, vin, dobYear, gender, nameX, nameY });
    }
  }

  voters.sort((a, b) => {
    const colA = a.nameX < 300 ? 0 : 1;
    const colB = b.nameX < 300 ? 0 : 1;
    if (colA !== colB) return colA - colB;
    return b.nameY - a.nameY;
  });

  return voters;
}

async function main() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  console.log(`PDF: ${path.basename(PDF_PATH)}`);
  console.log(`Total pages: ${pdf.numPages}`);

  let delimCode = null;
  let puName = null;
  const allVoters = [];

  for (let pageNum = 2; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems = textContent.items;

    if (pageNum === 2) {
      delimCode = extractDelimCode(textItems);
      puName = extractPUName(textItems);
      console.log(`PU Code: ${delimCode}, PU Name: ${puName}`);
    }

    const voters = parseVoters(textItems);

    // Count images (excluding logos)
    const ops = await page.getOperatorList();
    let imgCount = 0;
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === 85 || ops.fnArray[i] === 86) imgCount++;
    }
    const voterImgCount = Math.max(0, imgCount - 2); // subtract 2 logos

    console.log(`Page ${pageNum}: ${voters.length} voters, ${voterImgCount} voter photos`);
    voters.forEach((v, i) => {
      console.log(`  [${i+1}] ${v.name} | VIN: ${v.vin} | DOB: ${v.dobYear} | Gender: ${v.gender}`);
    });

    allVoters.push(...voters);
  }

  console.log(`\nTotal voters from ${path.basename(PDF_PATH)}: ${allVoters.length}`);
  console.log('Expected: 49 voters');
}

main().catch(console.error);
