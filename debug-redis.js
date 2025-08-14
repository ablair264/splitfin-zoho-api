// debug-redis.js - Quick Redis connection debug
import Redis from 'ioredis';

const config = {
  host: 'redis-14532.c15.us-east-1-2.ec2.redns.redis-cloud.com',
  port: 14532,
  username: 'default',
  password: 'mshwGabXeCQIuLmUfUD4sy57VGIxbUMO',
  tls: {
    rejectUnauthorized: false,
    checkServerIdentity: () => null
  },
  connectTimeout: 10000,
  retryStrategy: (times) => {
    console.log(`Retry attempt ${times}`);
    return Math.min(times * 50, 2000);
  }
};

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

async function test() {
  try {
    console.log('Testing PING...');
    const pong = await redis.ping();
    console.log('PING response:', pong);
    
    console.log('Testing SET...');
    await redis.set('test', 'hello');
    
    console.log('Testing GET...');
    const value = await redis.get('test');
    console.log('GET response:', value);
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
}

setTimeout(() => {
  console.log('❌ Connection timeout after 15 seconds');
  process.exit(1);
}, 15000);