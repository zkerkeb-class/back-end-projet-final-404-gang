const Lyrics = require('../models/Lyrics');
const Track = require('../models/Track');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');

class LyricsService {
  // Rechercher dans les paroles
  static async searchLyrics(query, options = {}) {
    try {
      const {
        limit = 10,
        language,
        minScore = 0.5,
        includeExcerpts = true,
        excerptSize = 50
      } = options;

      let searchCriteria = {
        $text: { $search: query }
      };

      if (language) {
        searchCriteria.language = language;
      }

      const results = await retryOperation(async () => {
        return await Lyrics.find(
          searchCriteria,
          { score: { $meta: 'textScore' } }
        )
        .sort({ score: { $meta: 'textScore' } })
        .populate({
          path: 'track',
          populate: [
            { path: 'artist' },
            { path: 'album' }
          ]
        })
        .limit(limit);
      });

      // Filtrer et formater les résultats
      return results
        .filter(result => result._doc.score > minScore)
        .map(result => ({
          track: {
            _id: result.track._id,
            title: result.track.title,
            artist: result.track.artist.name,
            album: result.track.album.title
          },
          score: result._doc.score,
          language: result.language,
          ...(includeExcerpts && {
            excerpt: result.getExcerpt(query, excerptSize)
          })
        }));
    } catch (error) {
      logger.error('Error searching lyrics:', error);
      throw error;
    }
  }

  // Rechercher des paroles par thème ou mot-clé
  static async searchByTheme(theme, options = {}) {
    try {
      const {
        limit = 10,
        language,
        includeExcerpts = true
      } = options;

      // Liste de mots-clés associés au thème
      const themeKeywords = await this.getThemeKeywords(theme);
      const searchQuery = themeKeywords.join(' ');

      return await this.searchLyrics(searchQuery, {
        limit,
        language,
        includeExcerpts,
        minScore: 0.3 // Score plus bas pour les recherches thématiques
      });
    } catch (error) {
      logger.error('Error searching lyrics by theme:', error);
      throw error;
    }
  }

  // Obtenir les paroles synchronisées pour un morceau
  static async getSyncedLyrics(trackId) {
    try {
      const lyrics = await retryOperation(async () => {
        return await Lyrics.findOne({ track: trackId })
          .select('verses language');
      });

      if (!lyrics) {
        throw new Error('Lyrics not found');
      }

      return {
        trackId,
        language: lyrics.language,
        verses: lyrics.verses.map(verse => ({
          content: verse.content,
          startTime: verse.startTime,
          endTime: verse.endTime
        }))
      };
    } catch (error) {
      logger.error('Error getting synced lyrics:', error);
      throw error;
    }
  }

  // Obtenir les paroles à un timestamp spécifique
  static async getLyricsAtTimestamp(trackId, timestamp) {
    try {
      const lyrics = await retryOperation(async () => {
        return await Lyrics.findOne({ track: trackId });
      });

      if (!lyrics) {
        throw new Error('Lyrics not found');
      }

      const currentVerse = lyrics.findVerseByTime(timestamp);
      
      return {
        trackId,
        timestamp,
        verse: currentVerse ? currentVerse.content : null,
        language: lyrics.language
      };
    } catch (error) {
      logger.error('Error getting lyrics at timestamp:', error);
      throw error;
    }
  }

  // Ajouter ou mettre à jour les paroles
  static async upsertLyrics(trackId, lyricsData) {
    try {
      const {
        content,
        language = 'en',
        verses = [],
        metadata = {}
      } = lyricsData;

      // Vérifier que le morceau existe
      const track = await retryOperation(async () => {
        return await Track.findById(trackId);
      });

      if (!track) {
        throw new Error('Track not found');
      }

      // Mettre à jour ou créer les paroles
      const lyrics = await retryOperation(async () => {
        return await Lyrics.findOneAndUpdate(
          { track: trackId },
          {
            content,
            language,
            verses,
            metadata: {
              ...metadata,
              lastUpdated: new Date()
            }
          },
          {
            new: true,
            upsert: true
          }
        );
      });

      return lyrics;
    } catch (error) {
      logger.error('Error upserting lyrics:', error);
      throw error;
    }
  }

  // Obtenir les mots-clés pour un thème
  static async getThemeKeywords(theme) {
    // Cette fonction pourrait être étendue avec une API externe ou une base de données de thèmes
    const themeMap = {
      love: ['love', 'heart', 'romance', 'passion', 'feelings'],
      nature: ['nature', 'trees', 'ocean', 'sky', 'mountains'],
      peace: ['peace', 'harmony', 'tranquility', 'calm', 'serenity'],
      party: ['party', 'dance', 'celebration', 'fun', 'night'],
      sadness: ['sad', 'tears', 'pain', 'heartbreak', 'lonely']
    };

    return themeMap[theme.toLowerCase()] || [theme];
  }
}

module.exports = LyricsService; 