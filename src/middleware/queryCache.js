const { queryCache } = require('../config/redis');
const PerformanceMetrics = require('../utils/performanceMetrics');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');

const cacheQuery = (duration = 3600) => {
  return async (req, res, next) => {
    const key = `query:${req.originalUrl}`;
    const startTime = process.hrtime();

    try {
      const cachedResponse = await retryOperation(async () => {
        return await queryCache.get(key);
      });
      
      if (cachedResponse) {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000;
        await retryOperation(async () => {
          await PerformanceMetrics.recordOperationTiming('cache_hit', duration);
        });
        
        return res.json(JSON.parse(cachedResponse));
      }

      // Store original send function
      const originalJson = res.json;

      // Override res.json method
      res.json = async function(body) {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000;
        
        await retryOperation(async () => {
          await PerformanceMetrics.recordOperationTiming('cache_miss', duration);
          // Cache the response
          await queryCache.set(key, JSON.stringify(body), 'EX', duration);
        });
        
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Query cache error:', error);
      next();
    }
  };
};

module.exports = { cacheQuery };