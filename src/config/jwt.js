const jwt = require("jsonwebtoken");

// Charger les variables d'environnement
const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

/**
 * Configuration et fonctions liées à JWT
 */
const jwtConfig = {
  secret: JWT_SECRET || "default_secret_key", // Clé secrète JWT
  expiresIn: JWT_EXPIRES_IN || "1h", // Durée de validité du token
};

/**
 * Génère un token JWT
 * @param {Object} payload - Les données à inclure dans le token
 * @returns {string} - Le token généré
 */
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });
  } catch (error) {
    console.error("Erreur lors de la génération du token JWT:", error);
    throw new Error("Impossible de générer le token JWT");
  }
};

/**
 * Vérifie et décode un token JWT
 * @param {string} token - Le token JWT à vérifier
 * @returns {Object} - Le payload décodé si le token est valide
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    console.error("Erreur lors de la vérification du token JWT:", error);
    throw new Error("Token JWT invalide ou expiré");
  }
};

module.exports = {
  jwtConfig,
  generateToken,
  verifyToken,
};
