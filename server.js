require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const os = require('os');
const PORT = process.env.PORT || 3000;

// --- Helper: Get Local IP ---
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();

// --- Database ---
const hasDB = !!process.env.DATABASE_URL;

const pool = hasDB ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

// Init DB schema on startup
async function initDB() {
  if (!hasDB) {
    console.log('ℹ️ No se ha detectado DATABASE_URL en .env. El servidor funcionará en modo "sin persistencia".');
    return;
  }
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        session_id UUID DEFAULT gen_random_uuid(),
        player_count INT NOT NULL DEFAULT 1,
        player_names TEXT,
        waves_survived INT NOT NULL DEFAULT 0,
        total_kills INT NOT NULL DEFAULT 0,
        victory BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Ensure columns exist if table was created before
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scores' AND column_name='player_names') THEN
          ALTER TABLE scores ADD COLUMN player_names TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scores' AND column_name='player_levels') THEN
          ALTER TABLE scores ADD COLUMN player_levels TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scores' AND column_name='player_stats') THEN
          ALTER TABLE scores ADD COLUMN player_stats TEXT;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS global_stats (
        id INT PRIMARY KEY DEFAULT 1,
        total_games INT DEFAULT 0,
        total_kills INT DEFAULT 0,
        total_victories INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO global_stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Base de datos inicializada correctamente');
  } catch (err) {
    console.error('⚠️ Error iniciando DB (puede que la configuración sea incorrecta):', err.message);
  }
}

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Socket.io Logic ---
let players = {};
let gameState = {
  enemies: [],
  wave: 0,
  isStarted: false
};

io.on('connection', (socket) => {
  console.log(`📡 Jugador conectado: ${socket.id}`);

  socket.on('joinGame', (userData) => {
    players[socket.id] = {
      id: socket.id,
      name: userData.name || 'Anónimo',
      x: 400,
      y: 300,
      hp: 100,
      score: 0,
      color: userData.color || `hsl(${Math.random() * 360}, 70%, 50%)`
    };
    
    // Enviar estado actual al nuevo jugador
    socket.emit('currentPlayers', players);
    // Notificar a otros
    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('playerAction', (actionData) => {
    // Ejemplo: ataques, habilidades
    socket.broadcast.emit('playerActionPerformed', {
      playerId: socket.id,
      ...actionData
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Jugador desconectado: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// --- API Routes ---

// GET /api/scores - Top 10 mejores puntajes
app.get('/api/scores', async (req, res) => {
  if (!hasDB) return res.json({ success: true, scores: [] });
  try {
    const result = await pool.query(
      `SELECT id, player_count, player_names, player_levels, player_stats, waves_survived, total_kills, victory,
              to_char(created_at, 'DD/MM/YYYY HH24:MI') as fecha
       FROM scores
       ORDER BY waves_survived DESC, total_kills DESC
       LIMIT 10`
    );
    res.json({ success: true, scores: result.rows });
  } catch (err) {
    console.error('Error en GET /api/scores:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener puntajes' });
  }
});

// POST /api/scores - Guardar puntaje de una partida
app.post('/api/scores', async (req, res) => {
  const { player_count, player_names, player_levels, player_stats, waves_survived, total_kills, victory } = req.body;
  
  if (player_count == null || waves_survived == null || total_kills == null) {
    return res.status(400).json({ success: false, message: 'Faltan datos de la partida' });
  }

  if (!hasDB) return res.json({ success: true, message: 'Score record omitido (sin DB)' });

  try {
    const insertResult = await pool.query(
      `INSERT INTO scores (player_count, player_names, player_levels, player_stats, waves_survived, total_kills, victory)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [player_count, player_names || '', player_levels || '', player_stats || '', waves_survived, total_kills, !!victory]
    );

    // Actualizar estadisticas globales
    await pool.query(
      `UPDATE global_stats SET
        total_games = total_games + 1,
        total_kills = total_kills + $1,
        total_victories = total_victories + $2,
        updated_at = NOW()
       WHERE id = 1`,
      [total_kills, victory ? 1 : 0]
    );

    res.json({ success: true, score: insertResult.rows[0] });
  } catch (err) {
    console.error('Error en POST /api/scores:', err.message);
    res.status(500).json({ success: false, message: 'Error al guardar puntaje' });
  }
});

// GET /api/stats - Estadisticas globales
app.get('/api/stats', async (req, res) => {
  if (!hasDB) return res.json({ success: true, stats: { total_games: 0, total_kills: 0, total_victories: 0 } });
  try {
    const result = await pool.query('SELECT * FROM global_stats WHERE id = 1');
    res.json({ success: true, stats: result.rows[0] || {} });
  } catch (err) {
    res.json({ success: true, stats: { total_games: 0, total_kills: 0, total_victories: 0 } });
  }
});

// Fallback: servir index.html para cualquier ruta no encontrada
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start ---
initDB();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️  Bastion Defenders servidor multijugador activo`);
  console.log(`🏠 Red Local: http://${LOCAL_IP}:${PORT}`);
  console.log(`🌍 Puerto: ${PORT}`);
});
