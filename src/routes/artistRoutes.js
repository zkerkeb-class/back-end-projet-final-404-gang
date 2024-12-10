const express = require('express');
const router = express.Router();
const Artist = require('../models/Artist');

// Créer un artiste
router.post('/', async (req, res) => {
  try {
    const artist = new Artist(req.body);
    await artist.save();
    res.status(201).json(artist);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lire tous les artistes
router.get('/', async (req, res) => {
  try {
    const artists = await Artist.find().populate('albums tracks');
    res.status(200).json(artists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lire un artiste par ID
router.get('/:id', async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id).populate('albums tracks');
    if (!artist) return res.status(404).json({ message: 'Artiste non trouvé' });
    res.status(200).json(artist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour un artiste
router.put('/:id', async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!artist) return res.status(404).json({ message: 'Artiste non trouvé' });
    res.status(200).json(artist);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Supprimer un artiste
router.delete('/:id', async (req, res) => {
  try {
    const artist = await Artist.findByIdAndDelete(req.params.id);
    if (!artist) return res.status(404).json({ message: 'Artiste non trouvé' });
    res.status(200).json({ message: 'Artiste supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
