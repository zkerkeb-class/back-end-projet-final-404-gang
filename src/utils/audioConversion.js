const cloudinary = require('./cloudinary');

const convertAudio = async (inputPath, format) => {
  const result = await cloudinary.uploader.upload(inputPath, {
    resource_type: 'video',
    folder: 'spotifyclone/audio',
    format: format,
    audio_codec: 'mp3',
    bit_rate: '128k'
  });

  return result.secure_url;
};

module.exports = { convertAudio };