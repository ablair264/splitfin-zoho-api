// server/src/services/redisService.js
import Redis from 'ioredis';

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
    
    // Initialize Redis connection
    this.init();
  }

  init() {
    try {
      // For Redis Cloud, use connection string format which handles TLS better
      if (process.env.REDIS_HOST && process.env.REDIS_HOST.includes('redis-cloud.com')) {
        const protocol = process.env.REDIS_TLS === 'true' ? 'rediss://' : 'redis://';
        const username = process.env.REDIS_USERNAME || 'default';
        const password = process.env.REDIS_PASSWORD || '';
        const host = process.env.REDIS_HOST;
        const port = process.env.REDIS_PORT || 6379;
        const db = process.env.REDIS_DB || 0;
        
        const connectionString = `${protocol}${username}:${password}@${host}:${port}/${db}`;
        
        this.client = new Redis(connectionString, {
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          connectTimeout: 15000,
          commandTimeout: 8000,
        });
      } else {
        // Fallback to object config for other Redis instances
        const redisConfig = {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          username: process.env.REDIS_USERNAME || 'default',
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB) || 0,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: true,
          connectTimeout: 10000,
          commandTimeout: 5000,
        };

        // Add TLS config if using secured Redis
        if (process.env.REDIS_TLS === 'true') {
          redisConfig.tls = {
            servername: process.env.REDIS_HOST,
            rejectUnauthorized: false
          };
        }

        this.client = new Redis(redisConfig);
      }

      // Event handlers
      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
        this.retryAttempts = 0;
      });

      this.client.on('ready', () => {
        console.log('🚀 Redis ready for commands');
      });

      this.client.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.warn('⚠️ Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', (ms) => {
        console.log(`🔄 Redis reconnecting in ${ms}ms...`);
      });

    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Get data from Redis with JSON parsing
   */
  async get(key) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ Redis not connected, attempting to connect...');
        await this.client.connect();
      }

      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error(`❌ Redis GET error for key "${key}":`, error.message);
      return null;
    }
  }

  /**
   * Set data in Redis with JSON stringification and TTL
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ Redis not connected, attempting to connect...');
        await this.client.connect();
      }

      const jsonValue = JSON.stringify(value);
      
      if (ttlSeconds > 0) {
        await this.client.setex(key, ttlSeconds, jsonValue);
      } else {
        await this.client.set(key, jsonValue);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Redis SET error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Set with expiration time
   */
  async setex(key, seconds, value) {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
      
      const jsonValue = JSON.stringify(value);
      await this.client.setex(key, seconds, jsonValue);
      return true;
    } catch (error) {
      console.error(`❌ Redis SETEX error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Delete key from Redis
   */
  async del(key) {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
      
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`❌ Redis DEL error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
      
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Redis EXISTS error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key, seconds) {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
      
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error(`❌ Redis EXPIRE error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Get keys by pattern
   */
  async keys(pattern) {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
      
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`❌ Redis KEYS error for pattern "${pattern}":`, error.message);
      return [];
    }
  }

  /**
   * Clear keys by pattern (useful for cache invalidation)
   */
  async clearPattern(pattern) {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
      
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        const result = await this.client.del(...keys);
        console.log(`🗑️ Cleared ${result} Redis keys matching pattern: ${pattern}`);
        return result;
      }
      return 0;
    } catch (error) {
      console.error(`❌ Redis CLEAR error for pattern "${pattern}":`, error.message);
      return 0;
    }
  }

  /**
   * Get Redis info for monitoring
   */
  async getInfo() {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
      
      const info = await this.client.info();
      return {
        connected: this.isConnected,
        info: info
      };
    } catch (error) {
      console.error('❌ Redis INFO error:', error.message);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
      
      const testKey = 'health-check';
      const testValue = { timestamp: Date.now() };
      
      await this.set(testKey, testValue, 10); // 10 second TTL
      const retrieved = await this.get(testKey);
      
      if (retrieved && retrieved.timestamp === testValue.timestamp) {
        await this.del(testKey);
        return {
          status: 'healthy',
          connected: true,
          latency: Date.now() - testValue.timestamp
        };
      }
      
      return {
        status: 'unhealthy',
        connected: false,
        error: 'Failed to retrieve test data'
      };
    } catch (error) {
      return {
        status: 'error',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    try {
      if (this.client) {
        await this.client.quit();
        console.log('🔌 Redis connection closed');
      }
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error.message);
    }
  }

  /**
   * Dashboard-specific cache keys
   */
  getDashboardCacheKey(userId, dateRange) {
    return `dashboard:${userId}:${dateRange}`;
  }

  getAgentCacheKey(agentId, dateRange) {
    return `agent:${agentId}:${dateRange}`;
  }

  getMetricsCacheKey(userId, metric) {
    return `metrics:${userId}:${metric}`;
  }

  /**
   * Cache dashboard data with smart TTL based on date range
   */
  async cacheDashboard(userId, dateRange, data) {
    const key = this.getDashboardCacheKey(userId, dateRange);
    
    // Smart TTL based on date range
    let ttl = 300; // 5 minutes default
    
    switch (dateRange) {
      case 'today':
        ttl = 60; // 1 minute for today's data
        break;
      case '7_days':
        ttl = 180; // 3 minutes
        break;
      case '30_days':
        ttl = 300; // 5 minutes
        break;
      case '90_days':
      case 'quarter':
        ttl = 600; // 10 minutes
        break;
      case 'year':
      case '1_year':
        ttl = 1800; // 30 minutes
        break;
      default:
        ttl = 300;
    }
    
    return await this.setex(key, ttl, data);
  }

  /**
   * Get cached dashboard data
   */
  async getCachedDashboard(userId, dateRange) {
    const key = this.getDashboardCacheKey(userId, dateRange);
    return await this.get(key);
  }

  /**
   * Clear all dashboard caches for a user
   */
  async clearUserDashboardCache(userId) {
    const pattern = `dashboard:${userId}:*`;
    return await this.clearPattern(pattern);
  }

  /**
   * Clear all caches (useful for data refresh)
   */
  async clearAllDashboardCaches() {
    const pattern = 'dashboard:*';
    return await this.clearPattern(pattern);
  }
}

// Create singleton instance
const redisService = new RedisService();

export default redisService;