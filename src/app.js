const express = require('express');
const app = express();
const searchRoutes = require('./routes/search');
const audioRoutes = require('./routes/audioRoutes');
const imageRoutes = require('./routes/imageRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// Register routes
app.use('/api/search', searchRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/images', imageRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ... other middleware ...

// ... other imports ...

module.exports = app; 