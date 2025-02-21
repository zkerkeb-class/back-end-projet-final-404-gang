const express = require('express');
const router = express.Router();
const multer = require('multer');
const { convertAndUploadAudio, deleteAudio } = require('../utils/audioConversion');
const logger = require('../utils/logger');
const Track = require('../models/Track');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = '/tmp/audio-uploads';
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// Upload and convert audio file
// auth 
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const {
      title,
      artistId,
      albumId,
      genre
    } = req.body;

    // Convert and upload the audio file
    const audioUrls = await convertAndUploadAudio(req.file.path, {
      folder: 'spotifyclone/tracks',
      bitRate: '192k'
    });

    // Create new track in database
    const track = await Track.create({
      title: title,
      artist: artistId,
      album: albumId,
      genre: genre,
      duration: audioUrls.duration,
      audioUrl: audioUrls.original,
      audioFormats: {
        mp3: audioUrls.mp3,
        wav: audioUrls.wav,
        aac: audioUrls.aac
      }
    });

    // Populate artist and album information
    await track.populate([
      { path: 'artist', select: 'name images' },
      { path: 'album', select: 'title images' }
    ]);

    res.status(201).json({
      message: 'Track uploaded successfully',
      track
    });

  } catch (error) {
    logger.error('Audio upload error:', error);
    res.status(500).json({
      message: 'Failed to upload audio',
      error: error.message
    });
  }
});

// Delete audio file
router.delete('/:trackId', auth, async (req, res) => {
  try {
    const track = await Track.findById(req.params.trackId);
    
    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    // Extract public_id from audioUrl
    const publicId = track.audioUrl.split('/').slice(-1)[0].split('.')[0];
    
    // Delete from Cloudinary
    await deleteAudio(publicId);

    // Delete track from database
    await Track.deleteOne({ _id: req.params.trackId });

    res.json({ message: 'Track deleted successfully' });

  } catch (error) {
    logger.error('Audio deletion error:', error);
    res.status(500).json({
      message: 'Failed to delete audio',
      error: error.message
    });
  }
});

// Get track details
router.get('/:trackId', async (req, res) => {
  try {
    const track = await Track.findById(req.params.trackId)
      .populate('artist', 'name images')
      .populate('album', 'title images');

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    res.json(track);
  } catch (error) {
    logger.error('Get track error:', error);
    res.status(500).json({
      message: 'Failed to get track details',
      error: error.message
    });
  }
});

// Update track details
router.patch('/:trackId', auth, async (req, res) => {
  try {
    const allowedUpdates = ['title', 'genre'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    const track = await Track.findByIdAndUpdate(
      req.params.trackId,
      updates,
      { new: true, runValidators: true }
    ).populate('artist album');

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    res.json(track);
  } catch (error) {
    logger.error('Update track error:', error);
    res.status(500).json({
      message: 'Failed to update track',
      error: error.message
    });
  }
});

module.exports = router; 