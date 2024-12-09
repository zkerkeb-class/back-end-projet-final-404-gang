const fs = require('fs');
const path = require('path');
const { convertAudio } = require('./audioConversion');

// Mock cloudinary
jest.mock('../utils/cloudinary', () => ({
  uploader: {
    upload: jest.fn().mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test/audio/upload/test.mp3'
    })
  }
}));

describe('convertAudio', () => {
  const inputPath = path.join(__dirname, 'testAudio.mp3');
  const outputDir = path.join(__dirname, 'testOutput');

  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    // Create a dummy test audio file
    fs.writeFileSync(inputPath, 'dummy audio content');
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('should convert the audio file to mp3 format', async () => {
    const result = await convertAudio(inputPath, 'mp3');
    expect(result).toMatch(/^https:\/\/res\.cloudinary\.com/);
  }, 30000);
});