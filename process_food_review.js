const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const getUserFoods = require('./get_user_foods');
const createImageCollage = require('./image_collage');
const analyzeFoodCollage = require('./ai_request');

const QUEUE_FILE = path.join(__dirname, 'queue.json');

let queueLock = Promise.resolve();

async function withQueueLock(fn) {
  const run = queueLock.then(() => fn());
  queueLock = run.then(
    () => {},
    () => {}
  );
  return run;
}

function readQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return [];
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

function writeQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

async function findRecord(userId, date) {
  return withQueueLock(() => {
    const queue = readQueue();
    return queue.find(
      (r) => String(r.user_id) === String(userId) && r.date === date
    );
  });
}

async function addPendingRecord(userId, date) {
  return withQueueLock(() => {
    const queue = readQueue();
    const record = {
      id: crypto.randomUUID(),
      user_id: userId,
      date,
      status: 'pending',
      created_at: new Date().toISOString(),
      result: null,
    };
    queue.push(record);
    writeQueue(queue);
    return record;
  });
}

async function updateRecord(id, updates) {
  return withQueueLock(() => {
    const queue = readQueue();
    const index = queue.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`Record not found: ${id}`);
    queue[index] = { ...queue[index], ...updates };
    writeQueue(queue);
    return queue[index];
  });
}

async function resetFailedRecord(id) {
  return updateRecord(id, {
    status: 'pending',
    created_at: new Date().toISOString(),
    completed_at: null,
    collage_path: null,
    result: null,
    error: null,
  });
}

async function runReviewPipeline(recordId, userId, date) {
  try {
    const foodImages = await getUserFoods(userId, date);

    if (!foodImages.length) {
      throw new Error('No food images found for this user and date');
    }

    const collagePath = await createImageCollage(foodImages);
    const analysis = await analyzeFoodCollage(collagePath);

    await updateRecord(recordId, {
      status: 'done',
      completed_at: new Date().toISOString(),
      collage_path: collagePath,
      result: analysis,
    });
  } catch (error) {
    await updateRecord(recordId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: error.message,
    });
  }
}

async function processFoodReview(userId, date) {
  const existing = await findRecord(userId, date);

  if (existing) {
    if (existing.status === 'failed') {
      const record = await resetFailedRecord(existing.id);
      runReviewPipeline(record.id, userId, date);
      return record;
    }

    return existing;
  }

  const record = await addPendingRecord(userId, date);
  runReviewPipeline(record.id, userId, date);
  return record;
}

module.exports = processFoodReview;
