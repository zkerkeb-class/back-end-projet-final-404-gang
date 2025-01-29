const mongoose = require('mongoose');
const axios = require('axios');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const Track = require('../models/Track');
const Playlist = require('../models/Playlist');
const User = require('../models/User');
const Lyrics = require('../models/Lyrics');
const cloudinary = require('../utils/cloudinary');
const logger = require('../utils/logger');
require('dotenv').config();

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

const FALLBACK_IMAGES = [
  'https://i.scdn.co/image/ab67616d0000b273a048415db06a5b6fa7ec4e1a',
  'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
  'https://i.scdn.co/image/ab67616d0000b273214f3cf1cbe7139c1e26ffbb',
  'https://i.scdn.co/image/ab67616d0000b273d8f97a01853ef29af3578b48',
  'https://i.scdn.co/image/ab67616d0000b2735675e83f707f1d7271e5cf8a',
  'https://i.scdn.co/image/ab67616d0000b273b1c4b76e23414c9f20242268',
  'https://i.scdn.co/image/ab67616d0000b273f461bbc21a9bcec43a926973',
  'https://i.scdn.co/image/ab67616d0000b273f9e5e01ea09b2fd7178eace7',
  'https://i.scdn.co/image/ab67616d0000b273e2f039481babe23658fc719a',
  'https://i.scdn.co/image/ab67616d0000b273db26e023e48d11f2a6d683f7'
];

