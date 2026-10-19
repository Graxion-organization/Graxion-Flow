const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const rawEncryptionKey =
  process.env.ENCRYPTION_KEY ||
  (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined
    ? 'test_only_32_byte_encryption_key'
    : null);
if (!rawEncryptionKey) {
  throw new Error('FATAL: ENCRYPTION_KEY environment variable is missing.');
}
const KEY = Buffer.from(rawEncryptionKey, 'utf8').slice(0, 32);

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

const decrypt = (encryptedText) => {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

module.exports = { encrypt, decrypt };
