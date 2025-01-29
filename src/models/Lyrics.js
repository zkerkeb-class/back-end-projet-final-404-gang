const mongoose = require('mongoose');

const LyricsSchema = new mongoose.Schema({
  track: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    text: true // Enable text search
  },
  language: {
    type: String,
    default: 'en'
  },
  verses: [{
    content: String,
    startTime: Number, // Timestamp in seconds
    endTime: Number
  }],
  metadata: {
    source: String,
    contributor: String,
    verifiedBy: String,
    lastUpdated: Date
  }
}, { timestamps: true });

// Index pour la recherche full-text
LyricsSchema.index({ content: 'text' });

// Index pour la recherche par langue
LyricsSchema.index({ language: 1 });

// Méthode pour rechercher des paroles similaires
LyricsSchema.statics.findSimilar = async function(text, limit = 10) {
  return this.find(
    { $text: { $search: text } },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
  .populate('track');
};

// Méthode pour extraire des extraits de paroles
LyricsSchema.methods.getExcerpt = function(searchText, contextSize = 50) {
  const content = this.content;
  const searchIndex = content.toLowerCase().indexOf(searchText.toLowerCase());
  
  if (searchIndex === -1) return '';
  
  const start = Math.max(0, searchIndex - contextSize);
  const end = Math.min(content.length, searchIndex + searchText.length + contextSize);
  
  let excerpt = content.substring(start, end);
  
  // Ajouter des ellipses si nécessaire
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';
  
  return excerpt;
};

// Méthode pour trouver les paroles par timestamp
LyricsSchema.methods.findVerseByTime = function(timestamp) {
  return this.verses.find(verse => 
    timestamp >= verse.startTime && timestamp <= verse.endTime
  );
};

module.exports = mongoose.model('Lyrics', LyricsSchema); 