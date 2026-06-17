const fs = require('fs');
const path = require('path');

async function main() {
  // Use legacy build of pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const pdfPath = path.resolve('src/data/21_KATSINA/10_SHINKAFI_A/014_K_GIDAN_AUDU_DANDA_SHINKAFI.pdf');
  console.log('Reading PDF:', pdfPath);
  
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  console.log(`PDF loaded. Total pages: ${pdf.numPages}`);
  
  // Let's inspect page 2
  const page = await pdf.getPage(2);
  console.log('Page view box:', page.view);
  
  console.log('--- Text content ---');
  const textContent = await page.getTextContent();
  let textOutput = '';
  for (const item of textContent.items) {
    if (item.str !== undefined) {
      textOutput += `Text: "${item.str}" at transform: [${item.transform.join(', ')}]\n`;
    }
  }
  fs.writeFileSync('scripts/inspect_page2_text.txt', textOutput);
  console.log('Saved text content to scripts/inspect_page2_text.txt');

  console.log('--- Operators ---');
  const ops = await page.getOperatorList();
  let opOutput = '';
  
  // We want to find the transforms for the images as well!
  // To get the transforms of images, we need to trace the operator list.
  // In PDF.js, when an image is painted, it is preceded by a transform matrix operator (transform: 12)
  // Let's trace the current transform matrix (ctm)
  let currentTransform = [1, 0, 0, 1, 0, 0];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    
    if (fn === pdfjsLib.OPS.transform) {
      currentTransform = args;
    } else if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
      opOutput += `Image: name=${args[0]} at index=${i}, CTM=[${currentTransform.join(', ')}]\n`;
    }
  }
  fs.writeFileSync('scripts/inspect_page2_ops.txt', opOutput);
  console.log('Saved operator content to scripts/inspect_page2_ops.txt');
}

main().catch(err => {
  console.error('Error:', err);
});
