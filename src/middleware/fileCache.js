const { fileCache } = require('../config/redis');
const crypto = require('crypto');

const cacheFile = (duration = 86400) => {
  return async (req, res, next) => {
    if (!req.file) return next();

    const fileHash = crypto
      .createHash('md5')
      .update(req.file.buffer)
      .digest('hex');
    
    const key = `file:${fileHash}`;

    try {
      // Try to get cached file
      const cachedFile = await fileCache.asyncGet(key);
      
      if (cachedFile) {
        const fileData = JSON.parse(cachedFile);
        return res.json(fileData);
      }

      // Store original file processing result
      const originalJson = res.json;
      res.json = function(body) {
        // Cache the file processing result
        fileCache.asyncSet(key, JSON.stringify(body), 'EX', duration);
        
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('File cache error:', error);
      next();
    }
  };
};

module.exports = { cacheFile };