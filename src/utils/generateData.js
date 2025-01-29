require('dotenv').config();

console.log('MONGO_URI:', process.env.MONGO_URI);

if (!process.env.MONGO_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const mongoose = require('mongoose');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const Track = require('../models/Track');
const Playlist = require('../models/Playlist');
const Lyrics = require('../models/Lyrics');
const { faker } = require('@faker-js/faker');
const logger = require('./logger');

// Données d'exemple pour les paroles
const sampleLyrics = [
  {
    content: "Je marche seul dans la ville\nLes lumières brillent dans la nuit\nMes pensées vagabondent\nDans ce monde qui dort à demi",
    language: "fr",
    theme: "solitude"
  },
  {
    content: "L'amour est comme une rose\nBelle mais avec des épines\nQui peut parfois nous blesser\nMais sa beauté nous fascine",
    language: "fr",
    theme: "love"
  },
  {
    content: "Dansons sous la pluie\nLaissons nos soucis\nLa vie est une fête\nQuand tu souris",
    language: "fr",
    theme: "joy"
  },
  {
    content: "Les saisons passent\nLe temps s'efface\nMais nos souvenirs\nGardent leur place",
    language: "fr",
    theme: "nostalgia"
  },
  {
    content: "La nature s'éveille\nAu printemps nouveau\nLes fleurs s'émerveillent\nSous un ciel si beau",
    language: "fr",
    theme: "nature"
  }
];

// Fonction pour générer des timestamps synchronisés pour les paroles
function generateSyncedVerses(lyrics) {
  const lines = lyrics.split('\n');
  let currentTime = 0;
  return lines.map(line => {
    const duration = 4 + Math.random() * 2; // Entre 4 et 6 secondes par ligne
    const verse = {
      content: line,
      startTime: currentTime,
      endTime: currentTime + duration
    };
    currentTime += duration;
    return verse;
  });
}

// Fonction pour générer des métadonnées de paroles
function generateLyricsMetadata() {
  return {
    source: faker.helpers.arrayElement(['User', 'Official', 'Community']),
    contributor: faker.internet.username(),
    verifiedBy: Math.random() > 0.7 ? faker.internet.username() : null,
    lastUpdated: faker.date.past()
  };
}

async function generateData() {
  try {
    // Supprimer les données existantes
    await Promise.all([
      Artist.deleteMany({}),
      Album.deleteMany({}),
      Track.deleteMany({}),
      Playlist.deleteMany({}),
      Lyrics.deleteMany({})
    ]);

    logger.info('Anciennes données supprimées');

    // Générer les artistes
    const artists = [];
    for (let i = 0; i < 20; i++) {
      const artist = new Artist({
        name: faker.person.fullName(),
        biography: faker.lorem.paragraph(),
        genre: faker.helpers.arrayElement(['Rock', 'Pop', 'Jazz', 'Classical', 'Hip Hop', 'Blues', 'Electronic', 'Folk', 'R&B']),
        images: {
          thumbnail: faker.image.url({ width: 150, height: 150 }),
          small: faker.image.url({ width: 300, height: 300 }),
          medium: faker.image.url({ width: 500, height: 500 }),
          large: faker.image.url({ width: 800, height: 800 })
        },
        popularity: faker.number.int({ min: 1, max: 100 }),
        phoneticCode: [],
        albums: [],
        tracks: []
      });
      artists.push(await artist.save());
    }

    logger.info('Artistes générés');

    // Générer les albums
    const albums = [];
    for (const artist of artists) {
      const numAlbums = faker.number.int({ min: 1, max: 4 });
      for (let i = 0; i < numAlbums; i++) {
        const album = new Album({
          title: faker.lorem.words(3),
          artist: artist._id,
          releaseDate: faker.date.past(),
          genre: artist.genre,
          images: {
            thumbnail: faker.image.url({ width: 150, height: 150 }),
            small: faker.image.url({ width: 300, height: 300 }),
            medium: faker.image.url({ width: 500, height: 500 }),
            large: faker.image.url({ width: 800, height: 800 })
          },
          phoneticCode: [],
          tracks: []
        });
        const savedAlbum = await album.save();
        albums.push(savedAlbum);
        
        // Add album to artist's albums
        artist.albums.push(savedAlbum._id);
        await artist.save();
      }
    }

    logger.info('Albums générés');

    // Générer les pistes
    const tracks = [];
    for (const album of albums) {
      const numTracks = faker.number.int({ min: 8, max: 15 });
      const albumTracks = [];
      
      for (let i = 0; i < numTracks; i++) {
        const track = new Track({
          title: faker.lorem.words(4),
          artist: album.artist,
          album: album._id,
          duration: faker.number.int({ min: 120, max: 420 }),
          genre: album.genre,
          releaseDate: album.releaseDate,
          popularity: faker.number.int({ min: 1, max: 100 }),
          audioUrl: faker.internet.url(),
          images: album.images,
          phoneticCode: []
        });
        const savedTrack = await track.save();
        tracks.push(savedTrack);
        albumTracks.push(savedTrack._id);
        
        // Add track to artist's tracks
        const artist = await Artist.findById(album.artist);
        artist.tracks.push(savedTrack._id);
        await artist.save();
      }
      
      // Add tracks to album
      album.tracks = albumTracks;
      await album.save();
    }

    logger.info('Pistes générées');

    // Générer les paroles
    const lyrics = [];
    for (const track of tracks) {
      if (Math.random() > 0.3) { // 70% des pistes ont des paroles
        const sampleLyric = faker.helpers.arrayElement(sampleLyrics);
        const lyric = new Lyrics({
          track: track._id,
          content: sampleLyric.content,
          language: sampleLyric.language,
          verses: generateSyncedVerses(sampleLyric.content),
          metadata: generateLyricsMetadata()
        });
        lyrics.push(await lyric.save());
      }
    }

    logger.info('Paroles générées');

    // Générer les playlists
    const playlists = [];
    const numPlaylists = 10;
    for (let i = 0; i < numPlaylists; i++) {
      const numTracksInPlaylist = faker.number.int({ min: 5, max: 20 });
      const playlistTracks = faker.helpers.arrayElements(tracks, numTracksInPlaylist);
      
      const playlist = new Playlist({
        name: faker.lorem.words(2) + ' Playlist',
        description: faker.lorem.sentence(),
        createdBy: faker.internet.username(),
        tracks: playlistTracks.map(track => track._id),
        isPublic: faker.datatype.boolean(),
        images: {
          thumbnail: faker.image.url({ width: 150, height: 150 }),
          small: faker.image.url({ width: 300, height: 300 }),
          medium: faker.image.url({ width: 500, height: 500 }),
          large: faker.image.url({ width: 800, height: 800 })
        },
        phoneticCode: [],
        createdAt: faker.date.past()
      });
      playlists.push(await playlist.save());
    }

    logger.info('Playlists générées');

    // Retourner les statistiques
    return {
      artists: artists.length,
      albums: albums.length,
      tracks: tracks.length,
      lyrics: lyrics.length,
      playlists: playlists.length
    };
  } catch (error) {
    logger.error('Erreur lors de la génération des données:', error);
    throw error;
  }
}

// If this file is run directly (not required as a module)
if (require.main === module) {
  // Check for MongoDB URI
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  // Connect to MongoDB and run data generation
  mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    logger.info('Connected to MongoDB');
    const stats = await generateData();
    logger.info('Data generation completed:', stats);
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  })
  .catch(error => {
    logger.error('Error:', error);
    process.exit(1);
  });
} else {
  // Export for use as a module
  module.exports = generateData;
}