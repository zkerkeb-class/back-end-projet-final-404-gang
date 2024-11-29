const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const uploadRoutes = require('./routes/uploadRoutes');
const searchRoutes = require('./routes/searchRoutes');
const connectDB = require('./utils/db');
const logger = require('./utils/logger');
const app = express();
app.use(bodyParser.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api', uploadRoutes);
app.use('/api', searchRoutes);
app.get('/test', (req, res) => {
  res.send('Test route is working!');
});
const startServer = async () => {
  try {
    await connectDB();
    app.listen(3000, () => logger.info('Server running on http://localhost:3000'));
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};
startServer();
module.exports = app;