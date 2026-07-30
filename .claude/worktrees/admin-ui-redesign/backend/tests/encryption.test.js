process.env.ENCRYPTION_KEY = 'test_encryption_key_32_chars_long_123';

const { encrypt, decrypt } = require('../src/utils/encryption');

describe('Encryption Utility', () => {
  const originalText = 'Hello, this is a secure token!';

  test('should successfully encrypt plain text', () => {
    const encrypted = encrypt(originalText);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:ciphertext
  });

  test('should successfully decrypt encrypted text', () => {
    const encrypted = encrypt(originalText);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  test('should throw error when decrypting tampered text', () => {
    const encrypted = encrypt(originalText);
    const parts = encrypted.split(':');
    // Tamper with the ciphertext (3rd part)
    parts[2] = parts[2].substring(0, parts[2].length - 2) + '00';
    const tampered = parts.join(':');

    expect(() => {
      decrypt(tampered);
    }).toThrow();
  });
});
