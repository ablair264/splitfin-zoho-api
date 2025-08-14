// Test the Stack Overflow fix for Redis Cloud SSL issues
import Redis from 'ioredis';

const username = 'default';
const password = 'mshwGabXeCQIuLmUfUD4sy57VGIxbUMO';
const host = 'redis-14532.c15.us-east-1-2.ec2.redns.redis-cloud.com';
const port = 14532;
const db = 0;

// Use redis:// instead of rediss:// and handle TLS in options
const connectionString = `redis://${username}:${password}@${host}:${port}/${db}`;

console.log('🔍 Testing Stack Overflow SSL fix...');
console.log('Connection:', connectionString.replace(/:[^:@]+@/, ':***@'));

const redis = new Redis(connectionString, {
  retryStrategy: (times) => {
    console.log(`Retry attempt ${times}`);
    return times > 3 ? null : Math.min(times * 50, 2000);
  },
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  connectTimeout: 15000,
  commandTimeout: 8000,
  // Stack Overflow fix for Redis Cloud SSL
  tls: {
    rejectUnauthorized: false,
    requestCert: true,
    agent: false,
  },
});

redis.on('connect', () => {
  console.log('✅ Redis connected with SSL fix!');
});

redis.on('ready', async () => {
  console.log('✅ Redis ready!');
  
  try {
    const pong = await redis.ping();
    console.log('PING response:', pong);
    
    // Test dashboard caching
    const testData = {
      userId: 'test-user',
      dateRange: '30_days',
      metrics: { totalOrders: 100, totalRevenue: 5000 },
      timestamp: Date.now()
    };
    
    await redis.setex('dashboard:test:30_days', 300, JSON.stringify(testData));
    console.log('✅ Data cached successfully');
    
    const cached = await redis.get('dashboard:test:30_days');
    const retrieved = JSON.parse(cached);
    console.log('✅ Data retrieved:', { userId: retrieved.userId, revenue: retrieved.metrics.totalRevenue });
    
    console.log('🎉 Redis Cloud connection working perfectly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
});

redis.on('error', (error) => {
  console.error('❌ Redis error:', error.message);
  
  if (error.message.includes('SSL') || error.message.includes('TLS')) {
    console.log('💡 Still having SSL issues. May need to try without TLS entirely.');
  }
  
  process.exit(1);
});

setTimeout(() => {
  console.log('❌ Connection timeout');
  process.exit(1);
}, 20000);