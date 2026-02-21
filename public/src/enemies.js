// ============================================================
// ENEMIES.JS — Sistema de enemigos completo
// Enemy base + 7 tipos (OrcGrunt..MiNotaurKing)
// ============================================================
import { GAME_W, GAME_H, ENEMY_TYPES } from './constants.js';

export class Enemy {
  constructor(type, spawnPoint, waypoints, particles) {
    const data = ENEMY_TYPES[type];
    this.type     = type;
    this.data     = data;
    this.x        = spawnPoint.x;
    this.y        = spawnPoint.y;
    this.hp       = data.hp;
    this.maxHp    = data.hp;
    this.speed    = data.speed;
    this.atk      = data.atk;
    this.atkRate  = data.atkRate;
    this.atkTimer = 0;
    this.radius   = data.radius;
    this.reward   = data.reward;
    this.alive    = true;
    this.particles= particles;
    this.flying   = !!data.flying;
    this.ranged   = !!data.ranged;
    this.boss     = !!data.boss || !!data.miniBoss || !!data.finalBoss;
    this.projectileRange = data.projectileRange || 150;

    // Path following
    this.waypoints    = waypoints;
    this.waypointIdx  = 0;
    this.target       = null; // Override target (e.g. decoy)

    // Status
    this.stunTime  = 0;
    this.slowMult  = 1;     // 1 = normal, <1 = slow
    this.slowTime  = 0;
    this.cursed    = 0;
    this._hitFlash = 0;

    // Projectiles (para ranged)
    this.projectiles = [];
  }

  get alive() { return this._alive; }
  set alive(v) { this._alive = v; }

  stun(duration)    { this.stunTime = Math.max(this.stunTime, duration); }
  slow(mult, dt)    { this.slowMult = Math.min(this.slowMult, mult); this.slowTime = 0.2; }
  setTarget(obj)    { this.target = obj; }

  get effectiveSpeed() {
    return this.speed * (this.slowMult) * (this.cursed > 0 ? 0.6 : 1);
  }
  get effectiveAtk() {
    return this.atk * (this.cursed > 0 ? 0.6 : 1);
  }

  update(dt, players, base) {
    if (!this.alive) return;

    // Status timers
    if (this.stunTime > 0)  { this.stunTime -= dt; return; } // aturdido
    if (this.slowTime > 0)  { this.slowTime -= dt; if (this.slowTime <= 0) this.slowMult = 1; }
    if (this.cursed > 0)    { this.cursed -= dt; }
    if (this._hitFlash > 0) { this._hitFlash -= dt; }

    // Resetear target si expiró (decoy removido)
    if (this.target && this.target.life !== undefined && this.target.life <= 0) this.target = null;

    // Movimiento
    let gx, gy;
    if (this.target) {
      gx = this.target.x; gy = this.target.y;
    } else if (this.waypointIdx < this.waypoints.length) {
      gx = this.waypoints[this.waypointIdx].x;
      gy = this.waypoints[this.waypointIdx].y;
    } else {
      gx = base.x; gy = base.y;
    }

    const dx = gx - this.x, dy = gy - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < 8 && !this.target) {
      this.waypointIdx++;
    } else if (dist > 1) {
      const spd = this.effectiveSpeed * 60;
      this.x += (dx/dist) * spd * dt;
      this.y += (dy/dist) * spd * dt;
    }

    // Atacar base
    const dBase = Math.hypot(base.x - this.x, base.y - this.y);
    if (dBase < base.radius + this.radius) {
      this.atkTimer -= dt;
      if (this.atkTimer <= 0) {
        base.takeDamage(this.effectiveAtk);
        this.atkTimer = 1 / this.atkRate;
        this.particles.emit(base.x, base.y, '#ff4444', 8, 4, 0.3);
      }
    }

