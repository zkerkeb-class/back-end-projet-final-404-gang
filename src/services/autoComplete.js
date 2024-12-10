const getRedisConnection = require('../config/redis');
const logger = require('../utils/logger');
const retryOperation = require('../utils/retryOperation');

class AutoCompleteService {
  // Ajouter une recherche à l'historique de l'utilisateur
  static async addToSearchHistory(userId, query, type = 'general') {
    try {
      const { client } = await getRedisConnection();
      const key = `search:history:${userId}:${type}`;
      const timestamp = Date.now();

      await retryOperation(async () => {
        // Ajouter à l'historique avec timestamp comme score
        await client.zAdd(key, {
          score: timestamp,
          value: query.toLowerCase()
        });

        // Garder seulement les 100 dernières recherches
        await client.zRemRangeByRank(key, 0, -101);

        // Ajouter aux tendances globales
        await this.incrementTrend(query, type);
      });
    } catch (error) {
      logger.error('Error adding to search history:', error);
    }
  }

  // Incrémenter le score d'une tendance
  static async incrementTrend(query, type = 'general') {
    try {
      const { client } = await getRedisConnection();
      const key = `search:trends:${type}`;
      
      await retryOperation(async () => {
        // Incrémenter le score dans le sorted set
        await client.zIncrBy(key, 1, query.toLowerCase());

        // Expirer les anciennes tendances (garder 7 jours)
        await client.expire(key, 7 * 24 * 60 * 60);
      });
    } catch (error) {
      logger.error('Error incrementing trend:', error);
    }
  }

  // Obtenir des suggestions basées sur le préfixe
  static async getSuggestions(userId, prefix, type = 'general', limit = 10) {
    try {
      const { client } = await getRedisConnection();
      const suggestions = new Set();

      await retryOperation(async () => {
        // 1. Obtenir l'historique récent de l'utilisateur
        const userHistory = await client.zRevRange(
          `search:history:${userId}:${type}`,
          0,
          limit - 1
        );

        // Ajouter les éléments correspondants de l'historique
        userHistory.forEach(item => {
          if (item.toLowerCase().startsWith(prefix.toLowerCase())) {
            suggestions.add({
              text: item,
              source: 'history',
              score: 3
            });
          }
        });

        // 2. Obtenir les tendances globales
        const trends = await client.zRevRangeWithScores(
          `search:trends:${type}`,
          0,
          limit - 1
        );

        // Ajouter les éléments tendance correspondants
        trends.forEach(({value, score}) => {
          if (value.toLowerCase().startsWith(prefix.toLowerCase())) {
            suggestions.add({
              text: value,
              source: 'trending',
              score: 2 + (score / 100) // Normaliser le score des tendances
            });
          }
        });

        // 3. Obtenir les suggestions basées sur les genres préférés
        const userGenres = await this.getUserPreferredGenres(userId);
        for (const genre of userGenres) {
          const genreSuggestions = await client.zRevRange(
            `search:genre:${genre}:suggestions`,
            0,
            Math.floor(limit / 2)
          );

          genreSuggestions.forEach(item => {
            if (item.toLowerCase().startsWith(prefix.toLowerCase())) {
              suggestions.add({
                text: item,
                source: 'genre',
                genre,
                score: 1
              });
            }
          });
        }
      });

      // Trier et limiter les suggestions
      return Array.from(suggestions)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting suggestions:', error);
      return [];
    }
  }

  // Obtenir les genres préférés de l'utilisateur
  static async getUserPreferredGenres(userId) {
    try {
      const { client } = await getRedisConnection();
      const key = `user:${userId}:genres`;
      
      return await retryOperation(async () => {
        return await client.zRevRange(key, 0, 4); // Top 5 genres
      });
    } catch (error) {
      logger.error('Error getting user preferred genres:', error);
      return [];
    }
  }

  // Mettre à jour les préférences de genre de l'utilisateur
  static async updateUserGenrePreference(userId, genre) {
    try {
      const { client } = await getRedisConnection();
      const key = `user:${userId}:genres`;
      
      await retryOperation(async () => {
        await client.zIncrBy(key, 1, genre.toLowerCase());
      });
    } catch (error) {
      logger.error('Error updating user genre preference:', error);
    }
  }

  // Obtenir les recherches populaires
  static async getPopularSearches(type = 'general', limit = 10) {
    try {
      const { client } = await getRedisConnection();
      
      return await retryOperation(async () => {
        const results = await client.zRevRangeWithScores(
          `search:trends:${type}`,
          0,
          limit - 1
        );

        return results.map(({value, score}) => ({
          text: value,
          count: Math.floor(score),
          source: 'trending'
        }));
      });
    } catch (error) {
      logger.error('Error getting popular searches:', error);
      return [];
    }
  }

  // Ajouter une suggestion pour un genre spécifique
  static async addGenreSuggestion(genre, suggestion) {
    try {
      const { client } = await getRedisConnection();
      const key = `search:genre:${genre}:suggestions`;
      
      await retryOperation(async () => {
        await client.zAdd(key, {
          score: Date.now(),
          value: suggestion.toLowerCase()
        });

        // Garder seulement les 100 meilleures suggestions par genre
        await client.zRemRangeByRank(key, 0, -101);
      });
    } catch (error) {
      logger.error('Error adding genre suggestion:', error);
    }
  }

  // Nettoyer les anciennes données
  static async cleanup() {
    try {
      const { client } = await getRedisConnection();
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

      await retryOperation(async () => {
        // Nettoyer les anciennes tendances
        const trendKeys = await client.keys('search:trends:*');
        for (const key of trendKeys) {
          await client.zRemRangeByScore(key, '-inf', oneWeekAgo);
        }

        // Nettoyer les anciennes suggestions de genre
        const genreSuggestionKeys = await client.keys('search:genre:*:suggestions');
        for (const key of genreSuggestionKeys) {
          await client.zRemRangeByScore(key, '-inf', oneWeekAgo);
        }
      });
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }
}

module.exports = AutoCompleteService; 