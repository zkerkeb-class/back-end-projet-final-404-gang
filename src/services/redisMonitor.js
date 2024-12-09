const getRedisConnection = require('../config/redis');
const logger = require('../utils/logger');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class RedisMonitor {
  // Basic Redis Stats
  static async getStats() {
    try {
      const { client } = await getRedisConnection();
      const info = await client.info();

      return {
        memory: this.parseMemoryStats(info),
        operations: this.parseOperationStats(info),
        connections: this.parseConnectionStats(info)
      };
    } catch (error) {
      logger.error('Error getting Redis stats:', error);
      throw error;
    }
  }

  // Memory Stats Methods
  static parseMemoryStats(info) {
    try {
      const used = parseInt(info.match(/used_memory:(\d+)/)?.[1] || 0);
      const peak = parseInt(info.match(/used_memory_peak:(\d+)/)?.[1] || 0);
      const fragmentation = parseFloat(info.match(/mem_fragmentation_ratio:([.\d]+)/)?.[1] || 0);

      return {
        used: this.formatBytes(used),
        peak: this.formatBytes(peak),
        fragmentation: `${fragmentation.toFixed(2)}%`,
        raw: {
          used,
          peak,
          fragmentation
        }
      };
    } catch (error) {
      logger.error('Error parsing memory stats:', error);
      return {
        used: '0 B',
        peak: '0 B',
        fragmentation: '0%',
        raw: { used: 0, peak: 0, fragmentation: 0 }
      };
    }
  }
  // Historical Stats Methods
  static async getHistoricalStats(type = 'all', timeRange = 3600000) {
    try {
      const { client } = await getRedisConnection();
      const now = Date.now();
      const minTime = now - timeRange;
      const history = {};

      if (type === 'all' || type === 'cache') {
        const cacheKeys = await client.keys('monitor:cache:*');
        history.cache = await this.processHistoricalData(client, cacheKeys, minTime);
      }

      if (type === 'all' || type === 'network') {
        const networkKeys = await client.keys('monitor:network:*');
        history.network = await this.processHistoricalData(client, networkKeys, minTime);
      }

      if (type === 'all' || type === 'memory') {
        const memoryKeys = await client.keys('memory:*');
        history.memory = await this.processHistoricalData(client, memoryKeys, minTime);
      }

      return history;
    } catch (error) {
      logger.error('Error getting historical stats:', error);
      return { cache: [], network: [], memory: [] };
    }
  }

  static async processHistoricalData(client, keys, minTime) {
    const history = [];
    for (const key of keys) {
      const timestamp = parseInt(key.split(':')[2]);
      if (timestamp >= minTime) {
        const data = JSON.parse(await client.get(key));
        history.push({
          timestamp: new Date(timestamp).toISOString(),
          ...data
        });
      }
    }
    return history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  static parseOperationStats(info) {
    try {
      const totalCommands = parseInt(info.match(/total_commands_processed:(\d+)/)?.[1] || 0);
      const keyspaceHits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || 0);
      const keyspaceMisses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || 0);
      const totalOperations = keyspaceHits + keyspaceMisses;
      const hitRate = totalOperations ? (keyspaceHits / totalOperations * 100) : 0;

      return {
        totalCommands,
        keyspaceHits,
        keyspaceMisses,
        hitRate: `${hitRate.toFixed(2)}%`
      };
    } catch (error) {
      logger.error('Error parsing operation stats:', error);
      return {
        totalCommands: 0,
        keyspaceHits: 0,
        keyspaceMisses: 0,
        hitRate: '0%'
      };
    }
  }

  // Connection Stats Methods
  static parseConnectionStats(info) {
    try {
      const connected = parseInt(info.match(/connected_clients:(\d+)/)?.[1] || 0);
      const rejected = parseInt(info.match(/rejected_connections:(\d+)/)?.[1] || 0);
      const maxClients = parseInt(info.match(/maxclients:(\d+)/)?.[1] || 0);

      return {
        currentConnections: connected,
        rejectedConnections: rejected,
        maxConnections: maxClients,
        utilizationRate: maxClients ? ((connected / maxClients) * 100).toFixed(2) + '%' : '0%'
      };
    } catch (error) {
      logger.error('Error parsing connection stats:', error);
      return {
        currentConnections: 0,
        rejectedConnections: 0,
        maxConnections: 0,
        utilizationRate: '0%'
      };
    }
  }

  // Cache Monitoring Methods
  static async getCacheStats() {
    try {
      const { client } = await getRedisConnection();
      const info = await client.info();
      const keys = await client.keys('*');

      const stats = {
        keyspace: await this.analyzeKeyspace(keys),
        performance: this.parseCachePerformance(info),
        memory: this.parseMemoryStats(info),
        hitRate: await this.calculateHitRate()
      };

      await this.recordCacheStats(stats);
      return stats;
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      throw error;
    }
  }

  static async analyzeKeyspace(keys) {
    try {
      const { client } = await getRedisConnection();
      const patterns = {};
      const ttlDistribution = {
        noExpiry: 0,
        lessThanHour: 0,
        lessThanDay: 0,
        moreThanDay: 0
      };

      for (const key of keys) {
        const pattern = key.split(':')[0];
        patterns[pattern] = (patterns[pattern] || 0) + 1;

        const ttl = await client.ttl(key);
        if (ttl === -1) {
          ttlDistribution.noExpiry++;
        } else if (ttl < 3600) {
          ttlDistribution.lessThanHour++;
        } else if (ttl < 86400) {
          ttlDistribution.lessThanDay++;
        } else {
          ttlDistribution.moreThanDay++;
        }
      }

      return {
        totalKeys: keys.length,
        patterns,
        ttlDistribution
      };
    } catch (error) {
      logger.error('Error analyzing keyspace:', error);
      throw error;
    }
  }

  static parseCachePerformance(info) {
    try {
      const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || 0);
      const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || 0);
      const totalOps = parseInt(info.match(/total_commands_processed:(\d+)/)?.[1] || 0);
      const opsPerSec = parseInt(info.match(/instantaneous_ops_per_sec:(\d+)/)?.[1] || 0);

      return {
        hits,
        misses,
        hitRatio: hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(2) + '%' : '0%',
        totalOperations: totalOps,
        operationsPerSecond: opsPerSec
      };
    } catch (error) {
      logger.error('Error parsing cache performance:', error);
      return {
        hits: 0,
        misses: 0,
        hitRatio: '0%',
        totalOperations: 0,
        operationsPerSecond: 0
      };
    }
  }

  static async calculateHitRate() {
    try {
      const { client } = await getRedisConnection();
      const hits = await client.get('cache:hits') || 0;
      const misses = await client.get('cache:misses') || 0;
      const total = parseInt(hits) + parseInt(misses);

      return {
        hits: parseInt(hits),
        misses: parseInt(misses),
        rate: total ? (parseInt(hits) / total * 100).toFixed(2) + '%' : '0%'
      };
    } catch (error) {
      logger.error('Error calculating hit rate:', error);
      return { hits: 0, misses: 0, rate: '0%' };
    }
  }

  // Network Monitoring Methods
  static async getNetworkStats() {
    try {
      const { client } = await getRedisConnection();
      const info = await client.info();
      
      const stats = {
        interfaces: this.getNetworkInterfaces(),
        connections: this.parseConnectionStats(info),
        throughput: this.parseThroughputStats(info),
        latency: await this.measureLatency()
      };

      await this.recordNetworkStats(stats);
      return stats;
    } catch (error) {
      logger.error('Error getting network stats:', error);
      throw error;
    }
  }

  static getNetworkInterfaces() {
    try {
      const interfaces = os.networkInterfaces();
      const parsed = {};

      Object.keys(interfaces).forEach(name => {
        parsed[name] = interfaces[name].map(iface => ({
          address: iface.address,
          netmask: iface.netmask,
          family: iface.family,
          mac: iface.mac,
          internal: iface.internal,
          cidr: iface.cidr
        }));
      });

      return parsed;
    } catch (error) {
      logger.error('Error getting network interfaces:', error);
      return {};
    }
  }

  static parseThroughputStats(info) {
    try {
      const inputBytes = parseInt(info.match(/total_net_input_bytes:(\d+)/)?.[1] || 0);
      const outputBytes = parseInt(info.match(/total_net_output_bytes:(\d+)/)?.[1] || 0);
      const inputKbps = parseFloat(info.match(/instantaneous_input_kbps:([.\d]+)/)?.[1] || 0);
      const outputKbps = parseFloat(info.match(/instantaneous_output_kbps:([.\d]+)/)?.[1] || 0);

      return {
        totalBytesReceived: this.formatBytes(inputBytes),
        totalBytesSent: this.formatBytes(outputBytes),
        currentInputKbps: inputKbps.toFixed(2),
        currentOutputKbps: outputKbps.toFixed(2)
      };
    } catch (error) {
      logger.error('Error parsing throughput stats:', error);
      return {
        totalBytesReceived: '0 B',
        totalBytesSent: '0 B',
        currentInputKbps: '0',
        currentOutputKbps: '0'
      };
    }
  }

  static async measureLatency() {
    try {
      const { client } = await getRedisConnection();
      const start = process.hrtime();
      await client.ping();
      const [seconds, nanoseconds] = process.hrtime(start);
      const latencyMs = (seconds * 1000 + nanoseconds / 1000000).toFixed(2);

      return {
        lastPing: `${latencyMs}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error measuring latency:', error);
      return { lastPing: '0ms', timestamp: new Date().toISOString() };
    }
  }

  // History and Recording Methods
  static async getMemoryHistory(timeRange = 3600000) {
    try {
      const { client } = await getRedisConnection();
      const now = Date.now();
      const minTime = now - timeRange;
      const keys = await client.keys('memory:*');
      const history = [];

      for (const key of keys) {
        const timestamp = parseInt(key.split(':')[1]);
        if (timestamp >= minTime) {
          const value = await client.get(key);
          history.push({
            timestamp: new Date(timestamp).toISOString(),
            memory: (parseInt(value) / 1024 / 1024).toFixed(2) // MB
          });
        }
      }

      return history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      logger.error('Error getting memory history:', error);
      return [];
    }
  }

  static async recordCacheStats(stats) {
    try {
      const { client } = await getRedisConnection();
      const timestamp = Date.now();
      await client.set(`monitor:cache:${timestamp}`, JSON.stringify(stats));
      await this.cleanupOldStats('monitor:cache:');
    } catch (error) {
      logger.error('Error recording cache stats:', error);
    }
  }

  static async recordNetworkStats(stats) {
    try {
      const { client } = await getRedisConnection();
      const timestamp = Date.now();
      await client.set(`monitor:network:${timestamp}`, JSON.stringify(stats));
      await this.cleanupOldStats('monitor:network:');
    } catch (error) {
      logger.error('Error recording network stats:', error);
    }
  }

  static async cleanupOldStats(prefix) {
    try {
      const { client } = await getRedisConnection();
      const keys = await client.keys(`${prefix}*`);
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      for (const key of keys) {
        const timestamp = parseInt(key.split(':')[2]);
        if (timestamp < dayAgo) {
          await client.del(key);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old stats:', error);
    }
  }

  // Utility Methods
  static formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Server Resource Monitoring Methods
  static async getServerResources() {
    try {
      const stats = {
        cpu: await this.getCPUUsage(),
        memory: this.getMemoryUsage(),
        disk: await this.getDiskUsage(),
        system: this.getSystemInfo()
      };

      await this.recordServerStats(stats);
      return stats;
    } catch (error) {
      logger.error('Error getting server resources:', error);
      throw error;
    }
  }

  static async getCPUUsage() {
    return new Promise((resolve) => {
      const cpus = os.cpus();
      const cpuCount = cpus.length;
      
      // Calculate CPU usage percentage
      const loadAvg = os.loadavg();
      const loadPercent = (loadAvg[0] / cpuCount * 100).toFixed(2);

      resolve({
        cores: cpuCount,
        model: cpus[0].model,
        speed: `${cpus[0].speed} MHz`,
        loadAverage: {
          '1min': loadAvg[0].toFixed(2),
          '5min': loadAvg[1].toFixed(2),
          '15min': loadAvg[2].toFixed(2)
        },
        usagePercent: `${loadPercent}%`,
        perCore: cpus.map(cpu => {
          const total = Object.values(cpu.times).reduce((acc, val) => acc + val, 0);
          const idle = cpu.times.idle;
          const used = total - idle;
          return {
            usage: `${((used / total) * 100).toFixed(2)}%`,
            times: cpu.times
          };
        })
      });
    });
  }

  static getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      total: this.formatBytes(totalMem),
      free: this.formatBytes(freeMem),
      used: this.formatBytes(usedMem),
      usagePercent: `${((usedMem / totalMem) * 100).toFixed(2)}%`,
      raw: {
        total: totalMem,
        free: freeMem,
        used: usedMem
      },
      process: {
        heap: this.formatBytes(process.memoryUsage().heapUsed),
        rss: this.formatBytes(process.memoryUsage().rss),
        external: this.formatBytes(process.memoryUsage().external)
      }
    };
  }

  static async getDiskUsage() {
    try {
      const rootPath = os.platform() === 'win32' ? process.cwd().split(path.sep)[0] : '/';
      const stats = await fs.statfs(rootPath);
      
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      
      return {
        total: this.formatBytes(total),
        free: this.formatBytes(free),
        used: this.formatBytes(used),
        usagePercent: `${((used / total) * 100).toFixed(2)}%`,
        raw: {
          total,
          free,
          used
        },
        path: rootPath
      };
    } catch (error) {
      logger.error('Error getting disk usage:', error);
      // Fallback to basic disk info
      return {
        total: 'N/A',
        free: 'N/A',
        used: 'N/A',
        usagePercent: 'N/A',
        raw: { total: 0, free: 0, used: 0 },
        path: os.platform() === 'win32' ? process.cwd().split(path.sep)[0] : '/'
      };
    }
  }

  static getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      uptime: this.formatUptime(os.uptime()),
      loadAverage: os.loadavg().map(load => load.toFixed(2)),
      nodeVersion: process.version,
      processUptime: this.formatUptime(process.uptime())
    };
  }

  static formatUptime(uptime) {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    
    return parts.join(' ') || '0s';
  }

  static async recordServerStats(stats) {
    try {
      const { client } = await getRedisConnection();
      const timestamp = Date.now();
      await client.set(`monitor:server:${timestamp}`, JSON.stringify({
        cpu: stats.cpu.usagePercent,
        memory: stats.memory.usagePercent,
        disk: stats.disk.usagePercent
      }));
      await this.cleanupOldStats('monitor:server:');
    } catch (error) {
      logger.error('Error recording server stats:', error);
    }
  }

  // Update getHistoricalStats to include server resources
  static async getHistoricalStats(type = 'all', timeRange = 3600000) {
    try {
      const { client } = await getRedisConnection();
      const now = Date.now();
      const minTime = now - timeRange;
      const history = {};

      if (type === 'all' || type === 'server') {
        const serverKeys = await client.keys('monitor:server:*');
        history.server = await this.processHistoricalData(client, serverKeys, minTime);
      }

      // ... existing history collection code ...

      return history;
    } catch (error) {
      logger.error('Error getting historical stats:', error);
      return { server: [], cache: [], network: [], memory: [] };
    }
  }
}

module.exports = RedisMonitor;