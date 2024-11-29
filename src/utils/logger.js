const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors, json } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new transports.Console({
      format: combine(
        timestamp(),
        errors({ stack: true }),
        logFormat
      )
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});

module.exports = logger;