const { Queue } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../utils/logger');


const useRedis = process.env.USE_REDIS === 'true';

let connection, pdfQueue;

if (useRedis) {
  connection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  });
  pdfQueue = new Queue('pdf-processing', { connection });
} else {
  pdfQueue = {
    add: async (name, data) => {
      logger.info(`[Mock Queue] Job ${name} added. Set USE_REDIS=true in .env to process.`);
    }
  };
}

module.exports = { pdfQueue, connection };
