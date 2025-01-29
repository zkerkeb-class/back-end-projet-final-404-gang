const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  createdBy: { type: String, required: true },
    images: {
    original: { type: String },
    medium: { type: String },  // 500x500
    thumbnail: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('Playlist', PlaylistSchema);