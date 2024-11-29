const fs = require('fs');
const path = require('path');
const { convertAudio } = require('./audioConversion');

describe('convertAudio', () => {
  const inputPath = path.join(__dirname, 'testAudio.mp3');
  const outputDir = path.join(__dirname, 'testOutput');

  beforeAll(() => {
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
  });

  afterAll(async () => {
    // Add a delay to ensure all file operations are complete
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Clean up the output directory after tests
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('should convert the audio file to .mp3 and .wav formats', async () => {
    const outputPathMp3 = path.join(outputDir, 'testAudio.mp3');
    const outputPathWav = path.join(outputDir, 'testAudio.wav');

    await convertAudio(inputPath, outputPathMp3, 'mp3');
    await convertAudio(inputPath, outputPathWav, 'wav');

    expect(fs.existsSync(outputPathMp3)).toBe(true);
    expect(fs.existsSync(outputPathWav)).toBe(true);
  }, 30000); // Increase the timeout to 30 seconds
});