const fetchRandomSongs = async (count) => {
  const response = await axios.get(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${count}&include=musicinfo&fuzzytags=pop`);
  return response.data.results;
};

const fetchRandomImages = async (count) => {
  try {
    const response = await axios.get(`https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=music&image_type=photo&per_page=${count}`);
    logger.info(`Fetched ${response.data.hits.length} images from Pixabay`);
    return response.data.hits.length >= count ? response.data.hits : FALLBACK_IMAGES.map(url => ({ largeImageURL: url }));
  } catch (error) {
    logger.error('Error fetching images from Pixabay:', error.message);
    return FALLBACK_IMAGES.map(url => ({ largeImageURL: url }));
  }
};

const uploadToCloudinary = async (url, folder) => {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: `spotifyclone/${folder}`,
      resource_type: "auto",
      eager: [
        { width: 300, height: 300, crop: 'fill', format: 'jpg' },
        { width: 150, height: 150, crop: 'fill', format: 'jpg' }
      ],
      eager_async: false
    });

    logger.info(`Uploaded file to Cloudinary: ${result.public_id}`);

    return {
      original: result.secure_url,
      medium: result.eager ? result.eager[0].secure_url : result.secure_url,
      thumbnail: result.eager ? result.eager[1].secure_url : result.secure_url
    };
  } catch (error) {
    logger.error(`Cloudinary upload error: ${error.message}`);
    // Return default URLs if upload fails
    return {
      original: url,
      medium: url,
      thumbnail: url
    };
  }
};

const generateData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Clear existing data
    await Artist.deleteMany({});
    await Album.deleteMany({});
    await Track.deleteMany({});
    await Playlist.deleteMany({});
    await User.deleteMany({});
    await Lyrics.deleteMany({});
    logger.info('Cleared existing data.');

    // Create a user if one does not already exist
    let user = await User.findOne();
    if (!user) {
      user = await User.create({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123', // Note: In a real application, ensure passwords are hashed
      });
      logger.info('Created user.');
    } else {
      logger.info('User already exists.');
    }

    const songs = await fetchRandomSongs(100);
    if (!songs || songs.length === 0) {
      throw new Error('No songs fetched from Jamendo');
    }
    logger.info(`Fetched ${songs.length} songs from Jamendo`);

    // Fetch images for tracks and playlists
    const allImages = await fetchRandomImages(114); // 100 tracks + 10 albums + 4 playlists
    if (!allImages || allImages.length < 114) {
      throw new Error('Not enough images available');
    }
    logger.info(`Using ${allImages.length} images for all entities`);

    // Split images for different uses
    const albumImages = allImages.slice(0, 10);
    const trackImages = allImages.slice(10, 110);
    const playlistImages = allImages.slice(110, 114);

    // Create artists map to track unique artists
    const artistsMap = new Map();
    songs.forEach(song => {
      if (!artistsMap.has(song.artist_id)) {
        artistsMap.set(song.artist_id, {
          name: song.artist_name,
          bio: song.artist_description || `Music by ${song.artist_name}`,
          genre: song.genre || "Various",
          tracks: [],
          albums: []
        });
      }
    });

    // Create artists in database
    const artists = [];
    for (const [artistId, artistData] of artistsMap) {
      const artist = await Artist.create({
        name: artistData.name,
        bio: artistData.bio,
        genre: artistData.genre,
        tracks: [],
        albums: []
      });
      artists.push(artist);
      artistsMap.set(artistId, { ...artistData, _id: artist._id });
      logger.info(`Created artist: ${artist.name}`);
    }

    // Create albums and assign to artists
    const albums = [];
    const albumsPerArtist = Math.ceil(10 / artists.length);
    
    for (let i = 0; i < 10; i++) {
      const artistIndex = Math.floor(i / albumsPerArtist);
      const artist = artists[artistIndex % artists.length];
      const albumImage = await uploadToCloudinary(albumImages[i].largeImageURL, 'albums');
      
      const album = await Album.create({
        title: `Album ${i + 1}`,
        artist: artist._id,
        releaseDate: new Date(),
        images: albumImage,
        tracks: [], // Initialize empty tracks array
        genre: artist.genre
      });
      
      albums.push(album);
      artist.albums.push(album._id);
      await artist.save();
      logger.info(`Created album ${i + 1} for artist ${artist.name}`);
    }

    // Modify track creation to assign to correct artist and include images
    const tracks = [];
    const albumTracks = Array(10).fill().map(() => []);

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const audioUrl = await uploadToCloudinary(song.audio, 'audio');
      const trackImage = await uploadToCloudinary(trackImages[i].largeImageURL, 'tracks');
      const albumIndex = Math.floor(i / 10);
      const album = albums[albumIndex];
      const artist = await Artist.findById(album.artist);

      const track = await Track.create({
        title: song.name,
        artist: artist._id,
        album: album._id,
        duration: song.duration,
        trackNumber: (i % 10) + 1,
        audioUrl: audioUrl.original,
        popularity: Math.floor(Math.random() * 50),
        genre: song.genre || album.genre || "Various",
        images: trackImage
      });
      
      tracks.push(track);
      albumTracks[albumIndex].push(track._id);
      artist.tracks.push(track._id);
      await artist.save();
      logger.info(`Created track ${i + 1} for artist ${artist.name}`);

      // Create lyrics for the track
      await Lyrics.create({
        track: track._id,
        content: song.lyrics || 'No lyrics available', // Assuming the song object has a lyrics field
        language: 'en',
        verses: [], // Add verses if available
        metadata: {
          source: 'Jamendo',
          contributor: song.artist_name,
          lastUpdated: new Date(),
        },
      });
      logger.info(`Created lyrics for track ${i + 1}.`);
    }

    // Update all albums with their tracks
    await Promise.all(albums.map(async (album, index) => {
      album.tracks = albumTracks[index];
      await album.save();
      logger.info(`Updated album ${index + 1} with ${albumTracks[index].length} tracks`);
    }));

    // Update all artists with their final albums and tracks
    await Promise.all(artists.map(async (artist) => {
      await artist.save();
      logger.info(`Updated artist ${artist.name} with ${artist.tracks.length} tracks and ${artist.albums.length} albums`);
    }));

    // Create multiple playlists with images
    for (let i = 0; i < 4; i++) {
      const playlistImage = await uploadToCloudinary(playlistImages[i].largeImageURL, 'playlists');
      const playlistTracks = tracks.slice(i * 25, (i + 1) * 25);
      const playlist = await Playlist.create({
        name: `Playlist ${i + 1}`,
        description: `A playlist of ${playlistTracks.length} random royalty-free songs.`,
        tracks: playlistTracks.map(track => track._id),
        createdBy: user._id,
        images: playlistImage
      });
      user.playlists.push(playlist._id);
      logger.info(`Created playlist ${i + 1} with image.`);
    }

    await user.save();

    logger.info('Data generation complete.');
  } catch (error) {
    logger.error('Error generating data:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
};

generateData();