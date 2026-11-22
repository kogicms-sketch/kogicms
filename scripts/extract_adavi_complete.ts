import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== Starting Complete Adavi Registered Voters Extraction ===');
  const pdfModule = await import('pdfjs-dist');

  const adaviDir = path.resolve('22_KOGI/01_ADAVI');
  if (!fs.existsSync(adaviDir)) {
    throw new Error('Directory 22_KOGI/01_ADAVI not found!');
  }

  const outBaseDir = path.resolve('voters_data/01_ADAVI');
  const outWardsDir = path.join(outBaseDir, 'wards');
  fs.mkdirSync(outWardsDir, { recursive: true });

  const wardFolders = fs.readdirSync(adaviDir)
    .filter(f => fs.statSync(path.join(adaviDir, f)).isDirectory())
    .sort();

  console.log(`Found ${wardFolders.length} wards in 01_ADAVI.`);

  interface Voter {
    sn: number;
    name: string;
    vin: string;
    dob_year: number | null;
    gender: string;
    pu_code: string;
    pu_name: string;
    ward_name: string;
    lga: string;
  }

  interface PollingUnitGroup {
    pu_code: string;
    pu_name: string;
    pdf_file: string;
    total_records: number;
    voters_extracted: number;
    voters: Voter[];
  }

  interface WardGroup {
    lga: string;
    ward_folder: string;
    ward_code: string;
    ward_name: string;
    polling_units_count: number;
    total_voters: number;
    polling_units: PollingUnitGroup[];
  }

  // Gather all PDF tasks
  interface Task {
    wardFolder: string;
    wardNum: string;
    puFile: string;
    filePath: string;
    puNum: string;
  }

  const tasks: Task[] = [];
  for (const ward of wardFolders) {
    const wardPath = path.join(adaviDir, ward);
    const puFiles = fs.readdirSync(wardPath).filter(f => f.endsWith('.pdf')).sort();
    for (const pu of puFiles) {
      tasks.push({
        wardFolder: ward,
        wardNum: ward.slice(0, 2),
        puFile: pu,
        filePath: path.join(wardPath, pu),
        puNum: pu.slice(0, 3)
      });
    }
  }

  console.log(`Total Polling Units to extract in Adavi: ${tasks.length}`);

  // Regex for voters
  const voterRegex = /(\d+)\s+([A-Z\s,'.-]+?)\s+VIN:\s*([A-Z0-9]+)\s+DOB-Y:\s*(\d{4}|None|[^\s|]+)\s*\|\s*Gender:\s*([MF])/g;

  // Process tasks
  const results: Record<string, PollingUnitGroup> = {};

  let completed = 0;
  let taskIdx = 0;
  const CONCURRENCY = 16;
  const startTime = Date.now();

  async function worker() {
    while (taskIdx < tasks.length) {
      const idx = taskIdx++;
      const task = tasks[idx];
      const delimCode = `22-01-${task.wardNum}-${task.puNum}`;

      try {
        const fileBytes = new Uint8Array(fs.readFileSync(task.filePath));
        const doc = await pdfModule.getDocument({ data: fileBytes }).promise;

        // Page 1 header info
        const p1 = await doc.getPage(1);
        const t1 = (await p1.getTextContent()).items.map((i: any) => i.str).join(' ');

        let totalRecords = 0;
        const rm = t1.match(/Records\s+(\d+)/i);
        if (rm) totalRecords = parseInt(rm[1], 10);

        let parsedWardName = task.wardFolder.replace(/^\d+_\s*/, '').replace(/_/g, ' ');
        const wm = t1.match(/Ward\s+([A-Z0-9\s\/_-]+?)\s+PU/i);
        if (wm && wm[1].trim()) parsedWardName = wm[1].trim();

        let parsedPuName = task.puFile.replace(/^\d+_\s*/, '').replace(/\.pdf$/i, '').replace(/_/g, ' ');
        const pum = t1.match(/PU\s+([A-Z0-9\s\/_'.()-]+?)\s+Delim/i);
        if (pum && pum[1].trim()) parsedPuName = pum[1].trim();

        const voters: Voter[] = [];

        // Pages 2..N contain voters
        for (let pageNum = 2; pageNum <= doc.numPages; pageNum++) {
          const page = await doc.getPage(pageNum);
          const text = (await page.getTextContent()).items.map((i: any) => i.str).join(' ');

          let m: RegExpExecArray | null;
          voterRegex.lastIndex = 0;
          while ((m = voterRegex.exec(text)) !== null) {
            const rawDob = m[4].trim();
            const dobYear = /^\d{4}$/.test(rawDob) ? parseInt(rawDob, 10) : null;

            voters.push({
              sn: parseInt(m[1], 10),
              name: m[2].trim(),
              vin: m[3].trim(),
              dob_year: dobYear,
              gender: m[5],
              pu_code: delimCode,
              pu_name: parsedPuName,
              ward_name: parsedWardName,
              lga: 'Adavi'
            });
          }
        }

        results[task.filePath] = {
          pu_code: delimCode,
          pu_name: parsedPuName,
          pdf_file: task.puFile,
          total_records: totalRecords || voters.length,
          voters_extracted: voters.length,
          voters
        };
      } catch (err) {
        console.error(`Error extracting ${task.puFile}:`, err);
      }

      completed++;
      if (completed % 25 === 0 || completed === tasks.length) {
        console.log(`[Adavi Extraction] ${completed}/${tasks.length} Polling Units extracted (${((Date.now() - startTime) / 1000).toFixed(1)}s)...`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log('\nAll Adavi Polling Units extracted! Writing structured JSON files...');

  let totalAdaviVoters = 0;
  const wardSummaries: any[] = [];
  const allAdaviVotersFlat: Voter[] = [];

  for (const wardFolder of wardFolders) {
    const wardNum = wardFolder.slice(0, 2);
    const wardTasks = tasks.filter(t => t.wardFolder === wardFolder);
    const puGroups: PollingUnitGroup[] = wardTasks.map(t => results[t.filePath]).filter(Boolean);

    const wardVotersCount = puGroups.reduce((sum, g) => sum + g.voters_extracted, 0);
    totalAdaviVoters += wardVotersCount;

    const wardName = puGroups[0]?.voters[0]?.ward_name || wardFolder.replace(/^\d+_\s*/, '').replace(/_/g, ' ');

    const wardData: WardGroup = {
      lga: 'Adavi',
      ward_folder: wardFolder,
      ward_code: `W${wardNum}`,
      ward_name: wardName,
      polling_units_count: puGroups.length,
      total_voters: wardVotersCount,
      polling_units: puGroups
    };

    // Save individual Ward file
    const wardOutPath = path.join(outWardsDir, `${wardFolder}.json`);
    fs.writeFileSync(wardOutPath, JSON.stringify(wardData, null, 2), 'utf8');

    wardSummaries.push({
      ward_code: `W${wardNum}`,
      ward_folder: wardFolder,
      ward_name: wardName,
      polling_units_count: puGroups.length,
      total_voters: wardVotersCount,
      file_path: `voters_data/01_ADAVI/wards/${wardFolder}.json`
    });

    for (const g of puGroups) {
      allAdaviVotersFlat.push(...g.voters);
    }
  }

  // Save LGA Summary
  const summary = {
    lga: 'Adavi',
    lga_code: '01',
    state: 'Kogi',
    total_wards: wardFolders.length,
    total_polling_units: tasks.length,
    total_voters_extracted: totalAdaviVoters,
    wards: wardSummaries,
    extracted_at: new Date().toISOString()
  };

  fs.writeFileSync(path.join(outBaseDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  // Save Search Index (optimized for quick lookup by name or VIN)
  console.log(`Writing search index for ${allAdaviVotersFlat.length} voters...`);
  const searchIndex = allAdaviVotersFlat.map(v => ({
    vin: v.vin,
    name: v.name,
    g: v.gender,
    y: v.dob_year,
    pu: v.pu_code,
    pu_name: v.pu_name,
    w: v.ward_name,
    lga: v.lga
  }));

  fs.writeFileSync(path.join(outBaseDir, 'search_index.json'), JSON.stringify(searchIndex), 'utf8');

  console.log(`\n======================================================`);
  console.log(`SUCCESS! Adavi LGA Registered Voters Extracted:`);
  console.log(`- Total Polling Units: ${tasks.length}`);
  console.log(`- Total Voters: ${totalAdaviVoters.toLocaleString()}`);
  console.log(`- Ward Files written to: voters_data/01_ADAVI/wards/ (11 files)`);
  console.log(`- Summary written to: voters_data/01_ADAVI/summary.json`);
  console.log(`- Search Index written to: voters_data/01_ADAVI/search_index.json`);
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error('Fatal extraction error:', err);
  process.exit(1);
});
