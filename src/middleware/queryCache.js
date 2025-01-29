const getRedisConnection = require('../config/redis');
const logger = require('../utils/logger');

const cacheQuery = (duration) => {
  return async (req, res, next) => {
    try {
      const redis = await getRedisConnection();
      const cacheKey = `query:${req.originalUrl || req.url}`;

      // Check cache
      const cachedResponse = await redis.get(cacheKey);
      if (cachedResponse) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return res.json(JSON.parse(cachedResponse));
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method
      res.json = async function(body) {
        try {
          // Cache the response
          await redis.setex(cacheKey, duration, JSON.stringify(body));
          logger.debug(`Cached response for ${cacheKey} (${duration}s)`);
        } catch (error) {
          logger.error('Error caching response:', error);
        }

        // Call original json method
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    try {
      const redis = await getRedisConnection();
      
      // Get all cache keys
      const keys = await redis.keys('query:*');
      
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

      // Delete matched keys
      if (keysToDelete.length > 0) {
        await redis.del(keysToDelete);
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