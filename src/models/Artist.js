const mongoose = require('mongoose');
const phonetics = require('phonetics');

const ArtistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genre: { type: String, required: true },
  popularity: { type: Number, default: 0 },
  albums: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Album' }],
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  phoneticCode: { type: [String], index: true }
}, { timestamps: true });

ArtistSchema.pre('save', function (next) {
  try {
    const phoneticCode = phonetics.metaphone(this.name);
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

module.exports = mongoose.model('Artist', ArtistSchema);