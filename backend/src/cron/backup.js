const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const cron = require('node-cron');
const logger = require('../utils/logger');
const execAsync = util.promisify(exec);

// Configure S3
const s3Client = process.env.AWS_REGION ? new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
}) : null;

/**
 * Perform MongoDB Backup and upload to S3
 */
const runBackup = async () => {
  if (!s3Client || !process.env.BACKUP_S3_BUCKET || !process.env.MONGODB_URI) {
    logger.warn('[BACKUP] S3 or MongoDB URI not configured, skipping backup');
    return;
  }

  const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupFilename = `backup-${dateStr}.archive`;
  const backupPath = path.join(__dirname, '..', '..', 'tmp', backupFilename);

  // Ensure tmp directory exists
  if (!fs.existsSync(path.dirname(backupPath))) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  }

  try {
    logger.info(`[BACKUP] Starting MongoDB dump to ${backupPath}...`);
    
    // Run mongodump
    await execAsync(`mongodump --uri="${process.env.MONGODB_URI}" --archive="${backupPath}" --gzip`);
    logger.info('[BACKUP] Dump completed. Uploading to S3...');

    // Upload to S3
    const fileStream = fs.createReadStream(backupPath);
    const uploadParams = {
      Bucket: process.env.BACKUP_S3_BUCKET,
      Key: `database-backups/${backupFilename}.gz`,
      Body: fileStream,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    logger.info(`[BACKUP] Uploaded successfully to S3: database-backups/${backupFilename}.gz`);

  } catch (err) {
    logger.error('[BACKUP] Backup failed:', err);
  } finally {
    // Cleanup local file
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
  }
};

/**
 * Initialize Backup Cron Job
 */
exports.initBackupCron = () => {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    logger.info('[CRON] Executing scheduled database backup');
    runBackup();
  });
  logger.info('[CRON] Database Backup scheduler initialized (0 2 * * *)');
};
