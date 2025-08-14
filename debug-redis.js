// debug-redis.js - Quick Redis connection debug
import Redis from 'ioredis';

// Try connection string format first
const connectionString = 'rediss://default:mshwGabXeCQIuLmUfUD4sy57VGIxbUMO@redis-14532.c15.us-east-1-2.ec2.redns.redis-cloud.com:14532';

console.log('Testing with connection string:', connectionString.replace(/:[^:@]+@/, ':***@'));

const redis1 = new Redis(connectionString, {
  retryStrategy: (times) => {
    console.log(`Connection string - Retry attempt ${times}`);
    return Math.min(times * 50, 2000);
  },
  connectTimeout: 10000
});

redis1.on('connect', () => {
  console.log('✅ Connection String: Redis connected!');
  testConnection(redis1, 'Connection String');
});

redis1.on('error', (error) => {
  console.error('❌ Connection String error:', error.message);
  
  // Try object config as fallback
  console.log('\n--- Trying object config as fallback ---');
  testObjectConfig();
});

function testObjectConfig() {
  const config = {
    host: 'redis-14532.c15.us-east-1-2.ec2.redns.redis-cloud.com',
    port: 14532,
    username: 'default',
    password: 'mshwGabXeCQIuLmUfUD4sy57VGIxbUMO',
    tls: {},
    connectTimeout: 10000,
    retryStrategy: (times) => {
      console.log(`Object config - Retry attempt ${times}`);
      return Math.min(times * 50, 2000);
    }
  };

  console.log('Testing with object config:', {
    host: config.host,
    port: config.port,
    username: config.username,
    password: '***hidden***',
    tls: true
  });

  const redis2 = new Redis(config);

  redis2.on('connect', () => {
    console.log('✅ Object Config: Redis connected!');
    testConnection(redis2, 'Object Config');
  });

  redis2.on('error', (error) => {
    console.error('❌ Object Config error:', error.message);
    process.exit(1);
  });
}

console.log('Testing Redis connection with config:', {
  host: config.host,
  port: config.port,
  password: '***hidden***',
  tls: !!config.tls
});

const redis = new Redis(config);

redis.on('connect', () => {
  console.log('✅ Redis connected!');
});

redis.on('ready', () => {
  console.log('✅ Redis ready!');
  test();
});

redis.on('error', (error) => {
  console.error('❌ Redis error:', error.message);
  process.exit(1);
});

redis.on('close', () => {
  console.log('🔌 Redis connection closed');
});

async function testConnection(redis, method) {
  try {
    console.log(`\n[${method}] Testing PING...`);
    const pong = await redis.ping();
    console.log(`[${method}] PING response:`, pong);
    
    console.log(`[${method}] Testing SET...`);
    await redis.set('test', 'hello');
    
    console.log(`[${method}] Testing GET...`);
    const value = await redis.get('test');
    console.log(`[${method}] GET response:`, value);
    
    console.log(`✅ [${method}] All tests passed!`);
    
  } catch (error) {
    console.error(`❌ [${method}] Test failed:`, error.message);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
}

setTimeout(() => {
  console.log('❌ Connection timeout after 20 seconds');
  process.exit(1);
}, 20000);