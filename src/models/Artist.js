import mongoose from 'mongoose';

const ArtistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genre: { type: String, required: true },
  popularity: { type: Number, default: 0 },
  albums: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Album' }],
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
}, { timestamps: true });

export default mongoose.model('Artist', ArtistSchema);
