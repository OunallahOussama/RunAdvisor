function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
    message: `No route for ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error('Unhandled error:', err);
  }

  res.status(status).json({
    error: isServerError ? 'Internal server error' : (err.message || 'Request failed'),
    message: isServerError
      ? 'Something went wrong. Please try again shortly.'
      : (err.expose === false ? 'Request failed' : err.message)
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
