/**
 * extract_shinkafi_voters.js
 * 
 * Extracts voter registration data and portrait photos from the 15 PDFs in
 * src/data/21_KATSINA/10_SHINKAFI_A and uploads them to Supabase.
 * 
 * Target:
 *   - voter_registry table in ltpsylgqcwxaprsvabap project
 *   - voter-photos bucket in ltpsylgqcwxaprsvabap project
 * 
 * Usage: node scripts/extract_shinkafi_voters.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ============ CONFIG ============
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ltpsylgqcwxaprsvabap.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PDF_DIR = path.resolve('src/data/21_KATSINA/10_SHINKAFI_A');
const BATCH_SIZE = 50;

// Ward/LGA metadata (uppercase as stored in this project's voter_registry)
const LGA = 'KATSINA';
const WARD = "SHINKAFI 'A'";

// ============ SUPABASE CLIENT ============
if (!SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============ STATS ============
let totalVotersExtracted = 0;
let totalPhotosUploaded = 0;
let totalVotersInserted = 0;
let totalErrors = 0;

// ============ HELPERS ============

/**
 * Extract the polling unit DELIM code from a page footer.
 * Footer text: "Valid Registrations | DELIM: 20-21-10-014 | 08-01-2023"
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
 * Extract the Polling Unit name from the header.
 * Header text: "PU:", then next non-empty item is the PU name
 */
function extractPUName(textItems) {
  for (let i = 0; i < textItems.length; i++) {
    if (textItems[i].str === 'PU:' || textItems[i].str === 'PU') {
      // Find next non-empty and non-whitespace text item
      for (let j = i + 1; j < textItems.length && j < i + 5; j++) {
        const s = textItems[j].str.trim();
        if (s && s !== ' ') {
          return s;
        }
      }
    }
  }
  return null;
}

/**
 * Parse voter text items from a content page.
 * Layout: 2 columns, 8 voters per column, 16 per page.
 * Each voter has:
 *   - Serial number: small font at x~8.84 or x~303.83
 *   - Name: font-size 8, at x~147.84 or x~442.83
 *   - VIN: after "VIN:" text, at x~178.96 or x~473.96
 *   - DOB-Y: at same line "DOB-Y: YYYY"
 *   - Gender: "Gender: M" or "Gender: F"
 */
function parseVoters(textItems) {
  const voters = [];
  
  // Build a list of candidate voter rows by grouping text items by y-coordinate
  // The voter name appears at y values separated by ~94 points
  // Left column: x ~ 147.84, Right column: x ~ 442.83
  
  // Collect name items (font size 8 = transform[0]=8)
  const nameItems = textItems.filter(item => {
    return item.str && item.str.trim() && item.transform[0] === 8 && 
           (Math.abs(item.transform[4] - 147.84) < 10 || Math.abs(item.transform[4] - 442.83) < 10);
  });

  for (const nameItem of nameItems) {
    const name = nameItem.str.trim();
    if (!name || name.length < 2) continue;

    const nameX = nameItem.transform[4];
    const nameY = nameItem.transform[5]; // y coordinate of the name

    // VIN line is at y ~ nameY - 23.7 (from observation: name at 737.99, VIN at 714.29)
    const vinLineY = nameY - 23.7;
    // DOB-Y line is at y ~ nameY - 35.7 (name at 737.99, DOB at 702.29)
    const dobLineY = nameY - 35.7;

    // Find VIN: look for text after "VIN:" near nameX, vinLineY
    let vin = null;
    let dobYear = null;
    let gender = null;

    for (const item of textItems) {
      if (!item.str) continue;
      const dx = Math.abs(item.transform[4] - nameX);
      const dy = Math.abs(item.transform[5] - vinLineY);
      
      if (dy < 8 && dx < 200) {
        const s = item.str.trim();
        // VIN is typically 19-20 chars alphanumeric
        if (/^[A-Z0-9]{15,25}$/.test(s)) {
          vin = s;
        }
      }

      // DOB-Y line
      const dyDob = Math.abs(item.transform[5] - dobLineY);
      if (dyDob < 8 && dx < 250) {
        const s = item.str.trim();
        const dobMatch = s.match(/DOB-Y:\s*(\d{4})/);
        if (dobMatch) {
          dobYear = parseInt(dobMatch[1]);
        }
        const genderMatch = s.match(/Gender:\s*([MF])/i);
        if (genderMatch) {
          gender = genderMatch[1].toUpperCase();
        }
      }
    }

    if (name && vin) {
      voters.push({ name, vin, dobYear, gender, nameX, nameY });
    }
  }

  // Sort by column (x), then by y descending (top to bottom in PDF coords)
  voters.sort((a, b) => {
    // Left column (x~147) first, then right column (x~442)
    const colA = a.nameX < 300 ? 0 : 1;
    const colB = b.nameX < 300 ? 0 : 1;
    if (colA !== colB) return colA - colB;
    // Within column, sort by y descending (higher y = higher on page)
    return b.nameY - a.nameY;
  });

  return voters;
}

