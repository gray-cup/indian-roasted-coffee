import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, basename } from 'path';

const INPUT_DIR = new URL('../webp', import.meta.url).pathname;
const OUTPUT_DIR = new URL('../public/images', import.meta.url).pathname;

const files = (await readdir(INPUT_DIR)).filter(f => f.endsWith('.webp'));

if (files.length === 0) {
  console.log('No .webp files found in webp/');
  process.exit(0);
}

await import('fs').then(fs => fs.promises.mkdir(OUTPUT_DIR, { recursive: true }));

for (const file of files) {
  const input = join(INPUT_DIR, file);
  const output = join(OUTPUT_DIR, basename(file));

  const meta = await sharp(input).metadata();
  const width = Math.round(meta.width / 2);
  const height = Math.round(meta.height / 2);

  await sharp(input)
    .resize(width, height)
    .webp({ quality: 80 })
    .toFile(output);

  const { size: inSize } = await import('fs').then(fs => fs.promises.stat(input));
  const { size: outSize } = await import('fs').then(fs => fs.promises.stat(output));
  const saved = (((inSize - outSize) / inSize) * 100).toFixed(1);

  console.log(`${file}: ${(inSize / 1024).toFixed(0)}KB → ${(outSize / 1024).toFixed(0)}KB (${saved}% smaller, ${meta.width}×${meta.height} → ${width}×${height})`);
}

console.log(`\nDone. ${files.length} image(s) written to public/images/`);
