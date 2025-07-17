/**
 * Smart Solar Tracking API
 * ───────────────────────
 *  • Récupère la télémétrie humidity / temperature depuis ThingsBoard
 *  • L’enregistre dans PostgreSQL
 *  • Fournit des endpoints REST consommés par un front‑end React
 *
 *  ⚙️  Dépendances : express, axios, pg, cors, dotenv
 *  ➜  npm i express axios pg cors dotenv
 */

require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const { Pool } = require('pg');
const cors    = require('cors');

const http = require('http');
const { Server } = require('socket.io');
const app = express();
app.use(express.json());
const allowedOrigins = [
  'http://localhost:5000',
  process.env.FRONT_URL
].filter(Boolean);
app.use(cors({
  origin: function(origin, callback) {
    // autorise les requêtes sans origin (ex: curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Création du serveur HTTP et du serveur socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin:"*",
    methods: ["GET", "POST"],
     credentials: true,
  }
});

io.on('connection', (socket) => {
  console.log('🟢 Client WebSocket connecté:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔴 Client WebSocket déconnecté:', socket.id);
  });
});

/* ──────────────────────────────────────────────────────────────
   ThingsBoard
   ────────────────────────────────────────────────────────────── */

const TB = {
  baseUrl : process.env.TB_URL || 'https://thingsboard.cloud',
  username: process.env.TB_USER,
  password: process.env.TB_PASS,
  deviceId: process.env.TB_DEVICE,
};

let tbToken      = null;
let tokenExpires = 0; // timestamp (ms)

/**
 * Récupère et met en cache le JWT ThingsBoard.
 * Rafraîchit automatiquement quand il expire (marge 10 min).
 */
async function getTbToken() {
  const now = Date.now();
  if (tbToken && now < tokenExpires) {
    console.log('ThingsBoard token (cache):', tbToken);
    return tbToken;
  }

  const { data } = await axios.post(
    `${TB.baseUrl}/api/auth/login`,
    { username: TB.username, password: TB.password },
    { headers: { 'Content-Type': 'application/json' } }
  );

  tbToken      = data.token;
  tokenExpires = now + 50 * 60 * 1000; // 50 min
  console.log('ThingsBoard token (nouveau):', tbToken);
  return tbToken;
}

/*""""""""""""""""""""""""""""""""""""""""""""""""""*/
const WebSocket = require('ws');

async function connectThingsBoardWS() {
  // Obtenir le token JWT via API login (comme dans ton code)
  const token = await getTbToken();

  const ws = new WebSocket(`wss://thingsboard.cloud/api/ws/plugins/telemetry?token=${token}`);

  ws.on('open', () => {
    console.log('WS connecté à ThingsBoard');

    // S'abonner aux données du device, exemple pour deviceId = TB.deviceId
    const subscribeMsg = {
      tsSubCmds: [{
        entityType: "DEVICE",
        entityId: process.env.TB_DEVICE,
        scope: "LATEST_TELEMETRY",
        cmdId: 1,
      }],
      historyCmds: [],
      attrSubCmds: []
    };
    ws.send(JSON.stringify(subscribeMsg));
  });

 ws.on("message", async (msg) => {
  const payload = JSON.parse(msg);

  if (payload.data) {
    // extrait la 1ʳᵉ valeur de chaque tableau
    const humValArr  = payload.data.humidity?.[0];
    const tempValArr = payload.data.temperature?.[0];

    const humidity    = humValArr  ? Number(humValArr[1])  : null;
    const temperature = tempValArr ? Number(tempValArr[1]) : null;

    console.log("📡 Reçu :", { temperature, humidity });

    // 1️⃣ enregistre dans PostgreSQL
    await insertTelemetry({ humidity, temperature });

    // 2️⃣ diffuse au front
    io.emit("telemetry", { humidity, temperature });
  }
});

  ws.on('close', () => {
    console.log('WS déconnecté, tentative de reconnexion dans 5s...');
    setTimeout(connectThingsBoardWS, 5000);
  });

  ws.on('error', (err) => {
    console.error('Erreur WS:', err.message);
    ws.close();
  });
}

connectThingsBoardWS();

/*""""""""""""""""""""""""""""""""""""""""""""""""""*/

/* ──────────────────────────────────────────────────────────────
   PostgreSQL
   ────────────────────────────────────────────────────────────── */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ex : postgres://user:pass@host:5432/db
  idleTimeoutMillis: 30_000,
});
pool.on('error', (err) => console.error('Idle PG client error:', err));

/**
 * Insère un enregistrement télémétrie (nullable).
 * @param {Object} payload {humidity?: number|null, temperature?: number|null}
 */
async function insertTelemetry({ humidity = null, temperature = null }) {
  await pool.query(
    `INSERT INTO telemetry (humidity, temperature, created_at)
     VALUES ($1, $2, NOW())`,
    [humidity, temperature]
  );
}



/* ──────────────────────────────────────────────────────────────
   Lancement
   ────────────────────────────────────────────────────────────── */

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`✅  API prête (WebSocket inclus) sur http://localhost:${PORT}`));
