const express = require('express');
const router = express.Router();
const CacheInvalidationService = require('../services/cacheInvalidation');
const { cacheQuery } = require('../middleware/queryCache');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');
const Track = require('../models/Track');
const { convertAudio } = require('../utils/audioConversion');
const SimilarityService = require('../services/similarityService');

router.get('/tracks/:id/audio', cacheQuery(3600), async (req, res) => {
  try {
    const { format = 'mp3', bitrate = '128k' } = req.query;
    const validFormats = ['mp3', 'ogg', 'wav'];
    const validBitrates = ['64k', '128k', '192k', '256k', '320k'];
    
    if (!validFormats.includes(format)) {
      return res.status(400).json({ 
        error: 'Invalid format parameter',
        validFormats
      });
    }

    if (!validBitrates.includes(bitrate)) {
      return res.status(400).json({
        error: 'Invalid bitrate parameter',
        validBitrates
      });
    }

    const track = await retryOperation(async () => {
      return await Track.findById(req.params.id).select('audioUrl');
    });
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    if (!track.audioUrl) {
      return res.status(404).json({ error: 'Audio not found for this track' });
    }

    // Return the audio URL with format and bitrate info
    res.json({
      audioUrl: track.audioUrl,
      format,
      bitrate,
      availableFormats: validFormats,
      availableBitrates: validBitrates
    });
  } catch (error) {
    logger.error('Error fetching track audio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/tracks/:id/audio', async (req, res) => {
  try {
    const track = await retryOperation(async () => {
      return await Track.findById(req.params.id);
    });
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioUrl = await retryOperation(async () => {
      return await convertAudio(req.file.path, 'mp3');
    });

    track.audioUrl = audioUrl;
    await retryOperation(async () => {
      await track.save();
    });

    // Invalidate related caches
    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'track', id: track._id, albumId: track.album },
        'update'
      );
    });

    res.json({
      message: 'Audio uploaded and converted successfully',
      audioUrl
    });
  } catch (error) {
    logger.error('Error uploading track audio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tracks/:id', cacheQuery(3600), async (req, res) => {
  try {
    const track = await retryOperation(async () => {
      return await Track.findById(req.params.id)
        .populate('artist')
        .populate('album');
    });
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    res.json(track);
  } catch (error) {
    logger.error('Error fetching track:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/tracks/:id', async (req, res) => {
  try {
    const track = await retryOperation(async () => {
      return await Track.findByIdAndUpdate(req.params.id, req.body, { new: true });
    });
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    // Invalidate related caches
    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'track', id: track._id, albumId: track.album },
        'update'
      );
    });

    res.json(track);
  } catch (error) {
    logger.error('Error updating track:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/tracks/:id', async (req, res) => {
  try {
    const track = await retryOperation(async () => {
      return await Track.findByIdAndDelete(req.params.id);
    });
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    // Invalidate related caches
    await retryOperation(async () => {
      await CacheInvalidationService.invalidateRelatedCaches(
        { type: 'track', id: track._id, albumId: track.album },
        'delete'
      );
    });

    res.json({ message: 'Track deleted successfully' });
  } catch (error) {
    logger.error('Error deleting track:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trouver des morceaux similaires
router.get('/tracks/:id/similar', cacheQuery(3600), async (req, res) => {
  try {
    const {
      limit = 10,
      minScore = 0.5,
      includeArtist = true,
      includeAlbum = true,
      includeGenre = true
    } = req.query;

    const similarTracks = await SimilarityService.findSimilarTracks(
      req.params.id,
      {
        limit: parseInt(limit),
        minScore: parseFloat(minScore),
        includeArtistTracks: includeArtist === 'true',
        includeAlbumTracks: includeAlbum === 'true',
        includeGenreTracks: includeGenre === 'true'
      }
    );

    res.json({
      sourceTrackId: req.params.id,
      similarTracks,
      count: similarTracks.length,
      filters: {
        limit,
        minScore,
        includeArtist,
        includeAlbum,
        includeGenre
      }
    });
  } catch (error) {
    logger.error('Error finding similar tracks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trouver des morceaux similaires par caractéristiques spécifiques
router.get('/tracks/:id/similar-by-features', cacheQuery(3600), async (req, res) => {
  try {
    const { features = [] } = req.query;
    const validFeatures = ['genre', 'duration', 'popularity'];
    
    // Valider les caractéristiques demandées
    const requestedFeatures = Array.isArray(features) 
      ? features 
      : features.split(',');

    const validatedFeatures = requestedFeatures.filter(
      feature => validFeatures.includes(feature)
    );

    if (validatedFeatures.length === 0) {
      return res.status(400).json({
        error: 'No valid features specified',
        validFeatures
      });
    }

    const similarTracks = await SimilarityService.findSimilarByFeatures(
      req.params.id,
      validatedFeatures
    );

    res.json({
      sourceTrackId: req.params.id,
      similarTracks,
      count: similarTracks.length,
      features: validatedFeatures
    });
  } catch (error) {
    logger.error('Error finding similar tracks by features:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 