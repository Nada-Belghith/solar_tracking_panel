const { fetchToken } = require('./src/services/solarman');

(async () => {
  try {
    const token = await fetchToken();
    console.log('Fetched Token:', token.token);
  } catch (error) {
    console.error('Error fetching token:', error.message || error);
  }
})();
