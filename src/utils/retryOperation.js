const logger = require('./logger');

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  factor: 2, // exponential factor
};

/**
 * Retry an operation with exponential backoff
 * @param {Function} operation - The operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - The result of the operation
 */
const retryOperation = async (operation, options = {}) => {
  const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError;
  let delay = retryOptions.initialDelay;

  for (let attempt = 1; attempt <= retryOptions.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retryOptions.maxRetries) {
        throw error;
      }

      logger.warn(`Operation failed (attempt ${attempt}/${retryOptions.maxRetries}): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * retryOptions.factor, retryOptions.maxDelay);
    }
  }

  throw lastError;
};

module.exports = retryOperation; 