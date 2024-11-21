import mongoose from 'mongoose';

const TrackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: Number, required: true }, // in seconds
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
  album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album', required: true },
  genre: { type: String },
  popularity: { type: Number, default: 0 },
  filePath: { type: String, required: true }, // Path to audio file
}, { timestamps: true });

export default mongoose.model('Track', TrackSchema);
