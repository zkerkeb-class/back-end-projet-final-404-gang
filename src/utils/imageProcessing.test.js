const { processImage } = require('./imageProcessing');
const cloudinary = require('./cloudinary');
const path = require('path');
const fs = require('fs');

// Mock cloudinary uploader with the exact response structure
jest.mock('./cloudinary', () => ({
  uploader: {
    upload: jest.fn().mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test/upload/original',
      eager: [
        { secure_url: 'https://res.cloudinary.com/test/upload/thumbnail' },
        { secure_url: 'https://res.cloudinary.com/test/upload/small' },
        { secure_url: 'https://res.cloudinary.com/test/upload/medium' },
        { secure_url: 'https://res.cloudinary.com/test/upload/large' }
      ]
    })
  }
}));

describe('processImage', () => {
  let testImagePath;

  beforeAll(() => {
    testImagePath = path.join(__dirname, 'test-image.jpg');
    const imageData = Buffer.from([
      0xFF, 0xD8, // JPEG SOI marker
      0xFF, 0xE0, // APP0 marker
      0x00, 0x10, // Length of APP0 segment
      0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
      0x01, 0x01, // Version 1.1
      0x00, // Density units
      0x00, 0x01, // X density
      0x00, 0x01, // Y density
      0x00, 0x00  // Thumbnail size
    ]);
    fs.writeFileSync(testImagePath, imageData);
  });

  afterAll(() => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  it('should process the image into multiple formats and sizes', async () => {
    const result = await processImage(testImagePath);

    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      testImagePath,
      expect.any(Object)
    );

    // Match the exact structure returned by processImage
    expect(result).toEqual({
      original: 'https://res.cloudinary.com/test/upload/original',
      thumbnail: 'https://res.cloudinary.com/test/upload/thumbnail',
      small: 'https://res.cloudinary.com/test/upload/small',
      medium: 'https://res.cloudinary.com/test/upload/medium',
      large: 'https://res.cloudinary.com/test/upload/large'
    });
  });
});