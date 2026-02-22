// ============================================================
// SYSTEMS.JS — WaveManager + ParticleSystem MEJORADO
// Incluye: explosiones, ondas de choque, fuego, magia, humo
// ============================================================
import { WAVES, CONFIG, getSpawnPoints } from './constants.js';
import { createEnemy } from './enemies.js';

// ─────────────────────────────────────
// PARTICLE TYPES
// ─────────────────────────────────────
const PT = { SPARK:0, SMOKE:1, FIRE:2, MAGIC:3, BLOOD:4, STAR:5 };

// ─────────────────────────────────────
// PARTICLE SYSTEM
// ─────────────────────────────────────
export class ParticleSystem {
  constructor() {
    this.particles  = [];
    this.shockwaves = [];
    this.decals     = []; // marcas de explosion en suelo (desaparecen lento)
  }

  // ── Basico (compatibilidad hacia atras) ──
  emit(x, y, color, count, speed, life) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = speed * (0.3 + Math.random() * 0.9);
      this.particles.push({
        x, y,
        vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd - speed*0.25,
        life, maxLife: life,
        color, size: 1.5 + Math.random()*3,
        gravity: speed*0.1, type: PT.SPARK,
      });
    }
  }

  // ── EXPLOSION: onda de choque + esquirlas + fuego ──
  emitExplosion(x, y, radius, color, isLarge = false) {
    // Onda de choque
    this.shockwaves.push({
      x, y, r: 4, maxR: radius * 2.5,
      alpha: 0.9, color,
      speed: isLarge ? 220 : 160,
    });
    // Llamas principales
    const fireCount = isLarge ? 40 : 20;
    for (let i = 0; i < fireCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = (isLarge ? 4 : 2.5) * (0.5 + Math.random());
      this.particles.push({
        x: x + (Math.random()-0.5)*radius*0.5,
        y: y + (Math.random()-0.5)*radius*0.5,
        vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd - 1.5 - Math.random()*2,
        life: 0.4 + Math.random()*0.5, maxLife: 0.9,
        color: Math.random()<0.5 ? '#ff6600' : '#ffdd00',
        size: (isLarge ? 8 : 5) * (0.6 + Math.random()*0.8),
        gravity: -1, type: PT.FIRE,
      });
    }
    // Humo negro tras la explosion
    const smokeCount = isLarge ? 18 : 8;
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: x + (Math.random()-0.5)*radius*0.7,
        y: y + (Math.random()-0.5)*radius*0.7,
        vx: Math.cos(angle)*0.8, vy: -1.2 - Math.random()*1.5,
        life: 0.6 + Math.random()*0.6, maxLife: 1.2,
        color: '#333344', size: (isLarge ? 14 : 8) * (0.7+Math.random()*0.6),
        gravity: -0.2, type: PT.SMOKE,
      });
    }
    // Chispas brillantes
    const sparkCount = isLarge ? 25 : 12;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = (isLarge ? 7 : 4) * (0.6 + Math.random());
      this.particles.push({
        x, y,
        vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd - 2,
        life: 0.3 + Math.random()*0.35, maxLife: 0.65,
        color: '#ffffff', size: 1.5 + Math.random()*2,
        gravity: 3, type: PT.SPARK,
      });
    }
    // Marca en suelo
    if (isLarge) {
      this.decals.push({ x, y, r: radius*0.9, life: 5, maxLife: 5, color: '#ff660033' });
    }
  }

  // ── FUEGO: columna de fuego ascendente ──
  emitFire(x, y, intensity = 1) {
    const count = Math.round(3 * intensity);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random()-0.5)*14*intensity,
        y: y + (Math.random()-0.5)*4,
        vx: (Math.random()-0.5)*1.5, vy: -2 - Math.random()*3*intensity,
        life: 0.3 + Math.random()*0.3, maxLife: 0.6,
        color: Math.random()<0.5 ? '#ff4400' : '#ffaa00',
        size: 4 + Math.random()*5*intensity,
        gravity: -0.5, type: PT.FIRE,
      });
    }
  }

  // ── MAGIA: destellos brillantes de colores ──
  emitMagic(x, y, color, count = 12, spread = 30) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 1.5 + Math.random() * 3.5;
      const sx    = x + (Math.random()-0.5)*spread;
      const sy    = y + (Math.random()-0.5)*spread;
      this.particles.push({
        x: sx, y: sy,
        vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd - 1.5,
        life: 0.4 + Math.random()*0.5, maxLife: 0.9,
        color, size: 2 + Math.random()*4,
        gravity: -0.3, type: PT.MAGIC,
        glow: true,
      });
      // Estrellas pequeñas
      if (Math.random() < 0.4) {
        this.particles.push({
          x: sx, y: sy,
          vx: 0, vy: -1 - Math.random(),
          life: 0.5 + Math.random()*0.5, maxLife: 1.0,
          color: '#ffffff', size: 1 + Math.random()*2,
          gravity: 0, type: PT.STAR,
          angle: Math.random()*Math.PI*2,
        });
      }
    }
  }

  // ── HUMO: nube lenta ──
  emitSmoke(x, y, count = 8, darkColor = '#555566') {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random()-0.5)*20,
        y: y + (Math.random()-0.5)*10,
        vx: (Math.random()-0.5)*0.8, vy: -0.8 - Math.random()*1.2,
        life: 0.8 + Math.random()*1.0, maxLife: 1.8,
        color: darkColor, size: 10 + Math.random()*12,
        gravity: -0.1, type: PT.SMOKE,
      });
    }
  }

  // ── IMPACTO (golpe cuerpo a cuerpo) ──
  emitHit(x, y, color = '#ffffff') {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 3 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd - 2,
        life: 0.15 + Math.random()*0.2, maxLife: 0.35,
        color, size: 2 + Math.random()*3,
        gravity: 2, type: PT.SPARK,
      });
    }
    // Flash blanco
    this.shockwaves.push({ x, y, r: 2, maxR: 22, alpha: 0.7, color, speed: 200 });
  }

  // ── MUERTE ENEMIGO ──
  emitDeath(x, y, color, size = 14) {
    this.emitExplosion(x, y, size, color, size > 20);
    this.emitSmoke(x, y, size > 20 ? 15 : 6);
  }

  // ─────── UPDATE ───────
  update(dt) {
    // Particulas
    this.particles = this.particles.filter(p => {
      p.x  += p.vx * 60 * dt;
      p.y  += p.vy * 60 * dt;
      p.vy += p.gravity * dt * 60;
      p.life -= dt;
      if (p.type === PT.SMOKE) p.size += 3 * dt; // el humo se expande
      return p.life > 0;
    });

    // Ondas de choque
    this.shockwaves = this.shockwaves.filter(sw => {
      sw.r += sw.speed * dt;
      sw.alpha -= dt * 2.5;
      return sw.alpha > 0 && sw.r < sw.maxR;
    });

    // Decales
    this.decals = this.decals.filter(d => {
      d.life -= dt;
      return d.life > 0;
    });
  }

  // ─────── DRAW ───────
  draw(ctx) {
    // Decales de suelo
    for (const d of this.decals) {
      ctx.save();
      ctx.globalAlpha = (d.life/d.maxLife) * 0.5;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
      ctx.fillStyle = d.color;
      ctx.fill();
      ctx.restore();
    }

    // Ondas de choque
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = sw.alpha * 0.6;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI*2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = sw.alpha * 0.15;
      ctx.fillStyle = sw.color;
      ctx.fill();
      ctx.restore();
    }

    // Partículas
    ctx.save();
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;

      if (p.type === PT.SMOKE) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fillStyle = p.color;
        ctx.fill();
        continue;
      }

      if (p.type === PT.STAR) {
        ctx.fillStyle = p.color;
        _drawStar(ctx, p.x, p.y, p.size * 1.5, p.size * 0.6, 4, p.angle + p.life * 3);
        continue;
      }

      if (p.type === PT.FIRE || p.type === PT.MAGIC) {
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur  = p.size * 2;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI*2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        continue;
      }

      // SPARK default
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha*0.5), 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.restore();
  }
}

