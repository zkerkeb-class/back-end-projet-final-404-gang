const express = require('express');
const app = express();
const searchRoutes = require('./routes/search');
const audioRoutes = require('./routes/audioRoutes');
const imageRoutes = require('./routes/imageRoutes');

// Register routes
app.use('/api/search', searchRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/images', imageRoutes);

// ... other middleware ...

// ... other imports ...

module.exports = app; 