const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Validation d'un ObjectId MongoDB
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    try {
      const paramValue = req.params[paramName];
      
      if (!paramValue) {
        return res.status(400).json({
          error: `Le paramètre ${paramName} est requis`
        });
      }

      if (!mongoose.Types.ObjectId.isValid(paramValue)) {
        return res.status(400).json({
          error: `Le paramètre ${paramName} n'est pas un ID valide`
        });
      }

      next();
    } catch (error) {
      logger.error(`Erreur de validation pour ${paramName}:`, error);
      res.status(500).json({
        error: 'Erreur lors de la validation des paramètres'
      });
    }
  };
};

// Validation des paramètres de recherche de paroles
const validateLyricsSearch = (req, res, next) => {
  try {
    const { q, limit, minScore, excerptSize } = req.query;

    // Validation de la requête de recherche
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Le paramètre de recherche (q) est requis'
      });
    }

    // Validation et conversion du limit
    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1) {
        return res.status(400).json({
          error: 'Le paramètre limit doit être un nombre positif'
        });
      }
      req.query.limit = limitNum;
    }

    // Validation et conversion du score minimum
    if (minScore) {
      const scoreNum = parseFloat(minScore);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 1) {
        return res.status(400).json({
          error: 'Le paramètre minScore doit être un nombre entre 0 et 1'
        });
      }
      req.query.minScore = scoreNum;
    }

    // Validation et conversion de la taille des extraits
    if (excerptSize) {
      const sizeNum = parseInt(excerptSize);
      if (isNaN(sizeNum) || sizeNum < 10 || sizeNum > 500) {
        return res.status(400).json({
          error: 'Le paramètre excerptSize doit être un nombre entre 10 et 500'
        });
      }
      req.query.excerptSize = sizeNum;
    }

    next();
  } catch (error) {
    logger.error('Erreur de validation des paramètres de recherche:', error);
    res.status(500).json({
      error: 'Erreur lors de la validation des paramètres'
    });
  }
};

// Validation des données de paroles pour l'ajout/mise à jour
const validateLyricsData = (req, res, next) => {
  try {
    const { content, language, verses } = req.body;

    // Validation du contenu
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Le contenu des paroles est requis'
      });
    }

    // Validation de la langue
    if (language && !['fr', 'en'].includes(language.toLowerCase())) {
      return res.status(400).json({
        error: 'La langue doit être "fr" ou "en"'
      });
    }

    // Validation des verses si présents
    if (verses) {
      if (!Array.isArray(verses)) {
        return res.status(400).json({
          error: 'Les verses doivent être un tableau'
        });
      }

      for (const verse of verses) {
        if (!verse.content || typeof verse.content !== 'string') {
          return res.status(400).json({
            error: 'Chaque verse doit avoir un contenu textuel'
          });
        }

        if (verse.startTime !== undefined && typeof verse.startTime !== 'number') {
          return res.status(400).json({
            error: 'Le startTime doit être un nombre'
          });
        }

        if (verse.endTime !== undefined && typeof verse.endTime !== 'number') {
          return res.status(400).json({
            error: 'Le endTime doit être un nombre'
          });
        }

        if (verse.startTime !== undefined && verse.endTime !== undefined && verse.startTime >= verse.endTime) {
          return res.status(400).json({
            error: 'Le startTime doit être inférieur au endTime'
          });
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Erreur de validation des données de paroles:', error);
    res.status(500).json({
      error: 'Erreur lors de la validation des données'
    });
  }
};

module.exports = {
  validateObjectId,
  validateLyricsSearch,
  validateLyricsData
}; 