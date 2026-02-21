// ============================================================
// ENTITIES.JS — Clases de jugador: Player base + 5 subclases
// ============================================================
import { GAME_W, GAME_H, PLAYER_COLORS } from './constants.js';

// ─────────────────────────────────────
// CLASE BASE: Player
// ─────────────────────────────────────
export class Player {
  constructor(x, y, classData, playerIndex, particles) {
    this.x = x; this.y = y;
    this.classData = classData;
    this.idx   = playerIndex;
    this.color = PLAYER_COLORS[playerIndex];
    this.hp    = classData.hp;
    this.maxHp = classData.hp;
    this.speed = classData.speed;
    this.atk   = classData.atk;
    this.range = classData.range;
    this.atkRate  = classData.atkRate;  // ataques/segundo
    this.atkTimer = 0;
    this.radius   = classData.radius || 13;
    this.particles= particles;
    this.alive    = true;
    this.facing   = 0; // angulo en radianes
    this.lastDx = 1; this.lastDy = 0;
    this.invincible  = 0;   // tiempo de invulnerabilidad
    this.speedBuff   = 0;   // buff temporal
    this.atkRateBuff = 0;
    this.atkBuff     = 0;
    this._hitFlash   = 0;

    // Proyectiles propios
    this.projectiles = [];
    // Habilidades activas (efectos de area, barreras, mascotas)
    this.activeEffects = [];
    // Clon / mascota
    this.pets = [];

    // Warlock imp
    this.imps = [];
  }

  get effectiveSpeed()   { return this.speed   * (1 + this.speedBuff); }
  get effectiveAtkRate() { return this.atkRate  * (1 + this.atkRateBuff); }
  get effectiveAtk()     { return this.atk      + this.atkBuff; }

  move(dx, dy, dt, mapW, mapH) {
    if (!this.alive) return;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len > 0.1) {
      this.lastDx = dx/len; this.lastDy = dy/len;
      this.facing = Math.atan2(dy, dx);
    }
    this.x += (dx/Math.max(len,0.001)) * this.effectiveSpeed * (len > 0.01 ? 1 : 0) * 60 * dt;
    this.y += (dy/Math.max(len,0.001)) * this.effectiveSpeed * (len > 0.01 ? 1 : 0) * 60 * dt;
    this.x = Math.max(this.radius, Math.min(mapW - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(mapH - this.radius, this.y));
  }