    // Ranged: disparar a jugadores
    if (this.ranged) {
      this.atkTimer -= dt;
      if (this.atkTimer <= 0) {
        let closest = null, minD = this.projectileRange;
        for (const p of players) {
          if (!p.alive) continue;
          const d = Math.hypot(p.x-this.x, p.y-this.y);
          if (d < minD) { minD = d; closest = p; }
        }
        if (closest) {
          const angle = Math.atan2(closest.y-this.y, closest.x-this.x);
          this.projectiles.push({ x:this.x, y:this.y, angle, speed:5, dmg:this.effectiveAtk*0.7, radius:6, life:2.5, color:'#ffaa44' });
          this.atkTimer = 1 / this.atkRate;
        }
      }
    }

    // Actualizar proyectiles enemigos
    this.projectiles = this.projectiles.filter(p => {
      p.x += Math.cos(p.angle) * p.speed * 60 * dt;
      p.y += Math.sin(p.angle) * p.speed * 60 * dt;
      p.life -= dt;
      if (p.life <= 0) return false;
      for (const pl of players) {
        if (!pl.alive) continue;
        if (Math.hypot(pl.x-p.x, pl.y-p.y) < pl.radius + p.radius) {
          pl.takeDamage(p.dmg);
          this.particles.emit(p.x, p.y, '#ff4400', 6, 3, 0.2);
          return false;
        }
      }
      if (p.x<-50||p.x>GAME_W+50||p.y<-50||p.y>GAME_H+50) return false;
      return true;
    });
  }

  takeDamage(amount, source) {
    if (!this.alive) return;
    this.hp -= amount;
    this._hitFlash = 0.15;
    this.particles.emit(this.x, this.y, '#ffcc44', 4, 2, 0.15);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this._onDeath();
    }
  }

  _onDeath() {
    const count = this.boss ? 40 : this.data.miniBoss ? 25 : 12;
    this.particles.emit(this.x, this.y, this.data.color, count, this.radius*0.5, 0.7);
    this.particles.emit(this.x, this.y, '#ffcc44', Math.floor(count/2), this.radius*0.3, 0.5);
  }

  draw(ctx, time) {
    if (!this.alive) return;
    // Proyectiles
    for (const p of this.projectiles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }

    const flash = this._hitFlash > 0;
    ctx.save();
    // Sombra del enemigo
    ctx.beginPath();
    ctx.ellipse(this.x, this.y+this.radius*0.8, this.radius*0.7, this.radius*0.3, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // Aura boss
    if (this.boss) {
      const p = 0.5 + 0.5*Math.sin(time*3);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,50,50,${0.2*p})`;
      ctx.fill();
    }

    // Cuerpo
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
    const grad = ctx.createRadialGradient(this.x-4, this.y-4, 1, this.x, this.y, this.radius);
    if (flash) {
      grad.addColorStop(0,'#ffffff');
      grad.addColorStop(1,'#ffaaaa');
    } else {
      grad.addColorStop(0, this.data.borderColor+'ff');
      grad.addColorStop(1, this.data.color+'cc');
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = flash ? '#fff' : this.data.borderColor;
    ctx.lineWidth = this.boss ? 3 : 2;
    ctx.stroke();

    // Icono
    ctx.font = `${Math.round(this.radius * 1.05)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.data.icon, this.x, this.y - 1);

    // Estado maldicion
    if (this.cursed > 0) {
      ctx.font = '10px serif';
      ctx.fillText('💀', this.x + this.radius*0.6, this.y - this.radius*0.6);
    }

    // Barra de vida
    const bw = this.radius * 2.4 + (this.boss ? 20 : 0);
    const bh = this.boss ? 8 : 5;
    const bx = this.x - bw/2, by = this.y - this.radius - 12;
    ctx.fillStyle = '#111';
    ctx.fillRect(bx-1, by-1, bw+2, bh+2);
    const pct = this.hp / this.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#cc4444' : pct > 0.25 ? '#ff8800' : '#ff2222';
    ctx.fillRect(bx, by, bw*pct, bh);
    ctx.restore();
  }
}

// Factory de enemigos
export function createEnemy(type, spawnPoint, waypoints, particles) {
  return new Enemy(type, spawnPoint, waypoints, particles);
}
