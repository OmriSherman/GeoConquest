const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const INPUT  = path.join(__dirname, '../assets/avatars/pre-process/no_magenta.png');
const OUT_DIR = path.join(__dirname, '../assets/gauntlet');

fs.mkdirSync(OUT_DIR, { recursive: true });

// Grid: 3 cols × 3 rows on a 2048×2048 canvas
const COLS = 3, ROWS = 3;

const SPRITES = [
  { col: 0, row: 0, name: 'gauntlet_danger'   },
  { col: 1, row: 0, name: 'gauntlet_peril'    },
  { col: 2, row: 0, name: 'gauntlet_abyss'    },
  { col: 0, row: 1, name: 'gauntlet_void'     },
  { col: 1, row: 1, name: 'gauntlet_hell'     },
  { col: 2, row: 1, name: 'gauntlet_inferno'  },
  { col: 0, row: 2, name: 'gauntlet_oblivion' },
  { col: 1, row: 2, name: 'gauntlet_eternity' },
  // [col:2, row:2] is the EMPTY cell — skipped
];

async function main() {
  console.log('Reading source image...');
  const src = await Jimp.read(INPUT);
  const { width, height } = src;
  console.log(`Dimensions: ${width} x ${height}`);

  const cellW = Math.round(width  / COLS);
  const cellH = Math.round(height / ROWS);
  console.log(`Cell size: ${cellW} x ${cellH}\n`);

  for (const { col, row, name } of SPRITES) {
    const x0 = Math.round(col * width  / COLS);
    const y0 = Math.round(row * height / ROWS);
    const x1 = Math.round((col + 1) * width  / COLS);
    const y1 = Math.round((row + 1) * height / ROWS);
    const w  = x1 - x0;
    const h  = y1 - y0;

    // Create a blank transparent tile, then composite the source onto it
    // with a negative offset so (x0,y0) of the source lands at (0,0).
    const tile = new Jimp({ width: w, height: h, color: 0x00000000 });
    tile.composite(src, -x0, -y0);

    const outPath = path.join(OUT_DIR, `${name}.png`);
    await tile.write(outPath);
    console.log(`  ✓ ${name}.png  (${w}×${h} from [${x0},${y0}])`);
  }

  console.log('\nAll sprites saved to assets/gauntlet/');
}

main().catch(err => { console.error(err); process.exit(1); });
