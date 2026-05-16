const { isAdminUser } = require('../utils/adminAccess');

module.exports = function adminMiddleware(req, res, next) {
  if (!isAdminUser(req.user, req.auth0)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access is required for this resource.'
    });
  }

  return next();
};
