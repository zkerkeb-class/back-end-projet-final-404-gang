const express = require('express');
const router = express.Router();
const Album = require('../models/Album');

// Créer un album
router.post('/', async (req, res) => {
  try {
    const album = new Album(req.body);
    await album.save();
    res.status(201).json(album);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lire tous les albums
router.get('/', async (req, res) => {
  try {
    const albums = await Album.find().populate('artist tracks');
    res.status(200).json(albums);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lire un album par ID
router.get('/:id', async (req, res) => {
  try {
    const album = await Album.findById(req.params.id).populate('artist tracks');
    if (!album) return res.status(404).json({ message: 'Album non trouvé' });
    res.status(200).json(album);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour un album
router.put('/:id', async (req, res) => {
  try {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!album) return res.status(404).json({ message: 'Album non trouvé' });
    res.status(200).json(album);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Supprimer un album
router.delete('/:id', async (req, res) => {
  try {
    const album = await Album.findByIdAndDelete(req.params.id);
    if (!album) return res.status(404).json({ message: 'Album non trouvé' });
    res.status(200).json({ message: 'Album supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
