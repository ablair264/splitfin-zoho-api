// Simple Redis connection test
import Redis from 'ioredis';

console.log('🔍 Testing Redis connection...');

// Method 1: Connection String (Redis Cloud preferred)
const connectionString = 'rediss://default:mshwGabXeCQIuLmUfUD4sy57VGIxbUMO@redis-14532.c15.us-east-1-2.ec2.redns.redis-cloud.com:14532';
console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':***@'));

const redis = new Redis(connectionString, {
  connectTimeout: 15000,
  lazyConnect: false
});

redis.on('connect', () => {
  console.log('✅ Redis connected!');
});

redis.on('ready', async () => {
  console.log('✅ Redis ready!');
  
  try {
    console.log('Testing PING...');
    const pong = await redis.ping();
    console.log('PING response:', pong);
    
    console.log('Testing SET...');
    await redis.set('test-key', JSON.stringify({test: 'data', timestamp: Date.now()}));
    
    console.log('Testing GET...');
    const value = await redis.get('test-key');
    console.log('GET response:', value);
    
    console.log('✅ All Redis tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
});

redis.on('error', (error) => {
  console.error('❌ Redis error:', error.message);
  
  if (error.message.includes('SSL')) {
    console.log('💡 SSL/TLS issue detected. This is common with Redis Cloud.');
    console.log('💡 The server might need different TLS configuration.');
  }
  
  process.exit(1);
});

redis.on('close', () => {
  console.log('🔌 Redis connection closed');
});

setTimeout(() => {
  console.log('❌ Connection timeout after 20 seconds');
  process.exit(1);
}, 20000);