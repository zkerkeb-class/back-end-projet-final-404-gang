const express = require('express');
const router = express.Router();
const SearchService = require('../../services/searchService');
const { cacheQuery } = require('../../middleware/queryCache');
const logger = require('../../utils/logger');

// Main search endpoint that matches your frontend searchContent function
router.get('/', cacheQuery(3600), async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json({
        tracks: [],
        artists: [],
        albums: [],
        playlists: []
      });
    }

    const results = await SearchService.globalSearch(q);

    // Format response to match frontend expectations
    res.json({
      tracks: results.tracks.map(track => ({
        id: track._id,
        name: track.title,
        artist: track.artist?.name,
        duration: track.duration,
        image: track.images?.medium || track.album?.images?.medium,
        audioUrl: track.audioUrl
      })),
      artists: results.artists.map(artist => ({
        id: artist._id,
        name: artist.name,
        genre: artist.genre,
        image: artist.images?.medium,
        popularity: artist.popularity
      })),
      albums: results.albums.map(album => ({
        id: album._id,
        name: album.title,
        artist: album.artist?.name,
        image: album.images?.medium,
        releaseDate: album.releaseDate
      })),
      playlists: results.playlists.map(playlist => ({
        id: playlist._id,
        name: playlist.name,
        description: playlist.description,
        image: playlist.images?.medium
      }))
    });
  } catch (error) {
    logger.error('Global search error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router; 