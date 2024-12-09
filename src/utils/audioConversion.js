const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Converts an audio file to a specified format.
 *
 * @param {string} inputPath - The path to the input audio file.
 * @param {string} outputPath - The path to save the converted audio file.
 * @param {string} format - The format to convert the audio file to (e.g., 'mp3', 'wav', 'm4a').
 * @returns {Promise<string>} A promise that resolves to the output path of the converted audio file.
 */
const convertAudio = (inputPath, outputPath, format) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat(format)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
};

module.exports = { convertAudio };