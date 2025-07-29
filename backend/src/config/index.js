require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '2h'
  },
  db: {
    url: process.env.DATABASE_URL
  },
  thingsboard: {
    baseUrl: process.env.TB_URL || 'https://thingsboard.cloud',
    username: process.env.TB_USER,
    password: process.env.TB_PASS,
    deviceId: process.env.TB_DEVICE,
    devicetoken: process.env.TB_DEVICETOKEN
  },
  cors: {
    origins: [
      'http://localhost:5000',
      process.env.FRONT_URL
    ].filter(Boolean)
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  }
};
