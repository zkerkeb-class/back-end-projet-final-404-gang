const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const getRedisConnection = require('./config/redis');
const logger = require('./utils/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const uploadRoutes = require('./routes/uploadRoutes');
const searchRoutes = require('./routes/search');
const connectDB = require('./utils/db');
const monitorRoutes = require('./routes/monitorRoutes');
const artistRoutes = require('./routes/artistRoutes');
const albumRoutes = require('./routes/albumRoutes');
const trackRoutes = require('./routes/trackRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const lyricsRoutes = require('./routes/lyricsRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

const initializeApp = async () => {
  try {
    // Initialize Redis connection
    await getRedisConnection();
    
    // Initialize session configuration
    const sessionConfig = await require('./config/session')();
    
    // CORS middleware
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] // Add your production domains here
        : ['http://localhost:3000', 'http://localhost:5173'], // Development domains
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    // Session middleware
    app.use(session(sessionConfig));

    // Middleware
    app.use(bodyParser.json());
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // API Routes
    app.use('/api/search', searchRoutes);
    app.use('/api', uploadRoutes);
    app.use('/api', artistRoutes);
    app.use('/api', albumRoutes);
    app.use('/api', trackRoutes);
    app.use('/api', playlistRoutes);
    app.use('/api/lyrics', lyricsRoutes);
    app.use('/monitor', monitorRoutes);
    app.use('/api', userRoutes);

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
    const PORT = process.env.PORT || 3001;
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