const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');
const source = path.join(assetsDir, 'adaptive-icon.png');
const iosIcon = path.join(assetsDir, 'app-icon.png');
const androidForeground = path.join(assetsDir, 'app-adaptive-foreground.png');

const appBackground = { r: 10, g: 10, b: 26, alpha: 1 };
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  await fs.access(source);

  const trimmedSource = await sharp(source)
    .trim({ background: appBackground, threshold: 8 })
    .png()
    .toBuffer();

  await sharp(trimmedSource)
    .resize(1024, 1024, { fit: 'cover', position: 'center' })
    .flatten({ background: appBackground })
    .png()
    .toFile(iosIcon);

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: transparent,
    },
  })
    .composite([
      {
        input: await sharp(trimmedSource)
          .resize(820, 820, { fit: 'contain', position: 'center' })
          .png()
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(androidForeground);

  console.log(`Generated ${path.relative(root, iosIcon)}`);
  console.log(`Generated ${path.relative(root, androidForeground)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
