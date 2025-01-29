const express = require('express');
const router = express.Router();
const Lyrics = require('../models/Lyrics');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');

// Get lyrics by track ID
router.get('/lyrics/track/:trackId', cacheQuery(3600), async (req, res) => {
  try {
    const lyrics = await Lyrics.findOne({ track: req.params.trackId })
      .populate({
        path: 'track',
        populate: [
          { path: 'artist' },
          { path: 'album' }
        ]
      });

    if (!lyrics) {
      return res.status(404).json({ error: 'Lyrics not found' });
    }

    res.json(lyrics);
  } catch (error) {
    logger.error('Error fetching lyrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search lyrics
router.get('/lyrics/search', cacheQuery(3600), async (req, res) => {
  try {
    const { q, limit = 10, offset = 0 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const lyrics = await Lyrics.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .skip(parseInt(offset))
    .limit(parseInt(limit))
    .populate({
      path: 'track',
      populate: [
        { path: 'artist' },
        { path: 'album' }
      ]
    });

    res.json(lyrics);
  } catch (error) {
    logger.error('Error searching lyrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create lyrics
router.post('/lyrics', async (req, res) => {
  try {
    const { track, text, language } = req.body;

    if (!track || !text) {
      return res.status(400).json({ error: 'Track and lyrics text are required' });
    }

    const lyrics = new Lyrics({
      track,
      text,
      language: language || 'en'
    });

    await lyrics.save();
    res.status(201).json(lyrics);
  } catch (error) {
    logger.error('Error creating lyrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lyrics
router.put('/lyrics/:id', async (req, res) => {
  try {
    const lyrics = await Lyrics.findById(req.params.id);

    if (!lyrics) {
      return res.status(404).json({ error: 'Lyrics not found' });
    }

    const { text, language } = req.body;

    if (text) lyrics.text = text;
    if (language) lyrics.language = language;

    await lyrics.save();
    res.json(lyrics);
  } catch (error) {
    logger.error('Error updating lyrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete lyrics
router.delete('/lyrics/:id', async (req, res) => {
  try {
    const lyrics = await Lyrics.findById(req.params.id);

    if (!lyrics) {
      return res.status(404).json({ error: 'Lyrics not found' });
    }

    await lyrics.remove();
    res.json({ message: 'Lyrics deleted successfully' });
  } catch (error) {
    logger.error('Error deleting lyrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 