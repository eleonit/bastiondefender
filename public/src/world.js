// ============================================================
// WORLD.JS — Mapa del juego y Base central
// ============================================================
import { GAME_W, GAME_H, TILE, MAP_COLS, MAP_ROWS, BASE_X, BASE_Y, CONFIG } from './constants.js';

// ─────────────────────────────────────
// MAP
// ─────────────────────────────────────
const T = { GRASS:0, PATH:1, WATER:2, STONE:3 };

export class GameMap {
  constructor() {
    this.tiles = this._generateTiles();
    // Waypoints: los enemigos siguen estos puntos hacia la base
    this.waypoints = this._buildWaypoints();
  }

  _generateTiles() {
    const grid = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      grid.push([]);
      for (let c = 0; c < MAP_COLS; c++) {
        // Bordes: piedra
        if (r===0 || r===MAP_ROWS-1 || c===0 || c===MAP_COLS-1) {
          grid[r].push(T.STONE);
        } else {
          grid[r].push(T.GRASS);
        }
      }
    }
    // Caminos en X y en Y cruzant el centro
    const cr = Math.floor(MAP_ROWS/2);
    const cc = Math.floor(MAP_COLS/2);
    for (let c = 0; c < MAP_COLS; c++) { grid[cr][c] = T.PATH; grid[cr-1][c] = T.PATH; }
    for (let r = 0; r < MAP_ROWS; r++) { grid[r][cc] = T.PATH; grid[r][cc+1] = T.PATH; }
    // Caminos diagonales
    for (let i = 0; i < Math.min(MAP_ROWS, MAP_COLS); i++) {
      if (i < MAP_ROWS && i < MAP_COLS) {
        if (grid[i][i] !== undefined)       grid[i][i]       = T.PATH;
        if (grid[MAP_ROWS-1-i] && grid[MAP_ROWS-1-i][i] !== undefined) grid[MAP_ROWS-1-i][i] = T.PATH;
      }
    }
    return grid;
  }

  _buildWaypoints() {
    // 4 rutas que convergen en el centro
    const cx = BASE_X + TILE;
    const cy = BASE_Y + TILE;
    return [
      // Desde izquierda
      [{ x:0, y:cy }, { x:cx*0.4, y:cy }, { x:cx*0.7, y:cy*1.1 }, { x:cx, y:cy }],
      // Desde derecha
      [{ x:GAME_W, y:cy }, { x:cx*1.6, y:cy }, { x:cx*1.3, y:cy*0.9 }, { x:cx, y:cy }],
      // Desde arriba
      [{ x:cx, y:0 }, { x:cx, y:cy*0.4 }, { x:cx*1.1, y:cy*0.7 }, { x:cx, y:cy }],
      // Desde abajo
      [{ x:cx, y:GAME_H }, { x:cx, y:cy*1.6 }, { x:cx*0.9, y:cy*1.3 }, { x:cx, y:cy }],
      // Diagonal arriba-izquierda
      [{ x:0, y:0 }, { x:cx*0.5, y:cy*0.5 }, { x:cx*0.8, y:cy*0.8 }, { x:cx, y:cy }],
      // Diagonal abajo-derecha
      [{ x:GAME_W, y:GAME_H }, { x:cx*1.5, y:cy*1.5 }, { x:cx*1.2, y:cy*1.2 }, { x:cx, y:cy }],
    ];
  }

  draw(ctx) {
    const colors = {
      [T.GRASS]:  ['#2d5a27','#336328','#254d21'],
      [T.PATH]:   ['#8b6914','#9c7a1a','#7a5c10'],
      [T.WATER]:  ['#1a3a8b','#1e44a0'],
      [T.STONE]:  ['#3a3a4a','#2e2e3e'],
    };
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const t = this.tiles[r][c];
        const variants = colors[t] || colors[T.GRASS];
        // pequeña variacion de color por celda para efecto de textura
        const variant = variants[(r*3+c*7) % variants.length];
        ctx.fillStyle = variant;
        ctx.fillRect(c*TILE, r*TILE, TILE, TILE);
        // Detalle de borde sutil
        if (t === T.GRASS) {
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(c*TILE, r*TILE, TILE, 1);
          ctx.fillRect(c*TILE, r*TILE, 1, TILE);
        }
      }
    }
    // Decoracion: arboles en areas de cesped
    this._drawDecorations(ctx);
  }

  _drawDecorations(ctx) {
    // Arboles semi-transparentes fijos (seed visual)
    const trees = [
      {x:60,y:60},{x:150,y:80},{x:GAME_W-80,y:60},{x:GAME_W-150,y:100},
      {x:60,y:GAME_H-80},{x:150,y:GAME_H-100},{x:GAME_W-80,y:GAME_H-70},{x:GAME_W-200,y:GAME_H-90},
      {x:250,y:150},{x:GAME_W-250,y:150},{x:250,y:GAME_H-150},{x:GAME_W-250,y:GAME_H-150},
    ];
    trees.forEach(({x,y}) => {
      // tronco
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(x-3, y+8, 6, 10);
      // copa
      ctx.fillStyle = '#1a4a14';
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#22661a';
      ctx.beginPath();
      ctx.arc(x-3, y-3, 12, 0, Math.PI*2);
      ctx.fill();
    });
  }
}

