const UserActivity = require('../models/UserActivity');

const logActivity = async (userId, action, resource = null, resourceId = null, details = null, req = null) => {
  try {
    const activityData = {
      userId,
      action,
      resource,
      resourceId,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
    };

    if (req) {
      activityData.ipAddress = req.ip || req.connection.remoteAddress;
      activityData.userAgent = req.get('User-Agent');
    }

    await UserActivity.create(activityData);
  } catch (error) {
    console.error('Failed to log user activity:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

const activityLogger = (action, resource = null) => {
  return (req, res, next) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log activity on successful response (status < 400)
      if (res.statusCode < 400 && req.user) {
        const resourceId = req.params.id || (data && data.id) || null;
        const details = {
          method: req.method,
          url: req.originalUrl,
          body: req.method !== 'GET' ? req.body : undefined
        };
        
        logActivity(req.user.id, action, resource, resourceId, details, req);
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  logActivity,
  activityLogger
};
