const mongoose = require('mongoose');
const phonetics = require('phonetics');

const TrackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: Number, required: true }, // in seconds
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
  album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album', required: true },
  genre: { type: String },
  popularity: { type: Number, default: 0 },
  filePath: { type: String, required: true }, // Path to audio file
  phoneticCode: { type: [String], index: true },
}, { timestamps: true });

TrackSchema.pre('save', function (next) {
  try {
    const phoneticCode = phonetics.metaphone(this.title);
    if (typeof phoneticCode === 'string') {
      this.phoneticCode = [phoneticCode];
    } else {
      console.error("Phonetic code generation failed. Skipping phonetic code generation.");
      this.phoneticCode = [];
    }
  } catch (error) {
    console.error("Error in phonetic code generation:", error.message);
    this.phoneticCode = [];
  }
  next();
});

module.exports = mongoose.model('Track', TrackSchema);