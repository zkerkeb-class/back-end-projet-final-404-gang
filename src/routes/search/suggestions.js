const express = require('express');
const router = express.Router();
const AutoCompleteService = require('../../services/autoComplete');
const { cacheQuery } = require('../../middleware/queryCache');
const logger = require('../../utils/logger');

// Suggestions route
router.get('/', cacheQuery(300), async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    const suggestions = await AutoCompleteService.getSuggestions(q, parseInt(limit));
    res.json(suggestions);
  } catch (error) {
    logger.error('Search suggestions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trending searches route
router.get('/trending', cacheQuery(3600), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const trending = await AutoCompleteService.getTrendingSearches(parseInt(limit));
    res.json(trending);
  } catch (error) {
    logger.error('Trending searches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 