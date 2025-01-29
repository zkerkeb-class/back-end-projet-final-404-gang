const express = require('express');
const router = express.Router();
const Track = require('../models/Track');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');

// Get all tracks
router.get('/tracks', cacheQuery(3600), async (req, res) => {
  try {
    const { 
      sort = 'title',
      order = 'asc',
      limit = 20,
      offset = 0,
      genre,
      minDuration,
      maxDuration,
      minPopularity
    } = req.query;

    let query = {};
    
    // Filters
    if (genre) {
      query.genre = genre;
    }

    if (minDuration || maxDuration) {
      query.duration = {};
      if (minDuration) query.duration.$gte = parseInt(minDuration);
      if (maxDuration) query.duration.$lte = parseInt(maxDuration);
    }

    if (minPopularity) {
      query.popularity = { $gte: parseInt(minPopularity) };
    }

    // Sort
    let sortQuery = {};
    switch (sort) {
      case 'duration':
        sortQuery.duration = order === 'desc' ? -1 : 1;
        break;
      case 'popularity':
        sortQuery.popularity = order === 'desc' ? -1 : 1;
        break;
      case 'title':
      default:
        sortQuery.title = order === 'desc' ? -1 : 1;
    }

    const tracks = await Track.find(query)
      .sort(sortQuery)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('artist')
      .populate('album');

    res.json(tracks);
  } catch (error) {
    logger.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get track by ID
router.get('/tracks/:id', cacheQuery(3600), async (req, res) => {
  try {
    const track = await Track.findById(req.params.id)
      .populate('artist')
      .populate('album');

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    res.json(track);
  } catch (error) {
    logger.error('Error fetching track:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new track
router.post('/tracks', async (req, res) => {
  try {
    const { title, artist, album, duration, genre } = req.body;

    if (!title || !artist || !album) {
      return res.status(400).json({ error: 'Title, artist and album are required' });
    }

    const track = new Track({
      title,
      artist,
      album,
      duration,
      genre,
      popularity: 0
    });

    await track.save();
    res.status(201).json(track);
  } catch (error) {
    logger.error('Error creating track:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update track
router.put('/tracks/:id', async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const { title, artist, album, duration, genre, popularity } = req.body;

    if (title) track.title = title;
    if (artist) track.artist = artist;
    if (album) track.album = album;
    if (duration) track.duration = duration;
    if (genre) track.genre = genre;
    if (popularity !== undefined) track.popularity = popularity;

    await track.save();
    res.json(track);
  } catch (error) {
    logger.error('Error updating track:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete track
router.delete('/tracks/:id', async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    await track.remove();
    res.json({ message: 'Track deleted successfully' });
  } catch (error) {
    logger.error('Error deleting track:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get similar tracks
router.get('/tracks/:id/similar', cacheQuery(3600), async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const similarTracks = await Track.find({
      _id: { $ne: track._id },
      $or: [
        { genre: track.genre },
        { artist: track.artist }
      ]
    })
    .limit(10)
    .populate('artist')
    .populate('album');

    res.json(similarTracks);
  } catch (error) {
    logger.error('Error fetching similar tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 