const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// List of image paths to compress
const images = [
  path.join(__dirname, '../backend/public/assets/logo.png'),
  path.join(__dirname, '../frontend/public/assets/logo.png')
];
// Output formats and quality settings
const formats = [
  { ext: 'webp', options: { quality: 80 } },
];

(async () => {
  for (const imgPath of images) {
    if (!fs.existsSync(imgPath)) {
      console.warn(`Image not found: ${imgPath}`);
      continue;
    }
    const dir = path.dirname(imgPath);
    const name = path.basename(imgPath, path.extname(imgPath));

    for (const fmt of formats) {
      const outPath = path.join(dir, `${name}.${fmt.ext}`);
      try {
        await sharp(imgPath)
          .resize({ width: 1024 }) // max width
          .toFormat(fmt.ext, fmt.options)
          .toFile(outPath);
        console.log(`Generated ${outPath}`);
      } catch (err) {
        console.error(`Error processing ${imgPath} to ${fmt.ext}:`, err);
      }
    }
  }
})();