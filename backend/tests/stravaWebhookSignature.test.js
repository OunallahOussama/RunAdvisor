const crypto = require('crypto');
const {
  parseSignatureHeader,
  verifyStravaWebhookSignature
} = require('../utils/stravaWebhookSignature');

describe('strava webhook signature', () => {
  const secret = 'test-signing-secret';
  const rawBody = JSON.stringify({
    aspect_type: 'create',
    object_id: 123,
    object_type: 'activity',
    owner_id: 456
  });

  function sign(body, timestamp = '1714000000') {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`, 'utf8')
      .digest('hex');

    return `t=${timestamp},v1=${signature}`;
  }

  test('parseSignatureHeader extracts timestamp and signature', () => {
    expect(parseSignatureHeader(sign(rawBody))).toEqual({
      timestamp: '1714000000',
      signature: expect.any(String)
    });
  });

  test('verifyStravaWebhookSignature accepts a valid signature', () => {
    const nowSeconds = 1714000000;
    const result = verifyStravaWebhookSignature({
      signatureHeader: sign(rawBody),
      rawBody,
      secret,
      nowSeconds
    });

    expect(result).toEqual({ ok: true });
  });

  test('verifyStravaWebhookSignature rejects tampered bodies', () => {
    const nowSeconds = 1714000000;
    const result = verifyStravaWebhookSignature({
      signatureHeader: sign(rawBody),
      rawBody: `${rawBody} `,
      secret,
      nowSeconds
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_signature');
  });

  test('verifyStravaWebhookSignature rejects stale timestamps', () => {
    const result = verifyStravaWebhookSignature({
      signatureHeader: sign(rawBody, '1000'),
      rawBody,
      secret,
      nowSeconds: 1714000000,
      toleranceSeconds: 300
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('timestamp_outside_tolerance');
  });
});
