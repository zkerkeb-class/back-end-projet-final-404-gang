/*const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const dotenv = require('dotenv');
const phonetics = require('phonetics');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const Track = require('../models/Track');
const Playlist = require('../models/Playlist');

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
  for (let i = 0; i < num; i++) {
    const title = faker.music.album();
    const artist = artists[faker.number.int({ min: 0, max: artists.length - 1 })];
    const album = new Album({
      title,
      artist: artist._id,
      genre: faker.music.genre(),
      releaseDate: faker.date.past(),
      tracks: [],
      phoneticCode: [phonetics.metaphone(title)],
    });
    albums.push(album);
    artist.albums.push(album._id);
  }
  await Album.insertMany(albums);
  await Promise.all(artists.map(artist => artist.save()));
  return albums;
};

const generateTracks = async (artists, albums, num) => {
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
      filePath: faker.system.filePath(),
      phoneticCode: [phonetics.metaphone(title)],
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
  await mongoose.connect(process.env.MONGO_URI);

  const artists = await generateArtists(10);
  const albums = await generateAlbums(artists, 20);
  const tracks = await generateTracks(artists, albums, 50);
  await generatePlaylists(tracks, 10);

  mongoose.connection.close();
};

generateData().catch((err) => console.error(err));*/