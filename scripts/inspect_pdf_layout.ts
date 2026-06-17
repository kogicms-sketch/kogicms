import { readFileSync } from 'fs';
import path from 'path';

async function main() {
  // Use legacy build of pdfjs-dist
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  
  const pdfPath = path.resolve('src/data/21_KATSINA/10_SHINKAFI_A/014_K_GIDAN_AUDU_DANDA_SHINKAFI.pdf');
  console.log('Reading PDF:', pdfPath);
  
  const data = new Uint8Array(readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  console.log(`PDF loaded. Total pages: ${pdf.numPages}`);
  
  // Let's inspect page 1
  const page = await pdf.getPage(1);
  console.log('Page view box:', page.view);
  
  console.log('--- Text content ---');
  const textContent = await page.getTextContent();
  for (const item of textContent.items) {
    if ('str' in item) {
      console.log(`Text: "${item.str}" at transform: [${item.transform.join(', ')}]`);
    }
  }
  
  console.log('--- Operators ---');
  const ops = await page.getOperatorList();
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
      console.log(`Image painted: name=${args[0]} at index=${i}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err);
});