  autoAttack(enemies, dt) {
    if (!this.alive) return;
    this.atkTimer -= dt;
    if (this.atkTimer > 0) return;
    // Encontrar enemigo mas cercano en rango
    let closest = null, minDist = this.range + 1;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < minDist && d < this.range) { minDist = d; closest = e; }
    }
    if (!closest) return;
    this.atkTimer = 1 / this.effectiveAtkRate;
    this._doAttack(closest, enemies);
  }

  _doAttack(target, enemies) {
    // Subclases sobreescriben esto
    target.takeDamage(this.effectiveAtk, this);
    this.particles.emit(target.x, target.y, '#fff', 3, 2, 0.2);
  }

  takeDamage(amount) {
    if (this.invincible > 0 || !this.alive) return;
    this.hp -= amount;
    this._hitFlash = 0.2;
    this.invincible = 0.3;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
  }

  useAbility(index, enemies, players, base, time) {
    // Subclases sobreescriben esto
  }

  update(dt, enemies, players, base, time) {
    if (!this.alive) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this._hitFlash > 0) this._hitFlash -= dt;
    if (this.speedBuff > 0)   { this.speedBuff -= dt;   if (this.speedBuff < 0) this.speedBuff = 0; }
    if (this.atkRateBuff > 0) { this.atkRateBuff -= dt; if (this.atkRateBuff < 0) this.atkRateBuff = 0; }
    if (this.atkBuff > 0)     { this.atkBuff -= dt;     if (this.atkBuff < 0) this.atkBuff = 0; }

    // Actualizar proyectiles
    this.projectiles = this.projectiles.filter(p => {
      p.x += Math.cos(p.angle) * p.speed * dt * 60;
      p.y += Math.sin(p.angle) * p.speed * dt * 60;
      p.life -= dt;
      if (p.life <= 0) return false;
      // Colision con enemigos
      for (const e of enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x-p.x, e.y-p.y) < e.radius + p.radius) {
          e.takeDamage(p.dmg, this);
          if (p.aoe > 0) {
            for (const e2 of enemies) {
              if (!e2.alive || e2 === e) continue;
              if (Math.hypot(e2.x-p.x, e2.y-p.y) < p.aoe) { e2.takeDamage(p.dmg*0.6, this); }
            }
            this.particles.emit(p.x, p.y, p.color, 20, 5, 0.4);
          } else {
            this.particles.emit(p.x, p.y, p.color, 6, 3, 0.2);
          }
          if (!p.pierce) return false;
        }
      }
      if (p.x < -50 || p.x > GAME_W+50 || p.y < -50 || p.y > GAME_H+50) return false;
      return true;
    });

    // Actualizar efectos activos (barreras, etc.)
    this.activeEffects = this.activeEffects.filter(ef => {
      ef.life -= dt;
      if (ef.onUpdate) ef.onUpdate(ef, enemies, dt);
      return ef.life > 0;
    });
  }

  _launchProjectile(angle, speed, dmg, radius, color, life, aoe=0, pierce=false) {
    this.projectiles.push({ x:this.x, y:this.y, angle, speed, dmg, radius, color, life, aoe, pierce });
  }

  draw(ctx, time) {
    if (!this.alive) return;
    this.projectiles.forEach(p => this._drawProjectile(ctx, p));
    this.activeEffects.forEach(ef => { if (ef.draw) ef.draw(ctx, ef, time); });

    const flash = this._hitFlash > 0;
    ctx.save();
    // Sombra
    ctx.beginPath();
    ctx.ellipse(this.x, this.y+this.radius*0.8, this.radius*0.7, this.radius*0.3, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    // Cuerpo principal
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
    const grad = ctx.createRadialGradient(this.x-4, this.y-4, 1, this.x, this.y, this.radius);
    if (flash) {
      grad.addColorStop(0,'#ffffff');
      grad.addColorStop(1,'#ffaaaa');
    } else {
      grad.addColorStop(0, this.color+'ff');
      grad.addColorStop(1, this.color+'88');
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = flash ? '#fff' : this.classData.borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Icono de clase
    ctx.font = `${Math.round(this.radius * 1.1)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.classData.icon, this.x, this.y-1);
    // Barra de vida
    const bw = this.radius * 2.2, bh = 5;
    const bx = this.x - bw/2, by = this.y - this.radius - 10;
    ctx.fillStyle = '#111';
    ctx.fillRect(bx-1, by-1, bw+2, bh+2);
    const pct = this.hp/this.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#44cc44' : pct > 0.25 ? '#ffaa00' : '#ff4444';
    ctx.fillRect(bx, by, bw*pct, bh);
    // Numero de jugador
    ctx.font = 'bold 9px "Exo 2",sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`J${this.idx+1}`, this.x, by-7);
    ctx.restore();
  }

  _drawProjectile(ctx, p) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────
// CABALLERO
// ─────────────────────────────────────
export class Knight extends Player {
  _doAttack(target) {
    target.takeDamage(this.effectiveAtk, this);
    this.particles.emit(target.x, target.y, '#88aaff', 4, 3, 0.15);
  }
  useAbility(index, enemies, players, base) {
    switch(index) {
      case 0: // Tajo de Espada — daño en arco frente
        for (const e of enemies) {
          if (!e.alive) continue;
          const d = Math.hypot(e.x-this.x, e.y-this.y);
          if (d > this.range * 1.5) continue;
          const angle = Math.atan2(e.y-this.y, e.x-this.x);
          const diff = Math.abs(((angle - this.facing) + Math.PI*3) % (Math.PI*2) - Math.PI);
          if (diff < Math.PI * 0.45) {
            e.takeDamage(this.effectiveAtk * 2.5, this);
          }
        }
        this.particles.emit(this.x, this.y, '#88aaff', 30, 5, 0.5);
        break;
      case 1: // Golpe de Escudo — aturde cercanos
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x-this.x, e.y-this.y) < 80) {
            e.stun(1.5);
            e.takeDamage(this.effectiveAtk * 0.5, this);
          }
        }
        this.particles.emit(this.x, this.y, '#aaaaff', 25, 4, 0.4);
        break;
      case 2: // Grito de Guerra — buff ATK rate aliados
        for (const p of players) {
          if (!p.alive) continue;
          p.atkRateBuff = Math.max(p.atkRateBuff, 5); // 5 segundos
        }
        this.particles.emit(this.x, this.y, '#ffff88', 40, 6, 0.6);
        break;
      case 3: // Torbellino — daño en 360°
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x-this.x, e.y-this.y) < 100) {
            e.takeDamage(this.effectiveAtk * 3, this);
            e.stun(0.5);
          }
        }
        this.particles.emit(this.x, this.y, '#88aaff', 50, 7, 0.8);
        break;
    }
  }
}

// ─────────────────────────────────────
// ARQUERO
// ─────────────────────────────────────
export class Archer extends Player {
  _doAttack(target) {
    const angle = Math.atan2(target.y-this.y, target.x-this.x);
    this._launchProjectile(angle, 8, this.effectiveAtk, 5, '#88ff88', 1.5);
  }
  useAbility(index, enemies, players) {
    switch(index) {
      case 0: // Multiflechas — 3 en abanico
        for (let d=-1; d<=1; d++) {
          const a = this.facing + d * 0.35;
          this._launchProjectile(a, 8, this.effectiveAtk * 1.2, 5, '#aaffaa', 1.5);
        }
        this.particles.emit(this.x, this.y, '#88ff88', 15, 4, 0.3);
        break;
      case 1: // Flecha Perforadora — atraviesa todos
        this._launchProjectile(this.facing, 9, this.effectiveAtk * 1.8, 6, '#ffff44', 2.0, 0, true);
        this.particles.emit(this.x, this.y, '#ffff44', 10, 5, 0.3);
        break;
      case 2: // Lluvia de Flechas — area de impacto
        { const cx = this.x + Math.cos(this.facing)*200, cy = this.y + Math.sin(this.facing)*200;
          setTimeout(() => {
            for (const e of enemies) {
              if (!e.alive) continue;
              if (Math.hypot(e.x-cx, e.y-cy) < 100) e.takeDamage(this.effectiveAtk * 2, this);
            }
            this.particles.emit(cx, cy, '#88ff88', 60, 8, 0.9);
          }, 700);
        }
        this.particles.emit(this.x, this.y, '#88ff88', 10, 3, 0.3);
        break;
      case 3: // Ojo de Aguila — buff de rango y daño
        this.atkBuff  += this.atk * 2;
        setTimeout(() => { this.atkBuff = Math.max(0, this.atkBuff - this.atk * 2); }, 4000);
        this.range *= 1.6;
        setTimeout(() => { this.range /= 1.6; }, 4000);
        this.particles.emit(this.x, this.y, '#ffff88', 30, 6, 0.5);
        break;
    }
  }
}

// ─────────────────────────────────────
// MAGO
// ─────────────────────────────────────
export class Mage extends Player {
  _doAttack(target) {
    const angle = Math.atan2(target.y-this.y, target.x-this.x);
    this._launchProjectile(angle, 6, this.effectiveAtk, 7, '#dd88ff', 1.8, 30);
  }
  useAbility(index, enemies) {
    switch(index) {
      case 0: // Bola de Fuego — proyectil explosivo grande
        this._launchProjectile(this.facing, 7, this.effectiveAtk * 2, 9, '#ff6622', 2.0, 80);
        this.particles.emit(this.x, this.y, '#ff8844', 20, 5, 0.3);
        break;
      case 1: // Muro de Hielo — barrera que ralentiza
        { const cx = this.x + Math.cos(this.facing)*100, cy = this.y + Math.sin(this.facing)*100;
          this.activeEffects.push({
            life: 4, cx, cy, radius: 70, color: '#88ddff',
            onUpdate: (ef, enemies) => {
              for (const e of enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x-ef.cx, e.y-ef.cy) < ef.radius) e.slow(0.4, 0.1);
              }
            },
            draw: (ctx, ef, time) => {
              ctx.save();
              ctx.beginPath();
              ctx.arc(ef.cx, ef.cy, ef.radius, 0, Math.PI*2);
              ctx.fillStyle = `rgba(136,221,255,${0.15 + 0.05*Math.sin(time*4)})`;
              ctx.fill();
              ctx.strokeStyle = '#88ddff88';
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.restore();
            }
          });
        }
        this.particles.emit(this.x + Math.cos(this.facing)*100, this.y + Math.sin(this.facing)*100, '#88ddff', 30, 5, 0.5);
        break;
      case 2: // Cadena Electrica — salta entre hasta 5 enemigos
        { let targets = enemies.filter(e => e.alive && Math.hypot(e.x-this.x, e.y-this.y) < this.range + 50)
            .sort((a,b) => Math.hypot(a.x-this.x,a.y-this.y) - Math.hypot(b.x-this.x,b.y-this.y))
            .slice(0,5);
          for (const e of targets) { e.takeDamage(this.effectiveAtk * 1.5, this); this.particles.emit(e.x, e.y, '#ffff44', 15, 5, 0.3); }
        }
        this.particles.emit(this.x, this.y, '#ffff44', 30, 6, 0.4);
        break;
      case 3: // Meteoro — explosion retardada masiva
        { const tx = this.x + Math.cos(this.facing)*180, ty = this.y + Math.sin(this.facing)*180;
          this.particles.emit(tx, ty, '#ff4400', 10, 4, 0.3);
          setTimeout(() => {
            for (const e of enemies) {
              if (!e.alive) continue;
              if (Math.hypot(e.x-tx, e.y-ty) < 140) e.takeDamage(this.effectiveAtk * 5, this);
            }
            this.particles.emit(tx, ty, '#ff6622', 80, 12, 1.2);
          }, 1200);
        }
        break;
    }
  }
}

// ─────────────────────────────────────
// ASESINO
// ─────────────────────────────────────
export class Assassin extends Player {
  constructor(...args) { super(...args); this.cloneDecoy = null; }
  _doAttack(target) {
    const crit = Math.random() < 0.25;
    const dmg = this.effectiveAtk * (crit ? 2.5 : 1);
    target.takeDamage(dmg, this);
    this.particles.emit(target.x, target.y, crit ? '#ffff44' : '#ff88cc', crit ? 8 : 4, 4, 0.2);
  }
  useAbility(index, enemies, players) {
    switch(index) {
      case 0: // Apuñalada — daño masivo al más cercano
        { let target = null, minD = Infinity;
          for (const e of enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x-this.x, e.y-this.y);
            if (d < minD) { minD = d; target = e; }
          }
          if (target) {
            this.x = target.x - Math.cos(this.facing)*this.radius*2.5;
            this.y = target.y - Math.sin(this.facing)*this.radius*2.5;
            target.takeDamage(this.effectiveAtk * 5, this);
            this.particles.emit(target.x, target.y, '#ff44aa', 25, 6, 0.5);
          }
        }
        break;
      case 1: // Bomba de Humo
        { const ef = { life: 3, x: this.x, y: this.y, radius: 100,
            onUpdate: (ef, enemies) => {
              for (const e of enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x-ef.x, e.y-ef.y) < ef.radius) { e.slow(0.5, 0.1); }
              }
            },
            draw: (ctx, ef, time) => {
              ctx.save();
              ctx.beginPath();
              ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI*2);
              ctx.fillStyle = `rgba(80,80,80,${0.35 + 0.1*Math.sin(time*5)})`;
              ctx.fill();
              ctx.restore();
            }
          };
          this.activeEffects.push(ef);
          this.particles.emit(this.x, this.y, '#888888', 40, 8, 0.7);
        }
        break;
      case 2: // Clon Oscuro — señuelo que los atrae
        this.activeEffects.push({
          life: 3, x: this.x+50, y: this.y+40, radius: this.radius,
          taunt: true,
          onUpdate: (ef, enemies) => {
            for (const e of enemies) {
              if (!e.alive) continue;
              if (Math.hypot(e.x-ef.x, e.y-ef.y) < 200) e.setTarget(ef);
            }
          },
          draw: (ctx, ef, time) => {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(ef.x, ef.y, this.radius, 0, Math.PI*2);
            ctx.fillStyle = '#ff88cc88';
            ctx.fill();
            ctx.restore();
          }
        });
        this.particles.emit(this.x, this.y, '#ff88cc', 20, 5, 0.4);
        break;
      case 3: // Tormenta de Dagas — en todas direcciones
        for (let a = 0; a < Math.PI*2; a += Math.PI/6) {
          this._launchProjectile(a, 7, this.effectiveAtk * 1.5, 4, '#ff88cc', 0.8);
        }
        this.particles.emit(this.x, this.y, '#ff44aa', 30, 5, 0.4);
        break;
    }
  }
}

// ─────────────────────────────────────
// BRUJO
// ─────────────────────────────────────
export class Warlock extends Player {
  constructor(...args) { super(...args); this.imp = null; this._soulDrain = 0; }
  _doAttack(target) {
    if (!target.alive) return;
    const dmg = this.effectiveAtk;
    target.takeDamage(dmg, this);
    // Soul Drain: cura un poco al matar
    this._soulDrain += dmg * 0.05;
    if (this._soulDrain >= 1) {
      this.hp = Math.min(this.maxHp, this.hp + Math.floor(this._soulDrain));
      this._soulDrain = 0;
    }
    this._launchProjectile(Math.atan2(target.y-this.y, target.x-this.x), 5, 0, 6, '#ff8800', 0.8);
    this.particles.emit(target.x, target.y, '#ff8800', 5, 3, 0.2);
  }
  useAbility(index, enemies, players, base) {
    switch(index) {
      case 0: // Maldicion
        { let target = null, minD = this.range;
          for (const e of enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x-this.x, e.y-this.y);
            if (d < minD) { minD = d; target = e; }
          }
          if (target) {
            target.cursed = 4; // 4 segundos
            this.particles.emit(target.x, target.y, '#6600bb', 20, 4, 0.5);
          }
        }
        break;
      case 1: // Invocar Imp
        if (!this.imp) {
          this.imp = { x: this.x+30, y: this.y, hp: 60, alive: true, atkTimer: 0, owner: this };
          this.particles.emit(this.x, this.y, '#ff4400', 25, 5, 0.4);
        }
        break;
      case 2: // Pacto Oscuro — sacrificio
        { const sacHp = this.hp * 0.3;
          this.hp -= sacHp;
          if (this.hp < 1) this.hp = 1;
          for (const e of enemies) {
            if (!e.alive) continue;
            if (Math.hypot(e.x-this.x, e.y-this.y) < 150) {
              e.takeDamage(sacHp * 2, this);
            }
          }
          this.particles.emit(this.x, this.y, '#881100', 60, 10, 0.9);
        }
        break;
      case 3: // Grieta del Vacio
        { const cx = this.x + Math.cos(this.facing)*120, cy = this.y + Math.sin(this.facing)*120;
          this.activeEffects.push({
            life: 3, cx, cy, radius: 120,
            onUpdate: (ef, enemies) => {
              for (const e of enemies) {
                if (!e.alive) continue;
                const dx = ef.cx - e.x, dy = ef.cy - e.y;
                const d = Math.sqrt(dx*dx+dy*dy);
                if (d < ef.radius && d > 5) {
                  e.x += (dx/d) * 1.5;
                  e.y += (dy/d) * 1.5;
                }
              }
            },
            draw: (ctx, ef, time) => {
              ctx.save();
              ctx.beginPath();
              ctx.arc(ef.cx, ef.cy, ef.radius * (0.5 + 0.1*Math.sin(time*8)), 0, Math.PI*2);
              ctx.fillStyle = `rgba(40,0,80,0.4)`;
              ctx.fill();
              ctx.strokeStyle = '#8800ff';
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.restore();
            }
          });
        }
        this.particles.emit(this.x + Math.cos(this.facing)*120, this.y + Math.sin(this.facing)*120, '#8800ff', 40, 8, 0.6);
        break;
    }
  }

  update(dt, enemies, players, base, time) {
    super.update(dt, enemies, players, base, time);
    // Actualizar Imp
    if (this.imp && this.imp.alive) {
      this.imp.atkTimer -= dt;
      let impTarget = null, minD = 200;
      for (const e of enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x-this.imp.x, e.y-this.imp.y);
        if (d < minD) { minD = d; impTarget = e; }
      }
      if (impTarget) {
        // Mover imp hacia objetivo
        const angle = Math.atan2(impTarget.y-this.imp.y, impTarget.x-this.imp.x);
        this.imp.x += Math.cos(angle) * 3;
        this.imp.y += Math.sin(angle) * 3;
        if (this.imp.atkTimer <= 0) {
          impTarget.takeDamage(12, this);
          this.particles.emit(impTarget.x, impTarget.y, '#ff6600', 5, 3, 0.2);
          this.imp.atkTimer = 1.0;
        }
      } else {
        // Volver al brujo
        const angle = Math.atan2(this.y - this.imp.y, this.x - this.imp.x);
        this.imp.x += Math.cos(angle) * 2;
        this.imp.y += Math.sin(angle) * 2;
      }
    }
  }

  draw(ctx, time) {
    super.draw(ctx, time);
    if (this.imp && this.imp.alive) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.imp.x, this.imp.y, 9, 0, Math.PI*2);
      ctx.fillStyle = '#ff4400';
      ctx.fill();
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👺', this.imp.x, this.imp.y);
      ctx.restore();
    }
  }
}

// Factory
import { CLASSES, CLASS_NAMES } from './constants.js';
export function createPlayer(className, x, y, playerIndex, particles) {
  const classData = CLASSES[className];
  switch(className) {
    case 'Caballero': return new Knight(x, y, classData, playerIndex, particles);
    case 'Arquero':   return new Archer(x, y, classData, playerIndex, particles);
    case 'Mago':      return new Mage(x, y, classData, playerIndex, particles);
    case 'Asesino':   return new Assassin(x, y, classData, playerIndex, particles);
    case 'Brujo':     return new Warlock(x, y, classData, playerIndex, particles);
    default:          return new Knight(x, y, classData, playerIndex, particles);
  }
}
