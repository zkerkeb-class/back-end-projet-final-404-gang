const mongoose = require('mongoose');
const phonetics = require('phonetics');

const AlbumSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
  genre: { type: String },
  releaseDate: { type: Date },
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  phoneticCode: { type: [String], index: true }
}, { timestamps: true });

AlbumSchema.pre('save', function (next) {
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

module.exports = mongoose.model('Album', AlbumSchema);