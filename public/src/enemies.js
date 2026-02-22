// ============================================================
// ENEMIES.JS — Enemigos con fisonomia dibujada
// ============================================================
import { GAME_W, GAME_H, ENEMY_TYPES } from './constants.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// Dibujantes especializados por tipo
const BODY_DRAWERS = {
  OrcGrunt(ctx, e, time) {
    const w = Math.sin(time*6)*3;
    ctx.save(); ctx.scale(1,1);
    // Sombra
    ctx.beginPath(); ctx.ellipse(0,14,12,4,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fill();
    // Piernas
    ctx.fillStyle='#2a4a1a';
    roundRect(ctx,-8,6+w,7,11,2); ctx.fill();
    roundRect(ctx,2,6-w,7,11,2); ctx.fill();
    ctx.fillStyle='#552200'; roundRect(ctx,-9,16+w,8,4,2); ctx.fill(); roundRect(ctx,1,16-w,8,4,2); ctx.fill();
    // Torso musculoso
    const tg=ctx.createLinearGradient(-10,-8,10,8);
    tg.addColorStop(0,'#558833'); tg.addColorStop(1,'#2a4415');
    ctx.fillStyle=tg; roundRect(ctx,-10,-8,20,15,3); ctx.fill();
    // Pelo del pecho
    ctx.strokeStyle='#1a3010'; ctx.lineWidth=1;
    for(let i=-7;i<7;i+=3){ctx.beginPath();ctx.moveTo(i,-4);ctx.lineTo(i-1,2);ctx.stroke();}
    // Arma: maza
    ctx.save(); ctx.translate(12,0);
    ctx.fillStyle='#775533'; roundRect(ctx,-2,-15,4,20,1); ctx.fill();
    ctx.fillStyle='#997755'; ctx.beginPath(); ctx.arc(0,-15,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#cc9944';
    for(let a=0;a<Math.PI*2;a+=Math.PI/3){ctx.beginPath();ctx.moveTo(Math.cos(a)*7,Math.sin(a)*7-15);ctx.lineTo(Math.cos(a)*11,Math.sin(a)*11-15);ctx.strokeStyle='#ccaa55';ctx.lineWidth=2;ctx.stroke();}
    ctx.restore();
    // Hombros
    ctx.fillStyle='#558833'; ctx.beginPath(); ctx.ellipse(-10,-5,6,4,0.3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(10,-5,6,4,-0.3,0,Math.PI*2); ctx.fill();
    // Cabeza verde orco
    const hg=ctx.createRadialGradient(-2,-18,2,0,-16,12);
    hg.addColorStop(0,'#88cc44'); hg.addColorStop(1,'#446622');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.ellipse(0,-18,11,10,0,0,Math.PI*2); ctx.fill();
    // Mandibula pronunciada con colmillos
    ctx.fillStyle='#558833'; ctx.beginPath(); ctx.ellipse(0,-10,9,5,0,0,Math.PI); ctx.fill();
    ctx.fillStyle='#eeeecc';
    ctx.beginPath(); ctx.moveTo(-4,-10); ctx.lineTo(-3,-4); ctx.lineTo(-1,-10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4,-10); ctx.lineTo(3,-4); ctx.lineTo(1,-10); ctx.fill();
    // Ojos amarillos
    ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffaa00'; ctx.shadowBlur=5;
    ctx.beginPath(); ctx.arc(-4,-20,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(4,-20,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#440000'; ctx.beginPath(); ctx.arc(-4,-20,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(4,-20,1.5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Nariz chata
    ctx.fillStyle='#447733'; ctx.beginPath(); ctx.ellipse(0,-16,3,2,0,0,Math.PI*2); ctx.fill();
    // Orejas puntiagudas
    ctx.fillStyle='#558833';
    ctx.beginPath(); ctx.moveTo(-11,-18); ctx.lineTo(-17,-24); ctx.lineTo(-11,-24); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11,-18); ctx.lineTo(17,-24); ctx.lineTo(11,-24); ctx.fill();
    ctx.restore();
  },

  OrcShaman(ctx, e, time) {
    const bob=Math.sin(time*2.5)*2;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0,14,9,3,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fill();
    // Túnica ritual
    const rg=ctx.createLinearGradient(-8,-6,8,14);
    rg.addColorStop(0,'#996633'); rg.addColorStop(1,'#441100');
    ctx.fillStyle=rg; ctx.beginPath(); ctx.moveTo(-6,-6); ctx.lineTo(-10,14); ctx.lineTo(10,14); ctx.lineTo(6,-6); ctx.closePath(); ctx.fill();
    // Runas
    ctx.strokeStyle='#ffaa00'; ctx.lineWidth=0.7;
    [[-3,0],[3,5],[-2,9]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.stroke();});
    // Bastón ritual
    ctx.save(); ctx.translate(-12,bob);
    ctx.fillStyle='#553300'; roundRect(ctx,-2,-20,4,25,1); ctx.fill();
    // Craneo en el baston
    ctx.fillStyle='#ddddbb'; ctx.beginPath(); ctx.arc(0,-22,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(-2,-23,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(2,-23,1.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ddddbb'; roundRect(ctx,-3,-19,6,3,1); ctx.fill();
    // Fuego del baston
    ctx.shadowColor='#ff6600'; ctx.shadowBlur=10+Math.sin(time*5)*5;
    ctx.fillStyle='#ff4400'; ctx.beginPath(); ctx.arc(0,-27,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffdd00'; ctx.beginPath(); ctx.arc(0,-27,2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
    // Cabeza con tocado
    const hg=ctx.createRadialGradient(-1,-17,1,0,-15,9);
    hg.addColorStop(0,'#99cc55'); hg.addColorStop(1,'#446622');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-17,9,0,Math.PI*2); ctx.fill();
    // Tocado/mascara ritual
    ctx.fillStyle='#774400'; roundRect(ctx,-8,-24,16,8,3); ctx.fill();
    ctx.fillStyle='#ffaa00';
    for(let i=-6;i<=6;i+=4){ctx.beginPath();ctx.moveTo(i,-24);ctx.lineTo(i,-30);ctx.strokeStyle='#ffcc44';ctx.lineWidth=2;ctx.stroke();}
    ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ff8800'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(-3,-19,2.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3,-19,2.5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
  },

  OrcBerserker(ctx, e, time) {
    const w=Math.sin(time*9)*4;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0,15,13,5,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fill();
    // Piernas potentes
    ctx.fillStyle='#881111';
    roundRect(ctx,-9,5+w,8,13,2); ctx.fill(); roundRect(ctx,2,5-w,8,13,2); ctx.fill();
    ctx.fillStyle='#440000'; roundRect(ctx,-10,17+w,9,5,2); ctx.fill(); roundRect(ctx,2,17-w,9,5,2); ctx.fill();
    // Torso enorme con cicatrices
    const tg=ctx.createLinearGradient(-12,-10,12,10);
    tg.addColorStop(0,'#cc2222'); tg.addColorStop(1,'#660000');
    ctx.fillStyle=tg; roundRect(ctx,-12,-10,24,16,3); ctx.fill();
    // Cicatrices
    ctx.strokeStyle='#ff6666'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-7,-6); ctx.lineTo(-3,-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5,-8); ctx.lineTo(8,-3); ctx.stroke();
    // Hacha doble
    ctx.save(); ctx.translate(14,0); ctx.rotate(Math.sin(time*9)*0.15);
    ctx.fillStyle='#774433'; roundRect(ctx,-2,-18,4,24,1); ctx.fill();
    ctx.fillStyle='#aabbcc';
    ctx.beginPath(); ctx.moveTo(2,-15); ctx.lineTo(14,-10); ctx.lineTo(12,-2); ctx.lineTo(2,-5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2,-15); ctx.lineTo(-14,-10); ctx.lineTo(-12,-2); ctx.lineTo(-2,-5); ctx.fill();
    ctx.strokeStyle='#ccddee'; ctx.lineWidth=0.8; ctx.stroke();
    ctx.restore();
    // Cabeza furiosa
    const hg=ctx.createRadialGradient(-2,-19,2,0,-17,11);
    hg.addColorStop(0,'#cc3333'); hg.addColorStop(1,'#660000');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.ellipse(0,-18,12,10,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#eeddcc'; ctx.beginPath(); ctx.arc(-4,-13,4,0,Math.PI); ctx.fill(); ctx.beginPath(); ctx.arc(4,-13,4,0,Math.PI); ctx.fill();
    ctx.fillStyle='#eeddcc'; ctx.beginPath(); ctx.moveTo(-5,-13); ctx.lineTo(-4,-8); ctx.lineTo(-2,-13); ctx.fill(); ctx.beginPath(); ctx.moveTo(5,-13); ctx.lineTo(4,-8); ctx.lineTo(2,-13); ctx.fill();
    ctx.fillStyle='#ff2200'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(-4,-21,3.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(4,-21,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(-4,-21,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(4,-21,1.5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#cc3333'; ctx.beginPath(); ctx.arc(-11,-18,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(11,-18,4,0,Math.PI*2); ctx.fill();
    ctx.restore();
  },

  Harpy(ctx, e, time) {
    const wing=Math.sin(time*8)*15;
    ctx.save();
    // Alas
    ctx.fillStyle='#7755aa';
    ctx.save(); ctx.translate(-8,-10);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(-18,wing-10,-26,wing+5,-20,wing+15); ctx.bezierCurveTo(-12,wing+10,-6,wing+5,0,0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#9977cc'; ctx.lineWidth=1; ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(8,-10);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(18,-wing-10,26,-wing+5,20,-wing+15); ctx.bezierCurveTo(12,-wing+10,6,-wing+5,0,0); ctx.closePath(); ctx.fill();
    ctx.restore();
    // Cuerpo pajaro/humano
    const bg=ctx.createLinearGradient(-7,-8,7,8);
    bg.addColorStop(0,'#8866bb'); bg.addColorStop(1,'#553388');
    ctx.fillStyle=bg; roundRect(ctx,-7,-8,14,16,4); ctx.fill();
    // Patas de ave
    ctx.strokeStyle='#ffcc44'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(-4,8); ctx.lineTo(-6,16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4,8); ctx.lineTo(6,16); ctx.stroke();
    // Garras
    for(let g=-1;g<=1;g+=2){
      const ox=g<0?-6:6;
      ctx.beginPath(); ctx.moveTo(ox,16); ctx.lineTo(ox-3,20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox,16); ctx.lineTo(ox,21); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox,16); ctx.lineTo(ox+3,20); ctx.stroke();
    }
    // Cabeza
    const hg=ctx.createRadialGradient(-1,-16,1,0,-14,8);
    hg.addColorStop(0,'#ddaacc'); hg.addColorStop(1,'#aa7799');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-15,7,0,Math.PI*2); ctx.fill();
    // Pico
    ctx.fillStyle='#ffcc44'; ctx.beginPath(); ctx.moveTo(7,-14); ctx.lineTo(14,-16); ctx.lineTo(7,-18); ctx.closePath(); ctx.fill();
    // Ojos
    ctx.fillStyle='#ff2200'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(-2,-16,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3,-16,2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Cresta de plumas
    ctx.fillStyle='#9966cc';
    for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*2.5,-22);ctx.lineTo(i*2,-29+Math.abs(i));ctx.lineTo(i*2.5+2,-22);ctx.fill();}
    ctx.restore();
  },

  Cyclops(ctx, e, time) {
    const w=Math.sin(time*3)*4;
    ctx.save(); ctx.scale(1.9,1.9);
    ctx.beginPath(); ctx.ellipse(0,15,14,5,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fill();
    // Piernas enormes
    ctx.fillStyle='#335588';
    roundRect(ctx,-12,6+w,10,14,3); ctx.fill(); roundRect(ctx,3,6-w,10,14,3); ctx.fill();
    ctx.fillStyle='#112244'; roundRect(ctx,-13,19+w,11,5,2); ctx.fill(); roundRect(ctx,2,19-w,11,5,2); ctx.fill();
    // Torso ciclope
    const tg=ctx.createLinearGradient(-14,-10,14,12);
    tg.addColorStop(0,'#4477aa'); tg.addColorStop(0.5,'#2255aa'); tg.addColorStop(1,'#112244');
    ctx.fillStyle=tg; roundRect(ctx,-14,-10,28,17,5); ctx.fill();
    // Detalle pecho
    ctx.strokeStyle='#6699cc'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-8,-5); ctx.lineTo(0,0); ctx.lineTo(8,-5); ctx.stroke();
    // Brazos
    ctx.fillStyle='#335588';
    roundRect(ctx,-18,-8,7,18,3); ctx.fill(); roundRect(ctx,12,-8,7,18,3); ctx.fill();
    // Punos
    ctx.fillStyle='#4477aa';
    ctx.beginPath(); ctx.arc(-15,10,6,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(16,10,6,0,Math.PI*2); ctx.fill();
    // Cabeza grande
    const hg=ctx.createRadialGradient(-3,-22,3,0,-18,16);
    hg.addColorStop(0,'#6699cc'); hg.addColorStop(1,'#1a3366');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.ellipse(0,-20,15,14,0,0,Math.PI*2); ctx.fill();
    // EL OJO CENTRAL (gigante)
    const og=ctx.createRadialGradient(-2,-22,1,0,-22,10);
    og.addColorStop(0,'#ffffff'); og.addColorStop(0.3,'#88aaff'); og.addColorStop(0.7,'#0044cc'); og.addColorStop(1,'#001166');
    ctx.fillStyle=og; ctx.shadowColor='#4488ff'; ctx.shadowBlur=15+Math.sin(time*2)*8;
    ctx.beginPath(); ctx.arc(0,-21,10,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    // Pupila
    ctx.fillStyle='#000020'; ctx.beginPath(); ctx.ellipse(1,-21,4,5,0.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(2,-24,2,0,Math.PI*2); ctx.fill();
    // Ceja
    ctx.fillStyle='#1a3366'; roundRect(ctx,-12,-33,24,5,2); ctx.fill();
    // Dientes
    ctx.fillStyle='#ddddcc';
    for(let i=-6;i<=6;i+=4){roundRect(ctx,i-1,-8,2.5,5,1);ctx.fill();}
    // Corona boss
    ctx.fillStyle='#cc9900';
    ctx.beginPath(); ctx.moveTo(-12,-33); ctx.lineTo(-10,-40); ctx.lineTo(-5,-34); ctx.lineTo(0,-42); ctx.lineTo(5,-34); ctx.lineTo(10,-40); ctx.lineTo(12,-33); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#ffdd44'; ctx.lineWidth=1; ctx.stroke();
    ctx.restore();
  },

  Minotaur(ctx, e, time) {
    const w=Math.sin(time*4)*3;
    ctx.save(); ctx.scale(1.5,1.5);
    ctx.beginPath(); ctx.ellipse(0,16,13,4,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fill();
    // Piernas
    ctx.fillStyle='#663311';
    roundRect(ctx,-10,6+w,9,13,3); ctx.fill(); roundRect(ctx,2,6-w,9,13,3); ctx.fill();
    ctx.fillStyle='#331100'; roundRect(ctx,-11,18+w,11,5,3); ctx.fill(); roundRect(ctx,1,18-w,11,5,3); ctx.fill();
    // Torso toro
    const tg=ctx.createLinearGradient(-12,-10,12,8);
    tg.addColorStop(0,'#885522'); tg.addColorStop(1,'#442200');
    ctx.fillStyle=tg; ctx.beginPath(); ctx.ellipse(0,-1,13,10,0,0,Math.PI*2); ctx.fill();
    // Brazos musculosos
    ctx.fillStyle='#774411';
    roundRect(ctx,-18,-8,8,18,4); ctx.fill(); roundRect(ctx,11,-8,8,18,4); ctx.fill();
    // Hacha de guerra
    ctx.save(); ctx.translate(16,0); ctx.rotate(Math.sin(time*4)*0.1);
    ctx.fillStyle='#665544'; roundRect(ctx,-2,-20,4,28,1); ctx.fill();
    ctx.fillStyle='#99aacc';
    ctx.beginPath(); ctx.moveTo(2,-18); ctx.lineTo(18,-12); ctx.lineTo(16,-2); ctx.lineTo(2,-6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2,-18); ctx.lineTo(-18,-12); ctx.lineTo(-16,-2); ctx.lineTo(-2,-6); ctx.fill();
    ctx.restore();
    // Cabeza de toro
    const hg=ctx.createRadialGradient(-2,-21,3,0,-19,14);
    hg.addColorStop(0,'#996633'); hg.addColorStop(1,'#442200');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.ellipse(0,-20,13,12,0,0,Math.PI*2); ctx.fill();
    // Morro
    ctx.fillStyle='#bb8855'; ctx.beginPath(); ctx.ellipse(0,-13,8,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#441100'; ctx.beginPath(); ctx.arc(-3,-13,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3,-13,2,0,Math.PI*2); ctx.fill();
    // Cuernos grandes
    ctx.fillStyle='#eeeecc';
    ctx.save(); ctx.translate(-11,-23); ctx.rotate(-0.7);
    roundRect(ctx,-2,-14,4,14,2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(11,-23); ctx.rotate(0.7);
    roundRect(ctx,-2,-14,4,14,2); ctx.fill(); ctx.restore();
    // Ojos rojos
    ctx.fillStyle='#ff2200'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(-5,-22,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(5,-22,3,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
  },

  MiNotaurKing(ctx, e, time) {
    ctx.save(); ctx.scale(2.2, 2.2);
    // Aura infernal
    ctx.shadowColor='#ff0000'; ctx.shadowBlur=20+Math.sin(time*3)*10;
    BODY_DRAWERS.Minotaur(ctx, e, time);
    ctx.shadowBlur=0;
    // Corona rey encima
    ctx.fillStyle='#ffcc00';
    ctx.beginPath(); ctx.moveTo(-13,-40); ctx.lineTo(-11,-50); ctx.lineTo(-6,-42); ctx.lineTo(0,-54); ctx.lineTo(6,-42); ctx.lineTo(11,-50); ctx.lineTo(13,-40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#ffee88'; ctx.lineWidth=1; ctx.stroke();
    // Joyas corona
    ['#ff4444','#4488ff','#44ff44'].forEach((c,i)=>{ctx.fillStyle=c;ctx.shadowColor=c;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(-6+i*6,-42,2,0,Math.PI*2);ctx.fill();});
    ctx.shadowBlur=0;
    ctx.restore();
  },
};

// ═══════════════════════════════════════════════════════════
// ENEMY BASE CLASS
// ═══════════════════════════════════════════════════════════
export class Enemy {
  constructor(type, spawnPoint, waypoints, particles) {
    const data = ENEMY_TYPES[type];
    this.type=type; this.data=data;
    this.x=spawnPoint.x; this.y=spawnPoint.y;
    this.hp=data.hp; this.maxHp=data.hp;
    this.speed=data.speed; this.atk=data.atk; this.atkRate=data.atkRate;
    this.atkTimer=0; this.radius=data.radius;
    this.reward=data.reward; this._alive=true;
    this.particles=particles;
    this.flying=!!data.flying; this.ranged=!!data.ranged;
    this.boss=!!data.boss||!!data.miniBoss||!!data.finalBoss;
    this.projectileRange=data.projectileRange||150;
    this.waypoints=waypoints; this.waypointIdx=0; this.target=null;
    this.stunTime=0; this.slowMult=1; this.slowTime=0; this.cursed=0;
    this._hitFlash=0; this._walkTime=0;
    this.projectiles=[];
  }

  get alive() { return this._alive; }
  set alive(v) { this._alive=v; }
  stun(d) { this.stunTime=Math.max(this.stunTime,d); }
  slow(m) { this.slowMult=Math.min(this.slowMult,m); this.slowTime=0.2; }
  setTarget(o) { this.target=o; }
  get effectiveSpeed() { return this.speed*(this.slowMult)*(this.cursed>0?0.6:1); }
  get effectiveAtk()   { return this.atk*(this.cursed>0?0.6:1); }

  update(dt, players, base) {
    if (!this.alive) return;
    if (this.stunTime>0) { this.stunTime-=dt; return; }
    if (this.slowTime>0) { this.slowTime-=dt; if(this.slowTime<=0)this.slowMult=1; }
    if (this.cursed>0) this.cursed-=dt;
    if (this._hitFlash>0) this._hitFlash-=dt;
    if (this.target&&this.target.life!==undefined&&this.target.life<=0) this.target=null;

    this._walkTime += dt*6;

    let gx,gy;
    if (this.target) { gx=this.target.x; gy=this.target.y; }
    else if (this.waypointIdx<this.waypoints.length) { gx=this.waypoints[this.waypointIdx].x; gy=this.waypoints[this.waypointIdx].y; }
    else { gx=base.x; gy=base.y; }

    const dx=gx-this.x, dy=gy-this.y, dist=Math.sqrt(dx*dx+dy*dy);
    if (dist<8&&!this.target) this.waypointIdx++;
    else if (dist>1) { const spd=this.effectiveSpeed*60; this.x+=dx/dist*spd*dt; this.y+=dy/dist*spd*dt; }

    // Atacar base
    const dBase=Math.hypot(base.x-this.x,base.y-this.y);
    if (dBase<base.radius+this.radius) {
      this.atkTimer-=dt;
      if (this.atkTimer<=0) { base.takeDamage(this.effectiveAtk); this.atkTimer=1/this.atkRate; this.particles.emitHit(base.x,base.y,'#ff4444'); }
    }

    // Ranged
    if (this.ranged) {
      this.atkTimer-=dt;
      if (this.atkTimer<=0) {
        let closest=null,minD=this.projectileRange;
        for(const p of players){if(!p.alive)continue;const d=Math.hypot(p.x-this.x,p.y-this.y);if(d<minD){minD=d;closest=p;}}
        if(closest){const angle=Math.atan2(closest.y-this.y,closest.x-this.x);this.projectiles.push({x:this.x,y:this.y,angle,speed:5,dmg:this.effectiveAtk*0.7,radius:6,life:2.5,color:'#ffaa44'});this.atkTimer=1/this.atkRate;}
      }
    }

    // Proyectiles enemigo
    this.projectiles=this.projectiles.filter(p=>{
      p.x+=Math.cos(p.angle)*p.speed*60*dt; p.y+=Math.sin(p.angle)*p.speed*60*dt; p.life-=dt;
      if(p.life<=0)return false;
      for(const pl of players){if(!pl.alive)continue;if(Math.hypot(pl.x-p.x,pl.y-p.y)<pl.radius+p.radius){pl.takeDamage(p.dmg);this.particles.emitHit(p.x,p.y,'#ff6600');return false;}}
      return p.x>-50&&p.x<GAME_W+50&&p.y>-50&&p.y<700;
    });
  }

  takeDamage(amount, source) {
    if (!this.alive) return;
    this.hp-=amount; this._hitFlash=0.15;
    this.particles.emit(this.x,this.y,'#ffcc44',4,2,0.15);
    if (this.hp<=0) {
      this.hp=0; this.alive=false; this._onDeath();
      if (source && typeof source.gainXp === 'function') {
        source.gainXp(this.data.xp || 5);
      }
    }
  }

  _onDeath() {
    this.particles.emitDeath(this.x, this.y, this.data.color, this.radius);
  }

  draw(ctx, time) {
    if (!this.alive) return;
    // Proyectiles
    for(const p of this.projectiles){
      ctx.save(); ctx.shadowColor=p.color; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.fillStyle=p.color; ctx.fill(); ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Aura boss pulsante
    if (this.boss) {
      const p=0.5+0.5*Math.sin(time*3);
      ctx.shadowColor='#ff4444'; ctx.shadowBlur=20*p;
      ctx.beginPath(); ctx.arc(0,0,this.radius+10,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,50,50,${0.15*p})`; ctx.fill(); ctx.shadowBlur=0;
    }

    // Flash de daño
    if (this._hitFlash>0) ctx.filter='brightness(3) saturate(0)';

    // Estado aturdido
    if (this.stunTime>0) {
      ctx.shadowColor='#ffff44'; ctx.shadowBlur=10;
      ctx.font='14px serif'; ctx.textAlign='center';
      ctx.fillText('⭐', 0, -this.radius-12);
      ctx.shadowBlur=0;
    }

    // Dibujar cuerpo especifico
    const drawer = BODY_DRAWERS[this.type] || BODY_DRAWERS.OrcGrunt;
    drawer(ctx, this, time);

    ctx.filter='none';

    // Barra de vida
    const bw=(this.boss?55:38)+this.radius*0.5, bh=this.boss?8:5;
    const bx=-bw/2, by=-this.radius-(this.boss?22:16);
    ctx.fillStyle='#111'; ctx.fillRect(bx-1,by-1,bw+2,bh+2);
    const pct=this.hp/this.maxHp;
    ctx.fillStyle=pct>0.5?'#cc3333':pct>0.25?'#ff8800':'#ff2222';
    ctx.fillRect(bx,by,bw*pct,bh);
    if(this.cursed>0){ctx.fillStyle='#6600bb';ctx.font='10px serif';ctx.textAlign='center';ctx.fillText('💀',bw/2+5,by+bh/2+2);}

    ctx.restore();
  }
}

export function createEnemy(type, spawnPoint, waypoints, particles) {
  return new Enemy(type, spawnPoint, waypoints, particles);
}
