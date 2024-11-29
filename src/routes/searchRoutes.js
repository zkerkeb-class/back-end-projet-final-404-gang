const express = require('express');
const Track = require('../models/Track');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const phonetics = require('phonetics');


const router = express.Router();

const getPhoneticCode = (text) => {
  return metaphone(text);
};

router.get('/search', async (req, res) => {
  const { artist, title, album, genre } = req.query;

  const searchCriteria = {};

  if (artist) {
    const primary = getPhoneticCode(artist);
    const artistDocs = await Artist.find({
      $or: [
        { name: new RegExp(artist, 'i') },
        { phoneticCode: primary }
      ]
    });
    if (artistDocs.length > 0) {
      searchCriteria.artist = { $in: artistDocs.map(doc => doc._id) };
    }
  }

  if (title) {
    const primary = getPhoneticCode(title);
    searchCriteria.title = {
      $or: [
        { $regex: new RegExp(title, 'i') },
        { phoneticCode: primary }
      ]
    };
  }

  if (album) {
    const primary = getPhoneticCode(album);
    const albumDocs = await Album.find({
      $or: [
        { title: new RegExp(album, 'i') },
        { phoneticCode: primary }
      ]
    });
    if (albumDocs.length > 0) {
      searchCriteria.album = { $in: albumDocs.map(doc => doc._id) };
    }
  }

  if (genre) {
    searchCriteria.genre = new RegExp(genre, 'i');
  }

  const tracks = await Track.find(searchCriteria).populate('artist album');
  res.json(tracks);
});

module.exports = router;