// ─────────────────────────────────────
// BASE
// ─────────────────────────────────────
export class Base {
  constructor() {
    this.x     = BASE_X + TILE;
    this.y     = BASE_Y + TILE;
    this.hp    = CONFIG.BASE_HP;
    this.maxHp = CONFIG.BASE_HP;
    this.radius= 38;
    this._shakeTime = 0;
    this._shakeX    = 0;
    this._shakeY    = 0;
  }

  get alive() { return this.hp > 0; }
  get pctHp() { return Math.max(0, this.hp / this.maxHp); }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this._shakeTime = 0.3;
  }

  regen(pct) {
    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * pct);
  }

  update(dt) {
    if (this._shakeTime > 0) {
      this._shakeTime -= dt;
      this._shakeX = (Math.random()-0.5) * 6;
      this._shakeY = (Math.random()-0.5) * 6;
    } else {
      this._shakeX = 0; this._shakeY = 0;
    }
  }

  draw(ctx, time) {
    const x = this.x + this._shakeX;
    const y = this.y + this._shakeY;

    // Aura pulsante
    const pulse = 0.7 + 0.3 * Math.sin(time * 2.5);
    const hpFrac = this.pctHp;
    const auraColor = hpFrac > 0.5 ? `rgba(80,180,255,${0.2*pulse})` : `rgba(255,80,80,${0.3*pulse})`;
    ctx.save();
    ctx.shadowColor = hpFrac > 0.5 ? '#55aaff' : '#ff5555';
    ctx.shadowBlur  = 20 * pulse;
    ctx.beginPath();
    ctx.arc(x, y, this.radius + 8, 0, Math.PI*2);
    ctx.fillStyle = auraColor;
    ctx.fill();
    ctx.restore();

    // Base principal
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI*2);
    const grad = ctx.createRadialGradient(x-8, y-8, 2, x, y, this.radius);
    grad.addColorStop(0, '#8888cc');
    grad.addColorStop(0.5,'#444488');
    grad.addColorStop(1, '#222244');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = hpFrac > 0.5 ? '#aaaaff' : '#ff8888';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Torre central
    ctx.save();
    ctx.fillStyle = '#5555aa';
    ctx.fillRect(x-10, y-24, 20, 28);
    ctx.fillStyle = '#7777cc';
    ctx.fillRect(x-14, y-30, 28, 10);
    // Bandera
    ctx.fillStyle = '#ffdd00';
    ctx.fillRect(x+4, y-42, 2, 16);
    ctx.beginPath();
    ctx.moveTo(x+6, y-42);
    ctx.lineTo(x+18, y-36);
    ctx.lineTo(x+6, y-30);
    ctx.closePath();
    ctx.fillStyle = '#ff4444';
    ctx.fill();
    // Icono
    ctx.font = `${this.radius * 0.55}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏰', x, y+6);
    ctx.restore();

    // Barra de vida encima de la base
    const bw = 90, bh = 10;
    const bx = x - bw/2, by = y - this.radius - 20;
    ctx.fillStyle = '#111';
    ctx.fillRect(bx-1, by-1, bw+2, bh+2);
    ctx.fillStyle = hpFrac > 0.5 ? '#44cc44' : hpFrac > 0.25 ? '#ffaa00' : '#ff4444';
    ctx.fillRect(bx, by, bw * hpFrac, bh);
    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    // Texto HP
    ctx.font = '9px "Exo 2", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(this.hp)}/${this.maxHp}`, x, by + bh/2);
  }
}
