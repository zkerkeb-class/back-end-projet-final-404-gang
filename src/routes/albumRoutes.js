const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');
const getRedisConnection = require('../config/redis');

// Get all albums
router.get('/albums', cacheQuery(3600), async (req, res) => {
  try {
    const { 
      sort = 'releaseDate',
      order = 'desc',
      limit = 100,
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

    // Validation améliorée
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Un titre valide est requis' });
    }

    if (!artist) {
      return res.status(400).json({ error: 'L\'artiste est requis' });
    }

    if (genre && typeof genre !== 'string') {
      return res.status(400).json({ error: 'Le genre doit être une chaîne de caractères' });
    }

    const album = new Album({
      title: title.trim(),
      artist,
      releaseDate: releaseDate || new Date(),
      genre: genre?.trim(),
      coverImage
    });

    await album.save();

    // Suppression du cache
    try {
      const redis = await getRedisConnection();
      const keys = await redis.queryCache.keys('query:/api/albums*');
      console.log('Clés à supprimer:', keys);

      if (keys.length > 0) {
        await Promise.all(keys.map(key => redis.queryCache.del(key)));
        console.log('Cache supprimé pour les clés:', keys);
      }
    } catch (cacheError) {
      logger.error('Erreur lors de la suppression du cache:', cacheError);
    }

    res.status(201).json(album);
  } catch (error) {
    logger.error('Error creating album:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Données invalides', details: error.message });
    }
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

    const { title, artist, releaseDate, genre, coverImage, tracks } = req.body;

    // Validation des données
    if (title && (typeof title !== 'string' || title.trim().length === 0)) {
      return res.status(400).json({ error: 'Le titre doit être une chaîne valide' });
    }

    if (genre && typeof genre !== 'string') {
      return res.status(400).json({ error: 'Le genre doit être une chaîne de caractères' });
    }

    // Validation des tracks si fournies
    if (tracks) {
      if (!Array.isArray(tracks)) {
        return res.status(400).json({ error: 'Les tracks doivent être un tableau' });
      }

      // Vérifier que tous les IDs de tracks sont présents
      const trackIds = new Set(tracks.map(track => track._id || track));
      if (trackIds.size !== tracks.length) {
        return res.status(400).json({ error: 'Chaque track doit avoir un ID unique' });
      }
    }

    // Mise à jour des champs
    if (title) album.title = title.trim();
    if (artist) album.artist = artist;
    if (releaseDate) album.releaseDate = releaseDate;
    if (genre) album.genre = genre.trim();
    if (coverImage) album.coverImage = coverImage;
    if (tracks) {
      album.tracks = tracks;
    }

    await album.save();

    // Suppression du cache
    try {
      const redis = await getRedisConnection();
      const keys = await redis.queryCache.keys('query:/api/albums*');
      console.log('Clés à supprimer:', keys);

      if (keys.length > 0) {
        await Promise.all(keys.map(key => redis.queryCache.del(key)));
        console.log('Cache supprimé pour les clés:', keys);
      }
    } catch (cacheError) {
      logger.error('Erreur lors de la suppression du cache:', cacheError);
    }

    // Retourner l'album avec les tracks populées
    const updatedAlbum = await Album.findById(album._id)
      .populate('tracks')
      .populate('artist');

    res.json(updatedAlbum);
  } catch (error) {
    logger.error('Error updating album:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Données invalides', details: error.message });
    }
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

    // Utiliser deleteOne au lieu de remove
    await Album.deleteOne({ _id: req.params.id });

    // Suppression du cache
    try {
      const redis = await getRedisConnection();
      const keys = await redis.queryCache.keys('query:/api/albums*');
      console.log('Clés à supprimer:', keys);

      if (keys.length > 0) {
        await Promise.all(keys.map(key => redis.queryCache.del(key)));
        console.log('Cache supprimé pour les clés:', keys);
      }
    } catch (cacheError) {
      logger.error('Erreur lors de la suppression du cache:', cacheError);
    }

    res.json({ message: 'Album supprimé avec succès' });
  } catch (error) {
    logger.error('Error deleting album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get album's tracks
router.get('/albums/:id/tracks', cacheQuery(3600), async (req, res) => {
  try {
    const { 
      sort = 'trackNumber',
      order = 'asc'
    } = req.query;

    // Validation du tri
    const validSortFields = ['trackNumber', 'title', 'duration'];
    if (!validSortFields.includes(sort)) {
      return res.status(400).json({ 
        error: 'Champ de tri invalide. Utilisez: trackNumber, title, ou duration' 
      });
    }

    const album = await Album.findById(req.params.id)
      .populate({
        path: 'tracks',
        populate: {
          path: 'artist'
        },
        options: {
          sort: { [sort]: order === 'desc' ? -1 : 1 }
        }
      });

    if (!album) {
      return res.status(404).json({ error: 'Album non trouvé' });
    }

    res.json(album.tracks);
  } catch (error) {
    logger.error('Error fetching album tracks:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;