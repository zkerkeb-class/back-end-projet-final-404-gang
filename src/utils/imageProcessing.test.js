const fs = require('fs');
const path = require('path');
const { processImage } = require('./imageProcessing');

describe('processImage', () => {
  const inputPath = path.join(__dirname, 'testImage.jpg');
  const outputDir = path.join(__dirname, 'testOutput');

  beforeAll(() => {
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
  });

  afterAll(() => {
    // Clean up the output directory after tests
    fs.rmdirSync(outputDir, { recursive: true });
  });

  it('should process the image into multiple formats and sizes', async () => {
    await processImage(inputPath, outputDir);

    const formats = ['webp', 'jpeg', 'avif'];
    const sizes = ['thumbnail', 'medium', 'large'];

    for (const format of formats) {
      for (const size of sizes) {
        const outputPath = path.join(outputDir, `${size}.${format}`);
        expect(fs.existsSync(outputPath)).toBe(true);
      }
    }
  }, 30000); // Increase the timeout to 30 seconds
});