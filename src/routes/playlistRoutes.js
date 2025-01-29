const express = require('express');
const router = express.Router();
const Playlist = require('../models/Playlist');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');

// Get all playlists
router.get('/playlists', cacheQuery(3600), async (req, res) => {
  try {
    const { 
      sort = 'name',
      order = 'asc',
      limit = 20,
      offset = 0,
      minTracks,
      maxTracks
    } = req.query;

    let query = {};
    
    // Filters
    if (minTracks || maxTracks) {
      query.trackCount = {};
      if (minTracks) query.trackCount.$gte = parseInt(minTracks);
      if (maxTracks) query.trackCount.$lte = parseInt(maxTracks);
    }

    // Sort
    let sortQuery = {};
    switch (sort) {
      case 'trackCount':
        sortQuery.trackCount = order === 'desc' ? -1 : 1;
        break;
      case 'createdAt':
        sortQuery.createdAt = order === 'desc' ? -1 : 1;
        break;
      case 'name':
      default:
        sortQuery.name = order === 'desc' ? -1 : 1;
    }

    const playlists = await Playlist.find(query)
      .sort(sortQuery)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate({
        path: 'tracks',
        populate: [
          { path: 'artist' },
          { path: 'album' }
        ]
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
    const playlist = await Playlist.findById(req.params.id)
      .populate({
        path: 'tracks',
        populate: [
          { path: 'artist' },
          { path: 'album' }
        ]
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

// Create new playlist
router.post('/playlists', async (req, res) => {
  try {
    const { name, description, tracks = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    const playlist = new Playlist({
      name,
      description,
      tracks,
      trackCount: tracks.length,
      createdAt: new Date()
    });

    await playlist.save();
    res.status(201).json(playlist);
  } catch (error) {
    logger.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update playlist
router.put('/playlists/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const { name, description, tracks } = req.body;

    if (name) playlist.name = name;
    if (description) playlist.description = description;
    if (tracks) {
      playlist.tracks = tracks;
      playlist.trackCount = tracks.length;
    }

    await playlist.save();
    res.json(playlist);
  } catch (error) {
    logger.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete playlist
router.delete('/playlists/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    await playlist.remove();
    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    logger.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add track to playlist
router.post('/playlists/:id/tracks', async (req, res) => {
  try {
    const { trackId } = req.body;
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (!trackId) {
      return res.status(400).json({ error: 'Track ID is required' });
    }

    if (!playlist.tracks.includes(trackId)) {
      playlist.tracks.push(trackId);
      playlist.trackCount = playlist.tracks.length;
      await playlist.save();
    }

    res.json(playlist);
  } catch (error) {
    logger.error('Error adding track to playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove track from playlist
router.delete('/playlists/:id/tracks/:trackId', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const trackIndex = playlist.tracks.indexOf(req.params.trackId);
    if (trackIndex > -1) {
      playlist.tracks.splice(trackIndex, 1);
      playlist.trackCount = playlist.tracks.length;
      await playlist.save();
    }

    res.json(playlist);
  } catch (error) {
    logger.error('Error removing track from playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get playlist tracks
router.get('/playlists/:id/tracks', cacheQuery(3600), async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate({
        path: 'tracks',
        populate: [
          { path: 'artist' },
          { path: 'album' }
        ]
      });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json(playlist.tracks);
  } catch (error) {
    logger.error('Error fetching playlist tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 