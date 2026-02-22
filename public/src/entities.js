// ============================================================
// ENTITIES.JS — Jugadores con fisonomia dibujada + habilidades
// ============================================================
import { GAME_W, GAME_H, PLAYER_COLORS, CLASSES, CLASS_NAMES, CONFIG } from './constants.js';

// ── Helpers de dibujo ──────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ═══════════════════════════════════════════════════════════
// CLASE BASE: Player
// ═══════════════════════════════════════════════════════════
export class Player {
  constructor(x, y, classData, playerIndex, particles) {
    this.x = x; this.y = y;
    this.classData = classData;
    this.idx   = playerIndex;
    this.color = PLAYER_COLORS[playerIndex];
    this.hp    = classData.hp; this.maxHp = classData.hp;
    this.speed = classData.speed; this.atk = classData.atk;
    this.range = classData.range; this.atkRate = classData.atkRate;
    this.atkTimer = 0; this.radius = classData.radius || 13;
    this.particles = particles;
    this.alive = true;
    this.lives = 3;        // revives disponibles
    this.reviveTimer = 0;  // cuenta regresiva antes de revivir
    this.facing = 0; this.lastDx = 1; this.lastDy = 0;
    this.invincible = 0; this.speedBuff = 0; this.atkRateBuff = 0; this.atkBuff = 0;
    this._hitFlash = 0; this._walkTime = 0; this._walkAnim = 0;
    this.projectiles = []; this.activeEffects = []; this.imp = null;
    this._cast = null; // { index, timer, duration, enemies, players, base, time }
    
    // Progresión
    this.level = 1;
    this.xp = 0;
    this.nextLevelXp = CONFIG.XP_PER_LEVEL[1] || 100;
    this.statPoints = 0;
    // Stats asignados manualmente
    this.statsInvested = { atk: 0, hp: 0, speed: 0 };
  }

  gainXp(amount) {
    if (!this.alive) return;
    this.xp += amount;
    while (this.xp >= this.nextLevelXp && this.level < CONFIG.XP_PER_LEVEL.length - 1) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.nextLevelXp = CONFIG.XP_PER_LEVEL[this.level] || this.nextLevelXp * 2;
    this.statPoints += 3; // Otorgar 3 puntos por nivel

    // Curación parcial automática al subir (50% de lo faltante)
    this.hp += Math.round((this.maxHp - this.hp) * 0.5);
    
    // Efecto visual
    this.particles.emitMagic(this.x, this.y, '#ffff00', 30, 45);
    this.particles.shockwaves.push({ x:this.x, y:this.y, r:5, maxR:80, alpha:1, color:'#ffff00', speed:300 });
  }

  allocateStat(type) {
    if (this.statPoints <= 0) return false;
    this.statPoints--;
    this.statsInvested[type]++;

    if (type === 'atk') {
      this.atk = Math.round(this.atk * 1.1);
    } else if (type === 'hp') {
      const oldMax = this.maxHp;
      this.maxHp = Math.round(this.maxHp * 1.1);
      this.hp += (this.maxHp - oldMax); // Sumar la vida ganada a la actual
    } else if (type === 'speed') {
      this.speed *= 1.05;
    }
    return true;
  }

  get effectiveSpeed()   { return this.speed   * (1 + this.speedBuff); }
  get effectiveAtkRate() { return this.atkRate  * (1 + this.atkRateBuff); }
  get effectiveAtk()     { return this.atk      + this.atkBuff; }
  get isCasting()        { return this._cast !== null; }

  // Inicia canal de lanzamiento; el efecto se dispara despues de castTime
  startCast(index, enemies, players, base, time) {
    // Verificar requerimiento de nivel
    const reqLevel = CONFIG.ABILITY_UNLOCK_LEVELS[index] || 1;
    if (this.level < reqLevel) return;

    const ab = this.classData.abilities[index];
    const castTime = ab.castTime || 0;
    if (castTime <= 0) {
      // Instantaneo — ejecutar de inmediato
      this.useAbility(index, enemies, players, base, time);
    } else {
      this._cast = { index, timer: 0, duration: castTime, enemies, players, base, time };
    }
  }

  move(dx, dy, dt) {
    if (!this.alive) return;
    // Bloquear movimiento durante canales largos (>0.3s)
    if (this._cast && this._cast.duration > 0.3) return;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len > 0.1) {
      this.lastDx = dx/len; this.lastDy = dy/len;
      this.facing = Math.atan2(dy, dx);
      this._walkTime += dt * 8;
      this._walkAnim = Math.sin(this._walkTime);
    } else { this._walkAnim *= 0.8; }
    const ms = this.effectiveSpeed * (len > 0.01 ? 1 : 0) * 60 * dt;
    this.x += (len>0?dx/len:0) * ms;
    this.y += (len>0?dy/len:0) * ms;
    this.x = Math.max(this.radius, Math.min(GAME_W-this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(620-this.radius, this.y));
  }

