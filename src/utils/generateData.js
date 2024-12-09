const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const dotenv = require('dotenv');
const phonetics = require('phonetics');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const Track = require('../models/Track');
const Playlist = require('../models/Playlist');
const { processImage } = require('./imageProcessing');
const fs = require('fs');
const path = require('path');

dotenv.config();

const generateArtists = async (num) => {
  const artists = [];
  for (let i = 0; i < num; i++) {
    const name = faker.person.fullName();
    const artist = new Artist({
      name,
      genre: faker.music.genre(),
      popularity: faker.number.int({ min: 0, max: 100 }),
      albums: [],
      tracks: [],
      phoneticCode: [phonetics.metaphone(name)],
    });
    artists.push(artist);
  }
  await Artist.insertMany(artists);
  return artists;
};

const generateAlbums = async (artists, num) => {
  const albums = [];
  // Use a placeholder image URL if no image is available
  const placeholderImageUrl = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';

  for (let i = 0; i < num; i++) {
    const title = faker.music.album();
    const artist = artists[faker.number.int({ min: 0, max: artists.length - 1 })];
    
    try {
      const album = new Album({
        title,
        artist: artist._id,
        genre: faker.music.genre(),
        releaseDate: faker.date.past(),
        tracks: [],
        phoneticCode: [phonetics.metaphone(title)],
        images: {
          original: placeholderImageUrl,
          thumbnail: placeholderImageUrl,
          small: placeholderImageUrl,
          medium: placeholderImageUrl,
          large: placeholderImageUrl
        }
      });
      albums.push(album);
      artist.albums.push(album._id);
    } catch (error) {
      console.error(`Error creating album ${title}:`, error);
      continue;
    }
  }

  if (albums.length === 0) {
    console.error('No albums were created. Using fallback album creation.');
    // Create at least one fallback album
    const fallbackAlbum = new Album({
      title: 'Fallback Album',
      artist: artists[0]._id,
      genre: 'Various',
      releaseDate: new Date(),
      tracks: [],
      phoneticCode: [phonetics.metaphone('Fallback Album')],
      images: {
        original: placeholderImageUrl,
        icon: placeholderImageUrl,
        thumbnail: placeholderImageUrl,
        small: placeholderImageUrl,
        medium: placeholderImageUrl,
        large: placeholderImageUrl
      }
    });
    albums.push(fallbackAlbum);
    artists[0].albums.push(fallbackAlbum._id);
  }

  await Album.insertMany(albums);
  await Promise.all(artists.map(artist => artist.save()));
  return albums;
};

const generateTracks = async (artists, albums, num) => {
  if (!albums || albums.length === 0) {
    throw new Error('No albums available for track generation');
  }

  // Use a placeholder image URL if no image is available
  const placeholderImageUrl = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';

  const tracks = [];
  for (let i = 0; i < num; i++) {
    const title = faker.music.songName();
    const artist = artists[faker.number.int({ min: 0, max: artists.length - 1 })];
    const album = albums[faker.number.int({ min: 0, max: albums.length - 1 })];
    
    const track = new Track({
      title,
      duration: faker.number.int({ min: 120, max: 300 }), // duration in seconds
      artist: artist._id,
      album: album._id,
      genre: faker.music.genre(),
      popularity: faker.number.int({ min: 0, max: 100 }),
      audioUrl: '', // Initialize as empty string
      phoneticCode: [phonetics.metaphone(title)],
      images: {
        original: placeholderImageUrl,
        icon: placeholderImageUrl,
        thumbnail: placeholderImageUrl,
        small: placeholderImageUrl,
        medium: placeholderImageUrl,
        large: placeholderImageUrl
      }
    });
    tracks.push(track);
    artist.tracks.push(track._id);
    album.tracks.push(track._id);
  }
  await Track.insertMany(tracks);
  await Promise.all(artists.map(artist => artist.save()));
  await Promise.all(albums.map(album => album.save()));
  return tracks;
};

const generatePlaylists = async (tracks, num) => {
  if (!tracks || tracks.length === 0) {
    console.warn('No tracks available for playlist generation');
    return [];
  }

  const playlists = [];
  for (let i = 0; i < num; i++) {
    const playlist = new Playlist({
      name: faker.lorem.words(3),
      description: faker.lorem.sentence(),
      tracks: tracks.slice(0, faker.number.int({ min: 1, max: tracks.length })),
      createdBy: faker.internet.username(),
    });
    playlists.push(playlist);
  }
  await Playlist.insertMany(playlists);
  return playlists;
};

const generateData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('Generating artists...');
    const artists = await generateArtists(10);
    
    console.log('Generating albums...');
    const albums = await generateAlbums(artists, 20);
    console.log(`Created ${albums.length} albums`);
    
    console.log('Generating tracks...');
    const tracks = await generateTracks(artists, albums, 50);
    console.log(`Created ${tracks.length} tracks`);
    
    console.log('Generating playlists...');
    const playlists = await generatePlaylists(tracks, 10);
    console.log(`Created ${playlists.length} playlists`);

    console.log('Data generation complete!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error generating data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

generateData();