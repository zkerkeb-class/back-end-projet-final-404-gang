const express = require('express');
const router = express.Router();
const Artist = require('../models/Artist');
const { cacheQuery,invalidateCache } = require('../middleware/queryCache');
const logger = require('../utils/logger');
const getRedisConnection = require('../config/redis');

// Get all artists
router.get('/artists', cacheQuery(3600), async (req, res) => {
  try {
    const { 
      sort = 'name',
      order = 'asc',
      limit = 1000,
      offset = 0,
      genre,
      minPopularity
    } = req.query;

    let query = {};
    
    // Filters
    if (genre) {
      query.genre = genre;
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
    const { name, biography, genre, images } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Artist name is required' });
    }

    const artist = new Artist({
      name,
      biography,
      genre,
      images,
      popularity: 0
    });

    await artist.save();

    // Suppression explicite du cache
    try {
      const redis = await getRedisConnection();
      // Récupérer toutes les clés qui correspondent au pattern
      const keys = await redis.queryCache.keys('query:/api/artists*');
      console.log('Clés à supprimer:', keys);

      // Supprimer chaque clé trouvée
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redis.queryCache.del(key)));
        console.log('Cache supprimé pour les clés:', keys);
      }
    } catch (cacheError) {
      logger.error('Erreur lors de la suppression du cache:', cacheError);
    }

    res.status(201).json(artist);
  } catch (error) {
    logger.error('Error creating artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update artist
router.put('/artists/:id', async (req, res) => {
  try {
    const { name, biography, genre, images, popularity } = req.body;
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    // Validation des données
    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Le nom doit être une chaîne valide' });
    }

    if (genre && (typeof genre !== 'string' || genre.trim().length === 0)) {
      return res.status(400).json({ error: 'Le genre doit être une chaîne valide' });
    }

    if (popularity !== undefined && (typeof popularity !== 'number' || popularity < 0 || popularity > 100)) {
      return res.status(400).json({ error: 'La popularité doit être un nombre entre 0 et 100' });
    }

    // Mise à jour des champs
    if (name) artist.name = name.trim();
    if (biography) artist.biography = biography.trim();
    if (genre) artist.genre = genre.trim();
    if (images) artist.images = images;
    if (popularity !== undefined) artist.popularity = popularity;

    await artist.save();

    // Suppression du cache
    try {
      const redis = await getRedisConnection();
      const keys = await redis.queryCache.keys('query:/api/artists*');
      console.log('Clés à supprimer:', keys);

      if (keys.length > 0) {
        await Promise.all(keys.map(key => redis.queryCache.del(key)));
        console.log('Cache supprimé pour les clés:', keys);
      }
    } catch (cacheError) {
      logger.error('Erreur lors de la suppression du cache:', cacheError);
    }

    res.json(artist);
  } catch (error) {
    logger.error('Error updating artist:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Données invalides', details: error.message });
    }
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

    // Utiliser deleteOne() au lieu de remove()
    await Artist.deleteOne({ _id: req.params.id });

    // Suppression du cache
    try {
      const redis = await getRedisConnection();
      const keys = await redis.queryCache.keys('query:/api/artists*');
      console.log('Clés à supprimer:', keys);

      if (keys.length > 0) {
        await Promise.all(keys.map(key => redis.queryCache.del(key)));
        console.log('Cache supprimé pour les clés:', keys);
      }
    } catch (cacheError) {
      logger.error('Erreur lors de la suppression du cache:', cacheError);
    }

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