function _drawStar(ctx, cx, cy, outer, inner, points, rotation) {
  ctx.beginPath();
  for (let i = 0; i <= points*2; i++) {
    const r = i%2===0 ? outer : inner;
    const a = (i/points)*Math.PI + rotation;
    if (i===0) ctx.moveTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r);
    else ctx.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r);
  }
  ctx.closePath();
  ctx.fill();
}

// ─────────────────────────────────────
// WAVE MANAGER (mismo que antes)
// ─────────────────────────────────────
export class WaveManager {
  constructor(map, particles) {
    this.map       = map;
    this.particles = particles;
    this.waveIndex = 0;
    this.totalWaves= WAVES.length;
    this.enemies   = [];
    this.state     = 'rest';
    this.restTimer = 3;
    this.kills     = 0;
    this.totalKills= 0;
    this._spawnQueue = [];
    this._spawnTimer = 0;
    this._spawnPoints= getSpawnPoints();
    this._nextEid    = 0;        // ID incremental por enemigo para sync multijugador
    this.onEnemyDied = null;     // callback(eid) cuando muere un enemigo localmente
  }

  get currentWaveNumber() { return this.waveIndex + 1; }
  get allWavesDone()      { return this.waveIndex >= this.totalWaves && this.state === 'done'; }
  get wavesCleared()      { return this.waveIndex; }

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
        if (this.enemies.every(e => !e.alive)) {
          this.enemies = [];
          this.waveIndex++;
          if (this.waveIndex >= this.totalWaves) {
            this.state = 'done';
          } else {
            this.state = 'rest';
            this.restTimer = CONFIG.WAVE_REST_TIME;
            base.regen(CONFIG.REGEN_BETWEEN_WAVES);
          }
        }
        break;
      case 'done': break;
    }

    for (const e of this.enemies) e.update(dt, players, base);

    const dead = this.enemies.filter(e => !e.alive && !e._counted);
    for (const e of dead) {
      e._counted = true;
      this.kills++;
      this.totalKills++;
      // Notificar muerte al sistema de sync multijugador
      if (this.onEnemyDied && e.eid !== undefined) {
        this.onEnemyDied(e.eid);
      }
    }
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
      for (let i = 0; i < group.count; i++) queue.push({ type: group.type, interval: group.interval });
    }
    // Sin shuffle aleatorio — orden determinístico para sincronización multijugador
    return queue;
  }

  _spawnEnemy(type) {
    const sp = this._spawnPoints[Math.floor(Math.random() * this._spawnPoints.length)];
    let bestRoute = this.map.waypoints[0];
    for (const route of this.map.waypoints) {
      if (Math.hypot(route[0].x-sp.x, route[0].y-sp.y) <
          Math.hypot(bestRoute[0].x-sp.x, bestRoute[0].y-sp.y)) bestRoute = route;
    }
    const enemy = createEnemy(type, sp, bestRoute, this.particles);
    enemy.eid = this._nextEid++; // ID único para sincronización entre clientes
    this.enemies.push(enemy);
  }

  drawEnemies(ctx, time) { for (const e of this.enemies) e.draw(ctx, time); }
  getRestTimeLeft() { return Math.ceil(this.restTimer); }
}
