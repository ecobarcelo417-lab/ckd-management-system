const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Since demo accounts were removed, set these to a real account you registered
// via POST /api/auth/register (e.g. TEST_USERNAME=myadmin TEST_PASSWORD=... node test.js)
const TEST_USERNAME = process.env.TEST_USERNAME;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!TEST_USERNAME || !TEST_PASSWORD) {
  console.error('Set TEST_USERNAME and TEST_PASSWORD to an existing account (e.g. TEST_USERNAME="Dr Eco").');
  process.exit(1);
}

async function testBackend() {
  console.log('Testing CKD Management System Backend...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('   ✅ Health check:', health.data.status);

    // Test 2: Login as admin
    console.log('\n2. Testing admin login...');
    const login = await axios.post(`${BASE_URL}/auth/login`, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    });
    console.log('   ✅ Login successful');
    console.log('   Token received:', login.data.token.substring(0, 20) + '...');

    const token = login.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // Test 3: Get current user
    console.log('\n3. Testing get current user...');
    const me = await axios.get(`${BASE_URL}/auth/me`, { headers });
    console.log('   ✅ User:', me.data.full_name, `(${me.data.role})`);

    // Test 4: Get patients
    console.log('\n4. Testing patients endpoint...');
    const patients = await axios.get(`${BASE_URL}/patients`, { headers });
    console.log('   ✅ Patients found:', patients.data.length);

    // Test 5: Get dialysis sessions
    console.log('\n5. Testing dialysis sessions...');
    const sessions = await axios.get(`${BASE_URL}/dialysis`, { headers });
    console.log('   ✅ Sessions found:', sessions.data.length);

    // Test 6: Get dashboard stats
    console.log('\n6. Testing dashboard stats...');
    const stats = await axios.get(`${BASE_URL}/dashboard/stats`, { headers });
    console.log('   ✅ Stats:', JSON.stringify(stats.data, null, 2).substring(0, 100) + '...');

    console.log('\n✅ All tests passed! Backend is working correctly.');
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return false;
  }
}

// Run tests if backend is running
testBackend().then(success => {
  if (!success) {
    console.log('\nMake sure the backend is running on port 3001');
    console.log('Run: cd backend && npm start');
  }
});
