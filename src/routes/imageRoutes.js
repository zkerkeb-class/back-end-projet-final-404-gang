const express = require('express');
const router = express.Router();
const multer = require('multer');
const { processAndUploadImage, deleteImage } = require('../utils/imageProcessing');
const logger = require('../utils/logger');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const auth = require('../middleware/auth');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/tmp/image-uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Upload artist image
router.post('/artist/:artistId', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const artist = await Artist.findById(req.params.artistId);
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    // Process and upload the image
    const imageUrls = await processAndUploadImage(req.file.path, {
      folder: 'spotifyclone/artists'
    });

    // Update artist with new images
    artist.images = {
      original: imageUrls.original,
      thumbnail: imageUrls.thumbnail,
      small: imageUrls.small,
      medium: imageUrls.medium,
      large: imageUrls.large
    };

    await artist.save();

    res.json({
      message: 'Artist image uploaded successfully',
      artist
    });

  } catch (error) {
    logger.error('Artist image upload error:', error);
    res.status(500).json({
      message: 'Failed to upload artist image',
      error: error.message
    });
  }
});

// Upload album cover
router.post('/album/:albumId', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const album = await Album.findById(req.params.albumId);
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    // Process and upload the image
    const imageUrls = await processAndUploadImage(req.file.path, {
      folder: 'spotifyclone/albums'
    });

    // Update album with new images
    album.images = {
      original: imageUrls.original,
      thumbnail: imageUrls.thumbnail,
      small: imageUrls.small,
      medium: imageUrls.medium,
      large: imageUrls.large
    };

    await album.save();

    res.json({
      message: 'Album cover uploaded successfully',
      album
    });

  } catch (error) {
    logger.error('Album cover upload error:', error);
    res.status(500).json({
      message: 'Failed to upload album cover',
      error: error.message
    });
  }
});

// Delete image
router.delete('/:type/:id', auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    let entity;

    // Find the entity based on type
    switch (type) {
      case 'artist':
        entity = await Artist.findById(id);
        break;
      case 'album':
        entity = await Album.findById(id);
        break;
      default:
        return res.status(400).json({ message: 'Invalid entity type' });
    }

    if (!entity) {
      return res.status(404).json({ message: 'Entity not found' });
    }

    if (entity.images?.original) {
      // Extract public_id from image URL
      const publicId = entity.images.original.split('/').slice(-1)[0].split('.')[0];
      await deleteImage(publicId);
    }

    // Clear images from entity
    entity.images = {};
    await entity.save();

    res.json({ message: 'Image deleted successfully' });

  } catch (error) {
    logger.error('Image deletion error:', error);
    res.status(500).json({
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

module.exports = router; 