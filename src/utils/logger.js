const winston = require('winston');
const path = require('path');

// Configuration des niveaux de log personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Configuration des couleurs pour chaque niveau
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Ajout des couleurs à Winston
winston.addColors(colors);

// Format personnalisé pour les logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Configuration des transports (destinations des logs)
const transports = [
  // Logs console
  new winston.transports.Console(),
  
  // Logs d'erreurs dans un fichier
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
  }),
  
  // Tous les logs dans un fichier
  new winston.transports.File({
    filename: path.join('logs', 'all.log'),
  }),
];

// Création du logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});

// Fonction pour formater les objets et les erreurs
const formatMessage = (message) => {
  if (message instanceof Error) {
    return `${message.message}\n${message.stack}`;
  }
  if (typeof message === 'object') {
    return JSON.stringify(message, null, 2);
  }
  return message;
};

// Export d'une interface simplifiée
module.exports = {
  error: (message, ...args) => logger.error(formatMessage(message), ...args),
  warn: (message, ...args) => logger.warn(formatMessage(message), ...args),
  info: (message, ...args) => logger.info(formatMessage(message), ...args),
  http: (message, ...args) => logger.http(formatMessage(message), ...args),
  debug: (message, ...args) => logger.debug(formatMessage(message), ...args),
};