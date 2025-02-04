const getRedisConnection = require('../config/redis');
const logger = require('../utils/logger');

const cacheQuery = (duration = 3600) => {
  return async (req, res, next) => {
    try {
      const redis = await getRedisConnection();
      const cacheKey = `query:${req.originalUrl}`;

      // Get cached data using queryCache
      const cachedData = await redis.queryCache.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Store original res.json function
      const originalJson = res.json;

      // Override res.json method to cache the response
      res.json = function(data) {
        // Cache the response data using queryCache
        redis.queryCache.set(cacheKey, JSON.stringify(data), 'EX', duration)
          .catch(err => logger.error('Redis cache set error:', err));

        // Call the original res.json with the data
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
};

const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    try {
      const redis = await getRedisConnection();
      
      // Get all cache keys using queryCache
      const keys = await redis.queryCache.keys('query:*');
      
      // Filter keys matching patterns
      const keysToDelete = keys.filter(key => {
        return patterns.some(pattern => {
          const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
          const regex = new RegExp(regexPattern);
          return regex.test(key);
        });
      });

      // Delete matched keys using queryCache
      if (keysToDelete.length > 0) {
        await Promise.all(keysToDelete.map(key => redis.queryCache.del(key)));
        logger.debug(`Invalidated cache keys: ${keysToDelete.join(', ')}`);
      }

      next();
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      next();
    }
  };
};

module.exports = {
  cacheQuery,
  invalidateCache
};