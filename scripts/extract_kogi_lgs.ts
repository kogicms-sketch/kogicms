import fs from 'fs';
import path from 'path';

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

interface Task {
  lgaFolder: string;
  lgaNum: string;
  lgaCleanName: string;
  wardFolder: string;
  wardNum: string;
  puFile: string;
  filePath: string;
  puNum: string;
}

const origWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && (args[0].includes('standardFontDataUrl') || args[0].includes('legacy'))) return;
  origWarn(...args);
};

const voterRegex = /(\d+)\s+([A-Z\s,'.-]+?)\s+VIN:\s*([A-Z0-9]+)\s+DOB-Y:\s*(\d{4}|None|[^\s|]+)\s*\|\s*Gender:\s*([MF])/g;

async function extractLga(lgaFolder: string, pdfModule: any) {
  const lgaPath = path.resolve('22_KOGI', lgaFolder);
  if (!fs.existsSync(lgaPath)) {
    console.error(`Folder ${lgaPath} does not exist! Skipping.`);
    return;
  }

  const outBasePublic = path.resolve('public/voters_data', lgaFolder);
  const outSummaryPublic = path.join(outBasePublic, 'summary.json');
  if (fs.existsSync(outSummaryPublic)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outSummaryPublic, 'utf8'));
      if (existing.total_voters_extracted > 0) {
        console.log(`[ALREADY DONE] ${lgaFolder}: ${existing.total_voters_extracted.toLocaleString()} voters across ${existing.total_polling_units} PUs. Skipping.`);
        return {
          lgaFolder,
          lgaCleanName: existing.lga,
          totalLgaVoters: existing.total_voters_extracted,
          totalPus: existing.total_polling_units
        };
      }
    } catch {}
  }

  const lgaNum = lgaFolder.slice(0, 2);
  const lgaCleanName = lgaFolder.replace(/^\d+_\s*/, '').replace(/_/g, ' ');

  const outWardsPublic = path.join(outBasePublic, 'wards');
  fs.mkdirSync(outWardsPublic, { recursive: true });

  const outBaseMirror = path.resolve('voters_data', lgaFolder);
  const outWardsMirror = path.join(outBaseMirror, 'wards');
  fs.mkdirSync(outWardsMirror, { recursive: true });

  const wardFolders = fs.readdirSync(lgaPath)
    .filter(f => fs.statSync(path.join(lgaPath, f)).isDirectory())
    .sort();

  const tasks: Task[] = [];
  for (const ward of wardFolders) {
    const wardPath = path.join(lgaPath, ward);
    const puFiles = fs.readdirSync(wardPath).filter(f => f.endsWith('.pdf')).sort();
    for (const pu of puFiles) {
      tasks.push({
        lgaFolder,
        lgaNum,
        lgaCleanName,
        wardFolder: ward,
        wardNum: ward.slice(0, 2),
        puFile: pu,
        filePath: path.join(wardPath, pu),
        puNum: pu.slice(0, 3)
      });
    }
  }

  console.log(`\n======================================================`);
  console.log(`>>> Starting Extraction for ${lgaFolder} (${lgaCleanName})`);
  console.log(`- Wards: ${wardFolders.length} | Polling Units: ${tasks.length}`);
  console.log(`======================================================`);

  const results: Record<string, PollingUnitGroup> = {};
  let completed = 0;
  let taskIdx = 0;
  const CONCURRENCY = 20;
  const startTime = Date.now();

  async function worker() {
    while (taskIdx < tasks.length) {
      const idx = taskIdx++;
      const task = tasks[idx];
      const delimCode = `22-${task.lgaNum}-${task.wardNum}-${task.puNum}`;

      try {
        const fileBytes = new Uint8Array(fs.readFileSync(task.filePath));
        const doc = await pdfModule.getDocument({ data: fileBytes }).promise;

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
              lga: task.lgaCleanName
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
        console.error(`Error in ${task.filePath}:`, err);
      }

      completed++;
      if (completed % 25 === 0 || completed === tasks.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[${lgaFolder}] ${completed}/${tasks.length} PUs done (${elapsed}s)...`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Aggregate results per Ward
  let totalLgaVoters = 0;
  const wardSummaries: any[] = [];
  const allVotersFlat: Voter[] = [];

  for (const wardFolder of wardFolders) {
    const wardNum = wardFolder.slice(0, 2);
    const wardTasks = tasks.filter(t => t.wardFolder === wardFolder);
    const puGroups: PollingUnitGroup[] = wardTasks.map(t => results[t.filePath]).filter(Boolean);

    const wardVotersCount = puGroups.reduce((sum, g) => sum + g.voters_extracted, 0);
    totalLgaVoters += wardVotersCount;

    const wardName = puGroups[0]?.voters[0]?.ward_name || wardFolder.replace(/^\d+_\s*/, '').replace(/_/g, ' ');

    const wardData: WardGroup = {
      lga: lgaCleanName,
      ward_folder: wardFolder,
      ward_code: `W${wardNum}`,
      ward_name: wardName,
      polling_units_count: puGroups.length,
      total_voters: wardVotersCount,
      polling_units: puGroups
    };

    // Save Ward JSON in both public and mirror
    const wardJson = JSON.stringify(wardData, null, 2);
    fs.writeFileSync(path.join(outWardsPublic, `${wardFolder}.json`), wardJson, 'utf8');
    fs.writeFileSync(path.join(outWardsMirror, `${wardFolder}.json`), wardJson, 'utf8');

    wardSummaries.push({
      ward_code: `W${wardNum}`,
      ward_folder: wardFolder,
      ward_name: wardName,
      polling_units_count: puGroups.length,
      total_voters: wardVotersCount,
      file_path: `voters_data/${lgaFolder}/wards/${wardFolder}.json`
    });

    for (const g of puGroups) {
      allVotersFlat.push(...g.voters);
    }
  }

  // Save LGA Summary
  const summary = {
    lga: lgaCleanName,
    lga_code: lgaNum,
    state: 'Kogi',
    total_wards: wardFolders.length,
    total_polling_units: tasks.length,
    total_voters_extracted: totalLgaVoters,
    wards: wardSummaries,
    extracted_at: new Date().toISOString()
  };

  const summaryJson = JSON.stringify(summary, null, 2);
  fs.writeFileSync(path.join(outBasePublic, 'summary.json'), summaryJson, 'utf8');
  fs.writeFileSync(path.join(outBaseMirror, 'summary.json'), summaryJson, 'utf8');

  // Save Search Index
  const searchIndex = allVotersFlat.map(v => ({
    vin: v.vin,
    name: v.name,
    g: v.gender,
    y: v.dob_year,
    pu: v.pu_code,
    pu_name: v.pu_name,
    w: v.ward_name,
    lga: v.lga
  }));

  const indexJson = JSON.stringify(searchIndex);
  fs.writeFileSync(path.join(outBasePublic, 'search_index.json'), indexJson, 'utf8');
  fs.writeFileSync(path.join(outBaseMirror, 'search_index.json'), indexJson, 'utf8');

  console.log(`[DONE ${lgaFolder}] Extracted ${totalLgaVoters.toLocaleString()} voters across ${tasks.length} PUs into public/voters_data/${lgaFolder}/\n`);
  return { lgaFolder, lgaCleanName, totalLgaVoters, totalPus: tasks.length };
}

async function main() {
  const pdfModule = await import('pdfjs-dist');
  const targetLgas = process.argv.slice(2);

  const kogiDir = path.resolve('22_KOGI');
  let lgaFolders = fs.readdirSync(kogiDir)
    .filter(f => fs.statSync(path.join(kogiDir, f)).isDirectory())
    .sort();

  if (targetLgas.length > 0) {
    lgaFolders = lgaFolders.filter(f => {
      const normF = f.toLowerCase().replace(/[^a-z0-9]/g, '');
      return targetLgas.some(t => {
        const normT = t.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normF.includes(normT) || normT.includes(normF);
      });
    });
  }

  console.log(`LGAs queued for extraction (${lgaFolders.length}):`, lgaFolders);

  const overallStats: any[] = [];
  for (const folder of lgaFolders) {
    const stat = await extractLga(folder, pdfModule);
    if (stat) overallStats.push(stat);
  }

  console.log(`\n======================================================`);
  console.log(`BATCH EXTRACTION COMPLETE!`);
  console.log(overallStats);
  console.log(`======================================================`);
}

main().catch(err => {
  console.error('Extraction error:', err);
  process.exit(1);
});
