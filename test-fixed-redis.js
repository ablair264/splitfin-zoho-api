// Test the updated Redis connection
import Redis from 'ioredis';

const protocol = 'rediss://';
const username = 'default';
const password = 'mshwGabXeCQIuLmUfUD4sy57VGIxbUMO';
const host = 'redis-14532.c15.us-east-1-2.ec2.redns.redis-cloud.com';
const port = 14532;
const db = 0;

const connectionString = `${protocol}${username}:${password}@${host}:${port}/${db}`;

console.log('🔍 Testing Redis Cloud connection string approach...');
console.log('Connection:', connectionString.replace(/:[^:@]+@/, ':***@'));

const redis = new Redis(connectionString, {
  retryStrategy: (times) => {
    console.log(`Retry attempt ${times}`);
    return Math.min(times * 50, 2000);
  },
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  connectTimeout: 15000,
  commandTimeout: 8000,
});

redis.on('connect', () => {
  console.log('✅ Redis connected!');
});

redis.on('ready', async () => {
  console.log('✅ Redis ready!');
  
  try {
    const pong = await redis.ping();
    console.log('PING response:', pong);
    
    await redis.set('test-dashboard', JSON.stringify({
      userId: 'test-user',
      dateRange: '30_days',
      data: { totalOrders: 100, totalRevenue: 5000 },
      timestamp: Date.now()
    }), 'EX', 300); // 5 minute TTL
    
    const cached = await redis.get('test-dashboard');
    console.log('Cached data:', JSON.parse(cached));
    
    console.log('✅ Redis Cloud connection successful!');
    
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