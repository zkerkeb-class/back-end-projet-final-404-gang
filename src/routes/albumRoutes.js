const express = require('express');
const router = express.Router();
const CacheInvalidationService = require('../services/cacheInvalidation');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');
const Album = require('../models/Album');

router.post('/albums', async (req, res) => {
  try {
    const album = await retryOperation(async () => {
      return await Album.create(req.body);
    });
    
    // Invalidate related caches
    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'album', id: album._id, artistId: album.artist },
        'create'
      );
    });

    res.status(201).json(album);
  } catch (error) {
    logger.error('Error creating album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/albums/:id/images', cacheQuery(3600), async (req, res) => {
  try {
    const { size = 'medium' } = req.query;
    const validSizes = ['thumbnail', 'small', 'medium', 'large', 'original'];
    
    if (!validSizes.includes(size)) {
      return res.status(400).json({ 
        error: 'Invalid size parameter',
        validSizes
      });
    }

    const album = await retryOperation(async () => {
      return await Album.findById(req.params.id).select('images');
    });
    
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    if (!album.images || !album.images[size]) {
      return res.status(404).json({ error: 'Image not found for this album' });
    }

    // Return the image URL for the requested size
    res.json({
      imageUrl: album.images[size],
      size,
      availableSizes: validSizes.filter(s => album.images[s])
    });
  } catch (error) {
    logger.error('Error fetching album image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/albums/:id', async (req, res) => {
  try {
    const album = await retryOperation(async () => {
      return await Album.findByIdAndUpdate(req.params.id, req.body, { new: true });
    });
    
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    // Invalidate related caches
    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'album', id: album._id, artistId: album.artist },
        'update'
      );
    });

    res.json(album);
  } catch (error) {
    logger.error('Error updating album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/albums/:id', cacheQuery(3600), async (req, res) => {
  try {
    const album = await retryOperation(async () => {
      return await Album.findById(req.params.id).populate('artist');
    });
    
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    res.json(album);
  } catch (error) {
    logger.error('Error fetching album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/albums/:id', async (req, res) => {
  try {
    const album = await retryOperation(async () => {
      return await Album.findByIdAndDelete(req.params.id);
    });
    
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    // Invalidate related caches
    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'album', id: album._id, artistId: album.artist },
        'delete'
      );
    });

    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    logger.error('Error deleting album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;