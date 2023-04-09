import * as crypto from 'crypto';

function encrypt(plaintext, password) {
  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);

  // Derive a key from the password using PBKDF2
  const key = crypto.pbkdf2Sync(password, iv, 100000, 32, 'sha256');

  // Create a cipher object and encrypt the plaintext
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  // Return the encrypted data along with the initialization vector
  return { ciphertext, iv: iv.toString('hex') };
}

function decrypt(ciphertext, iv, password) {
  // Convert the initialization vector from a string to a buffer
  iv = Buffer.from(iv, 'hex');

  // Derive a key from the password using PBKDF2
  const key = crypto.pbkdf2Sync(password, iv, 100000, 32, 'sha256');

  // Create a decipher object and decrypt the ciphertext
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  // Return the decrypted plaintext
  return plaintext;
}