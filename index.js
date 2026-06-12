const fs = require('fs');
const path = require('path');
const https = require('https');
// const http = require('http');
const express = require('express');
const processFoodReview = require('./process_food_review');

require('dotenv').config();

const PORT = process.env.PORT;
const CERT_DIR = path.join(__dirname, 'certs');

const app = express();
app.use(express.json());


app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/review', async (req, res) => {
  const { user_id, date } = req.body;

  if (!user_id || !date) {
    return res.status(400).json({ error: 'user_id and date are required' });
  }

  const record = await processFoodReview(user_id, date);
  res.status(202).json(record);
});

const options = {
    key: fs.readFileSync("/etc/letsencrypt/live/nutrostyle.nutrosal.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/nutrostyle.nutrosal.com/fullchain.pem")
};

https.createServer(options, app).listen(PORT, () => {
    console.log(`server run on port 3444`)
});

// http.createServer(app).listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });