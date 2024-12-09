const getRedisConnection = require('../config/redis');
const logger = require('./logger');

class PerformanceMetrics {
  static async recordOperationTiming(operation, duration) {
    try {
      const { client } = await getRedisConnection();
      const key = `metrics:operation:${operation}`;
      const timestamp = Date.now();

      await client.zAdd(key, {
        score: timestamp,
        value: duration.toString()
      });

      // Keep only last 1000 measurements
      await client.zRemRangeByRank(key, 0, -1001);
    } catch (error) {
      logger.error('Error recording operation timing:', error);
    }
  }

  static async getOperationStats(operation, timeRange = 3600000) { // Default 1 hour
    try {
      const { client } = await getRedisConnection();
      const key = `metrics:operation:${operation}`;
      const minTime = Date.now() - timeRange;

      const measurements = await client.zRangeByScore(key, minTime, '+inf', {
        WITHSCORES: true
      });

      if (measurements.length === 0) {
        return null;
      }

      const durations = measurements.map(m => parseFloat(m));
      return {
        operation,
        count: durations.length,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations)
      };
    } catch (error) {
      logger.error('Error getting operation stats:', error);
      return null;
    }
  }
}

module.exports = PerformanceMetrics;