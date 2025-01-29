require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('../utils/cloudinary');
const { uploadAudio } = require('../utils/audioUpload');
const Album = require('../models/Album');
const Track = require('../models/Track');
const Artist = require('../models/Artist');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

// Sample data directory structure:
// /samples
//   /images
//     /albums/...
//     /artists/...
//   /audio/...

const SAMPLE_DIR = path.join(__dirname, '../../samples');

async function uploadSampleData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('Connected to MongoDB');

    // Create sample artist
    const artist = new Artist({
      name: "Sample Artist",
      biography: "This is a sample artist biography",
      genre: "Pop",
      popularity: 80
    });

    // Upload artist image
    const artistImagePath = path.join(SAMPLE_DIR, 'images/artists/artist1.jpg');
    const artistImageBase64 = await fs.readFile(artistImagePath, { encoding: 'base64' });
    const artistImageData = `data:image/jpeg;base64,${artistImageBase64}`;

    const artistImageResult = await cloudinary.uploader.upload(artistImageData, {
      folder: 'artists',
      transformation: [
        { width: 150, height: 150, crop: 'fill', quality: 'auto' },
        { width: 300, height: 300, crop: 'fill', quality: 'auto' },
        { width: 500, height: 500, crop: 'fill', quality: 'auto' },
        { width: 800, height: 800, crop: 'fill', quality: 'auto' }
      ]
    });

    artist.images = {
      thumbnail: cloudinary.url(artistImageResult.public_id, { width: 150, height: 150, crop: 'fill' }),
      small: cloudinary.url(artistImageResult.public_id, { width: 300, height: 300, crop: 'fill' }),
      medium: cloudinary.url(artistImageResult.public_id, { width: 500, height: 500, crop: 'fill' }),
      large: cloudinary.url(artistImageResult.public_id, { width: 800, height: 800, crop: 'fill' }),
      original: artistImageResult.secure_url
    };

    await artist.save();
    logger.info('Artist created:', artist.name);

    // Create sample album
    const album = new Album({
      title: "Sample Album",
      artist: artist._id,
      releaseDate: new Date(),
      genre: "Pop"
    });

    // Upload album cover
    const albumImagePath = path.join(SAMPLE_DIR, 'images/albums/album1.jpg');
    const albumImageBase64 = await fs.readFile(albumImagePath, { encoding: 'base64' });
    const albumImageData = `data:image/jpeg;base64,${albumImageBase64}`;

    const albumImageResult = await cloudinary.uploader.upload(albumImageData, {
      folder: 'albums',
      transformation: [
        { width: 150, height: 150, crop: 'fill', quality: 'auto' },
        { width: 300, height: 300, crop: 'fill', quality: 'auto' },
        { width: 500, height: 500, crop: 'fill', quality: 'auto' },
        { width: 800, height: 800, crop: 'fill', quality: 'auto' }
      ]
    });

    album.images = {
      thumbnail: cloudinary.url(albumImageResult.public_id, { width: 150, height: 150, crop: 'fill' }),
      small: cloudinary.url(albumImageResult.public_id, { width: 300, height: 300, crop: 'fill' }),
      medium: cloudinary.url(albumImageResult.public_id, { width: 500, height: 500, crop: 'fill' }),
      large: cloudinary.url(albumImageResult.public_id, { width: 800, height: 800, crop: 'fill' }),
      original: albumImageResult.secure_url
    };

    await album.save();
    logger.info('Album created:', album.title);

    // Upload sample tracks
    const audioFiles = await fs.readdir(path.join(SAMPLE_DIR, 'audio'));
    
    for (const [index, audioFile] of audioFiles.entries()) {
      const audioPath = path.join(SAMPLE_DIR, 'audio', audioFile);
      const audioBase64 = await fs.readFile(audioPath, { encoding: 'base64' });
      const audioData = `data:audio/mpeg;base64,${audioBase64}`;

      const audioResult = await uploadAudio(audioData, {
        resource_type: 'video',
        folder: 'tracks',
        format: 'mp3'
      });

      const track = new Track({
        title: `Sample Track ${index + 1}`,
        artist: artist._id,
        album: album._id,
        duration: audioResult.duration || 180,
        genre: "Pop",
        releaseDate: new Date(),
        popularity: 75,
        audioUrl: audioResult.url,
        images: album.images // Use album cover for track
      });

      await track.save();
      logger.info('Track created:', track.title);

      // Add track to album's tracks array
      album.tracks.push(track._id);
      artist.tracks.push(track._id);
    }

    // Save the updated album and artist
    await album.save();
    await artist.save();

    logger.info('Sample data upload completed successfully');
  } catch (error) {
    logger.error('Error uploading sample data:', error);
  } finally {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
}

// Run the script if called directly
if (require.main === module) {
  uploadSampleData();
}

module.exports = uploadSampleData; 