  autoAttack(enemies, dt) {
    if (!this.alive) return;
    this.atkTimer -= dt;
    if (this.atkTimer > 0) return;
    let closest = null, minD = this.range+1;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x-this.x, e.y-this.y);
      if (d < minD && d < this.range) { minD=d; closest=e; }
    }
    if (!closest) return;
    this.atkTimer = 1 / this.effectiveAtkRate;
    this._doAttack(closest, enemies);
  }

  _doAttack(target) {
    target.takeDamage(this.effectiveAtk, this);
    this.particles.emitHit(target.x, target.y, '#fff');
  }

  takeDamage(amount) {
    if (this.invincible>0||!this.alive) return;
    this.hp -= amount; this._hitFlash = 0.25; this.invincible = 0.35;
    if (this.hp<=0) {
      this.hp=0; this.alive=false;
      if (this.lives > 0) {
        this.lives--;
        this.reviveTimer = 5;
      }
    }
  }

  useAbility(index, enemies, players, base, time) {}

  _revive(base) {
    this.alive = true;
    this.hp = Math.round(this.maxHp * 0.5);
    this.invincible = 3;
    this._hitFlash = 0;
    if (base) { this.x = base.x + (Math.random()-0.5)*60; this.y = base.y + (Math.random()-0.5)*60; }
    this.particles.emitMagic(this.x, this.y, '#ffffff', 30, 50);
    this.particles.shockwaves.push({ x:this.x, y:this.y, r:5, maxR:70, alpha:1, color:'#ffffff', speed:280 });
  }

  update(dt, enemies, players, base, time) {
    if (!this.alive) {
      if (this.reviveTimer > 0) {
        this.reviveTimer -= dt;
        if (this.reviveTimer <= 0) this._revive(base);
      }
      return;
    }
    if (this.invincible>0) this.invincible -= dt;
    if (this._hitFlash>0) this._hitFlash -= dt;
    if (this.speedBuff>0)   { this.speedBuff   = Math.max(0,this.speedBuff-dt); }
    if (this.atkRateBuff>0) { this.atkRateBuff = Math.max(0,this.atkRateBuff-dt); }
    if (this.atkBuff>0)     { this.atkBuff     = Math.max(0,this.atkBuff-dt); }

    // Tick del canal de habilidad
    if (this._cast) {
      this._cast.timer += dt;
      // Particulas de carga durante el canal
      if (Math.random() < 0.6) {
        this.particles.emitMagic(
          this.x + (Math.random()-0.5)*20,
          this.y + (Math.random()-0.5)*20,
          this.classData.color, 2, 15
        );
      }
      if (this._cast.timer >= this._cast.duration) {
        // Canal completado — disparar habilidad
        const c = this._cast;
        this._cast = null;
        this.useAbility(c.index, c.enemies, c.players, c.base, c.time);
      }
    }

    this.projectiles = this.projectiles.filter(p => {
      p.x += Math.cos(p.angle)*p.speed*dt*60;
      p.y += Math.sin(p.angle)*p.speed*dt*60;
      p.life -= dt;
      if (p.life<=0) return false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x-p.x,e.y-p.y)<e.radius+p.radius) {
          e.takeDamage(p.dmg, this);
          if (p.aoe>0) {
            for (const e2 of enemies) { if (e2.alive&&e2!==e&&Math.hypot(e2.x-p.x,e2.y-p.y)<p.aoe) e2.takeDamage(p.dmg*0.6,this); }
            this.particles.emitExplosion(p.x, p.y, p.aoe*0.6, p.color, p.aoe>60);
          } else { this.particles.emitHit(p.x, p.y, p.color); }
          if (!p.pierce) return false;
        }
      }
      return p.x>-50&&p.x<GAME_W+50&&p.y>-50&&p.y<700;
    });

    this.activeEffects = this.activeEffects.filter(ef => {
      ef.life -= dt;
      if (ef.onUpdate) ef.onUpdate(ef, enemies, dt);
      return ef.life>0;
    });
  }

  _launch(angle, speed, dmg, radius, color, life, aoe=0, pierce=false) {
    this.projectiles.push({x:this.x,y:this.y,angle,speed,dmg,radius,color,life,aoe,pierce});
  }

  _drawReviving(ctx, time) {
    // Fantasma parpadeante mientras espera el revive
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 6);
    ctx.translate(this.x, this.y);
    if (this.lastDx < 0) ctx.scale(-1, 1);
    this.drawBody(ctx, time);
    ctx.restore();
    // Cuenta regresiva
    const secs = Math.ceil(this.reviveTimer);
    ctx.save();
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeText(`↑ ${secs}`, this.x, this.y - this.radius - 20);
    ctx.fillStyle = '#88ffff';
    ctx.fillText(`↑ ${secs}`, this.x, this.y - this.radius - 20);
    ctx.restore();
  }

  // ── Render base ──────────────────────────────────────────
  draw(ctx, time) {
    if (!this.alive) {
      if (this.reviveTimer > 0) this._drawReviving(ctx, time);
      return;
    }
    // Proyectiles
    for (const p of this.projectiles) {
      ctx.save();
      ctx.shadowColor = p.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.restore();
    }
    // Efectos
    this.activeEffects.forEach(ef => { if (ef.draw) ef.draw(ctx, ef, time); });
    // Cuerpo
    ctx.save();
    ctx.translate(this.x, this.y);
    // Flip si mira a la izquierda
    if (this.lastDx < 0) ctx.scale(-1, 1);
    if (this._hitFlash > 0) { ctx.filter = 'brightness(3)'; }
    this.drawBody(ctx, time);
    ctx.restore();
    // HP bar + indicador de cast
    this._drawHP(ctx);
    // Barra de canal sobre el personaje
    if (this._cast) this._drawCastBar(ctx);
  }

  _drawCastBar(ctx) {
    const c = this._cast;
    const pct = c.timer / c.duration;
    const ab  = this.classData.color;
    const r   = this.radius + 8;
    // Anillo de carga giratorio
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
    ctx.strokeStyle = this.classData.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = this.classData.color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    // Fondo del anillo
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI*2);
    ctx.strokeStyle = this.classData.color;
    ctx.lineWidth = 4;
    ctx.stroke();
    // Icono de la habilidad flotando
    ctx.globalAlpha = 0.9;
    ctx.shadowBlur = 0;
    ctx.font = `${Math.round(r*0.9)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.classData.abilities[c.index].icon, this.x, this.y - r - 12);
    ctx.restore();
  }

  drawBody(ctx, time) {
    // Fallback: circulo simple
    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2);
    ctx.fillStyle = this.color; ctx.fill();
  }

  _drawHP(ctx) {
    const bw = 32, bh = 5, bx = this.x-bw/2, by = this.y-this.radius-18;
    // Fondo barra HP
    ctx.fillStyle='#111'; ctx.fillRect(bx-1,by-1,bw+2,bh+2);
    const hpPct = this.hp/this.maxHp;
    ctx.fillStyle = hpPct>0.5?'#44cc44':hpPct>0.25?'#ffaa00':'#ff4444';
    ctx.fillRect(bx, by, bw*hpPct, bh);
    
    // Barra de XP (pequeña debajo de HP)
    const xpbh = 2;
    const xpby = by + bh + 2;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(bx, xpby, bw, xpbh);
    const xpPct = Math.min(1, this.xp / this.nextLevelXp);
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(bx, xpby, bw*xpPct, xpbh);

    // Texto Nivel + J
    ctx.font='bold 9px "Press Start 2P", monospace';
    if (ctx.font.includes('Press Start 2P')) { // Fallback if font not loaded
       ctx.font='bold 8px monospace';
    }
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='#000'; ctx.lineWidth=2;
    const label = `Lvl ${this.level} J${this.idx+1}`;
    ctx.strokeText(label, this.x, by-10);
    ctx.fillText(label, this.x, by-10);

    // Vidas restantes (pequeños puntos sobre la barra)
    const dotR = 4, dotGap = 3;
    const totalDots = 3;
    const dotsTotalW = totalDots * (dotR*2) + (totalDots-1) * dotGap;
    const dotsX = this.x - dotsTotalW/2 + dotR;
    const dotsY = by - 22;
    for (let i = 0; i < totalDots; i++) {
      const cx2 = dotsX + i * (dotR*2 + dotGap);
      ctx.beginPath(); ctx.arc(cx2, dotsY, dotR, 0, Math.PI*2);
      ctx.fillStyle = i < this.lives ? '#ff4466' : '#333344';
      ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// ═══════════════════════════════════════════════════════════
// CABALLERO — Armadura plateada, espada y escudo
// ═══════════════════════════════════════════════════════════
export class Knight extends Player {
  drawBody(ctx, time) {
    const w = this._walkAnim * 3;
    const s = this.radius / 13;
    ctx.save(); ctx.scale(s, s);

    // Sombra
    ctx.beginPath(); ctx.ellipse(0,14,10,4,0,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fill();

    // Piernas
    ctx.fillStyle='#3355aa';
    const lw=5,lh=10;
    // pierna izq (animada)
    roundRect(ctx,-lw-1,6+w,lw,lh,2); ctx.fill();
    // pierna der
    roundRect(ctx,1,6-w,lw,lh,2); ctx.fill();
    // Pies/botas
    ctx.fillStyle='#223388';
    roundRect(ctx,-lw-2,15+w,lw+2,4,2); ctx.fill();
    roundRect(ctx,0,15-w,lw+2,4,2); ctx.fill();

    // Torso armadura
    const grad=ctx.createLinearGradient(-8,-6,8,6);
    grad.addColorStop(0,'#aabbdd'); grad.addColorStop(0.5,'#7799cc'); grad.addColorStop(1,'#334477');
    ctx.fillStyle=grad;
    roundRect(ctx,-8,-6,16,13,3); ctx.fill();
    // Detalle pecho
    ctx.strokeStyle='#ccddee'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(-5,-2); ctx.lineTo(0,2); ctx.lineTo(5,-2); ctx.stroke();

    // Escudo (izquierda)
    ctx.save(); ctx.translate(-11, -3);
    const sg=ctx.createLinearGradient(-5,-7,5,7);
    sg.addColorStop(0,'#cc3333'); sg.addColorStop(1,'#881111');
    ctx.fillStyle=sg;
    ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(5,-4); ctx.lineTo(5,5); ctx.lineTo(0,9); ctx.lineTo(-5,5); ctx.lineTo(-5,-4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#ffcc44'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#ffcc44'; ctx.beginPath(); ctx.arc(0,0,2,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // Espada (derecha, ligeramente levantada al atacar)
    ctx.save(); ctx.translate(10,-4); ctx.rotate(-0.3+this._walkAnim*0.1);
    ctx.fillStyle='#ccddee'; roundRect(ctx,-1.5,-14,3,18,1); ctx.fill();
    ctx.fillStyle='#ffcc44'; roundRect(ctx,-5,-2,10,2.5,1); ctx.fill(); // guardia
    ctx.fillStyle='#885522'; roundRect(ctx,-1.5,0,3,5,1); ctx.fill();   // mango
    ctx.restore();

    // Hombros (hombreras)
    ctx.fillStyle='#aabbdd';
    ctx.beginPath(); ctx.ellipse(-8,-5,5,3,0.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8,-5,5,3,-0.3,0,Math.PI*2); ctx.fill();

    // Cabeza
    const hg=ctx.createRadialGradient(-2,-18,1,0,-16,8);
    hg.addColorStop(0,'#ddddcc'); hg.addColorStop(1,'#aabbcc');
    ctx.fillStyle=hg;
    roundRect(ctx,-7,-25,14,12,3); ctx.fill();
    // Visera del casco
    ctx.fillStyle='#556699';
    roundRect(ctx,-6,-22,12,5,2); ctx.fill();
    // Ranura visera
    ctx.strokeStyle='#334'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-5,-20); ctx.lineTo(5,-20); ctx.stroke();
    // Cresta del casco
    ctx.fillStyle='#cc3333';
    roundRect(ctx,-2,-28,4,4,1); ctx.fill();
    ctx.restore();
  }

  _doAttack(target) {
    target.takeDamage(this.effectiveAtk, this);
    this.particles.emitHit(target.x, target.y, '#aabbff');
  }

  useAbility(index, enemies, players, base) {
    if (index===0) { // Tajo
      for (const e of enemies) { if (!e.alive) continue; const d=Math.hypot(e.x-this.x,e.y-this.y); if (d>this.range*1.5) continue; const a=Math.atan2(e.y-this.y,e.x-this.x); const diff=Math.abs(((a-this.facing)+Math.PI*3)%(Math.PI*2)-Math.PI); if (diff<Math.PI*0.45) { e.takeDamage(this.effectiveAtk*2.5,this); this.particles.emitExplosion(e.x,e.y,20,'#aabbff'); } }
    } else if (index===1) { // Escudo
      for (const e of enemies) { if (!e.alive||Math.hypot(e.x-this.x,e.y-this.y)>80) continue; e.stun(1.5); e.takeDamage(this.effectiveAtk*0.5,this); } this.particles.emitExplosion(this.x,this.y,80,'#8899ff');
    } else if (index===2) { // Grito
      for (const p of players) { if (!p.alive) continue; p.atkRateBuff=Math.max(p.atkRateBuff,5); } this.particles.emitMagic(this.x,this.y,'#ffff88',40,50);
    } else if (index===3) { // Torbellino
      for (const e of enemies) { if (!e.alive||Math.hypot(e.x-this.x,e.y-this.y)>100) continue; e.takeDamage(this.effectiveAtk*3,this); e.stun(0.5); } this.particles.emitExplosion(this.x,this.y,100,'#aabbff',true);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// ARQUERO — Capa verde, arco y carcaj
// ═══════════════════════════════════════════════════════════
export class Archer extends Player {
  drawBody(ctx, time) {
    const w = this._walkAnim * 3;
    const s = this.radius / 12;
    ctx.save(); ctx.scale(s, s);

    ctx.beginPath(); ctx.ellipse(0,14,8,3,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fill();

    // Piernas
    ctx.fillStyle='#336633';
    roundRect(ctx,-4,6+w,4,10,2); ctx.fill();
    roundRect(ctx,1,6-w,4,10,2); ctx.fill();
    ctx.fillStyle='#553311';
    roundRect(ctx,-5,15+w,5,4,2); ctx.fill();
    roundRect(ctx,0,15-w,5,4,2); ctx.fill();

    // Cuerpo (tunca)
    const tg=ctx.createLinearGradient(-7,-6,7,6);
    tg.addColorStop(0,'#55bb55'); tg.addColorStop(1,'#224422');
    ctx.fillStyle=tg; roundRect(ctx,-7,-6,14,13,3); ctx.fill();
    // Carcaj (espalda)
    ctx.fillStyle='#774422'; roundRect(ctx,5,-8,5,16,2); ctx.fill();
    ctx.fillStyle='#ffcc44';
    for(let i=0;i<3;i++){ ctx.fillRect(7,-7+i*5,1,3); }

    // Arco (brazo izquierdo)
    ctx.save(); ctx.translate(-10,-2);
    ctx.strokeStyle='#774422'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,12,-Math.PI*0.6,Math.PI*0.6); ctx.stroke();
    // Cuerda
    ctx.strokeStyle='#eecc99'; ctx.lineWidth=0.8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(-Math.PI*0.6)*12, Math.sin(-Math.PI*0.6)*12);
    ctx.lineTo(Math.cos(Math.PI*0.6)*12, Math.sin(Math.PI*0.6)*12);
    ctx.stroke();
    ctx.restore();

    // Hombros/manto
    ctx.fillStyle='#336633';
    ctx.beginPath(); ctx.ellipse(0,-6,9,5,0,0,Math.PI*2); ctx.fill();

    // Cabeza con capucha
    const hg=ctx.createRadialGradient(-1,-18,1,0,-16,8);
    hg.addColorStop(0,'#ffddaa'); hg.addColorStop(1,'#cc9966');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-17,7,0,Math.PI*2); ctx.fill();
    // Capucha
    ctx.fillStyle='#336633';
    ctx.beginPath(); ctx.moveTo(-8,-17); ctx.quadraticCurveTo(-2,-30,0,-31); ctx.quadraticCurveTo(2,-30,8,-17); ctx.closePath(); ctx.fill();
    // Ojo
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(2,-17,1.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  _doAttack(target) {
    this._launch(Math.atan2(target.y-this.y,target.x-this.x),8,this.effectiveAtk,4,'#88ff88',1.5);
  }
  useAbility(index, enemies) {
    if (index===0) { for(let d=-1;d<=1;d++) this._launch(this.facing+d*0.35,8,this.effectiveAtk*1.2,4,'#aaffaa',1.5); this.particles.emitMagic(this.x,this.y,'#88ff88',12,20);
    } else if (index===1) { this._launch(this.facing,9,this.effectiveAtk*1.8,6,'#ffff44',2.0,0,true); this.particles.emitMagic(this.x,this.y,'#ffff44',10,15);
    } else if (index===2) { const cx=this.x+Math.cos(this.facing)*200,cy=this.y+Math.sin(this.facing)*200; setTimeout(()=>{ for(const e of enemies){if(e.alive&&Math.hypot(e.x-cx,e.y-cy)<100)e.takeDamage(this.effectiveAtk*2,this);} this.particles.emitExplosion(cx,cy,100,'#88ff88',false); },700); this.particles.emitMagic(this.x,this.y,'#aaffaa',8,10);
    } else if (index===3) { this.atkBuff+=this.atk*2; setTimeout(()=>{this.atkBuff=Math.max(0,this.atkBuff-this.atk*2);},4000); this.range*=1.6; setTimeout(()=>{this.range/=1.6;},4000); this.particles.emitMagic(this.x,this.y,'#ffff88',30,40); }
  }
}

// ═══════════════════════════════════════════════════════════
// MAGO — Túnica morada, sombrero puntiagudo, bastón
// ═══════════════════════════════════════════════════════════
export class Mage extends Player {
  drawBody(ctx, time) {
    const bob = Math.sin(time*2)*2;
    const s = this.radius/12;
    ctx.save(); ctx.scale(s,s);

    ctx.beginPath(); ctx.ellipse(0,15,7,3,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fill();

    // Túnica (forma de campana)
    const rg=ctx.createLinearGradient(-10,-5,10,16);
    rg.addColorStop(0,'#8833bb'); rg.addColorStop(1,'#441166');
    ctx.fillStyle=rg;
    ctx.beginPath(); ctx.moveTo(-5,-5); ctx.lineTo(-11,16); ctx.lineTo(11,16); ctx.lineTo(5,-5); ctx.closePath(); ctx.fill();
    // Detalle túnica
    ctx.strokeStyle='#aa55ee'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(0,15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6,5); ctx.lineTo(6,5); ctx.stroke();
    // Estrellas en la túnica
    ctx.fillStyle='#ffdd44';
    [[- 6,0],[6,2],[-4,10],[5,11]].forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y,1,0,Math.PI*2); ctx.fill(); });

    // Bastón (derecha)
    ctx.save(); ctx.translate(10,bob);
    ctx.strokeStyle='#774422'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(0,15); ctx.lineTo(0,-18); ctx.stroke();
    // Orbe del bastón (animado)
    const og=ctx.createRadialGradient(0,-20,1,0,-20,6);
    og.addColorStop(0,'#ffffff'); og.addColorStop(0.4,'#cc88ff'); og.addColorStop(1,'#660099');
    ctx.fillStyle=og;
    ctx.shadowColor='#cc88ff'; ctx.shadowBlur=10+Math.sin(time*4)*5;
    ctx.beginPath(); ctx.arc(0,-20,6,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();

    // Cabeza
    const hg=ctx.createRadialGradient(-1,-18,1,0,-16,7);
    hg.addColorStop(0,'#ffddaa'); hg.addColorStop(1,'#cc9966');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-17,7,0,Math.PI*2); ctx.fill();
    // Sombrero
    ctx.fillStyle='#551188';
    ctx.beginPath(); ctx.moveTo(-9,-17); ctx.lineTo(9,-17); ctx.lineTo(2,-35); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#7722aa'; roundRect(ctx,-9,-20,18,4,1); ctx.fill();
    // Estrella del sombrero
    ctx.fillStyle='#ffdd44'; ctx.beginPath(); ctx.arc(2,-28,2,0,Math.PI*2); ctx.fill();
    // Ojos brillantes
    ctx.fillStyle='#cc88ff'; ctx.shadowColor='#cc88ff'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(-2,-17,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3,-17,2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
  }

  _doAttack(target) {
    this._launch(Math.atan2(target.y-this.y,target.x-this.x),6,this.effectiveAtk,7,'#dd88ff',1.8,30);
  }
  useAbility(index, enemies) {
    if (index===0) { this._launch(this.facing,7,this.effectiveAtk*2,9,'#ff6622',2.0,80); this.particles.emitFire(this.x,this.y,2);
    } else if (index===1) { const cx=this.x+Math.cos(this.facing)*100,cy=this.y+Math.sin(this.facing)*100; this.activeEffects.push({life:4,cx,cy,radius:70,color:'#88ddff',onUpdate:(ef,enemies)=>{for(const e of enemies){if(e.alive&&Math.hypot(e.x-ef.cx,e.y-ef.cy)<ef.radius)e.slow(0.4,0.1);}},draw:(ctx,ef,time)=>{ctx.save();ctx.beginPath();ctx.arc(ef.cx,ef.cy,ef.radius,0,Math.PI*2);ctx.fillStyle=`rgba(136,221,255,${0.15+0.05*Math.sin(time*4)})`;ctx.fill();ctx.strokeStyle='#88ddffaa';ctx.lineWidth=2;ctx.stroke();ctx.restore();}}); this.particles.emitMagic(cx,cy,'#88ddff',25,30);
    } else if (index===2) { let t=[...enemies].filter(e=>e.alive&&Math.hypot(e.x-this.x,e.y-this.y)<this.range+50).sort((a,b)=>Math.hypot(a.x-this.x,a.y-this.y)-Math.hypot(b.x-this.x,b.y-this.y)).slice(0,5); for(const e of t){e.takeDamage(this.effectiveAtk*1.5,this);this.particles.emitMagic(e.x,e.y,'#ffff44',12,15);} this.particles.emitMagic(this.x,this.y,'#ffff44',20,25);
    } else if (index===3) { const tx=this.x+Math.cos(this.facing)*180,ty=this.y+Math.sin(this.facing)*180; this.particles.emitMagic(tx,ty,'#ff4400',10,15); setTimeout(()=>{for(const e of enemies){if(e.alive&&Math.hypot(e.x-tx,e.y-ty)<140)e.takeDamage(this.effectiveAtk*5,this);} this.particles.emitExplosion(tx,ty,140,'#ff6622',true);},1200); }
  }
}

// ═══════════════════════════════════════════════════════════
// ASESINO — Traje oscuro, capucha y dagas
// ═══════════════════════════════════════════════════════════
export class Assassin extends Player {
  drawBody(ctx, time) {
    const w = this._walkAnim * 3;
    const s = this.radius/11;
    ctx.save(); ctx.scale(s,s);

    ctx.beginPath(); ctx.ellipse(0,14,7,3,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fill();

    // Piernas (agachadas)
    ctx.fillStyle='#221133';
    roundRect(ctx,-4,4+w,4,11,2); ctx.fill();
    roundRect(ctx,1,4-w,4,11,2); ctx.fill();
    ctx.fillStyle='#110022';
    roundRect(ctx,-5,14+w,5,4,2); ctx.fill();
    roundRect(ctx,0,14-w,5,4,2); ctx.fill();

    // Torso (ligero)
    const tg=ctx.createLinearGradient(-7,-8,7,6);
    tg.addColorStop(0,'#553366'); tg.addColorStop(1,'#1a0a2e');
    ctx.fillStyle=tg; roundRect(ctx,-7,-8,14,13,3); ctx.fill();
    // Cinturón con herramientas
    ctx.fillStyle='#665500'; roundRect(ctx,-7,2,14,2.5,1); ctx.fill();
    ctx.fillStyle='#ffcc44'; ctx.beginPath(); ctx.arc(0,3.2,2,0,Math.PI*2); ctx.fill();

    // Daga izquierda
    ctx.save(); ctx.translate(-11,-2); ctx.rotate(0.4);
    ctx.fillStyle='#aabbcc'; roundRect(ctx,-1,-12,2.5,16,1); ctx.fill();
    ctx.fillStyle='#775500'; roundRect(ctx,-2.5,-1,5,3,1); ctx.fill();
    ctx.restore();
    // Daga derecha
    ctx.save(); ctx.translate(10,-2); ctx.rotate(-0.4);
    ctx.fillStyle='#aabbcc'; roundRect(ctx,-1,-12,2.5,16,1); ctx.fill();
    ctx.fillStyle='#775500'; roundRect(ctx,-2.5,-1,5,3,1); ctx.fill();
    ctx.restore();

    // Cabeza y capucha
    const hg=ctx.createRadialGradient(-1,-19,1,0,-17,7);
    hg.addColorStop(0,'#ddbbaa'); hg.addColorStop(1,'#aa8877');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-18,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#221133';
    ctx.beginPath(); ctx.moveTo(-9,-17); ctx.bezierCurveTo(-10,-28,0,-30,0,-31); ctx.bezierCurveTo(0,-30,10,-28,9,-17); ctx.closePath(); ctx.fill();
    // Mascara con ranura para ojos
    ctx.fillStyle='#331155'; roundRect(ctx,-6,-21,12,6,2); ctx.fill();
    // Ojos rojos
    ctx.fillStyle='#ff3333'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(-2,-19,1.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3,-19,1.5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
  }

  _doAttack(target) {
    const crit=Math.random()<0.25;
    target.takeDamage(this.effectiveAtk*(crit?2.5:1),this);
    this.particles.emitHit(target.x,target.y,crit?'#ffff44':'#ff88cc');
    if(crit) this.particles.emitExplosion(target.x,target.y,25,'#ffdd44');
  }
  useAbility(index, enemies, players) {
    if (index===0) { let t=null,m=Infinity; for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(e.x-this.x,e.y-this.y);if(d<m){m=d;t=e;}} if(t){this.x=t.x-Math.cos(this.facing)*this.radius*2.5;this.y=t.y-Math.sin(this.facing)*this.radius*2.5;t.takeDamage(this.effectiveAtk*5,this);this.particles.emitExplosion(t.x,t.y,35,'#ff44aa');}
    } else if (index===1) { this.activeEffects.push({life:3,x:this.x,y:this.y,radius:100,onUpdate:(ef,enemies)=>{for(const e of enemies){if(e.alive&&Math.hypot(e.x-ef.x,e.y-ef.y)<ef.radius)e.slow(0.5,0.1);}},draw:(ctx,ef,time)=>{ctx.save();ctx.beginPath();ctx.arc(ef.x,ef.y,ef.radius,0,Math.PI*2);ctx.fillStyle=`rgba(60,60,80,${0.4+0.1*Math.sin(time*5)})`;ctx.fill();ctx.restore();}}); this.particles.emitSmoke(this.x,this.y,12,'#445555');
    } else if (index===2) { this.activeEffects.push({life:3,x:this.x+50,y:this.y+40,radius:this.radius,taunt:true,onUpdate:(ef,enemies)=>{for(const e of enemies){if(e.alive&&Math.hypot(e.x-ef.x,e.y-ef.y)<200)e.setTarget(ef);}},draw:(ctx,ef,time)=>{ctx.save();ctx.globalAlpha=0.45+0.15*Math.sin(time*6);ctx.beginPath();ctx.arc(ef.x,ef.y,this.radius,0,Math.PI*2);ctx.fillStyle='#ff44cc88';ctx.fill();ctx.restore();}}); this.particles.emitMagic(this.x,this.y,'#ff88cc',15,20);
    } else if (index===3) { for(let a=0;a<Math.PI*2;a+=Math.PI/6)this._launch(a,7,this.effectiveAtk*1.5,4,'#ff88cc',0.8); this.particles.emitExplosion(this.x,this.y,60,'#ff44aa'); }
  }
}

// ═══════════════════════════════════════════════════════════
// BRUJO — Túnica negra, orbe oscuro, Imp mascota
// ═══════════════════════════════════════════════════════════
export class Warlock extends Player {
  constructor(...args) { super(...args); this.imp=null; this._soulDrain=0; }

  drawBody(ctx, time) {
    const bob = Math.sin(time*1.8)*2;
    const s = this.radius/12;
    ctx.save(); ctx.scale(s,s);

    ctx.beginPath(); ctx.ellipse(0,15+bob,8,3,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fill();

    // Toga oscura flotante
    const rg=ctx.createLinearGradient(-10,-5,10,18);
    rg.addColorStop(0,'#331100'); rg.addColorStop(0.5,'#552200'); rg.addColorStop(1,'#1a0800');
    ctx.fillStyle=rg;
    ctx.beginPath();
    ctx.moveTo(-6,-5); ctx.bezierCurveTo(-14,4+bob,-14,14+bob,-10,18+bob);
    ctx.lineTo(10,18+bob); ctx.bezierCurveTo(14,14+bob,14,4+bob,6,-5);
    ctx.closePath(); ctx.fill();
    // Runas en la toga
    ctx.strokeStyle='#ff440033'; ctx.lineWidth=0.8;
    [[-4,4],[3,8],[-2,13]].forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y+bob,2,0,Math.PI*2); ctx.stroke(); });
    ctx.strokeStyle='#ff440066'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(-3,0); ctx.lineTo(3,0); ctx.lineTo(0,-3); ctx.closePath(); ctx.stroke();

    // Orbe oscuro (mano)
    ctx.save(); ctx.translate(-10,-2+bob);
    ctx.shadowColor='#ff4400'; ctx.shadowBlur=12+Math.sin(time*3)*5;
    const og=ctx.createRadialGradient(0,0,1,0,0,7);
    og.addColorStop(0,'#ff8844'); og.addColorStop(0.5,'#881100'); og.addColorStop(1,'#330000');
    ctx.fillStyle=og; ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Espirales del orbe
    ctx.strokeStyle='#ff6600'; ctx.lineWidth=0.8; ctx.globalAlpha=0.7;
    ctx.beginPath(); ctx.arc(0,0,4,time,time+Math.PI*1.5); ctx.stroke();
    ctx.globalAlpha=1;
    ctx.restore();

    // Hombros con capucha
    ctx.fillStyle='#331100'; ctx.beginPath(); ctx.ellipse(0,-6,10,6,0,0,Math.PI*2); ctx.fill();

    // Cabeza
    const hg=ctx.createRadialGradient(-1,-17,1,0,-15,7);
    hg.addColorStop(0,'#aa7755'); hg.addColorStop(1,'#774433');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-17,7,0,Math.PI*2); ctx.fill();
    // Capucha oscura
    ctx.fillStyle='#220800';
    ctx.beginPath(); ctx.moveTo(-9,-16); ctx.bezierCurveTo(-11,-28,-2,-32,0,-33); ctx.bezierCurveTo(2,-32,11,-28,9,-16); ctx.closePath(); ctx.fill();
    // Ojos naranja brillantes
    ctx.fillStyle='#ff6600'; ctx.shadowColor='#ff4400'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(-2.5,-17,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.5,-17,2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
  }

  _doAttack(target) {
    if(!target.alive)return;
    target.takeDamage(this.effectiveAtk,this);
    this._soulDrain+=this.effectiveAtk*0.05;
    if(this._soulDrain>=1){this.hp=Math.min(this.maxHp,this.hp+Math.floor(this._soulDrain));this._soulDrain=0;}
    this.particles.emitMagic(target.x,target.y,'#ff6600',6,10);
  }
  useAbility(index, enemies, players, base) {
    if (index===0) { let t=null,m=this.range; for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(e.x-this.x,e.y-this.y);if(d<m){m=d;t=e;}} if(t){t.cursed=4;this.particles.emitMagic(t.x,t.y,'#6600bb',20,20);}
    } else if (index===1) { if(!this.imp){this.imp={x:this.x+30,y:this.y,hp:60,alive:true,atkTimer:0};this.particles.emitExplosion(this.x,this.y,30,'#ff4400');}
    } else if (index===2) { const sac=this.hp*0.3; this.hp-=sac; if(this.hp<1)this.hp=1; for(const e of enemies){if(e.alive&&Math.hypot(e.x-this.x,e.y-this.y)<150)e.takeDamage(sac*2,this);} this.particles.emitExplosion(this.x,this.y,150,'#881100',true);
    } else if (index===3) { const cx=this.x+Math.cos(this.facing)*120,cy=this.y+Math.sin(this.facing)*120; this.activeEffects.push({life:3,cx,cy,radius:120,onUpdate:(ef,enemies)=>{for(const e of enemies){if(!e.alive)continue;const dx=ef.cx-e.x,dy=ef.cy-e.y,d=Math.sqrt(dx*dx+dy*dy);if(d<ef.radius&&d>5){e.x+=dx/d*1.5;e.y+=dy/d*1.5;}}},draw:(ctx,ef,time)=>{ctx.save();ctx.beginPath();ctx.arc(ef.cx,ef.cy,ef.radius*(0.5+0.1*Math.sin(time*8)),0,Math.PI*2);ctx.fillStyle=`rgba(40,0,80,0.4)`;ctx.fill();ctx.strokeStyle='#8800ff';ctx.lineWidth=2;ctx.stroke();ctx.restore();}}); this.particles.emitMagic(this.x+Math.cos(this.facing)*120,this.y+Math.sin(this.facing)*120,'#8800ff',40,40); }
  }

  update(dt, enemies, players, base, time) {
    super.update(dt, enemies, players, base, time);
    if (this.imp?.alive) {
      this.imp.atkTimer-=dt;
      let t=null,m=200;
      for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(e.x-this.imp.x,e.y-this.imp.y);if(d<m){m=d;t=e;}}
      if(t){const a=Math.atan2(t.y-this.imp.y,t.x-this.imp.x);this.imp.x+=Math.cos(a)*3;this.imp.y+=Math.sin(a)*3;if(this.imp.atkTimer<=0){t.takeDamage(12,this);this.particles.emitHit(t.x,t.y,'#ff6600');this.imp.atkTimer=1.0;}}
      else{const a=Math.atan2(this.y-this.imp.y,this.x-this.imp.x);this.imp.x+=Math.cos(a)*2;this.imp.y+=Math.sin(a)*2;}
    }
  }

  draw(ctx,time) {
    super.draw(ctx,time);
    if (this.imp?.alive) {
      ctx.save();
      ctx.translate(this.imp.x,this.imp.y);
      // Cuerpo del imp
      ctx.fillStyle='#cc2200'; ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#ff6600'; ctx.lineWidth=1.5; ctx.stroke();
      // Cuernos
      ctx.fillStyle='#ff4400';
      ctx.beginPath(); ctx.moveTo(-4,-7); ctx.lineTo(-6,-13); ctx.lineTo(-2,-8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4,-7); ctx.lineTo(6,-13); ctx.lineTo(2,-8); ctx.fill();
      // Ojos
      ctx.fillStyle='#ffff00'; ctx.shadowColor='#ffff00'; ctx.shadowBlur=4;
      ctx.beginPath(); ctx.arc(-2,-1,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(2,-1,2,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.restore();
    }
  }
}

// Factory
export function createPlayer(className, x, y, playerIndex, particles) {
  const d = CLASSES[className];
  let p;
  switch(className) {
    case 'Caballero': p = new Knight(x,y,d,playerIndex,particles); break;
    case 'Arquero':   p = new Archer(x,y,d,playerIndex,particles); break;
    case 'Mago':      p = new Mage(x,y,d,playerIndex,particles); break;
    case 'Asesino':   p = new Assassin(x,y,d,playerIndex,particles); break;
    case 'Brujo':     p = new Warlock(x,y,d,playerIndex,particles); break;
    default:          p = new Knight(x,y,d,playerIndex,particles); break;
  }
  p.className = className;
  return p;
}
