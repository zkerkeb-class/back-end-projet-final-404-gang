const express = require('express');
const router = express.Router();
const CacheInvalidationService = require('../services/cacheInvalidation');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');
const Playlist = require('../models/Playlist');

// Create playlist
router.post('/playlists', async (req, res) => {
  try {
    const playlist = await retryOperation(async () => {
      return await Playlist.create(req.body);
    });

    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'playlist', id: playlist._id },
        'create'
      );
    });

    res.status(201).json(playlist);
  } catch (error) {
    logger.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all playlists
router.get('/playlists', cacheQuery(3600), async (req, res) => {
  try {
    const playlists = await retryOperation(async () => {
      return await Playlist.find()
        .populate({
          path: 'tracks',
          populate: {
            path: 'artist album'
          }
        });
    });
    
    res.json(playlists);
  } catch (error) {
    logger.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get playlist by ID
router.get('/playlists/:id', cacheQuery(3600), async (req, res) => {
  try {
    const playlist = await retryOperation(async () => {
      return await Playlist.findById(req.params.id)
        .populate({
          path: 'tracks',
          populate: {
            path: 'artist album'
          }
        });
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    res.json(playlist);
  } catch (error) {
    logger.error('Error fetching playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update playlist
router.put('/playlists/:id', async (req, res) => {
  try {
    const playlist = await retryOperation(async () => {
      return await Playlist.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      ).populate({
        path: 'tracks',
        populate: {
          path: 'artist album'
        }
      });
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'playlist', id: playlist._id },
        'update'
      );
    });

    res.json(playlist);
  } catch (error) {
    logger.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add track to playlist
router.post('/playlists/:id/tracks', async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) {
      return res.status(400).json({ error: 'Track ID is required' });
    }

    const playlist = await retryOperation(async () => {
      return await Playlist.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { tracks: trackId } },
        { new: true }
      ).populate({
        path: 'tracks',
        populate: {
          path: 'artist album'
        }
      });
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'playlist', id: playlist._id },
        'update'
      );
    });

    res.json(playlist);
  } catch (error) {
    logger.error('Error adding track to playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove track from playlist
router.delete('/playlists/:id/tracks/:trackId', async (req, res) => {
  try {
    const playlist = await retryOperation(async () => {
      return await Playlist.findByIdAndUpdate(
        req.params.id,
        { $pull: { tracks: req.params.trackId } },
        { new: true }
      ).populate({
        path: 'tracks',
        populate: {
          path: 'artist album'
        }
      });
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'playlist', id: playlist._id },
        'update'
      );
    });

    res.json(playlist);
  } catch (error) {
    logger.error('Error removing track from playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete playlist
router.delete('/playlists/:id', async (req, res) => {
  try {
    const playlist = await retryOperation(async () => {
      return await Playlist.findByIdAndDelete(req.params.id);
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'playlist', id: playlist._id },
        'delete'
      );
    });

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    logger.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 