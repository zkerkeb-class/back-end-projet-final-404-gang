const express = require('express');
const router = express.Router();
const Track = require('../models/Track');

// Créer une piste audio
router.post('/', async (req, res) => {
  try {
    const track = new Track(req.body);
    await track.save();
    res.status(201).json(track);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lire toutes les pistes
router.get('/', async (req, res) => {
  try {
    const tracks = await Track.find().populate('artist album');
    res.status(200).json(tracks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lire une piste par ID
router.get('/:id', async (req, res) => {
  try {
    const track = await Track.findById(req.params.id).populate('artist album');
    if (!track) return res.status(404).json({ message: 'Piste non trouvée' });
    res.status(200).json(track);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour une piste
router.put('/:id', async (req, res) => {
  try {
    const track = await Track.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!track) return res.status(404).json({ message: 'Piste non trouvée' });
    res.status(200).json(track);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Supprimer une piste
router.delete('/:id', async (req, res) => {
  try {
    const track = await Track.findByIdAndDelete(req.params.id);
    if (!track) return res.status(404).json({ message: 'Piste non trouvée' });
    res.status(200).json({ message: 'Piste supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
