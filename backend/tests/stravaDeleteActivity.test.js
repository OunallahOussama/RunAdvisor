const { deleteActivityFromStrava } = require('../services/stravaDeleteActivity');

jest.mock('../utils/stravaCredentials', () => ({
  stravaAxios: {
    delete: jest.fn()
  }
}));

const { stravaAxios } = require('../utils/stravaCredentials');

describe('deleteActivityFromStrava', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns deleted when Strava accepts the request', async () => {
    stravaAxios.delete.mockResolvedValue({ status: 200 });

    const result = await deleteActivityFromStrava('token', '12345');

    expect(result).toEqual({
      deleted: true,
      activityId: '12345'
    });
    expect(stravaAxios.delete).toHaveBeenCalledWith(
      'https://www.strava.com/api/v3/activities/12345',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' }
      })
    );
  });

  test('treats Strava 404 as already removed', async () => {
    stravaAxios.delete.mockRejectedValue({
      response: { status: 404, data: { message: 'Not Found' } }
    });

    const result = await deleteActivityFromStrava('token', '999');

    expect(result.deleted).toBe(true);
    expect(result.alreadyRemoved).toBe(true);
  });
});
