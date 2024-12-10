const Redis = require('redis');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');

const createRedisClient = async () => {
  const client = Redis.createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    },
    retry_strategy: function(options) {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        return new Error('The server refused the connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        return new Error('Retry time exhausted');
      }
      if (options.attempt > 10) {
        return undefined;
      }
      return Math.min(options.attempt * 100, 3000);
    }
  });

  client.on('error', (err) => logger.error('Redis Client Error:', err));
  client.on('connect', () => logger.info('Redis Client Connected'));

  try {
    await retryOperation(async () => {
      await client.connect();
    }, {
      maxRetries: 5,
      initialDelay: 2000,
    });
    
    logger.info('Redis connection established');

    return {
      client,
      queryCache: {
        get: async (key) => retryOperation(() => client.get(key)),
        set: async (key, value, ...args) => retryOperation(() => client.set(key, value, ...args)),
        del: async (key) => retryOperation(() => client.del(key)),
        keys: async (pattern) => retryOperation(() => client.keys(pattern))
      },
      fileCache: {
        get: async (key) => retryOperation(() => client.get(key)),
        set: async (key, value, ...args) => retryOperation(() => client.set(key, value, ...args)),
        del: async (key) => retryOperation(() => client.del(key)),
        keys: async (pattern) => retryOperation(() => client.keys(pattern))
      }
    };
  } catch (error) {
    logger.error('Failed to create Redis client:', error);
    throw error;
  }
};

let redisInstance = null;

const getRedisConnection = async () => {
  if (!redisInstance) {
    redisInstance = await retryOperation(createRedisClient, {
      maxRetries: 3,
      initialDelay: 3000,
    });
  }
  return redisInstance;
};

module.exports = getRedisConnection;