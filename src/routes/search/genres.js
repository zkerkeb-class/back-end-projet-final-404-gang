const express = require('express');
const router = express.Router();
const Track = require('../../models/Track');
const Artist = require('../../models/Artist');
const { cacheQuery } = require('../../middleware/queryCache');
const logger = require('../../utils/logger');

// Get all available genres with styling
router.get('/', cacheQuery(3600), async (req, res) => {
  try {
    const [trackGenres, artistGenres] = await Promise.all([
      Track.distinct('genre'),
      Artist.distinct('genre')
    ]);

    const uniqueGenres = [...new Set([...trackGenres, ...artistGenres])]
      .filter(genre => genre && genre.trim())
      .sort();

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

// Search by genre
router.get('/:genre', cacheQuery(3600), async (req, res) => {
  try {
    const { genre } = req.params;
    const query = { genre: { $regex: new RegExp(genre, 'i') } };

    const [tracks, artists, albums] = await Promise.all([
      Track.find(query)
        .populate('artist', 'name images')
        .populate('album', 'title images')
        .limit(10)
        .select('title duration audioUrl images'),
      Artist.find(query)
        .limit(6)
        .select('name genre images popularity'),
      Album.find(query)
        .populate('artist', 'name')
        .limit(10)
        .select('title releaseDate images')
    ]);

    res.json({
      tracks: tracks.map(track => ({
        id: track._id,
        title: track.title,
        duration: track.duration,
        audioUrl: track.audioUrl,
        image: track.images?.medium || track.album?.images?.medium,
        artist: track.artist?.name,
        album: track.album?.title
      })),
      artists: artists.map(artist => ({
        id: artist._id,
        name: artist.name,
        genre: artist.genre,
        image: artist.images?.medium,
        popularity: artist.popularity
      })),
      albums: albums.map(album => ({
        id: album._id,
        title: album.title,
        image: album.images?.medium,
        artist: album.artist?.name,
        releaseDate: album.releaseDate
      }))
    });
  } catch (error) {
    logger.error('Genre search error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router; 