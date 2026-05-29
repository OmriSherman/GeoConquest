const sharp = require('sharp');
const path = require('path');

const SIZE = 1024;
const SCALE = 0.72;
const INNER = Math.round(SIZE * SCALE);
const OFFSET = Math.round((SIZE - INNER) / 2);
const BG = { r: 10, g: 10, b: 26, alpha: 1 };

const src = path.join(__dirname, '../assets/icon.png');
const dst = path.join(__dirname, '../assets/adaptive-icon.png');

sharp(src)
  .resize(INNER, INNER)
  .toBuffer()
  .then(resized =>
    sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: BG } })
      .composite([{ input: resized, top: OFFSET, left: OFFSET }])
      .png()
      .toFile(dst)
  )
  .then(() => console.log(`Done — saved ${dst}`))
  .catch(err => { console.error(err); process.exit(1); });
