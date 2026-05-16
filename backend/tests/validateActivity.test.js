const { validateCreateActivity } = require('../middleware/validate');

function runValidator(body) {
  const req = { body };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  let nextCalled = false;

  validateCreateActivity(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
}

describe('validateCreateActivity', () => {
  const validBody = {
    name: 'Morning run',
    type: 'run',
    distance: 10,
    duration: 3600,
    date: '2026-05-01T08:00:00.000Z'
  };

  test('accepts a valid activity payload', () => {
    const { req, res, nextCalled } = runValidator(validBody);

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(req.validatedActivity).toMatchObject({
      name: 'Morning run',
      type: 'run',
      distanceKm: 10,
      durationSeconds: 3600
    });
  });

  test('rejects zero distance', () => {
    const { res, nextCalled } = runValidator({ ...validBody, distance: 0 });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/distance/i);
  });

  test('rejects invalid activity type', () => {
    const { res, nextCalled } = runValidator({ ...validBody, type: 'swim' });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/type/i);
  });
});
