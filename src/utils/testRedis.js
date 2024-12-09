require('dotenv').config();
const Redis = require('redis');

async function testRedisConnection() {
  console.log('Testing Redis connection...');
  
  const client = Redis.createClient({
    username: 'default', // Add username if required
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    }
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Successfully connected to Redis!');
  });

  try {
    await client.connect();
    await client.set('test', 'Hello Redis');
    const value = await client.get('test');
    console.log('Test value:', value);
    await client.quit();
  } catch (error) {
    console.error('Error:', error);
  }
}

testRedisConnection();