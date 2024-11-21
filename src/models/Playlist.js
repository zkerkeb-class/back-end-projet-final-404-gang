import mongoose from 'mongoose';

const PlaylistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  createdBy: { type: String, required: true }, // User who created the playlist
}, { timestamps: true });

export default mongoose.model('Playlist', PlaylistSchema);
