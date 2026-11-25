const { Jimp } = require('jimp');
const path = require('path');

const INPUT  = path.join(__dirname, '../assets/avatars/pre-process/Gemini_Generated_Image_x1hv3qx1hv3qx1hv.png');
const OUTPUT = path.join(__dirname, '../assets/avatars/pre-process/no_magenta.png');

// Pass 1: edge flood fill — removes all magenta connected to the outer border.
// Higher tolerance + 8-directional catches thin anti-aliased fringe pixels.
const EDGE_TOLERANCE = 115;

// Pass 2: interior flood fill seeded from specific cells where Gemini used
// magenta as a design color (ETERNITY sunburst rays).
// Seeded from a known interior magenta point so it never touches sprite art.
const INTERIOR_TOLERANCE = 60;

// ETERNITY is cell [2,1] in a 3x3 grid on a 2048x2048 image.
// Each cell is 2048/3 ≈ 682.67px. We seed from several points inside the
// sunburst ray area (roughly the centre-top of that cell).
const CELL = Math.floor(2048 / 3); // ~682
const ETERNITY_SEEDS = [
  // [col * CELL + offsetX, row * CELL + offsetY]  — row=2, col=1
  { x: 1 * CELL + 80,  y: 2 * CELL + 40  },
  { x: 1 * CELL + 580, y: 2 * CELL + 40  },
  { x: 1 * CELL + 80,  y: 2 * CELL + 550 },
  { x: 1 * CELL + 580, y: 2 * CELL + 550 },
  { x: 1 * CELL + 340, y: 2 * CELL + 80  },
];

function isMagenta(r, g, b, tol) {
  return r > (255 - tol) && g < tol && b > (255 - tol);
}

async function main() {
  console.log('Reading image...');
  const image = await Jimp.read(INPUT);
  const { width, height } = image;
  console.log(`Dimensions: ${width} x ${height}`);

  const data = image.bitmap.data;
  const visited = new Uint8Array(width * height);

  function floodFill(seeds, tolerance, label) {
    const queue = [];
    let head = 0;

    function tryEnqueue(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const i = y * width + x;
      if (visited[i]) return;
      visited[i] = 1;
      const idx = i * 4;
      if (isMagenta(data[idx], data[idx + 1], data[idx + 2], tolerance)) {
        queue.push(i);
      }
    }

    for (const { x, y } of seeds) tryEnqueue(x, y);

    while (head < queue.length) {
      const i = queue[head++];
      const idx = i * 4;
      data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 0;

      const x = i % width;
      const y = (i - x) / width;
      // 8-directional
      tryEnqueue(x + 1, y);
      tryEnqueue(x - 1, y);
      tryEnqueue(x, y + 1);
      tryEnqueue(x, y - 1);
      tryEnqueue(x + 1, y + 1);
      tryEnqueue(x - 1, y + 1);
      tryEnqueue(x + 1, y - 1);
      tryEnqueue(x - 1, y - 1);
    }

    console.log(`  [${label}] removed ${queue.length.toLocaleString()} pixels.`);
  }

  // ── Pass 1: all 4 outer edges ──────────────────────────────────────────────
  console.log('Pass 1: edge flood fill...');
  const edgeSeeds = [];
  for (let x = 0; x < width; x++) {
    edgeSeeds.push({ x, y: 0 });
    edgeSeeds.push({ x, y: height - 1 });
  }
  for (let y = 1; y < height - 1; y++) {
    edgeSeeds.push({ x: 0, y });
    edgeSeeds.push({ x: width - 1, y });
  }
  floodFill(edgeSeeds, EDGE_TOLERANCE, 'edges');

  // ── Pass 2: regional scans for cells with interior magenta ───────────────
  // Flood fill can't reach magenta that's fully enclosed inside sprite content.
  // We scan the specific cell bounds directly — safe because each sprite's
  // palette doesn't overlap with the magenta signature for that cell.
  function scanCell(col, row, tolerance, label) {
    const x0 = Math.floor(col * CELL);
    const y0 = Math.floor(row * CELL);
    const x1 = Math.min(width,  Math.floor((col + 1) * CELL));
    const y1 = Math.min(height, Math.floor((row + 1) * CELL));
    let removed = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * width + x;
        if (visited[i]) continue;
        const idx = i * 4;
        if (isMagenta(data[idx], data[idx + 1], data[idx + 2], tolerance)) {
          data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 0;
          removed++;
        }
      }
    }
    console.log(`  [${label}] removed ${removed.toLocaleString()} pixels.`);
  }

  console.log('Pass 2: interior cell scans...');
  // ETERNITY [row=2, col=1] — sunburst rays used magenta as design color
  scanCell(1, 2, INTERIOR_TOLERANCE, 'ETERNITY interior');
  // OBLIVION [row=2, col=0] — accretion ring rendered with magenta tones
  scanCell(0, 2, INTERIOR_TOLERANCE, 'OBLIVION interior');

  await image.write(OUTPUT);
  console.log(`\nSaved → ${OUTPUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
