// test-redis-connection.js
import dotenv from 'dotenv';
import redisService from './src/services/redisService.js';

dotenv.config();

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...');
  console.log('Host:', process.env.REDIS_HOST);
  console.log('Port:', process.env.REDIS_PORT);
  console.log('TLS:', process.env.REDIS_TLS);
  
  try {
    // Test basic connection
    console.log('\n1. Testing basic connection...');
    const health = await redisService.healthCheck();
    console.log('Health check result:', health);
    
    if (health.status === 'healthy') {
      console.log('✅ Redis connection successful!');
      
      // Test caching functionality
      console.log('\n2. Testing cache operations...');
      
      const testData = {
        message: 'Hello Redis!',
        timestamp: new Date().toISOString(),
        testArray: [1, 2, 3, 4, 5],
        testObject: { nested: true, value: 42 }
      };
      
      // Set test data
      console.log('Setting test data...');
      await redisService.set('test-key', testData, 60); // 60 second TTL
      
      // Get test data
      console.log('Getting test data...');
      const retrieved = await redisService.get('test-key');
      
      if (JSON.stringify(testData) === JSON.stringify(retrieved)) {
        console.log('✅ Cache operations working perfectly!');
        console.log('Retrieved data:', retrieved);
      } else {
        console.log('❌ Cache data mismatch');
        console.log('Original:', testData);
        console.log('Retrieved:', retrieved);
      }
      
      // Test dashboard cache key
      console.log('\n3. Testing dashboard cache keys...');
      const dashboardKey = redisService.getDashboardCacheKey('test-user', '30_days');
      console.log('Dashboard cache key:', dashboardKey);
      
      // Clean up
      await redisService.del('test-key');
      console.log('🧹 Test data cleaned up');
      
    } else {
      console.log('❌ Redis connection failed:', health);
    }
    
  } catch (error) {
    console.error('❌ Redis test error:', error.message);
    console.error('Full error:', error);
  }
  
  // Close connection
  await redisService.close();
  console.log('\n🔌 Redis connection closed');
  process.exit(0);
}

testRedisConnection();