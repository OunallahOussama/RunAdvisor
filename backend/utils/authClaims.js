function getClaimEmail(claims = {}) {
  if (typeof claims.email === 'string' && claims.email.trim()) {
    return claims.email.trim().toLowerCase();
  }

  const audience = process.env.AUTH0_AUDIENCE;

  if (audience) {
    const namespaced = claims[`${audience}/email`];

    if (typeof namespaced === 'string' && namespaced.trim()) {
      return namespaced.trim().toLowerCase();
    }
  }

  for (const key of Object.keys(claims)) {
    if (key.endsWith('/email') && typeof claims[key] === 'string' && claims[key].trim()) {
      return claims[key].trim().toLowerCase();
    }
  }

  return undefined;
}

module.exports = {
  getClaimEmail
};
