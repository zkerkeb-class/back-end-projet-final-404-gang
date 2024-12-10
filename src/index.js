const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const connectDB = require('./utils/db');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
// const uploadRoutes = require('./routes/uploadRoutes');
// const searchRoutes = require('./routes/searchRoutes');
// app.use('/api', uploadRoutes);
// app.use('/api', searchRoutes);
const trackRoutes = require('./routes/trackRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const artistRoutes = require('./routes/artistRoutes');
const albumRoutes = require('./routes/albumRoutes');

app.use('/api/tracks', trackRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/albums', albumRoutes);
app.get('/test', (req, res) => {
  res.send('Test route is working!');
});

// Start server
const startServer = () => {
  connectDB()
    .then(() => {
      app.listen(3000, () => logger.info('Server running on http://localhost:3000'));
    })
    .catch((error) => {
      logger.error('Error starting server:', error);
      process.exit(1);
    });
};

startServer();

module.exports = app;
