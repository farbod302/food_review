const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Jimp } = require('jimp');

const OUTPUT_DIR = path.join(__dirname, 'output');
const COLS = 2;
const CELL_WIDTH = 400;
const CELL_HEIGHT = 400;
const PADDING = 10;

async function downloadImage(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

function fitInside(image, maxWidth, maxHeight) {
  const { width, height } = image.bitmap;

  if (width <= maxWidth && height <= maxHeight) {
    return image;
  }

  return image.scaleToFit({ w: maxWidth, h: maxHeight });
}

async function createImageCollage(imageUrls) {
  if (!imageUrls?.length) {
    throw new Error('آرایه عکس‌ها خالی است');
  }

  const rows = Math.ceil(imageUrls.length / COLS);
  const canvasWidth = COLS * CELL_WIDTH + (COLS + 1) * PADDING;
  const canvasHeight = rows * CELL_HEIGHT + (rows + 1) * PADDING;

  const canvas = new Jimp({
    width: canvasWidth,
    height: canvasHeight,
    color: 0xffffffff,
  });

  for (let i = 0; i < imageUrls.length; i++) {
    const imageBuffer = await downloadImage(imageUrls[i]);
    const image = fitInside(await Jimp.read(imageBuffer), CELL_WIDTH, CELL_HEIGHT);

    const col = i % COLS;
    const row = Math.floor(i / COLS);

    const x =
      PADDING +
      col * (CELL_WIDTH + PADDING) +
      Math.floor((CELL_WIDTH - image.bitmap.width) / 2);
    const y =
      PADDING +
      row * (CELL_HEIGHT + PADDING) +
      Math.floor((CELL_HEIGHT - image.bitmap.height) / 2);

    canvas.composite(image, x, y);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputPath = path.join(OUTPUT_DIR, `collage-${Date.now()}.png`);
  await canvas.write(outputPath);

  return outputPath;
}

module.exports = createImageCollage;
