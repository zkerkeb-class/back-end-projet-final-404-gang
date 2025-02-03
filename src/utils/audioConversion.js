const cloudinary = require('./cloudinary');
const logger = require('./logger');

/**
 * Converts and uploads audio file to Cloudinary in multiple formats
 * @param {string} inputPath - Path or URL of the input audio file
 * @param {Object} options - Optional configuration
 * @param {string} options.folder - Cloudinary folder name (default: 'spotifyclone/audio')
 * @param {string} options.bitRate - Audio bit rate (default: '128k')
 * @returns {Promise<Object>} Object containing URLs for different audio formats
 */
const convertAndUploadAudio = async (inputPath, options = {}) => {
  try {
    const {
      folder = 'spotifyclone/audio',
      bitRate = '128k'
    } = options;

    // Upload MP3 version
    const mp3Result = await cloudinary.uploader.upload(inputPath, {
      resource_type: 'video',
      folder: folder,
      format: 'mp3',
      audio_codec: 'mp3',
      bit_rate: bitRate,
      eager: [
        { audio_codec: 'mp3', bit_rate: '192k' }, // High quality MP3
        { audio_codec: 'aac', bit_rate: '192k' }  // AAC version
      ],
      eager_async: false
    });

    // Upload WAV version
    const wavResult = await cloudinary.uploader.upload(inputPath, {
      resource_type: 'video',
      folder: folder,
      format: 'wav',
      audio_codec: 'wav',
      bit_rate: bitRate
    });

    logger.info(`Successfully converted and uploaded audio: ${mp3Result.public_id}`);

    return {
      original: mp3Result.secure_url,
      mp3: {
        standard: mp3Result.secure_url,
        high_quality: mp3Result.eager[0].secure_url,
      },
      aac: mp3Result.eager[1].secure_url,
      wav: wavResult.secure_url,
      duration: Math.round(mp3Result.duration),
      public_id: mp3Result.public_id,
      format: mp3Result.format,
      bytes: mp3Result.bytes,
    };
  } catch (error) {
    logger.error('Audio conversion error:', error);
    throw new Error(`Audio conversion failed: ${error.message}`);
  }
};

/**
 * Deletes an audio file from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the audio file
 * @returns {Promise<Object>} Deletion result
 */
const deleteAudio = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video'
    });
    logger.info(`Successfully deleted audio: ${publicId}`);
    return result;
  } catch (error) {
    logger.error('Audio deletion error:', error);
    throw new Error(`Audio deletion failed: ${error.message}`);
  }
};

module.exports = { 
  convertAndUploadAudio,
  deleteAudio
};