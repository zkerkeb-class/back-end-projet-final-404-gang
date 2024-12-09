const express = require('express');
const router = express.Router();
const CacheInvalidationService = require('../services/cacheInvalidation');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../config/logger');

router.post('/albums', async (req, res) => {
  try {
    const album = await Album.create(req.body);
    
    // Invalidate related caches
    await CacheInvalidationService.invalidateRelatedCaches(
      { type: 'album', id: album._id, artistId: album.artist },
      'create'
    );

    res.status(201).json(album);
  } catch (error) {
    logger.error('Error creating album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/albums/:id', async (req, res) => {
  try {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Invalidate related caches
    await CacheInvalidationService.invalidateRelatedCaches(
      { type: 'album', id: album._id, artistId: album.artist },
      'update'
    );

    res.json(album);
  } catch (error) {
    logger.error('Error updating album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});