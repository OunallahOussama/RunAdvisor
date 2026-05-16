const { resolveUserFromClaims, invalidateUserCache } = require('../services/userResolver');

jest.mock('../models/User', () => {
  const users = new Map();

  function User(data) {
    Object.assign(this, data);
    this._id = data._id || `id-${users.size + 1}`;
    this.isNew = !data._id;
    this.save = jest.fn(async () => {
      users.set(this.auth0UserId, this);
      this.isNew = false;
    });
  }

  User.findOne = jest.fn(async (query) => {
    if (query.auth0UserId) {
      return users.get(query.auth0UserId) || null;
    }

    if (query.email) {
      return [...users.values()].find((user) => user.email === query.email) || null;
    }

    return null;
  });

  User.__users = users;

  return User;
});

const User = require('../models/User');

describe('userResolver', () => {
  beforeEach(() => {
    User.__users.clear();
    invalidateUserCache('auth0|cached-user');
  });

  test('does not save when claims are unchanged', async () => {
    const user = new User({
      auth0UserId: 'auth0|cached-user',
      authProvider: 'auth0',
      email: 'runner@example.com',
      name: 'Runner',
      picture: 'https://example.com/p.png'
    });
    await user.save();
    user.save.mockClear();

    const claims = {
      sub: 'auth0|cached-user',
      email: 'runner@example.com',
      name: 'Runner',
      picture: 'https://example.com/p.png'
    };

    await resolveUserFromClaims(claims);
    await resolveUserFromClaims(claims);

    expect(user.save).not.toHaveBeenCalled();
  });
});
