const express = require('express');
const multer = require('multer');
const path = require('path');
const { convertAudio } = require('../utils/audioConversion');
const { processImage } = require('../utils/imageProcessing');
const logger = require('../utils/logger');

const router = express.Router();
const upload = multer({ dest: 'uploads/originals/' });

router.post('/upload-audio', upload.single('audio'), async (req, res) => {
  const inputPath = req.file.path;
  const outputPathM4a = path.join('uploads/convertedAudio', `${req.file.filename}.m4a`);
  const outputPathWav = path.join('uploads/convertedAudio', `${req.file.filename}.wav`);

  try {
    await convertAudio(inputPath, outputPathM4a, 'm4a');
    await convertAudio(inputPath, outputPathWav, 'wav');
    logger.info('Audio files converted successfully', { inputPath, outputPathM4a, outputPathWav });
    res.send('Audio files converted successfully!');
  } catch (error) {
    logger.error('Error converting audio files', { error });
    res.status(500).send('Error converting audio files');
  }
});

router.post('/upload-image', upload.single('image'), async (req, res) => {
  const inputPath = req.file.path;
  const outputDir = path.join('uploads/processedImg', req.file.filename);

  try {
    await processImage(inputPath, outputDir);
    logger.info('Image processed successfully', { inputPath, outputDir });
    res.send('Image processed successfully!');
  } catch (error) {
    logger.error('Error processing image', { error });
    res.status(500).send('Error processing image');
  }
});

module.exports = router;