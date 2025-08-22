const { fetchToken, fetchCurrentData } = require('./src/services/solarman');

// Numéro de série du dispositif à tester
const deviceSn = "SA3ES211N49240"; // Remplacez par votre vrai numéro de série de dispositif

async function testCurrentData() {
    try {
        // D'abord, obtenir un token
        console.log('Fetching token...');
        await fetchToken();
        
        // Ensuite, obtenir les données actuelles
        console.log(`Fetching current data for device ${deviceSn}...`);
        const data = await fetchCurrentData(deviceSn);
        console.log('Current Data Response:', JSON.stringify(data, null, 2));
        
        if (data.dataList) {
            console.log('\nParsed Data Points:');
            data.dataList.forEach(point => {
                console.log(`${point.key}: ${point.value}`);
            });
        }
    } catch (error) {
        console.error('Error:', error.response?.data || error.message || error);
    }
}

testCurrentData();
