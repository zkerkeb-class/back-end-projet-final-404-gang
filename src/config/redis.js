const Redis = require('redis');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');

// In-memory fallback cache
const memoryCache = new Map();

const createRedisClient = async () => {
  let client;
  
  try {
    // Try cloud Redis first if URL is provided
    if (process.env.REDIS_URL) {
      client = Redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              logger.warn('Cloud Redis connection failed, falling back to local Redis');
              return new Error('Fallback to local');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });
    } else {
      // Try local Redis
      client = Redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        }
      });
    }

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });
    
    client.on('connect', () => logger.info('Redis Client Connected'));
    client.on('reconnecting', () => logger.info('Redis Client Reconnecting'));

    await client.connect();
    logger.info('Redis connection established');

    return {
      client,
      queryCache: {
        get: async (key) => client.get(key),
        set: async (key, value, ...args) => client.set(key, value, ...args),
        del: async (key) => client.del(key),
        keys: async (pattern) => client.keys(pattern)
      },
      fileCache: {
        get: async (key) => client.get(key),
        set: async (key, value, ...args) => client.set(key, value, ...args),
        del: async (key) => client.del(key),
        keys: async (pattern) => client.keys(pattern)
      }
    };
  } catch (error) {
    logger.warn('Redis unavailable, using in-memory cache fallback');
    
    // Return in-memory cache implementation
    return {
      client: null,
      queryCache: {
        get: async (key) => memoryCache.get(key) || null,
        set: async (key, value) => {
          memoryCache.set(key, value);
          return 'OK';
        },
        del: async (key) => {
          memoryCache.delete(key);
          return 1;
        },
        keys: async () => Array.from(memoryCache.keys())
      },
      fileCache: {
        get: async (key) => memoryCache.get(key) || null,
        set: async (key, value) => {
          memoryCache.set(key, value);
          return 'OK';
        },
        del: async (key) => {
          memoryCache.delete(key);
          return 1;
        },
        keys: async () => Array.from(memoryCache.keys())
      }
    };
  }
};

let redisInstance = null;

const getRedisConnection = async () => {
  if (!redisInstance) {
    redisInstance = await createRedisClient();
  }
  return redisInstance;
};

module.exports = getRedisConnection;