const { queryCache, fileCache } = require('../config/redis');
const logger = require('../config/logger');

class CacheInvalidationService {
  static async invalidateQueryCache(patterns) {
    try {
      if (!Array.isArray(patterns)) {
        patterns = [patterns];
      }

      for (const pattern of patterns) {
        const keys = await queryCache.keys(`query:${pattern}`);
        if (keys.length > 0) {
          await queryCache.del(keys);
          logger.info(`Invalidated ${keys.length} query cache keys matching pattern: ${pattern}`);
        }
      }
    } catch (error) {
      logger.error('Error invalidating query cache:', error);
      throw error;
    }
  }

  static async invalidateFileCache(fileIds) {
    try {
      if (!Array.isArray(fileIds)) {
        fileIds = [fileIds];
      }

      for (const fileId of fileIds) {
        const key = `file:${fileId}`;
        await fileCache.del(key);
        logger.info(`Invalidated file cache for: ${fileId}`);
      }
    } catch (error) {
      logger.error('Error invalidating file cache:', error);
      throw error;
    }
  }

  static async invalidateRelatedCaches(entity, action) {
    try {
      const invalidationRules = {
        album: {
          create: ['albums*', 'artists*'],
          update: [`albums:${entity.id}*`, `artists:${entity.artistId}*`],
          delete: [`albums:${entity.id}*`, 'albums*', `artists:${entity.artistId}*`]
        },
        track: {
          create: [`albums:${entity.albumId}*`, 'tracks*'],
          update: [`tracks:${entity.id}*`, `albums:${entity.albumId}*`],
          delete: [`tracks:${entity.id}*`, `albums:${entity.albumId}*`]
        }
      };

      const patterns = invalidationRules[entity.type][action];
      await this.invalidateQueryCache(patterns);
    } catch (error) {
      logger.error('Error invalidating related caches:', error);
      throw error;
    }
  }
}

module.exports = CacheInvalidationService;