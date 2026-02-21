// ============================================================
// SYSTEMS.JS — WaveManager + ParticleSystem
// ============================================================
import { WAVES, ENEMY_TYPES, CONFIG, getSpawnPoints } from './constants.js';
import { createEnemy } from './enemies.js';

// ─────────────────────────────────────
// PARTICLE SYSTEM
// ─────────────────────────────────────
export class ParticleSystem {
  constructor() { this.particles = []; }

  emit(x, y, color, count, speed, life) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - speed * 0.3,
        life, maxLife: life,
        color,
        size: 2 + Math.random() * 3,
        gravity: speed * 0.15,
      });
    }
  }

  update(dt) {
    this.particles = this.particles.filter(p => {
      p.x  += p.vx * 60 * dt;
      p.y  += p.vy * 60 * dt;
      p.vy += p.gravity * dt * 60;
      p.life -= dt;
      return p.life > 0;
    });
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────
// WAVE MANAGER
// ─────────────────────────────────────
export class WaveManager {
  constructor(map, particles) {
    this.map       = map;
    this.particles = particles;
    this.waveIndex = 0;       // 0-based (oleada actual = waveIndex+1)
    this.totalWaves= WAVES.length;
    this.enemies   = [];
    this.state     = 'rest'; // 'rest' | 'spawning' | 'fighting' | 'done'
    this.restTimer = 3;      // tiempo inicial antes de la primera oleada
    this.kills     = 0;
    this.totalKills= 0;
    this._spawnQueue = [];
    this._spawnTimer = 0;
    this._spawnPoints= getSpawnPoints();
  }

  get currentWaveNumber() { return this.waveIndex + 1; }
  get allWavesDone()      { return this.waveIndex >= this.totalWaves && this.state === 'done'; }
  get wavesCleared()      { return this.waveIndex; }

  update(dt) {
    // Actualizar enemigos vivos
    return;  // Se llama desde main.js
  }

  tick(dt, players, base) {
    switch (this.state) {
      case 'rest':
        this.restTimer -= dt;
        if (this.restTimer <= 0) this._startWave();
        break;

      case 'spawning':
        this._spawnTimer -= dt;
        if (this._spawnTimer <= 0 && this._spawnQueue.length > 0) {
          const entry = this._spawnQueue.shift();
          this._spawnEnemy(entry.type);
          this._spawnTimer = entry.interval;
        }
        if (this._spawnQueue.length === 0) this.state = 'fighting';
        break;

      case 'fighting':
        // Comprobar si todos los enemigos están muertos
        if (this.enemies.every(e => !e.alive)) {
          this.enemies = this.enemies.filter(e => e.alive); // limpiar
          this.waveIndex++;
          if (this.waveIndex >= this.totalWaves) {
            this.state = 'done';
          } else {
            this.state = 'rest';
            this.restTimer = CONFIG.WAVE_REST_TIME;
            // Regenerar vida de la base
            base.regen(CONFIG.REGEN_BETWEEN_WAVES);
          }
        }
        break;

      case 'done':
        break;
    }

    // Actualizar enemigos
    for (const e of this.enemies) {
      e.update(dt, players, base);
    }
    // Contar kills nuevos
    const dead = this.enemies.filter(e => !e.alive && e._counted !== true);
    for (const e of dead) {
      e._counted = true;
      this.kills++;
      this.totalKills++;
    }
    // Remover los muertos ya procesados para no acumular
    this.enemies = this.enemies.filter(e => e.alive || !e._counted);
  }

  _startWave() {
    this.state   = 'spawning';
    this.kills   = 0;
    this.enemies = [];
    this._spawnQueue = this._buildQueue(WAVES[this.waveIndex]);
    this._spawnTimer = 0;
  }

  _buildQueue(waveDef) {
    const queue = [];
    for (const group of waveDef) {
      for (let i = 0; i < group.count; i++) {
        queue.push({ type: group.type, interval: group.interval });
      }
    }
    // Mezclar un poco para variedad
    for (let i = queue.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    return queue;
  }

  _spawnEnemy(type) {
    // Elegir punto de spawn aleatorio
    const sp = this._spawnPoints[Math.floor(Math.random() * this._spawnPoints.length)];
    // Elegir ruta de waypoints más cercana al spawn
    let bestRoute = this.map.waypoints[0];
    for (const route of this.map.waypoints) {
      if (Math.hypot(route[0].x-sp.x, route[0].y-sp.y) <
          Math.hypot(bestRoute[0].x-sp.x, bestRoute[0].y-sp.y)) {
        bestRoute = route;
      }
    }
    const enemy = createEnemy(type, sp, bestRoute, this.particles);
    this.enemies.push(enemy);
  }

  drawEnemies(ctx, time) {
    for (const e of this.enemies) e.draw(ctx, time);
  }

  getRestTimeLeft() { return Math.ceil(this.restTimer); }
}
