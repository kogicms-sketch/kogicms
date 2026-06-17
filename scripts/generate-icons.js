
import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_IMAGE = path.join(__dirname, '../public/logo.png');
const PUBLIC_DIR = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    if (!fs.existsSync(SOURCE_IMAGE)) {
      console.error('Error: Source image not found at', SOURCE_IMAGE);
      console.error('Please save the high-resolution logo to public/source-logo.png first.');
      process.exit(1);
    }

    console.log('Reading source image from:', SOURCE_IMAGE);
    const imageBuffer = await fs.promises.readFile(SOURCE_IMAGE);
    const image = await Jimp.read(imageBuffer);

    // Generate logo.png (original/resized if needed, let's keep it max 512x512 for safety or just copy if it's good)
    // Actually standard logo.png is often used as favicon fallback or small icon.
    // Let's generate a 512x512 one as standard base.
    console.log('Generating public/logo.png...');
    await image.resize({ w: 512, h: 512 }).write(path.join(PUBLIC_DIR, 'logo.png'));

    // Generate PWA icons
    console.log('Generating public/pwa-192x192.png...');
    await image.resize({ w: 192, h: 192 }).write(path.join(PUBLIC_DIR, 'pwa-192x192.png'));

    console.log('Generating public/pwa-512x512.png...');
    await image.resize({ w: 512, h: 512 }).write(path.join(PUBLIC_DIR, 'pwa-512x512.png'));

    // Generate favicon.ico (using 64x64 png as source for now, simpler)
    // Jimp doesn't directly support .ico, but we can save as png and rename or use a library.
    // For simplicity, we'll save as 64x64 PNG and let the browser handle it (modern browsers support png favicons)
    // OR we can try to save as .ico if jimp supports it (it might not).
    // Let's save as favicon.ico but it will be a PNG with ico extension, which works in many modern browsers,
    // but for true ico support we might need another lib.
    // actually, let's just resize to 32x32 and save as favicon.ico. width/height 64 is better for high DPI.
    console.log('Generating public/favicon.ico...');
    const icoBuffer = await image.resize({ w: 64, h: 64 }).getBuffer('image/png');
    await fs.promises.writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);

    console.log('Icons generated successfully!');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
