const crypto = require('crypto');

const DEFAULT_TOLERANCE_SECONDS = 300;

function getSigningSecret() {
  return process.env.STRAVA_WEBHOOK_SIGNING_SECRET
    || process.env.STRAVA_CLIENT_SECRET
    || '';
}

function isSignatureVerificationRequired() {
  if (process.env.STRAVA_WEBHOOK_SKIP_SIGNATURE === '1') {
    return false;
  }

  if (process.env.NODE_ENV !== 'production') {
    return Boolean(getSigningSecret());
  }

  return true;
}

function parseSignatureHeader(header) {
  if (!header || typeof header !== 'string') {
    return null;
  }

  const parts = {};

  for (const segment of header.split(',')) {
    const [key, value] = segment.split('=', 2);

    if (key && value != null) {
      parts[key.trim()] = value.trim();
    }
  }

  if (!parts.t || !parts.v1) {
    return null;
  }

  return { timestamp: parts.t, signature: parts.v1 };
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

function verifyStravaWebhookSignature({
  signatureHeader,
  rawBody,
  secret = getSigningSecret(),
  toleranceSeconds = Number(process.env.STRAVA_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS) || DEFAULT_TOLERANCE_SECONDS,
  nowSeconds = Math.floor(Date.now() / 1000)
} = {}) {
  if (!secret) {
    return { ok: false, reason: 'missing_secret' };
  }

  const parsed = parseSignatureHeader(signatureHeader);

  if (!parsed) {
    return { ok: false, reason: 'missing_header' };
  }

  const timestampSeconds = Number.parseInt(parsed.timestamp, 10);

  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, reason: 'invalid_timestamp' };
  }

  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) {
    return { ok: false, reason: 'timestamp_outside_tolerance' };
  }

  const body = rawBody == null ? '' : String(rawBody);
  const signedPayload = `${parsed.timestamp}.${body}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  if (!timingSafeEqualHex(parsed.signature, expected)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  return { ok: true };
}

module.exports = {
  DEFAULT_TOLERANCE_SECONDS,
  getSigningSecret,
  isSignatureVerificationRequired,
  parseSignatureHeader,
  verifyStravaWebhookSignature
};
