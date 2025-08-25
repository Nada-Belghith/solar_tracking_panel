const { fetchToken, fetchDeviceSiteId, fetchPowerHistory } = require('./solarman');

async function testSolarmanFunctions() {
    try {
        // Test 1: Fetch Token
        console.log('Test 1: Fetching token...');
        const tokenResult = await fetchToken();
        console.log('✅ Token fetch successful');
        console.log('Token:', tokenResult.token);
        console.log('Token expires in:', new Date(tokenResult.expiresIn).toLocaleString());
        console.log('---------------------');

        // Test 2: Fetch Device SiteId
        console.log('Test 2: Fetching device siteId...');
        const deviceSn = "SA3ES233N5Q493"; // Le numéro de série de test
        const siteId = await fetchDeviceSiteId(deviceSn);
        console.log('✅ SiteId fetch successful');
        console.log('Device SiteId:', siteId);
        console.log('---------------------');

        // Test 3: Fetch Power History
        console.log('Test 3: Fetching power history...');
        const today = new Date();
        const powerHistory = await fetchPowerHistory(
            deviceSn,
            today.getFullYear(),
            today.getMonth() + 1,  // getMonth() returns 0-11, we need 1-12
            today.getDate()
        );
        console.log('✅ Power history fetch successful');
        console.log('Power History Data:', JSON.stringify(powerHistory, null, 2));
        console.log('---------------------');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Error response:', {
                status: error.response.status,

                data: error.response.data
            });
        }
    }
}

// Exécuter les tests
console.log('Starting Solarman API tests...');
testSolarmanFunctions();
