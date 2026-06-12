const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Jimp } = require('jimp');

const OUTPUT_DIR = path.join(__dirname, 'output');
const COLS = 2;
const MAX_IMAGES = 6;
const PADDING = 10;
const JPEG_QUALITY = 85;

function getCellDimensions(imageCount) {
  const rows = Math.ceil(imageCount / COLS);

  if (rows === 1) return { width: 400, height: 400 };
  if (rows === 2) return { width: 340, height: 340 };
  return { width: 300, height: 300 };
}

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

  const images = imageUrls.slice(0, MAX_IMAGES);
  const { width: cellWidth, height: cellHeight } = getCellDimensions(images.length);
  const rows = Math.ceil(images.length / COLS);
  const canvasWidth = COLS * cellWidth + (COLS + 1) * PADDING;
  const canvasHeight = rows * cellHeight + (rows + 1) * PADDING;

  const canvas = new Jimp({
    width: canvasWidth,
    height: canvasHeight,
    color: 0xffffffff,
  });

  for (let i = 0; i < images.length; i++) {
    const imageBuffer = await downloadImage(images[i]);
    const image = fitInside(await Jimp.read(imageBuffer), cellWidth, cellHeight);

    const col = i % COLS;
    const row = Math.floor(i / COLS);

    const x =
      PADDING +
      col * (cellWidth + PADDING) +
      Math.floor((cellWidth - image.bitmap.width) / 2);
    const y =
      PADDING +
      row * (cellHeight + PADDING) +
      Math.floor((cellHeight - image.bitmap.height) / 2);

    canvas.composite(image, x, y);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputPath = path.join(OUTPUT_DIR, `collage-${Date.now()}.jpg`);
  await canvas.write(outputPath, { quality: JPEG_QUALITY });

  return outputPath;
}

module.exports = createImageCollage;
