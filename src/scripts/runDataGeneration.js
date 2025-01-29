require('dotenv').config();
const mongoose = require('mongoose');
const generateData = require('../utils/generateData');
const logger = require('../utils/logger');

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('Connected to MongoDB');

    // Generate data
    const stats = await generateData();
    logger.info('Data generation completed:', stats);

    // Close MongoDB connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error running data generation:', error);
    process.exit(1);
  }
}

main(); 