const cloudinary = require('./cloudinary');
const logger = require('./logger');

/**
 * Upload audio file to Cloudinary
 * @param {string} audioFile - Path or stream of the audio file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload response
 */
const uploadAudio = async (audioFile, options = {}) => {
  try {
    const uploadOptions = {
      resource_type: 'auto',
      folder: 'audio',
      ...options
    };

    const result = await cloudinary.uploader.upload(audioFile, uploadOptions);
    
    logger.info(`Audio file uploaded successfully to Cloudinary: ${result.public_id}`);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      duration: result.duration,
      bytes: result.bytes
    };
  } catch (error) {
    logger.error('Error uploading audio to Cloudinary:', error);
    throw new Error('Failed to upload audio file');
  }
};

/**
 * Delete audio file from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the audio file
 */
const deleteAudio = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    logger.info(`Audio file deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    logger.error('Error deleting audio from Cloudinary:', error);
    throw new Error('Failed to delete audio file');
  }
};

module.exports = {
  uploadAudio,
  deleteAudio
}; 