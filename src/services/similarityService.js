const Track = require('../models/Track');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');

class SimilarityService {
  // Calculer le score de similarité entre deux morceaux
  static calculateSimilarityScore(sourceTrack, targetTrack) {
    let score = 0;
    const weights = {
      genre: 0.3,
      artist: 0.2,
      album: 0.1,
      popularity: 0.2,
      duration: 0.2
    };

    // Similarité de genre
    if (sourceTrack.genre === targetTrack.genre) {
      score += weights.genre;
    }

    // Similarité d'artiste
    if (sourceTrack.artist.toString() === targetTrack.artist.toString()) {
      score += weights.artist;
    }

    // Similarité d'album
    if (sourceTrack.album.toString() === targetTrack.album.toString()) {
      score += weights.album;
    }

    // Similarité de popularité (différence normalisée)
    const popDiff = Math.abs(sourceTrack.popularity - targetTrack.popularity) / 100;
    score += weights.popularity * (1 - popDiff);

    // Similarité de durée (différence normalisée, tolérance de 30 secondes)
    const durationDiff = Math.abs(sourceTrack.duration - targetTrack.duration);
    const durationScore = Math.max(0, 1 - (durationDiff / 30));
    score += weights.duration * durationScore;

    return score;
  }

  // Trouver des morceaux similaires
  static async findSimilarTracks(trackId, options = {}) {
    try {
      const {
        limit = 10,
        minScore = 0.5,
        includeArtistTracks = true,
        includeAlbumTracks = true,
        includeGenreTracks = true
      } = options;

      // Récupérer le morceau source avec ses relations
      const sourceTrack = await retryOperation(async () => {
        return await Track.findById(trackId)
          .populate('artist')
          .populate('album');
      });

      if (!sourceTrack) {
        throw new Error('Track not found');
      }

      // Construire les critères de recherche
      const searchCriteria = {
        _id: { $ne: trackId } // Exclure le morceau source
      };

      // Ajouter les critères basés sur les options
      if (!includeArtistTracks && !includeAlbumTracks) {
        searchCriteria.artist = { $ne: sourceTrack.artist._id };
        searchCriteria.album = { $ne: sourceTrack.album._id };
      }

      if (includeGenreTracks) {
        searchCriteria.genre = sourceTrack.genre;
      }

      // Trouver les morceaux potentiellement similaires
      const candidates = await retryOperation(async () => {
        return await Track.find(searchCriteria)
          .populate('artist')
          .populate('album')
          .limit(limit * 3); // Récupérer plus de candidats pour le filtrage
      });

      // Calculer les scores de similarité
      const similarTracks = candidates
        .map(track => ({
          track,
          score: this.calculateSimilarityScore(sourceTrack, track)
        }))
        .filter(item => item.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Enrichir les résultats avec des métadonnées
      return similarTracks.map(({ track, score }) => ({
        track: {
          _id: track._id,
          title: track.title,
          artist: track.artist.name,
          album: track.album.title,
          genre: track.genre,
          duration: track.duration,
          popularity: track.popularity
        },
        similarity: {
          score: Math.round(score * 100) / 100,
          reasons: this.getSimilarityReasons(sourceTrack, track)
        }
      }));
    } catch (error) {
      logger.error('Error finding similar tracks:', error);
      throw error;
    }
  }

  // Obtenir les raisons de similarité
  static getSimilarityReasons(sourceTrack, targetTrack) {
    const reasons = [];

    if (sourceTrack.genre === targetTrack.genre) {
      reasons.push(`Same genre: ${sourceTrack.genre}`);
    }

    if (sourceTrack.artist.toString() === targetTrack.artist.toString()) {
      reasons.push('Same artist');
    }

    if (sourceTrack.album.toString() === targetTrack.album.toString()) {
      reasons.push('Same album');
    }

    const popDiff = Math.abs(sourceTrack.popularity - targetTrack.popularity);
    if (popDiff <= 20) {
      reasons.push('Similar popularity');
    }

    const durationDiff = Math.abs(sourceTrack.duration - targetTrack.duration);
    if (durationDiff <= 30) {
      reasons.push('Similar duration');
    }

    return reasons;
  }

  // Trouver des morceaux similaires par caractéristiques spécifiques
  static async findSimilarByFeatures(trackId, features = []) {
    try {
      const sourceTrack = await retryOperation(async () => {
        return await Track.findById(trackId)
          .populate('artist')
          .populate('album');
      });

      if (!sourceTrack) {
        throw new Error('Track not found');
      }

      const searchCriteria = {
        _id: { $ne: trackId }
      };

      // Ajouter les critères basés sur les caractéristiques demandées
      features.forEach(feature => {
        switch (feature) {
          case 'genre':
            searchCriteria.genre = sourceTrack.genre;
            break;
          case 'duration':
            searchCriteria.duration = {
              $gte: sourceTrack.duration - 30,
              $lte: sourceTrack.duration + 30
            };
            break;
          case 'popularity':
            searchCriteria.popularity = {
              $gte: sourceTrack.popularity - 20,
              $lte: sourceTrack.popularity + 20
            };
            break;
        }
      });

      const similarTracks = await retryOperation(async () => {
        return await Track.find(searchCriteria)
          .populate('artist')
          .populate('album')
          .limit(10);
      });

      return similarTracks.map(track => ({
        track: {
          _id: track._id,
          title: track.title,
          artist: track.artist.name,
          album: track.album.title,
          genre: track.genre,
          duration: track.duration,
          popularity: track.popularity
        },
        matchedFeatures: features.filter(feature => {
          switch (feature) {
            case 'genre':
              return track.genre === sourceTrack.genre;
            case 'duration':
              return Math.abs(track.duration - sourceTrack.duration) <= 30;
            case 'popularity':
              return Math.abs(track.popularity - sourceTrack.popularity) <= 20;
            default:
              return false;
          }
        })
      }));
    } catch (error) {
      logger.error('Error finding similar tracks by features:', error);
      throw error;
    }
  }
}

module.exports = SimilarityService; 