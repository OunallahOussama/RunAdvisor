function parseOriginList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildCorsOptions() {
  const configuredOrigins = parseOriginList(process.env.CORS_ORIGINS);
  const siteUrl = process.env.REACT_APP_SITE_URL || process.env.SITE_URL || '';
  const allowedOrigins = new Set(configuredOrigins);

  if (siteUrl) {
    allowedOrigins.add(siteUrl.replace(/\/$/, ''));
  }

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
  }

  const allowAllInDev = process.env.NODE_ENV !== 'production' && allowedOrigins.size === 0;

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowAllInDev) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    }
  };
}

module.exports = {
  buildCorsOptions,
  parseOriginList
};
