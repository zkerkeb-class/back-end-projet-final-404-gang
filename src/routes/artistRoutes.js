const express = require('express');
const router = express.Router();
const CacheInvalidationService = require('../services/cacheInvalidation');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');
const Artist = require('../models/Artist');

// Create artist
router.post('/artists', async (req, res) => {
  try {
    const artist = await retryOperation(async () => {
      return await Artist.create(req.body);
    });

    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'artist', id: artist._id },
        'create'
      );
    });

    res.status(201).json(artist);
  } catch (error) {
    logger.error('Error creating artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all artists
router.get('/artists', cacheQuery(3600), async (req, res) => {
  try {
    const artists = await retryOperation(async () => {
      return await Artist.find()
        .populate({
          path: 'albums',
          populate: {
            path: 'tracks'
          }
        })
        .populate('tracks');
    });
    
    res.json(artists);
  } catch (error) {
    logger.error('Error fetching artists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get artist by ID
router.get('/artists/:id', cacheQuery(3600), async (req, res) => {
  try {
    const artist = await retryOperation(async () => {
      return await Artist.findById(req.params.id)
        .populate({
          path: 'albums',
          populate: {
            path: 'tracks'
          }
        })
        .populate('tracks');
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    res.json(artist);
  } catch (error) {
    logger.error('Error fetching artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update artist
router.put('/artists/:id', async (req, res) => {
  try {
    const artist = await retryOperation(async () => {
      return await Artist.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      ).populate({
        path: 'albums',
        populate: {
          path: 'tracks'
        }
      }).populate('tracks');
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'artist', id: artist._id },
        'update'
      );
    });

    res.json(artist);
  } catch (error) {
    logger.error('Error updating artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get artist's albums
router.get('/artists/:id/albums', cacheQuery(3600), async (req, res) => {
  try {
    const artist = await retryOperation(async () => {
      return await Artist.findById(req.params.id)
        .populate({
          path: 'albums',
          populate: {
            path: 'tracks'
          }
        });
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    res.json(artist.albums);
  } catch (error) {
    logger.error('Error fetching artist albums:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get artist's tracks
router.get('/artists/:id/tracks', cacheQuery(3600), async (req, res) => {
  try {
    const artist = await retryOperation(async () => {
      return await Artist.findById(req.params.id)
        .populate({
          path: 'tracks',
          populate: {
            path: 'album'
          }
        });
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    res.json(artist.tracks);
  } catch (error) {
    logger.error('Error fetching artist tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete artist
router.delete('/artists/:id', async (req, res) => {
  try {
    const artist = await retryOperation(async () => {
      return await Artist.findByIdAndDelete(req.params.id);
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'artist', id: artist._id },
        'delete'
      );
    });

    res.json({ message: 'Artist deleted successfully' });
  } catch (error) {
    logger.error('Error deleting artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 