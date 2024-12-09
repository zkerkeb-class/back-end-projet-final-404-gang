const Redis = require('redis');
const logger = require('../utils/logger');

const createRedisClient = async () => {
  const client = Redis.createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    }
  });

  client.on('error', (err) => logger.error('Redis Client Error:', err));
  client.on('connect', () => logger.info('Redis Client Connected'));

  try {
    await client.connect();
    logger.info('Redis connection established');

    return {
      client,
      queryCache: {
        get: client.get.bind(client),
        set: client.set.bind(client),
        del: client.del.bind(client),
        keys: client.keys.bind(client)
      },
      fileCache: {
        get: client.get.bind(client),
        set: client.set.bind(client),
        del: client.del.bind(client),
        keys: client.keys.bind(client)
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
    redisInstance = await createRedisClient();
  }
  return redisInstance;
};

module.exports = getRedisConnection;