const fs = require('fs');
const path = require('path');
const axios = require('axios');

require('dotenv').config();

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-5.5';

function getMimeType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return mimeTypes[ext] || 'image/png';
}

async function analyzeFoodCollage(imagePath) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in .env');
  }

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:${getMimeType(imagePath)};base64,${base64Image}`;
  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a nutrition expert. Analyze food images and estimate nutritional values. Respond only with valid JSON using English keys.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this collage of meal photos. Estimate the following and return JSON with these exact keys:
- "approximate_protein_grams": total approximate protein consumed across all meals in grams (number)
- "approximate_calories": total approximate calories received from these foods (number)
- "vegetable_types_count": number of different types of vegetables consumed (number)
- "vegetable_types": array of identified vegetable names in English (string[])

Return only valid JSON, no markdown.`,
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl, detail: 'high' },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(response.data);
  
  return JSON.parse(response.data.choices[0].message.content);
}

module.exports = analyzeFoodCollage;