/**
 * Get images from a page in order matching voter positions.
 * Skip the first 2 images (header logos).
 * Left column images (x~64) come first (8 photos, top to bottom)
 * Right column images (x~359) come second (8 photos, top to bottom)
 */
async function getPageImages(page, ops) {
  const imageEntries = [];
  let currentTransform = [1, 0, 0, 1, 0, 0];

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];

    if (fn === 12) { // transform operator
      currentTransform = args;
    } else if (fn === 85 || fn === 86) { // paintImageXObject or paintJpegXObject
      imageEntries.push({
        name: args[0],
        x: currentTransform[4],
        y: currentTransform[5],
        w: currentTransform[0],
        h: currentTransform[3]
      });
    }
  }

  // Skip first 2 (logos), sort remaining: left col (x<200) then right col (x>200), each by y descending
  const voterImages = imageEntries.slice(2);
  voterImages.sort((a, b) => {
    const colA = a.x < 200 ? 0 : 1;
    const colB = b.x < 200 ? 0 : 1;
    if (colA !== colB) return colA - colB;
    return b.y - a.y; // higher y = higher on page
  });

  return voterImages;
}

/**
 * Resolve a page image object using PDF.js page.objs
 * Returns image data or null
 */
function resolveImage(page, imgName) {
  return new Promise((resolve) => {
    try {
      page.objs.get(imgName, (img) => {
        resolve(img);
      });
    } catch (e) {
      console.warn(`Could not resolve image ${imgName}:`, e.message);
      resolve(null);
    }
  });
}

/**
 * Convert ImageKind pixel data to JPEG Buffer using Jimp
 * ImageKind.GRAYSCALE_1BPP = 1
 * ImageKind.RGB_24BPP = 2
 * ImageKind.RGBA_32BPP = 3
 */
async function imageDataToJpegBuffer(imgData) {
  try {
    const Jimp = await import('jimp');
    const { width, height, kind, data } = imgData;

    let rgbaBuffer;

    if (kind === 1) {
      // GRAYSCALE_1BPP - each pixel is 1 bit
      const bytesPerRow = Math.ceil(width / 8);
      rgbaBuffer = Buffer.alloc(width * height * 4);
      let offset = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const byteIndex = y * bytesPerRow + Math.floor(x / 8);
          const bit = (data[byteIndex] >> (7 - (x % 8))) & 1;
          const v = bit ? 255 : 0;
          rgbaBuffer[offset++] = v;
          rgbaBuffer[offset++] = v;
          rgbaBuffer[offset++] = v;
          rgbaBuffer[offset++] = 255;
        }
      }
    } else if (kind === 2) {
      // RGB_24BPP
      rgbaBuffer = Buffer.alloc(width * height * 4);
      let srcOffset = 0;
      let dstOffset = 0;
      for (let i = 0; i < width * height; i++) {
        rgbaBuffer[dstOffset++] = data[srcOffset++];
        rgbaBuffer[dstOffset++] = data[srcOffset++];
        rgbaBuffer[dstOffset++] = data[srcOffset++];
        rgbaBuffer[dstOffset++] = 255;
      }
    } else if (kind === 3) {
      // RGBA_32BPP
      rgbaBuffer = Buffer.from(data);
    } else {
      console.warn(`Unknown image kind: ${kind}, trying raw RGBA`);
      rgbaBuffer = Buffer.from(data);
    }

    // Create Jimp image
    const jimpModule = Jimp.default || Jimp;
    const image = await jimpModule.fromBitmap({ data: rgbaBuffer, width, height });
    return await image.getBuffer('image/jpeg');
  } catch (err) {
    console.error('Error converting image to JPEG:', err.message);
    return null;
  }
}

