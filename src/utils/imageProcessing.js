const cloudinary = require('./cloudinary');
const logger = require('./logger');

/**
 * Processes and uploads image to Cloudinary with multiple sizes
 * @param {string} inputPath - Path or URL of the input image
 * @param {Object} options - Optional configuration
 * @param {string} options.folder - Cloudinary folder name
 * @returns {Promise<Object>} Object containing URLs for different image sizes
 */
const processAndUploadImage = async (inputPath, options = {}) => {
  try {
    const { folder = 'spotifyclone/images' } = options;

    // Upload to Cloudinary with eager transformations
    const result = await cloudinary.uploader.upload(inputPath, {
      folder: folder,
      eager: [
        // Thumbnail (160x160)
        {
          width: 160,
          height: 160,
          crop: 'fill',
          quality: 90,
          format: 'webp'
        },
        // Small (320x320)
        {
          width: 320,
          height: 320,
          crop: 'fill',
          quality: 90,
          format: 'webp'
        },
        // Medium (640x640)
        {
          width: 640,
          height: 640,
          crop: 'fill',
          quality: 85,
          format: 'webp'
        },
        // Large (1000x1000)
        {
          width: 1000,
          height: 1000,
          crop: 'fill',
          quality: 85,
          format: 'webp'
        }
      ],
      eager_async: false
    });

    logger.info(`Successfully processed and uploaded image: ${result.public_id}`);

    return {
      original: result.secure_url,
      thumbnail: result.eager[0].secure_url,
      small: result.eager[1].secure_url,
      medium: result.eager[2].secure_url,
      large: result.eager[3].secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    logger.error('Image processing error:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

/**
 * Deletes an image from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the image
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Successfully deleted image: ${publicId}`);
    return result;
  } catch (error) {
    logger.error('Image deletion error:', error);
    throw new Error(`Image deletion failed: ${error.message}`);
  }
};

module.exports = {
  processAndUploadImage,
  deleteImage
};