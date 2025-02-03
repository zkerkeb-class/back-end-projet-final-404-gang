const express = require('express');
const app = express();
const audioRoutes = require('./routes/audioRoutes');
const imageRoutes = require('./routes/imageRoutes');

// Register audio routes
app.use('/api/audio', audioRoutes);

// Register image routes
app.use('/api/images', imageRoutes);

// ... other middleware ...

// ... other imports ...

module.exports = app; 