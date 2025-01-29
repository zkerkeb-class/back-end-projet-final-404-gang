const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { processImage } = require('../utils/imageProcessing');
const { uploadAudio, deleteAudio } = require('../utils/audioUpload');
const Album = require('../models/Album');
const Track = require('../models/Track');
const logger = require('../utils/logger');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio and image files
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and image files are allowed'));
    }
  }
});

// Upload audio file
router.post('/upload/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Convert buffer to base64
    const base64Audio = req.file.buffer.toString('base64');
    const audioData = `data:${req.file.mimetype};base64,${base64Audio}`;

    // Upload to Cloudinary
    const result = await uploadAudio(audioData, {
      resource_type: 'video', // Cloudinary uses 'video' type for audio files
      folder: 'tracks',
      format: 'mp3'
    });

    res.json({
      url: result.url,
      duration: result.duration,
      publicId: result.publicId
    });
  } catch (error) {
    logger.error('Error uploading audio:', error);
    res.status(500).json({ error: 'Failed to upload audio file' });
  }
});

// Upload image file
router.post('/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const imageData = `data:${req.file.mimetype};base64,${base64Image}`;

    // Upload to Cloudinary with image processing
    const result = await cloudinary.uploader.upload(imageData, {
      folder: 'images',
      transformation: [
        // Generate different sizes
        { width: 150, height: 150, crop: 'fill', quality: 'auto', format: 'auto' },
        { width: 300, height: 300, crop: 'fill', quality: 'auto', format: 'auto' },
        { width: 500, height: 500, crop: 'fill', quality: 'auto', format: 'auto' },
        { width: 800, height: 800, crop: 'fill', quality: 'auto', format: 'auto' }
      ]
    });

    // Process and return image versions
    const imageVersions = {
      thumbnail: cloudinary.url(result.public_id, { width: 150, height: 150, crop: 'fill' }),
      small: cloudinary.url(result.public_id, { width: 300, height: 300, crop: 'fill' }),
      medium: cloudinary.url(result.public_id, { width: 500, height: 500, crop: 'fill' }),
      large: cloudinary.url(result.public_id, { width: 800, height: 800, crop: 'fill' }),
      original: result.secure_url
    };

    res.json({
      images: imageVersions,
      publicId: result.public_id
    });
  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image file' });
  }
});

// Delete audio file
router.delete('/upload/audio/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    await deleteAudio(publicId);
    res.json({ message: 'Audio file deleted successfully' });
  } catch (error) {
    logger.error('Error deleting audio:', error);
    res.status(500).json({ error: 'Failed to delete audio file' });
  }
});

// Delete image file
router.delete('/upload/image/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    await cloudinary.uploader.destroy(publicId);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    logger.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image file' });
  }
});

// Update album images
router.post('/album/:albumId/image', upload.single('image'), async (req, res) => {
  try {
    const { albumId } = req.params;
    const album = await Album.findById(albumId);

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const imageData = `data:${req.file.mimetype};base64,${base64Image}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imageData, {
      folder: 'albums',
      transformation: [
        { width: 150, height: 150, crop: 'fill', quality: 'auto', format: 'auto' },
        { width: 300, height: 300, crop: 'fill', quality: 'auto', format: 'auto' },
        { width: 500, height: 500, crop: 'fill', quality: 'auto', format: 'auto' },
        { width: 800, height: 800, crop: 'fill', quality: 'auto', format: 'auto' }
      ]
    });

    // Update album images
    album.images = {
      thumbnail: cloudinary.url(result.public_id, { width: 150, height: 150, crop: 'fill' }),
      small: cloudinary.url(result.public_id, { width: 300, height: 300, crop: 'fill' }),
      medium: cloudinary.url(result.public_id, { width: 500, height: 500, crop: 'fill' }),
      large: cloudinary.url(result.public_id, { width: 800, height: 800, crop: 'fill' }),
      original: result.secure_url
    };

    await album.save();

    res.json({
      message: 'Album image updated successfully',
      images: album.images
    });
  } catch (error) {
    logger.error('Error updating album image:', error);
    res.status(500).json({ error: 'Failed to update album image' });
  }
});

// Update track audio
router.post('/track/:trackId/audio', upload.single('audio'), async (req, res) => {
  try {
    const { trackId } = req.params;
    const track = await Track.findById(trackId);

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Convert buffer to base64
    const base64Audio = req.file.buffer.toString('base64');
    const audioData = `data:${req.file.mimetype};base64,${base64Audio}`;

    // Upload to Cloudinary
    const result = await uploadAudio(audioData, {
      resource_type: 'video',
      folder: 'tracks',
      format: 'mp3'
    });

    // Update track audio URL
    track.audioUrl = result.url;
    track.duration = result.duration || 0;
    await track.save();

    res.json({
      message: 'Track audio updated successfully',
      audioUrl: track.audioUrl,
      duration: track.duration
    });
  } catch (error) {
    logger.error('Error updating track audio:', error);
    res.status(500).json({ error: 'Failed to update track audio' });
  }
});

module.exports = router;