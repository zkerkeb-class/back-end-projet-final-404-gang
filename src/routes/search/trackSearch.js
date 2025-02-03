const express = require('express');
const router = express.Router();
const SearchService = require('../../services/searchService');
const { cacheQuery } = require('../../middleware/queryCache');
const logger = require('../../utils/logger');

router.get('/', cacheQuery(3600), async (req, res) => {
  try {
    const tracks = await SearchService.searchTracks(req.query);
    res.json(tracks);
  } catch (error) {
    logger.error('Track search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 