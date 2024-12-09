const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Track = require('../models/Track');
const Album = require('../models/Album');
const uploadRoutes = require('./uploadRoutes');
const dotenv = require('dotenv');

// Mock cloudinary before requiring the routes
jest.mock('../utils/cloudinary', () => ({
  config: jest.fn(),
  uploader: {
    upload: jest.fn().mockImplementation((filePath, options) => {
      return Promise.resolve({
        secure_url: 'https://res.cloudinary.com/test/upload/original',
        eager: [
          { secure_url: 'https://res.cloudinary.com/test/upload/thumbnail' },
          { secure_url: 'https://res.cloudinary.com/test/upload/small' },
          { secure_url: 'https://res.cloudinary.com/test/upload/medium' },
          { secure_url: 'https://res.cloudinary.com/test/upload/large' }
        ]
      });
    })
  }
}));

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use('/api', uploadRoutes);

describe('Upload Routes', () => {
  let testTrackId;
  let testAlbumId;
  const uploadsDir = path.join(process.cwd(), 'uploads', 'originals');

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const track = new Track({
      title: 'Test Track',
      duration: 180,
      artist: new mongoose.Types.ObjectId(),
      album: new mongoose.Types.ObjectId(),
      genre: 'Test Genre',
      popularity: 50,
      audioUrl: '',
    });

    const album = new Album({
      title: 'Test Album',
      artist: new mongoose.Types.ObjectId(),
      genre: 'Test Genre',
      releaseDate: new Date(),
      tracks: [],
      images: {},
    });

    const savedTrack = await track.save();
    const savedAlbum = await album.save();

    testTrackId = savedTrack._id;
    testAlbumId = savedAlbum._id;

    // Create test files
    const audioPath = path.join(uploadsDir, 'testAudio.mp3');
    const imagePath = path.join(uploadsDir, 'testImage.jpg');
    
    const sampleMP3Header = Buffer.from([0xFF, 0xFB, 0x90, 0x44, 0x00]);
    const sampleJPGHeader = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10,
      0x4A, 0x46, 0x49, 0x46, 0x00,
      0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00
    ]);
    
    fs.writeFileSync(audioPath, Buffer.concat([sampleMP3Header, Buffer.from('dummy audio content')]));
    fs.writeFileSync(imagePath, Buffer.concat([sampleJPGHeader, Buffer.from('dummy image content')]));
  }, 30000);

  afterAll(async () => {
    await Track.deleteOne({ _id: testTrackId });
    await Album.deleteOne({ _id: testAlbumId });
    await mongoose.connection.close();

    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }
  }, 30000);

  it('should upload an image file to Cloudinary and update the album', async () => {
    const imagePath = path.join(uploadsDir, 'testImage.jpg');

    const response = await request(app)
      .post('/api/upload-image')
      .field('albumId', testAlbumId.toString())
      .attach('image', imagePath);

    expect(response.status).toBe(200);
    
    const responseBody = JSON.parse(response.text);
    expect(responseBody).toEqual({
      message: 'Image uploaded and processed successfully',
      images: {
        original: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//),
        thumbnail: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//),
        small: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//),
        medium: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//),
        large: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//),
      }
    });

    const updatedAlbum = await Album.findById(testAlbumId);
    expect(updatedAlbum.images).toEqual({
      original: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//),
      thumbnail: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//),
      small: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//),
      medium: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//),
      large: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//),
    });
  }, 30000);

  it('should upload an audio file to Cloudinary and update the track', async () => {
    const audioPath = path.join(uploadsDir, 'testAudio.mp3');

    const response = await request(app)
      .post('/api/upload-audio')
      .field('trackId', testTrackId.toString())
      .attach('audio', audioPath);

    expect(response.status).toBe(200);
    expect(response.text).toContain('Audio file uploaded and URL saved to track');

    const updatedTrack = await Track.findById(testTrackId);
    expect(updatedTrack.audioUrl).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  }, 30000);
});