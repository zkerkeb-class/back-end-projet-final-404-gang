const express = require('express');
const router = express.Router();
const Playlist = require('../models/Playlist');

// Créer une playlist
router.post('/', async (req, res) => {
  try {
    const playlist = new Playlist(req.body);
    await playlist.save();
    res.status(201).json(playlist);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lire toutes les playlists
router.get('/', async (req, res) => {
  try {
    const playlists = await Playlist.find().populate('tracks');
    res.status(200).json(playlists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lire une playlist par ID
router.get('/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id).populate('tracks');
    if (!playlist) return res.status(404).json({ message: 'Playlist non trouvée' });
    res.status(200).json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour une playlist
router.put('/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!playlist) return res.status(404).json({ message: 'Playlist non trouvée' });
    res.status(200).json(playlist);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Supprimer une playlist
router.delete('/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndDelete(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist non trouvée' });
    res.status(200).json({ message: 'Playlist supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
