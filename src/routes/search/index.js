const express = require('express');
const router = express.Router();

// Import route handlers
const globalSearchRoutes = require('./globalSearch');
const trackSearchRoutes = require('./trackSearch');
const suggestionsRoutes = require('./suggestions');
const advancedSearchRoutes = require('./advancedSearch');
const genresRoutes = require('./genres');

// Mount routes
router.use('/', globalSearchRoutes); // Global search at root level
router.use('/tracks', trackSearchRoutes);
router.use('/suggestions', suggestionsRoutes);
router.use('/advanced', advancedSearchRoutes);
router.use('/genres', genresRoutes);

module.exports = router;