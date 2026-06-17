/**
 * upload_shinkafi_a_voters.js
 *
 * Extracts voter registration data and portrait photos from the 15 PDFs in
 * src/data/21_KATSINA/10_SHINKAFI_A and uploads them to the active Supabase project.
 *
 * Target project: qkjscvmrqkxbzflowrox (ACTIVE_HEALTHY)
 *   - voter_registry table
 *   - voter-photos bucket (public)
 *
 * Naming conventions (matching existing polling_units table):
 *   lga  = "Katsina"   (title case)
 *   ward = "Shinkafi A" (title case, no apostrophe)
 *
 * Usage: node scripts/upload_shinkafi_a_voters.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ============ CONFIG ============
// Active project: qkjscvmrqkxbzflowrox
const SUPABASE_URL = 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFranNjdm1ycWt4YnpmbG93cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34';

// SERVICE_ROLE_KEY bypasses RLS for storage uploads.
// Get this from: Supabase Dashboard → Project Settings → API → service_role (secret)
// Leave empty to skip photo uploads and only register voter data.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Set to false when SERVICE_ROLE_KEY is configured to also upload photos
const SKIP_PHOTOS = !SERVICE_ROLE_KEY;

const PDF_DIR = path.resolve('src/data/21_KATSINA/10_SHINKAFI_A');
const BATCH_SIZE = 50;

// Match naming convention in polling_units table
const LGA = 'Katsina';
const WARD = 'Shinkafi A';

// ============ SUPABASE CLIENTS ============
// Anon client for voter_registry (RLS disabled for import)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Service client for storage (bypasses RLS) — only created if key is available
const supabaseAdmin = SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

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
      for (let j = i + 1; j < textItems.length && j < i + 5; j++) {
        const s = textItems[j].str.trim();
        if (s && s !== ' ') return s;
      }
    }
  }
  return null;
}

/**
 * Parse voter text items from a content page.
 * Layout: 2 columns, 8 voters per column, 16 per page.
 */
function parseVoters(textItems) {
  const voters = [];

  // Name items appear at font-size 8 (transform[0] === 8) at x ~ 147.84 (left col) or 442.83 (right col)
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

  // Sort: left column (x<300) first, then right column; within column, top to bottom (y descending)
  voters.sort((a, b) => {
    const colA = a.nameX < 300 ? 0 : 1;
    const colB = b.nameX < 300 ? 0 : 1;
    if (colA !== colB) return colA - colB;
    return b.nameY - a.nameY;
  });

  return voters;
}

/**
 * Get image entries from a page's operator list.
 * Skips first 2 images (header logos). Returns voter photos sorted by column, then y-desc.
 */
async function getPageImages(page, ops) {
  const imageEntries = [];
  let currentTransform = [1, 0, 0, 1, 0, 0];

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];

    if (fn === 12) {
      currentTransform = args;
    } else if (fn === 85 || fn === 86) {
      imageEntries.push({
        name: args[0],
        x: currentTransform[4],
        y: currentTransform[5],
        w: currentTransform[0],
        h: currentTransform[3]
      });
    }
  }

  const voterImages = imageEntries.slice(2); // skip 2 logos
  voterImages.sort((a, b) => {
    const colA = a.x < 200 ? 0 : 1;
    const colB = b.x < 200 ? 0 : 1;
    if (colA !== colB) return colA - colB;
    return b.y - a.y;
  });

  return voterImages;
}

/**
 * Resolve a page image object using PDF.js page.objs
 */
function resolveImage(page, imgName) {
  return new Promise((resolve) => {
    try {
      page.objs.get(imgName, (img) => resolve(img));
    } catch (e) {
      console.warn(`Could not resolve image ${imgName}:`, e.message);
      resolve(null);
    }
  });
}

/**
 * Convert ImageKind pixel data to JPEG Buffer using Jimp v1.x
 */
async function imageDataToJpegBuffer(imgData) {
  try {
    const jimpPkg = await import('jimp');
    // Jimp v1.x exports { Jimp } named export
    const JimpClass = jimpPkg.Jimp || jimpPkg.default?.Jimp || jimpPkg.default;
    const { width, height, kind, data } = imgData;

    let rgbaBuffer;

    if (kind === 1) {
      // GRAYSCALE_1BPP — each pixel is 1 bit packed in bytes
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
      // RGB_24BPP — expand to RGBA
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
      rgbaBuffer = Buffer.from(data);
    }

    // Jimp v1.x: constructor accepts { data, width, height } with raw RGBA buffer
    const image = new JimpClass({ data: rgbaBuffer, width, height });
    return await image.getBuffer('image/jpeg');
  } catch (err) {
    console.error('Error converting image to JPEG:', err.message);
    return null;
  }
}

