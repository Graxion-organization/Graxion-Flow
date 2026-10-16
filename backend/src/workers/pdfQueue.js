const { Queue } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../utils/logger');


const { redis } = require('../config/redis');

const useRedis = process.env.USE_REDIS === 'true';

let connection, pdfQueue;

if (useRedis) {
  connection = redis;
  pdfQueue = new Queue('pdf-processing', { connection });
} else {
  pdfQueue = {
    add: async (name, data) => {
      logger.info(`[Mock Queue] Job ${name} added. Set USE_REDIS=true in .env to process.`);
    }
  };
}

module.exports = { pdfQueue, connection };
