const crypto = require('crypto');

const PREFIX = 'enc:v1:';
let warnedPlaintext = false;

function getEncryptionKey() {
  const raw = process.env.STRAVA_TOKEN_ENCRYPTION_KEY;

  if (raw) {
    const key = raw.length === 64
      ? Buffer.from(raw, 'hex')
      : crypto.createHash('sha256').update(raw).digest();

    return key.length === 32 ? key : key.subarray(0, 32);
  }

  if (process.env.STRAVA_CLIENT_SECRET) {
    return crypto.scryptSync(process.env.STRAVA_CLIENT_SECRET, 'runadvisor-strava-tokens', 32);
  }

  return null;
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') {
    return plaintext;
  }

  const key = getEncryptionKey();

  if (!key) {
    if (process.env.NODE_ENV === 'production' && !warnedPlaintext) {
      warnedPlaintext = true;
      console.warn('STRAVA_TOKEN_ENCRYPTION_KEY is not set; Strava tokens are stored without encryption.');
    }

    return plaintext;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decrypt(value) {
  if (value == null || value === '') {
    return value;
  }

  if (!isEncrypted(value)) {
    return value;
  }

  const key = getEncryptionKey();

  if (!key) {
    throw new Error('Cannot decrypt Strava tokens without STRAVA_TOKEN_ENCRYPTION_KEY or STRAVA_CLIENT_SECRET.');
  }

  const payload = value.slice(PREFIX.length);
  const [ivPart, tagPart, dataPart] = payload.split(':');

  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Invalid encrypted Strava token payload.');
  }

  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const data = Buffer.from(dataPart, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  getEncryptionKey
};
