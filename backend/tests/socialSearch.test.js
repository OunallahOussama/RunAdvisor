const { searchDiscoverableUsers } = require('../services/socialService');

describe('searchDiscoverableUsers', () => {
  it('requires at least 3 characters', async () => {
    await expect(
      searchDiscoverableUsers('507f1f77bcf86cd799439011', 'ab')
    ).rejects.toMatchObject({
      status: 400,
      message: 'Enter at least 3 characters to search.'
    });
  });

  it('rejects empty query', async () => {
    await expect(searchDiscoverableUsers('507f1f77bcf86cd799439011', '')).rejects.toMatchObject({
      status: 400
    });
  });
});
