const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('./logger');
const retryOperation = require('./retryOperation');

dotenv.config();

const connectDB = async () => {
  try {
    await retryOperation(async () => {
      await mongoose.connect(process.env.MONGO_URI, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }, {
      maxRetries: 5,
      initialDelay: 2000,
    });
    
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;