/**
 * Quick test script to verify the proxy server works
 * Run: node test-proxy.js
 */

const http = require('http');

const testProxy = () => {
  console.log('Testing proxy server...\n');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Proxy server is running!');
        console.log('Response:', data);
        console.log('\n💡 Next steps:');
        console.log('   1. Make sure your .env file has: EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api');
        console.log('   2. Restart your Expo app: npm run web');
      } else {
        console.log('❌ Proxy server responded with status:', res.statusCode);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Proxy server is NOT running!');
    console.log('Error:', error.message);
    console.log('\n💡 Start the proxy server: npm run proxy');
  });

  req.end();
};

testProxy();

