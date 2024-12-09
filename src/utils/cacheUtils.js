const getRedisConnection = require('../config/redis');
const logger = require('./logger');

const clearQueryCache = async (pattern) => {
  try {
    const { queryCache } = await getRedisConnection();
    const keys = await queryCache.keys(`query:${pattern}`);
    if (keys.length > 0) {
      await queryCache.del(keys);
    }
  } catch (error) {
    logger.error('Error clearing query cache:', error);
    throw error;
  }
};

const clearFileCache = async (pattern) => {
  try {
    const { fileCache } = await getRedisConnection();
    const keys = await fileCache.keys(`file:${pattern}`);
    if (keys.length > 0) {
      await fileCache.del(keys);
    }
  } catch (error) {
    logger.error('Error clearing file cache:', error);
    throw error;
  }
};

module.exports = {
  clearQueryCache,
  clearFileCache
};