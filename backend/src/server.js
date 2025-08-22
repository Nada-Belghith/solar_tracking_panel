const express = require('express');
const app = express();
const panelsRoute = require('./routes/panels');
const solarmanRoute = require('./routes/solarman');
const { startSolarmanPoller } = require('./services/solarman');

app.use(express.json());
app.use(panelsRoute);
app.use('/api/solarman', solarmanRoute);

const server = app.listen(3001, () => {
  console.log('Server is running on port 3001');
  if (process.env.SOLARMAN_API_KEY || (process.env.SOLARMAN_USER && process.env.SOLARMAN_PASS)) {
    startSolarmanPoller();
  }
});

module.exports = server;