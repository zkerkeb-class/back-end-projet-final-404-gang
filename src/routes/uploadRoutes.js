const express = require('express');
const multer = require('multer');
const path = require('path');
const cloudinary = require('../utils/cloudinary');
const { processImage } = require('../utils/imageProcessing');
const { convertAudio } = require('../utils/audioConversion');
const Album = require('../models/Album');
const Track = require('../models/Track');
const logger = require('../utils/logger');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/originals/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'audio/mpeg', 'audio/wav'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, MP3, and WAV are allowed.'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/upload-audio', upload.single('audio'), async (req, res) => {
  try {
    const filePath = req.file.path;
    logger.info(`Uploading audio file: ${filePath}`);
    logger.info(`File details:`, { 
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size 
    });

    const audioUrl = await convertAudio(filePath, 'mp3');
    logger.info(`Cloudinary response:`, { audioUrl });
    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    const trackId = req.body.trackId;
    const track = await Track.findById(trackId);
    if (track) {
      track.audioUrl = audioUrl;
      await track.save();
      logger.info('Audio file uploaded and URL saved to track', { audioUrl });
      res.send('Audio file uploaded and URL saved to track!');
    } else {
      res.status(404).send('Track not found');
    }
  } catch (error) {
    logger.error('Error uploading audio file', { error });
    res.status(500).send(`Error uploading audio file: ${error.message}`);
  }
});

router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    const filePath = req.file.path;
    logger.info(`Processing image upload: ${filePath}`);
    
    const imageVersions = await processImage(filePath);
    logger.info('Image processing complete', { imageVersions });
    
    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    const albumId = req.body.albumId;
    const album = await Album.findById(albumId);
    
    if (album) {
      // Update all image versions
      album.images = {
        original: imageVersions.original,
        thumbnail: imageVersions.thumbnail,
        small: imageVersions.small,
        medium: imageVersions.medium,
        large: imageVersions.large
      };
      
      await album.save();
      logger.info('Album images updated successfully', { 
        albumId, 
        images: album.images 
      });
      
      res.json({
        message: 'Image uploaded and processed successfully',
        images: album.images
      });
    } else {
      res.status(404).send('Album not found');
    }
  } catch (error) {
    logger.error('Error processing image upload', { error });
    res.status(500).send(`Error uploading image: ${error.message}`);
  }
});

module.exports = router;