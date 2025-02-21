const mongoose = require('mongoose');
const phonetics = require('phonetics');

const TrackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: Number, required: true }, // in seconds
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
  album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album', required: true },
  genre: { type: String },
  popularity: { type: Number, default: 0 },
  audioUrl: { type: String },
  phoneticCode: { type: [String], index: true },
  images: {
    original: { type: String },
    thumbnail: { type: String },
    small: { type: String },
    medium: { type: String },
    large: { type: String }
  },
  // pour l'ordre des tracks 
  trackNumber: {
    type: Number,
    min: 1
  }
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