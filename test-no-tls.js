// Test Redis Cloud without TLS (common fix)
import Redis from 'ioredis';

const config = {
  host: 'redis-14532.c15.us-east-1-2.ec2.redns.redis-cloud.com',
  port: 14532,
  username: 'default',
  password: 'mshwGabXeCQIuLmUfUD4sy57VGIxbUMO',
  db: 0,
  // NO TLS configuration - completely disabled
  retryStrategy: (times) => {
    console.log(`Retry attempt ${times}`);
    return times > 3 ? null : Math.min(times * 50, 2000);
  },
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  connectTimeout: 15000,
  commandTimeout: 8000,
};

console.log('🔍 Testing Redis Cloud WITHOUT TLS...');
console.log('Config:', {
  host: config.host,
  port: config.port,
  username: config.username,
  password: '***',
  tls: 'DISABLED'
});

const redis = new Redis(config);

redis.on('connect', () => {
  console.log('✅ Redis connected without TLS!');
});

redis.on('ready', async () => {
  console.log('✅ Redis ready!');
  
  try {
    const pong = await redis.ping();
    console.log('PING response:', pong);
    
    // Test caching
    await redis.setex('test', 60, 'hello-redis');
    const value = await redis.get('test');
    console.log('GET response:', value);
    
    console.log('🎉 Redis working without TLS!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
});

redis.on('error', (error) => {
  console.error('❌ Redis error:', error.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('❌ Connection timeout');
  process.exit(1);
}, 20000);