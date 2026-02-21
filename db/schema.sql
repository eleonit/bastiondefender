-- Schema para Bastion Defenders
-- Ejecutar manualmente si es necesario (el servidor lo crea automaticamente al iniciar)

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
