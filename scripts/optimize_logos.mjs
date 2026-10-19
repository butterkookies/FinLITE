import sharp from 'sharp';
import fs from 'fs';

async function optimizeLogos() {
  // LITE logo: reduce resolution by 20-25% (161x160 -> 124x124) with quality 78%
  await sharp('public/assets/lite-logo.png')
    .resize(124, 124, { fit: 'inside' })
    .png({ quality: 78, compressionLevel: 9 })
    .toFile('public/assets/lite-logo-opt.png');

  // PDM logo: reduce resolution by 20-25% (193x190 -> 148x146) with quality 78%
  await sharp('public/assets/pdm-logo.jpg')
    .resize(148, 146, { fit: 'inside' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile('public/assets/pdm-logo-opt.jpg');

  const oldLite = fs.statSync('public/assets/lite-logo.png').size;
  const newLite = fs.statSync('public/assets/lite-logo-opt.png').size;
  const oldPdm = fs.statSync('public/assets/pdm-logo.jpg').size;
  const newPdm = fs.statSync('public/assets/pdm-logo-opt.jpg').size;

  console.log('LITE logo size: ' + oldLite + ' -> ' + newLite + ' bytes (' + Math.round((1 - newLite / oldLite) * 100) + '% reduction)');
  console.log('PDM logo size: ' + oldPdm + ' -> ' + newPdm + ' bytes (' + Math.round((1 - newPdm / oldPdm) * 100) + '% reduction)');
}

optimizeLogos().catch(console.error);