/**
 * Upload photo buffer to Supabase storage voter-photos bucket
 * Path format: {pu_code}/{vin}.jpeg
 */
async function uploadPhoto(vin, puCode, jpegBuffer) {
  try {
    const filePath = `${puCode}/${vin}.jpeg`;
    const { data, error } = await supabase.storage
      .from('voter-photos')
      .upload(filePath, jpegBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Build public URL
    const { data: urlData } = supabase.storage
      .from('voter-photos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error(`Error uploading photo for VIN ${vin}:`, err.message);
    return null;
  }
}

/**
 * Process a single PDF file and return extracted voter records
 */
async function processPDF(pdfPath, pdfjsLib) {
  const fileName = path.basename(pdfPath, '.pdf');
  console.log(`\n📄 Processing: ${fileName}`);

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  console.log(`   Pages: ${pdf.numPages}`);

  let delimCode = null;
  let puName = null;
  const allVoters = [];
  const allPhotoMappings = []; // { voterIndex, imgName, page }

  // Page 1 = cover page (no voters), Pages 2+ = voter data pages
  // Let's first get the PU code from the first voter page (page 2)
  
  let voterPageStart = 2;
  let voterPageCount = pdf.numPages - 1; // exclude the cover page

  for (let pageNum = voterPageStart; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems = textContent.items;

    // Get DELIM code and PU name from the first voter page
    if (pageNum === voterPageStart) {
      delimCode = extractDelimCode(textItems);
      puName = extractPUName(textItems);
      if (!delimCode) {
        // Check cover page instead
        console.warn(`   ⚠️  Could not find DELIM code on page ${pageNum}`);
      } else {
        console.log(`   PU Code: ${delimCode}, PU Name: ${puName}`);
      }
    }

    // Parse voters from this page
    const pageVoters = parseVoters(textItems);

    // Get images
    const ops = await page.getOperatorList();
    const pageImages = await getPageImages(page, ops);

    // Match voters with images (same order, images 3+ are voter photos)
    for (let i = 0; i < pageVoters.length; i++) {
      const voter = pageVoters[i];
      voter.puCode = delimCode;
      voter.puName = puName;

      const imgEntry = pageImages[i];
      if (imgEntry) {
        allPhotoMappings.push({
          voterIndex: allVoters.length + i,
          imgName: imgEntry.name,
          page: page
        });
      }
      allVoters.push(voter);
    }
  }

  console.log(`   Voters extracted: ${allVoters.length}`);
  console.log(`   Photos mapped: ${allPhotoMappings.length}`);

  // Resolve and process images
  console.log(`   Uploading photos...`);
  let photosUploaded = 0;

  for (const mapping of allPhotoMappings) {
    const voter = allVoters[mapping.voterIndex];
    if (!voter || !voter.vin) continue;

    try {
      const imgData = await resolveImage(mapping.page, mapping.imgName);
      if (!imgData || !imgData.data || !imgData.width || !imgData.height) {
        console.warn(`   ⚠️  No image data for ${mapping.imgName} (voter ${voter.vin})`);
        continue;
      }

      const jpegBuffer = await imageDataToJpegBuffer(imgData);
      if (!jpegBuffer) {
        console.warn(`   ⚠️  Failed to convert image for voter ${voter.vin}`);
        continue;
      }

      const photoUrl = await uploadPhoto(voter.vin, voter.puCode || 'unknown', jpegBuffer);
      if (photoUrl) {
        voter.photoUrl = photoUrl;
        photosUploaded++;
      }
    } catch (err) {
      console.warn(`   ⚠️  Error processing photo for voter ${voter.vin}:`, err.message);
    }
  }

  console.log(`   Photos uploaded: ${photosUploaded}/${allPhotoMappings.length}`);
  totalPhotosUploaded += photosUploaded;

  return allVoters;
}

/**
 * Upsert voter records to voter_registry table in batches
 */
async function upsertVoters(voters) {
  const records = voters.map(v => ({
    vin: v.vin,
    full_name: v.name,
    dob_year: v.dobYear || null,
    gender: v.gender || null,
    lga: LGA,
    ward: WARD,
    polling_unit_code: v.puCode || null,
    polling_unit_name: v.puName || null,
    photo_url: v.photoUrl || null
  }));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('voter_registry')
      .upsert(batch, { onConflict: 'vin' });

    if (error) {
      console.error(`❌ Batch upsert error:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
    }
  }

  return { successCount, errorCount };
}

// ============ MAIN ============
async function main() {
  console.log('🗳️  Shinkafi A Voter Data Extraction & Upload');
  console.log(`🎯 Target: ${SUPABASE_URL}`);
  console.log(`📁 Source: ${PDF_DIR}`);
  console.log(`🏙️  LGA: ${LGA}, Ward: ${WARD}`);
  console.log('');

  // Load pdfjs-dist
  console.log('📦 Loading pdfjs-dist...');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  console.log('✅ pdfjs-dist loaded');

  // Get list of PDF files
  const pdfFiles = fs.readdirSync(PDF_DIR)
    .filter(f => f.endsWith('.pdf') && !f.includes(' - Copy'))
    .sort()
    .map(f => path.join(PDF_DIR, f));

  console.log(`\n📚 Found ${pdfFiles.length} PDF files`);

  const allVoters = [];

  // Process each PDF
  for (const pdfPath of pdfFiles) {
    try {
      const voters = await processPDF(pdfPath, pdfjsLib);
      allVoters.push(...voters);
      totalVotersExtracted += voters.length;
    } catch (err) {
      console.error(`❌ Error processing ${path.basename(pdfPath)}:`, err.message);
      totalErrors++;
    }
  }

  console.log(`\n📊 Extraction Summary:`);
  console.log(`   Total voters extracted: ${totalVotersExtracted}`);
  console.log(`   Total photos uploaded: ${totalPhotosUploaded}`);
  console.log(`   Errors: ${totalErrors}`);

  if (allVoters.length === 0) {
    console.error('\n❌ No voters extracted. Exiting.');
    process.exit(1);
  }

  // Log a few sample voters
  console.log('\n📋 Sample voters (first 5):');
  allVoters.slice(0, 5).forEach((v, i) => {
    console.log(`  [${i + 1}] ${v.name} (${v.vin}) - PU: ${v.puCode} - Photo: ${v.photoUrl ? '✅' : '❌'}`);
  });

  // Upsert all voters to the database
  console.log(`\n💾 Upserting ${allVoters.length} voters to voter_registry...`);
  const { successCount, errorCount } = await upsertVoters(allVoters);
  totalVotersInserted = successCount;

  console.log(`\n✨ Migration Complete!`);
  console.log(`   ✅ Voters inserted/updated: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📸 Photos uploaded: ${totalPhotosUploaded}`);

  // Final verification count
  const { count: finalCount } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true })
    .eq('lga', LGA)
    .eq('ward', WARD);

  console.log(`\n🔍 Verification: ${finalCount} total ${WARD} voters now in voter_registry`);

  // Export VINs to a file for reference
  const vinList = allVoters.map(v => v.vin).join('\n');
  fs.writeFileSync('scripts/shinkafi_a_vins.txt', vinList);
  console.log(`📋 VIN list saved to scripts/shinkafi_a_vins.txt`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
