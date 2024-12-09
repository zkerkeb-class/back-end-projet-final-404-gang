const express = require('express');
const RedisMonitor = require('../services/redisMonitor');
const PerformanceMetrics = require('../utils/performanceMetrics');
const logger = require('../utils/logger');
const router = express.Router();

// Basic Redis stats
router.get('/redis/stats', async (req, res) => {
  try {
    const stats = await RedisMonitor.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching Redis stats:', error);
    res.status(500).json({ error: 'Failed to fetch Redis stats' });
  }
});

// Key analysis
router.get('/redis/keys', async (req, res) => {
  try {
    const keyStats = await RedisMonitor.getKeyStats();
    res.json(keyStats);
  } catch (error) {
    logger.error('Error analyzing Redis keys:', error);
    res.status(500).json({ error: 'Failed to analyze Redis keys' });
  }
});

// Memory metrics
router.get('/metrics/memory', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 3600000; // Default 1 hour
    const memoryHistory = await RedisMonitor.getMemoryHistory(timeRange);
    res.json(memoryHistory);
  } catch (error) {
    logger.error('Error fetching memory metrics:', error);
    res.status(500).json({ error: 'Failed to fetch memory metrics' });
  }
  
});
// Cache monitoring
router.get('/cache/stats', async (req, res) => {
    try {
      const stats = await RedisMonitor.getCacheStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error fetching cache stats:', error);
      res.status(500).json({ error: 'Failed to fetch cache stats' });
    }
  });
  // Network monitoring
router.get('/network/stats', async (req, res) => {
    try {
      const stats = await RedisMonitor.getNetworkStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error fetching network stats:', error);
      res.status(500).json({ error: 'Failed to fetch network stats' });
    }
  });
  // Historical stats
router.get('/stats/history', async (req, res) => {
    try {
      const type = req.query.type || 'all';
      const timeRange = parseInt(req.query.timeRange) || 3600000;
      const history = await RedisMonitor.getHistoricalStats(type, timeRange);
      res.json(history);
    } catch (error) {
      logger.error('Error fetching historical stats:', error);
      res.status(500).json({ error: 'Failed to fetch historical stats' });
    }
  });
  
  router.get('/server/resources', async (req, res) => {
    try {
      const resources = await RedisMonitor.getServerResources();
      res.json(resources);
    } catch (error) {
      logger.error('Error fetching server resources:', error);
      res.status(500).json({ error: 'Failed to fetch server resources' });
    }
  });

module.exports = router;