const express = require('express');
const app = express();
const panelsRoute = require('./routes/panels');

app.use(express.json());
app.use(panelsRoute);

const server = app.listen(3001, () => {
  console.log('Server is running on port 3001');
});

module.exports = server;