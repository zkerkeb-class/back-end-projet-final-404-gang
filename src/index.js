const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const bodyParser = require('body-parser');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');

const getRedisConnection = require('./config/redis');
const connectDB = require('./utils/db');
const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');
const swaggerDocument = require('./swagger.json');
const uploadRoutes = require('./routes/uploadRoutes');
const searchRoutes = require('./routes/searchRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
const userRoutes = require('./routes/userRoutes');
const artistRoutes = require('./routes/artistRoutes');
const albumRoutes = require('./routes/albumRoutes');
const trackRoutes = require('./routes/trackRoutes');
const playlistRoutes = require('./routes/playlistRoutes');

const app = express();

// Initialisation asynchrone de l'application
const initializeApp = async () => {
  try {
    // Connexion à Redis et MongoDB
    await getRedisConnection();
    await connectDB();

    // Configuration des sessions
    const sessionConfig = await require('./config/session')();
    app.use(session(sessionConfig));

    // Middleware global
    app.use(cors());
    app.use(helmet());
    app.use(bodyParser.json()); // Peut être remplacé par express.json() si body-parser n'est pas nécessaire
    app.use(cookieParser());
    app.use(rateLimiter);

    // Protection CSRF
    const csrfProtection = csrf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
      },
    });
    app.use(csrfProtection);

    // Routes API
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // API Routes
    app.use('/api', uploadRoutes);
    app.use('/api', searchRoutes);
    app.use('/api', artistRoutes);
    app.use('/api', albumRoutes);
    app.use('/api', trackRoutes);
    app.use('/api', playlistRoutes);
    app.use('/api/monitor', monitorRoutes);
    app.use('/api/users', userRoutes);

    // Route pour renvoyer un token CSRF
    app.get('/api/csrf-token', (req, res) => {
      res.json({ csrfToken: req.csrfToken() });
    });

    // Route de vérification de santé
    app.get('/api/health', async (req, res) => {
      try {
        await req.session.touch();
        res.json({
          status: 'healthy',
          redis: 'connected',
          session: 'working',
        });
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
          status: 'unhealthy',
          error: error.message,
        });
      }
    });

    // Route par défaut
    app.get('/', (req, res) => {
      res.send("Bienvenue sur l'API sécurisée !");
    });

    // Gestion des erreurs
    app.use((err, req, res, next) => {
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      if (err.code === 'EBADCSRFTOKEN') {
        return res
          .status(403)
          .json({ message: 'Token CSRF invalide ou expiré' });
      }
      logger.error(err);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    });

    // Lancer le serveur
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
