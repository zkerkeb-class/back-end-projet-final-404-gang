const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const getRedisConnection = require('./config/redis');
const logger = require('./utils/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const uploadRoutes = require('./routes/uploadRoutes');
const searchRoutes = require('./routes/searchRoutes');
const connectDB = require('./utils/db');
const monitorRoutes = require('./routes/monitorRoutes');


const app = express();

const initializeApp = async () => {
  try {
    // Initialize Redis connection
    await getRedisConnection();
    
    // Initialize session configuration
    const sessionConfig = await require('./config/session')();
    
    // Session middleware
    app.use(session(sessionConfig));

    // Middleware
    app.use(bodyParser.json());
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.use('/api', uploadRoutes);
    app.use('/api', searchRoutes);
    app.use('/monitor', monitorRoutes);

    // Health check endpoint
    app.get('/health', async (req, res) => {
      try {
        await req.session.touch();
        res.json({ 
          status: 'healthy',
          redis: 'connected',
          session: 'working'
        });
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({ 
          status: 'unhealthy',
          error: error.message
        });
      }
    });

    // Connect to MongoDB and start server
    await connectDB();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to initialize app:', error);
    process.exit(1);
  }
};

initializeApp();

module.exports = app;