/**
 * Upload photo buffer to Supabase voter-photos bucket.
 * Path format: {pu_code}/{vin}.jpeg
 */
async function uploadPhoto(vin, puCode, jpegBuffer) {
  try {
    const filePath = `${puCode}/${vin}.jpeg`;
    // Use admin client (service role) to bypass storage RLS
    const client = supabaseAdmin || supabase;
    const { error } = await client.storage
      .from('voter-photos')
      .upload(filePath, jpegBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = client.storage
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
  const allPhotoMappings = [];

  for (let pageNum = 2; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems = textContent.items;

    if (pageNum === 2) {
      delimCode = extractDelimCode(textItems);
      puName = extractPUName(textItems);
      if (!delimCode) {
        console.warn(`   ⚠️  Could not find DELIM code on page ${pageNum}`);
      } else {
        console.log(`   PU Code: ${delimCode}, PU Name: ${puName}`);
      }
    }

    const pageVoters = parseVoters(textItems);
    const ops = await page.getOperatorList();
    const pageImages = await getPageImages(page, ops);

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

  // Upload photos — only if SERVICE_ROLE_KEY is configured
  let photosUploaded = 0;

  if (SKIP_PHOTOS) {
    console.log(`   ⏭️  Skipping photos (set SUPABASE_SERVICE_ROLE_KEY env var to enable)`);
  } else {
    console.log(`   Uploading photos with service role...`);

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
      console.error(`❌ Batch upsert error (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, error.message);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
      process.stdout.write(`   Upserted ${Math.min(i + BATCH_SIZE, records.length)}/${records.length}\r`);
    }
  }

  return { successCount, errorCount };
}

// ============ MAIN ============
async function main() {
  console.log('🗳️  Shinkafi A Voter Data Extraction & Upload');
  console.log(`🎯 Target: ${SUPABASE_URL}`);
  console.log(`📁 Source: ${PDF_DIR}`);
  console.log(`🏙️  LGA: "${LGA}", Ward: "${WARD}"`);
  console.log('');

  // Verify connection
  const { count: preCount, error: countErr } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true })
    .eq('lga', LGA)
    .eq('ward', WARD);

  if (countErr) {
    console.error('❌ Supabase connection error:', countErr.message);
    process.exit(1);
  }
  console.log(`✅ Connected to Supabase. Existing ${WARD} voters: ${preCount}`);

  // Load pdfjs-dist
  console.log('\n📦 Loading pdfjs-dist...');
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
  console.log(`   Total photos uploaded:  ${totalPhotosUploaded}`);
  console.log(`   Errors:                 ${totalErrors}`);

  if (allVoters.length === 0) {
    console.error('\n❌ No voters extracted. Exiting.');
    process.exit(1);
  }

  // Print sample
  console.log('\n📋 Sample voters (first 5):');
  allVoters.slice(0, 5).forEach((v, i) => {
    console.log(`  [${i + 1}] ${v.name} (${v.vin}) | PU: ${v.puCode} | Photo: ${v.photoUrl ? '✅' : '❌'}`);
  });

  // Upsert all voters
  console.log(`\n💾 Upserting ${allVoters.length} voters to voter_registry...`);
  const { successCount, errorCount } = await upsertVoters(allVoters);
  console.log(''); // newline after progress
  totalVotersInserted = successCount;

  // Final count verification
  const { count: finalCount } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true })
    .eq('lga', LGA)
    .eq('ward', WARD);

  console.log(`\n✨ Upload Complete!`);
  console.log(`   ✅ Voters inserted/updated: ${successCount}`);
  console.log(`   ❌ Failed:                  ${errorCount}`);
  console.log(`   📸 Photos uploaded:         ${totalPhotosUploaded}`);
  console.log(`   🔍 Total ${WARD} voters in DB: ${finalCount}`);

  // Save VIN list for reference
  const vinList = allVoters.map(v => v.vin).join('\n');
  fs.writeFileSync('scripts/shinkafi_a_vins.txt', vinList);
  console.log(`\n📋 VIN list saved to scripts/shinkafi_a_vins.txt`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
