const express = require('express');
const router = express.Router();
const Track = require('../../models/Track');
const Artist = require('../../models/Artist');
const Album = require('../../models/Album');
const { cacheQuery } = require('../../middleware/queryCache');
const logger = require('../../utils/logger');

// Get available genres
router.get('/genres', cacheQuery(3600), async (req, res) => {
  try {
    // Get unique genres from tracks and artists
    const [trackGenres, artistGenres] = await Promise.all([
      Track.distinct('genre'),
      Artist.distinct('genre')
    ]);

    // Combine genres and remove duplicates and empty values
    const uniqueGenres = [...new Set([...trackGenres, ...artistGenres])]
      .filter(genre => genre && genre.trim())
      .sort();

    // Define genre styles
    const genreStyles = {
      'pop': 'bg-gradient-to-br from-purple-500 to-pink-500',
      'hip-hop': 'bg-gradient-to-br from-orange-500 to-red-500',
      'rap': 'bg-gradient-to-br from-yellow-500 to-orange-500',
      'rock': 'bg-gradient-to-br from-red-500 to-rose-600',
      'electronic': 'bg-gradient-to-br from-blue-500 to-cyan-500',
      'dance': 'bg-gradient-to-br from-cyan-500 to-teal-500',
      'jazz': 'bg-gradient-to-br from-yellow-500 to-amber-600',
      'r&b': 'bg-gradient-to-br from-pink-500 to-rose-500',
      'soul': 'bg-gradient-to-br from-amber-500 to-orange-600',
      'classical': 'bg-gradient-to-br from-green-500 to-emerald-600',
      'metal': 'bg-gradient-to-br from-gray-700 to-gray-900'
    };

    const defaultGradients = [
      'bg-gradient-to-br from-indigo-500 to-purple-500',
      'bg-gradient-to-br from-blue-500 to-teal-500',
      'bg-gradient-to-br from-green-500 to-emerald-500',
      'bg-gradient-to-br from-orange-500 to-amber-500'
    ];

    // Format genres with basic counts
    const formattedGenres = await Promise.all(
      uniqueGenres.map(async genre => {
        const [trackCount, artistCount] = await Promise.all([
          Track.countDocuments({ genre }),
          Artist.countDocuments({ genre })
        ]);

        const genreId = genre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        return {
          id: genreId,
          name: genre,
          trackCount,
          artistCount,
          color: genreStyles[genreId] || 
            defaultGradients[Math.floor(Math.random() * defaultGradients.length)]
        };
      })
    );

    // Sort by total count and filter out empty genres
    const sortedGenres = formattedGenres
      .filter(genre => genre.trackCount + genre.artistCount > 0)
      .sort((a, b) => 
        (b.trackCount + b.artistCount) - (a.trackCount + a.artistCount)
      );

    res.json(sortedGenres);
  } catch (error) {
    logger.error('Get genres error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Advanced search endpoint
router.get('/', cacheQuery(3600), async (req, res) => {
  try {
    const {
      q,
      type = 'tracks',
      artist,
      album,
      genre,
      yearFrom,
      yearTo,
      durationFrom,
      durationTo,
      popularityMin,
      popularityMax,
      sort = 'popularity',
      order = 'desc',
      limit = 20,
      offset = 0
    } = req.query;

    // Build base query
    let query = {};

    // Text search
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ];
    }

    // Apply filters
    if (artist) {
      query['artist.name'] = { $regex: artist, $options: 'i' };
    }

    if (album) {
      query['album.title'] = { $regex: album, $options: 'i' };
    }

    if (genre) {
      query.genre = { $regex: genre, $options: 'i' };
    }

    // Year filter
    if (yearFrom || yearTo) {
      query.releaseDate = {};
      if (yearFrom) query.releaseDate.$gte = new Date(yearFrom, 0, 1);
      if (yearTo) query.releaseDate.$lte = new Date(yearTo, 11, 31);
    }

    // Duration filter
    if (durationFrom || durationTo) {
      query.duration = {};
      if (durationFrom) query.duration.$gte = parseInt(durationFrom);
      if (durationTo) query.duration.$lte = parseInt(durationTo);
    }

    // Popularity filter
    if (popularityMin || popularityMax) {
      query.popularity = {};
      if (popularityMin) query.popularity.$gte = parseInt(popularityMin);
      if (popularityMax) query.popularity.$lte = parseInt(popularityMax);
    }

    // Build sort query
    const sortQuery = {
      [sort === 'title' ? 'title' : sort]: order === 'desc' ? -1 : 1
    };

    // Get model based on type
    const Model = type === 'tracks' ? Track : type === 'artists' ? Artist : Album;

    // Execute query with pagination
    const [results, total] = await Promise.all([
      Model.find(query)
        .populate(type === 'tracks' ? ['artist', 'album'] : '')
        .sort(sortQuery)
        .skip(parseInt(offset))
        .limit(parseInt(limit)),
      Model.countDocuments(query)
    ]);

    res.json({
      results,
      pagination: {
        total,
        offset: parseInt(offset),
        limit: parseInt(limit),
        hasMore: total > (parseInt(offset) + parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Advanced search error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;