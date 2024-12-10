const express = require('express');
const Track = require('../models/Track');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const Playlist = require('../models/Playlist');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');
const AutoCompleteService = require('../services/autoComplete');
const router = express.Router();

// Helper function to parse duration range
const parseDurationRange = (range) => {
  switch (range) {
    case 'short':
      return { min: 0, max: 180 }; // 0-3 minutes
    case 'medium':
      return { min: 181, max: 300 }; // 3-5 minutes
    case 'long':
      return { min: 301, max: Infinity }; // 5+ minutes
    default:
      return null;
  }
};

// Helper function to parse year range
const parseYearRange = (yearRange) => {
  if (!yearRange) return null;
  const [startYear, endYear] = yearRange.split('-').map(Number);
  return {
    start: new Date(startYear, 0, 1),
    end: endYear ? new Date(endYear, 11, 31) : new Date()
  };
};

// Helper function to get sort options
const getSortOptions = (sortBy, sortOrder = 'desc') => {
  const validSortFields = {
    track: ['title', 'duration', 'popularity', 'releaseDate'],
    album: ['title', 'releaseDate', 'trackCount'],
    artist: ['name', 'popularity'],
    playlist: ['name', 'trackCount', 'createdAt']
  };

  const sortOptions = {};
  if (sortBy && validSortFields[sortBy]) {
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
  }
  return sortOptions;
};

