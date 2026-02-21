require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Database ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Init DB schema on startup
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        session_id UUID DEFAULT gen_random_uuid(),
        player_count INT NOT NULL DEFAULT 1,
        waves_survived INT NOT NULL DEFAULT 0,
        total_kills INT NOT NULL DEFAULT 0,
        victory BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

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
    console.error('⚠️ Error iniciando DB (puede que no haya DB configurada):', err.message);
  }
}

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---

// GET /api/scores - Top 10 mejores puntajes
app.get('/api/scores', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, player_count, waves_survived, total_kills, victory,
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
  const { player_count, waves_survived, total_kills, victory } = req.body;
  if (player_count == null || waves_survived == null || total_kills == null) {
    return res.status(400).json({ success: false, message: 'Faltan datos de la partida' });
  }
  try {
    const insertResult = await pool.query(
      `INSERT INTO scores (player_count, waves_survived, total_kills, victory)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [player_count, waves_survived, total_kills, !!victory]
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
app.listen(PORT, () => {
  console.log(`🛡️ Bastion Defenders servidor corriendo en puerto ${PORT}`);
});
