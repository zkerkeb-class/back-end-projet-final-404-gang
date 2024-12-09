const session = require('express-session');
const RedisStore = require('connect-redis').default;
const getRedisConnection = require('./redis');
const logger = require('../utils/logger');

const initializeSession = async () => {
  try {
    const { client } = await getRedisConnection();

    const redisStore = new RedisStore({
      client: client,
      prefix: "spotify:",
    });

    return {
      store: redisStore,
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    };
  } catch (error) {
    logger.error('Failed to initialize session:', error);
    throw error;
  }
};

module.exports = initializeSession;