const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');

// Get all albums
router.get('/albums', cacheQuery(3600), async (req, res) => {
  try {
    const { 
      sort = 'releaseDate',
      order = 'desc',
      limit = 20,
      offset = 0,
      genre,
      minYear,
      maxYear
    } = req.query;

    let query = {};
    
    // Filters
    if (genre) {
      query.genre = genre;
    }

    if (minYear || maxYear) {
      query.releaseDate = {};
      if (minYear) query.releaseDate.$gte = new Date(minYear, 0, 1);
      if (maxYear) query.releaseDate.$lte = new Date(maxYear, 11, 31);
    }

    // Sort
    let sortQuery = {};
    switch (sort) {
      case 'title':
        sortQuery.title = order === 'desc' ? -1 : 1;
        break;
      case 'trackCount':
        // Will be handled after population
        break;
      case 'releaseDate':
      default:
        sortQuery.releaseDate = order === 'desc' ? -1 : 1;
    }

    let albums = await Album.find(query)
      .sort(sortQuery)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('artist')
      .populate('tracks');

    // Handle track count sorting
    if (sort === 'trackCount') {
      albums = albums.sort((a, b) => {
        const diff = a.tracks.length - b.tracks.length;
        return order === 'desc' ? -diff : diff;
      });
    }

    res.json(albums);
  } catch (error) {
    logger.error('Error fetching albums:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get album by ID
router.get('/albums/:id', cacheQuery(3600), async (req, res) => {
  try {
    const album = await Album.findById(req.params.id)
      .populate('artist')
      .populate({
        path: 'tracks',
        populate: {
          path: 'artist'
        }
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

// Create new album
router.post('/albums', async (req, res) => {
  try {
    const { title, artist, releaseDate, genre, coverImage } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }

    const album = new Album({
      title,
      artist,
      releaseDate: releaseDate || new Date(),
      genre,
      coverImage
    });

    await album.save();
    res.status(201).json(album);
  } catch (error) {
    logger.error('Error creating album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update album
router.put('/albums/:id', async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    const { title, artist, releaseDate, genre, coverImage } = req.body;

    if (title) album.title = title;
    if (artist) album.artist = artist;
    if (releaseDate) album.releaseDate = releaseDate;
    if (genre) album.genre = genre;
    if (coverImage) album.coverImage = coverImage;

    await album.save();
    res.json(album);
  } catch (error) {
    logger.error('Error updating album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete album
router.delete('/albums/:id', async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    await album.remove();
    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    logger.error('Error deleting album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get album's tracks
router.get('/albums/:id/tracks', cacheQuery(3600), async (req, res) => {
  try {
    const album = await Album.findById(req.params.id)
      .populate({
        path: 'tracks',
        populate: {
          path: 'artist'
        },
        options: {
          sort: { trackNumber: 1 }
        }
      });

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    res.json(album.tracks);
  } catch (error) {
    logger.error('Error fetching album tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;