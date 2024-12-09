const sharp = require('sharp');
const path = require('path');

const processImage = async (inputPath, outputDir) => {
  const formats = ['webp', 'jpeg', 'avif'];
  const sizes = { thumbnail: 100, medium: 500, large: 1000 };

  for (const format of formats) {
    for (const [sizeName, size] of Object.entries(sizes)) {
      const outputPath = path.join(outputDir, `${sizeName}.${format}`);
      await sharp(inputPath)
        .resize(size)
        .toFormat(format)
        .toFile(outputPath);
    }
  }
};

module.exports = { processImage };