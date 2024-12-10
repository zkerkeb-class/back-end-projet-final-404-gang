const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite 100 requêtes par IP
  message: "Too many requests, please try again later.",
});

module.exports = limiter;