// Get all tracks with sorting
router.get('/tracks', cacheQuery(3600), async (req, res) => {
  try {
    const { sortBy = 'title', sortOrder = 'asc' } = req.query;
    const sortOptions = {};

    // Handle different sort fields
    switch (sortBy) {
      case 'duration':
      case 'popularity':
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'title':
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'artist':
        // Sort by artist name requires population
        break;
      default:
        sortOptions.title = 1;
    }

    const tracks = await retryOperation(async () => {
      let query = Track.find()
        .populate('artist')
        .populate('album');

      if (sortBy === 'artist') {
        // Special handling for artist name sorting
        query = query.populate({
          path: 'artist',
          options: { sort: { name: sortOrder === 'asc' ? 1 : -1 } }
        });
      } else {
        query = query.sort(sortOptions);
      }

      return await query;
    });

    res.json({
      results: tracks,
      count: tracks.length,
      sorting: { sortBy, sortOrder }
    });
  } catch (error) {
    logger.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all albums with sorting
router.get('/albums', cacheQuery(3600), async (req, res) => {
  try {
    const { sortBy = 'releaseDate', sortOrder = 'desc' } = req.query;
    const sortOptions = {};

    // Handle different sort fields
    switch (sortBy) {
      case 'releaseDate':
        sortOptions.releaseDate = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'trackCount':
        // Will be handled after population
        break;
      case 'title':
        sortOptions.title = sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sortOptions.releaseDate = -1;
    }

    let albums = await retryOperation(async () => {
      return await Album.find()
        .populate('artist')
        .populate('tracks')
        .sort(sortOptions);
    });

    // Handle track count sorting
    if (sortBy === 'trackCount') {
      albums = albums.sort((a, b) => {
        const diff = a.tracks.length - b.tracks.length;
        return sortOrder === 'asc' ? diff : -diff;
      });
    }

    res.json({
      results: albums,
      count: albums.length,
      sorting: { sortBy, sortOrder }
    });
  } catch (error) {
    logger.error('Error fetching albums:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all artists with sorting
router.get('/artists', cacheQuery(3600), async (req, res) => {
  try {
    const { sortBy = 'name', sortOrder = 'asc' } = req.query;
    const sortOptions = {};

    // Handle different sort fields
    switch (sortBy) {
      case 'name':
        sortOptions.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'popularity':
        sortOptions.popularity = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'trackCount':
        // Will be handled after population
        break;
      default:
        sortOptions.name = 1;
    }

    let artists = await retryOperation(async () => {
      return await Artist.find()
        .populate('tracks')
        .populate('albums')
        .sort(sortOptions);
    });

    // Handle track count sorting
    if (sortBy === 'trackCount') {
      artists = artists.sort((a, b) => {
        const diff = a.tracks.length - b.tracks.length;
        return sortOrder === 'asc' ? diff : -diff;
      });
    }

    res.json({
      results: artists,
      count: artists.length,
      sorting: { sortBy, sortOrder }
    });
  } catch (error) {
    logger.error('Error fetching artists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all playlists with sorting
router.get('/playlists', cacheQuery(3600), async (req, res) => {
  try {
    const { sortBy = 'name', sortOrder = 'asc' } = req.query;
    const sortOptions = {};

    // Handle different sort fields
    switch (sortBy) {
      case 'name':
        sortOptions.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'trackCount':
        // Will be handled after population
        break;
      case 'createdAt':
        sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sortOptions.name = 1;
    }

    let playlists = await retryOperation(async () => {
      return await Playlist.find()
        .populate({
          path: 'tracks',
          populate: [
            { path: 'artist' },
            { path: 'album' }
          ]
        })
        .sort(sortOptions);
    });

    // Handle track count sorting
    if (sortBy === 'trackCount') {
      playlists = playlists.sort((a, b) => {
        const diff = a.tracks.length - b.tracks.length;
        return sortOrder === 'asc' ? diff : -diff;
      });
    }

    res.json({
      results: playlists,
      count: playlists.length,
      sorting: { sortBy, sortOrder }
    });
  } catch (error) {
    logger.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtenir des suggestions de recherche
router.get('/suggestions', async (req, res) => {
  try {
    const { 
      q, // Le texte de recherche
      type = 'general', // Le type de suggestion (general, artist, album, track)
      limit = 10 // Nombre maximum de suggestions
    } = req.query;
    
    const userId = req.session.userId; // Supposant que l'ID utilisateur est stocké dans la session

    if (!q) {
      // Si pas de requête, retourner les recherches populaires
      const popular = await AutoCompleteService.getPopularSearches(type, limit);
      return res.json({
        suggestions: popular,
        type: 'popular'
      });
    }

    // Obtenir les suggestions personnalisées
    const suggestions = await AutoCompleteService.getSuggestions(
      userId,
      q,
      type,
      limit
    );

    res.json({
      suggestions,
      type: 'suggestions',
      query: q
    });
  } catch (error) {
    logger.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtenir les recherches populaires
router.get('/trending', async (req, res) => {
  try {
    const { type = 'general', limit = 10 } = req.query;
    const trending = await AutoCompleteService.getPopularSearches(type, limit);
    
    res.json({
      trending,
      type
    });
  } catch (error) {
    logger.error('Error getting trending searches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recherche avancée avec filtres et tri
router.get('/search', cacheQuery(3600), async (req, res) => {
  try {
    const {
      q, // Texte de recherche
      artist,
      album,
      genre,
      yearRange,
      durationRange,
      minPopularity,
      playlist,
      sortBy = 'title',
      sortOrder = 'asc'
    } = req.query;

    const userId = req.session.userId;

    // Ajouter la recherche à l'historique si un texte de recherche est fourni
    if (userId && q) {
      await AutoCompleteService.addToSearchHistory(userId, q);
      
      // Mettre à jour la préférence de genre si un filtre de genre est utilisé
      if (genre) {
        await AutoCompleteService.updateUserGenrePreference(userId, genre);
      }
    }

    const searchCriteria = {};
    let playlistTracks = null;

    // Filtre par playlist
    if (playlist) {
      const playlistDoc = await retryOperation(async () => {
        return await Playlist.findById(playlist).select('tracks');
      });
      if (playlistDoc) {
        playlistTracks = playlistDoc.tracks;
        searchCriteria._id = { $in: playlistTracks };
      }
    }

    // Filtre par artiste
    if (artist) {
      const artistDoc = await retryOperation(async () => {
        return await Artist.findById(artist);
      });
      if (artistDoc) {
        searchCriteria.artist = artistDoc._id;
      }
    }

    // Filtre par album
    if (album) {
      const albumDoc = await retryOperation(async () => {
        return await Album.findById(album);
      });
      if (albumDoc) {
        searchCriteria.album = albumDoc._id;
      }
    }

    // Filtre par genre
    if (genre) {
      searchCriteria.genre = new RegExp(genre, 'i');
    }

    // Filtre par plage d'années
    if (yearRange) {
      const range = parseYearRange(yearRange);
      if (range) {
        searchCriteria['album.releaseDate'] = {
          $gte: range.start,
          $lte: range.end
        };
      }
    }

    // Filtre par durée
    if (durationRange) {
      const range = parseDurationRange(durationRange);
      if (range) {
        searchCriteria.duration = {
          $gte: range.min,
          ...(range.max !== Infinity && { $lte: range.max })
        };
      }
    }

    // Filtre par popularité
    if (minPopularity) {
      searchCriteria.popularity = { $gte: parseInt(minPopularity) };
    }

    // Recherche textuelle si une requête est fournie
    if (q) {
      searchCriteria.$or = [
        { title: new RegExp(q, 'i') },
        { 'artist.name': new RegExp(q, 'i') },
        { 'album.title': new RegExp(q, 'i') }
      ];

      // Ajouter la suggestion au genre si un genre est spécifié
      if (genre) {
        await AutoCompleteService.addGenreSuggestion(genre, q);
      }
    }

    // Options de tri
    const sortOptions = {};
    switch (sortBy) {
      case 'duration':
      case 'popularity':
      case 'title':
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'artist':
        // Géré via la population
        break;
      case 'releaseDate':
        sortOptions['album.releaseDate'] = sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sortOptions.title = 1;
    }

    let tracks = await retryOperation(async () => {
      let query = Track.find(searchCriteria);

      if (sortBy === 'artist') {
        query = query.populate({
          path: 'artist',
          options: { sort: { name: sortOrder === 'asc' ? 1 : -1 } }
        });
      } else {
        query = query.sort(sortOptions);
      }

      return await query.populate('album');
    });

    // Appliquer le filtrage par playlist après la récupération si nécessaire
    if (playlistTracks) {
      tracks = tracks.filter(track => 
        playlistTracks.some(pt => pt.equals(track._id))
      );
    }

    res.json({
      results: tracks,
      count: tracks.length,
      filters: {
        q,
        artist,
        album,
        genre,
        yearRange,
        durationRange,
        minPopularity,
        playlist
      },
      sorting: { sortBy, sortOrder }
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tracks by artist
router.get('/artists/:id/tracks', cacheQuery(3600), async (req, res) => {
  try {
    const { genre, yearRange, durationRange, minPopularity, sortBy, sortOrder = 'desc' } = req.query;
    const searchCriteria = { artist: req.params.id };

    // Apply additional filters
    if (genre) {
      searchCriteria.genre = new RegExp(genre, 'i');
    }

    if (yearRange) {
      const range = parseYearRange(yearRange);
      if (range) {
        searchCriteria['album.releaseDate'] = {
          $gte: range.start,
          $lte: range.end
        };
      }
    }

    if (durationRange) {
      const range = parseDurationRange(durationRange);
      if (range) {
        searchCriteria.duration = {
          $gte: range.min,
          ...(range.max !== Infinity && { $lte: range.max })
        };
      }
    }

    if (minPopularity) {
      searchCriteria.popularity = { $gte: parseInt(minPopularity) };
    }

    // Build sort options
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    const tracks = await retryOperation(async () => {
      return await Track.find(searchCriteria)
        .sort(sortOptions)
        .populate('album');
    });

    res.json({
      results: tracks,
      count: tracks.length,
      filters: {
        genre,
        yearRange,
        durationRange,
        minPopularity
      }
    });
  } catch (error) {
    logger.error('Error fetching artist tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tracks by album
router.get('/albums/:id/tracks', cacheQuery(3600), async (req, res) => {
  try {
    const { durationRange, minPopularity, sortBy, sortOrder = 'desc' } = req.query;
    const searchCriteria = { album: req.params.id };

    if (durationRange) {
      const range = parseDurationRange(durationRange);
      if (range) {
        searchCriteria.duration = {
          $gte: range.min,
          ...(range.max !== Infinity && { $lte: range.max })
        };
      }
    }

    if (minPopularity) {
      searchCriteria.popularity = { $gte: parseInt(minPopularity) };
    }

    // Build sort options
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    const tracks = await retryOperation(async () => {
      return await Track.find(searchCriteria)
        .sort(sortOptions)
        .populate('artist');
    });

    res.json({
      results: tracks,
      count: tracks.length,
      filters: {
        durationRange,
        minPopularity
      }
    });
  } catch (error) {
    logger.error('Error fetching album tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tracks by genre
router.get('/tracks/genre/:genre', cacheQuery(3600), async (req, res) => {
  try {
    const { yearRange, durationRange, minPopularity, sortBy, sortOrder = 'desc' } = req.query;
    const searchCriteria = { genre: new RegExp(req.params.genre, 'i') };

    if (yearRange) {
      const range = parseYearRange(yearRange);
      if (range) {
        searchCriteria['album.releaseDate'] = {
          $gte: range.start,
          $lte: range.end
        };
      }
    }

    if (durationRange) {
      const range = parseDurationRange(durationRange);
      if (range) {
        searchCriteria.duration = {
          $gte: range.min,
          ...(range.max !== Infinity && { $lte: range.max })
        };
      }
    }

    if (minPopularity) {
      searchCriteria.popularity = { $gte: parseInt(minPopularity) };
    }

    // Build sort options
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    const tracks = await retryOperation(async () => {
      return await Track.find(searchCriteria)
        .sort(sortOptions)
        .populate('artist')
        .populate('album');
    });

    res.json({
      results: tracks,
      count: tracks.length,
      filters: {
        yearRange,
        durationRange,
        minPopularity
      }
    });
  } catch (error) {
    logger.error('Error fetching tracks by genre:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tracks by playlist
router.get('/playlists/:id/tracks', cacheQuery(3600), async (req, res) => {
  try {
    const { genre, yearRange, durationRange, minPopularity, sortBy, sortOrder = 'desc' } = req.query;

    const playlist = await retryOperation(async () => {
      return await Playlist.findById(req.params.id).populate({
        path: 'tracks',
        populate: [
          { path: 'artist' },
          { path: 'album' }
        ]
      });
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    let tracks = playlist.tracks;

    // Apply filters
    if (genre) {
      tracks = tracks.filter(track => 
        new RegExp(genre, 'i').test(track.genre)
      );
    }

    if (yearRange) {
      const range = parseYearRange(yearRange);
      if (range) {
        tracks = tracks.filter(track =>
          track.album.releaseDate >= range.start &&
          track.album.releaseDate <= range.end
        );
      }
    }

    if (durationRange) {
      const range = parseDurationRange(durationRange);
      if (range) {
        tracks = tracks.filter(track =>
          track.duration >= range.min &&
          (range.max === Infinity || track.duration <= range.max)
        );
      }
    }

    if (minPopularity) {
      const minPop = parseInt(minPopularity);
      tracks = tracks.filter(track => track.popularity >= minPop);
    }

    // Apply sorting
    if (sortBy) {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      tracks.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return (aVal - bVal) * multiplier;
      });
    }

    res.json({
      results: tracks,
      count: tracks.length,
      filters: {
        genre,
        yearRange,
        durationRange,
        minPopularity
      }
    });
  } catch (error) {
    logger.error('Error fetching playlist tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;