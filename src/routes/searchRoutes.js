const express = require('express');
const router = express.Router();
const Track = require('../models/Track');
const Album = require('../models/Album');
const Artist = require('../models/Artist');
const Playlist = require('../models/Playlist');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');
const AutoCompleteService = require('../services/autoComplete');

// Recherche globale avec support phonétique et similarité
router.get('/search', cacheQuery(3600), async (req, res) => {
  try {
    const { q, type = 'all', limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    // Split query into keywords
    const keywords = q.toLowerCase().split(/\s+/);
    const results = {};

    // Record search for autocomplete
    await AutoCompleteService.addToSearchHistory('general', q);

    // Build search query with multiple conditions
    const searchQuery = {
      $or: [
        // Phonetic search
        { phoneticCode: { $in: keywords.map(word => require('phonetics').metaphone(word)) } },
        // Regex search for partial matches
        { 
          $or: keywords.map(keyword => ({
            $or: [
              { name: { $regex: keyword, $options: 'i' } },
              { title: { $regex: keyword, $options: 'i' } }
            ]
          }))
        }
      ]
    };

    if (type === 'all' || type === 'tracks') {
      results.tracks = await Track.find(searchQuery)
        .populate({
          path: 'artist',
          select: 'name images'
        })
        .populate({
          path: 'album',
          select: 'title images'
        })
        .limit(parseInt(limit))
        .select('title duration audioUrl images');
    }

    if (type === 'all' || type === 'albums') {
      results.albums = await Album.find(searchQuery)
        .populate({
          path: 'artist',
          select: 'name'
        })
        .limit(parseInt(limit))
        .select('title releaseDate images');
    }

    if (type === 'all' || type === 'artists') {
      results.artists = await Artist.find(searchQuery)
        .limit(parseInt(limit))
        .select('name genre images popularity');
    }

    if (type === 'all' || type === 'playlists') {
      results.playlists = await Playlist.find({
        name: { $regex: q, $options: 'i' }
      })
        .limit(parseInt(limit))
        .select('name description images');
    }

    // Format response
    const formattedResults = {
      tracks: results.tracks?.map(track => ({
        id: track._id,
        title: track.title,
        duration: track.duration,
        audioUrl: track.audioUrl,
        image: track.images?.medium || track.album?.images?.medium,
        artist: track.artist?.name,
        album: track.album?.title
      })) || [],
      
      artists: results.artists?.map(artist => ({
        id: artist._id,
        name: artist.name,
        genre: artist.genre,
        image: artist.images?.medium,
        popularity: artist.popularity
      })) || [],
      
      albums: results.albums?.map(album => ({
        id: album._id,
        title: album.title,
        image: album.images?.medium,
        artist: album.artist?.name,
        releaseDate: album.releaseDate
      })) || [],
      
      playlists: results.playlists?.map(playlist => ({
        id: playlist._id,
        name: playlist.name,
        description: playlist.description,
        image: playlist.images?.medium
      })) || []
    };

    res.json(formattedResults);
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


// Recherche de pistes
router.get('/tracks', cacheQuery(3600), async (req, res) => {
  try {
    const { 
      q, 
      genre, 
      minDuration, 
      maxDuration,
      minYear,
      maxYear,
      minPopularity,
      sort = 'popularity',
      order = 'desc',
      limit = 10,
      offset = 0
    } = req.query;

    let query = {};
    
    // Recherche textuelle
    if (q) {
      query.$text = { $search: q };
    }

    // Filtres
    if (genre) {
      query.genre = genre;
    }

    if (minDuration || maxDuration) {
      query.duration = {};
      if (minDuration) query.duration.$gte = parseInt(minDuration);
      if (maxDuration) query.duration.$lte = parseInt(maxDuration);
    }

    if (minYear || maxYear) {
      query.releaseDate = {};
      if (minYear) query.releaseDate.$gte = new Date(minYear, 0, 1);
      if (maxYear) query.releaseDate.$lte = new Date(maxYear, 11, 31);
    }

    if (minPopularity) {
      query.popularity = { $gte: parseInt(minPopularity) };
    }

    // Tri
    let sortQuery = {};
    switch (sort) {
      case 'title':
        sortQuery.title = order === 'desc' ? -1 : 1;
        break;
      case 'duration':
        sortQuery.duration = order === 'desc' ? -1 : 1;
        break;
      case 'releaseDate':
        sortQuery.releaseDate = order === 'desc' ? -1 : 1;
        break;
      case 'popularity':
      default:
        sortQuery.popularity = order === 'desc' ? -1 : 1;
    }

    const tracks = await Track.find(query)
      .sort(sortQuery)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('artist album');

    res.json(tracks);
  } catch (error) {
    logger.error('Track search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recherche d'albums
router.get('/albums', cacheQuery(3600), async (req, res) => {
  try {
    const { 
      q, 
      genre,
      minYear,
      maxYear,
      sort = 'releaseDate',
      order = 'desc',
      limit = 10,
      offset = 0
    } = req.query;

    let query = {};
    
    // Recherche textuelle
    if (q) {
      query.$text = { $search: q };
    }

    // Filtres
    if (genre) {
      query.genre = genre;
    }

    if (minYear || maxYear) {
      query.releaseDate = {};
      if (minYear) query.releaseDate.$gte = new Date(minYear, 0, 1);
      if (maxYear) query.releaseDate.$lte = new Date(maxYear, 11, 31);
    }

    // Tri
    let sortQuery = {};
    switch (sort) {
      case 'title':
        sortQuery.title = order === 'desc' ? -1 : 1;
        break;
      case 'releaseDate':
      default:
        sortQuery.releaseDate = order === 'desc' ? -1 : 1;
    }

    const albums = await Album.find(query)
      .sort(sortQuery)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('artist');

    res.json(albums);
  } catch (error) {
    logger.error('Album search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recherche d'artistes
router.get('/artists', cacheQuery(3600), async (req, res) => {
  try {
    const { 
      q, 
      genre,
      minPopularity,
      sort = 'popularity',
      order = 'desc',
      limit = 10,
      offset = 0
    } = req.query;

    let query = {};
    
    // Recherche textuelle
    if (q) {
      query.$text = { $search: q };
    }

    // Filtres
    if (genre) {
      query.genres = genre;
    }

    if (minPopularity) {
      query.popularity = { $gte: parseInt(minPopularity) };
    }

    // Tri
    let sortQuery = {};
    switch (sort) {
      case 'name':
        sortQuery.name = order === 'desc' ? -1 : 1;
        break;
      case 'popularity':
      default:
        sortQuery.popularity = order === 'desc' ? -1 : 1;
    }

    const artists = await Artist.find(query)
      .sort(sortQuery)
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    res.json(artists);
  } catch (error) {
    logger.error('Artist search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Suggestions de recherche
router.get('/suggestions', cacheQuery(300), async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const suggestions = await AutoCompleteService.getSuggestions(q, parseInt(limit));
    res.json(suggestions);
  } catch (error) {
    logger.error('Search suggestions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recherches populaires
router.get('/trending', cacheQuery(3600), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const trending = await AutoCompleteService.getTrendingSearches(parseInt(limit));
    res.json(trending);
  } catch (error) {
    logger.error('Trending searches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;