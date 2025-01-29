const express = require('express');
const router = express.Router();
const Artist = require('../models/Artist');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');

// Get all artists
router.get('/artists', cacheQuery(3600), async (req, res) => {
  try {
    const { 
      sort = 'name',
      order = 'asc',
      limit = 20,
      offset = 0,
      genre,
      minPopularity
    } = req.query;

    let query = {};
    
    // Filters
    if (genre) {
      query.genres = genre;
    }

    if (minPopularity) {
      query.popularity = { $gte: parseInt(minPopularity) };
    }

    // Sort
    let sortQuery = {};
    switch (sort) {
      case 'popularity':
        sortQuery.popularity = order === 'desc' ? -1 : 1;
        break;
      case 'name':
      default:
        sortQuery.name = order === 'desc' ? -1 : 1;
    }

    const artists = await Artist.find(query)
      .sort(sortQuery)
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    res.json(artists);
  } catch (error) {
    logger.error('Error fetching artists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get artist by ID
router.get('/artists/:id', cacheQuery(3600), async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id)
      .populate('albums')
      .populate({
        path: 'tracks',
        options: { sort: { popularity: -1 } } // Sort tracks by popularity
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

// Create new artist
router.post('/artists', async (req, res) => {
  try {
    const { name, biography, genres, images } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Artist name is required' });
    }

    const artist = new Artist({
      name,
      biography,
      genres,
      images,
      popularity: 0
    });

    await artist.save();
    res.status(201).json(artist);
  } catch (error) {
    logger.error('Error creating artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update artist
router.put('/artists/:id', async (req, res) => {
  try {
    const { name, biography, genres, images, popularity } = req.body;
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    if (name) artist.name = name;
    if (biography) artist.biography = biography;
    if (genres) artist.genres = genres;
    if (images) artist.images = images;
    if (popularity !== undefined) artist.popularity = popularity;

    await artist.save();
    res.json(artist);
  } catch (error) {
    logger.error('Error updating artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete artist
router.delete('/artists/:id', async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    await artist.remove();
    res.json({ message: 'Artist deleted successfully' });
  } catch (error) {
    logger.error('Error deleting artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get artist's albums
router.get('/artists/:id/albums', cacheQuery(3600), async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id)
      .populate({
        path: 'albums',
        options: {
          sort: { releaseDate: -1 }
        }
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
    const artist = await Artist.findById(req.params.id)
      .populate({
        path: 'tracks',
        populate: {
          path: 'album'
        },
        options: {
          sort: { popularity: -1 }
        }
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

module.exports = router; 