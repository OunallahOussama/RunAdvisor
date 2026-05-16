const { getClaimEmail } = require('./authClaims');

function parseList(envValue) {
  return String(envValue || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isAdminUser(user = {}, claims = {}) {
  const adminEmails = parseList(process.env.ADMIN_EMAILS).map((email) => email.toLowerCase());
  const adminSubs = parseList(process.env.ADMIN_AUTH0_IDS);
  const email = String(user.email || getClaimEmail(claims) || '').trim().toLowerCase();
  const sub = String(claims.sub || user.auth0UserId || '').trim();

  if (user.role === 'admin') {
    return true;
  }

  if (email && adminEmails.includes(email)) {
    return true;
  }

  return Boolean(sub && adminSubs.includes(sub));
}

module.exports = {
  isAdminUser,
  parseList
};
