const cloudinary = require('./cloudinary');

const processImage = async (inputPath) => {
  try {
    // Upload to Cloudinary with eager transformations
    const result = await cloudinary.uploader.upload(inputPath, {
      folder: 'spotifyclone/images',
      eager: [
        // Thumbnail size (160x160)
        {
          width: 160,
          height: 160,
          crop: 'fill',
          quality: 90,
          format: 'webp'
        },
        // Small size (320x320)
        {
          width: 320,
          height: 320,
          crop: 'fill',
          quality: 90,
          format: 'webp'
        },
        // Medium size (640x640)
        {
          width: 640,
          height: 640,
          crop: 'fill',
          quality: 85,
          format: 'webp'
        },
        // Large size (1000x1000)  
        {
          width: 1000,
          height: 1000,
          crop: 'fill',
          quality: 85,
          format: 'webp'
        }
      ],
      eager_async: true
    });

    // Ensure all eager transformations are present
    const [thumbnail, small, medium, large] = result.eager || [];

    // Return an object with all image versions
    return {
      original: result.secure_url,
      thumbnail: thumbnail?.secure_url || '',
      small: small?.secure_url || '',
      medium: medium?.secure_url || '',
      large: large?.secure_url || ''
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

module.exports = { processImage };