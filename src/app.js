const express = require('express');
const app = express();
const audioRoutes = require('./routes/audioRoutes');

// Register audio routes
app.use('/api/audio', audioRoutes);

// ... other middleware ...

// ... other imports ...

module.exports = app; 