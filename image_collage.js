const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

const OUTPUT_DIR = path.join(__dirname, 'output');
const COLS = 2;
const CELL_WIDTH = 400;
const CELL_HEIGHT = 400;
const PADDING = 10;

async function downloadImage(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

async function createImageCollage(imageUrls) {
  if (!imageUrls?.length) {
    throw new Error('آرایه عکس‌ها خالی است');
  }

  const rows = Math.ceil(imageUrls.length / COLS);
  const canvasWidth = COLS * CELL_WIDTH + (COLS + 1) * PADDING;
  const canvasHeight = rows * CELL_HEIGHT + (rows + 1) * PADDING;

  const composites = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const imageBuffer = await downloadImage(imageUrls[i]);

    const resized = await sharp(imageBuffer)
      .resize(CELL_WIDTH, CELL_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    const { width, height } = await sharp(resized).metadata();

    const col = i % COLS;
    const row = Math.floor(i / COLS);

    const x = PADDING + col * (CELL_WIDTH + PADDING) + Math.floor((CELL_WIDTH - width) / 2);
    const y = PADDING + row * (CELL_HEIGHT + PADDING) + Math.floor((CELL_HEIGHT - height) / 2);

    composites.push({ input: resized, left: x, top: y });
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputPath = path.join(OUTPUT_DIR, `collage-${Date.now()}.png`);

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);

  return outputPath;
}

module.exports = createImageCollage;
