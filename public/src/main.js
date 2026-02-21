// ============================================================
// MAIN.JS — Game loop, state machine, wiring
// ============================================================
import { GAME_W, GAME_H, CLASSES, CLASS_NAMES, CONFIG, PLAYER_COLORS } from './constants.js';
import { VirtualPad }      from './input.js';
import { GameMap, Base }   from './world.js';
import { ParticleSystem, WaveManager } from './systems.js';
import { createPlayer }    from './entities.js';
import { drawCharacterSelect, drawHUD, drawGameOver, drawVictory, drawLeaderboard } from './ui.js';

// ─────────────────────────────────────
// STATE
// ─────────────────────────────────────
const STATE = { SELECT: 'select', PLAYING: 'playing', GAME_OVER: 'game_over', VICTORY: 'victory' };

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this.state  = STATE.SELECT;
    this.time   = 0;
    this.lastTs = 0;

    // Character select state
    this.selectState = {
      playerCount: 2,
      selectedClasses: CLASS_NAMES.map(() => 'Caballero'),  // default per slot
      playBtnBounds: null,
      playerBtnBounds: [],
      classBtnBounds: [],
    };
    // Ensure default class per player
    for (let i = 0; i < CONFIG.MAX_PLAYERS; i++) {
      this.selectState.selectedClasses[i] = CLASS_NAMES[i % CLASS_NAMES.length];
    }

    // Game objects (populated on start)
    this.map      = null;
    this.base     = null;
    this.particles= null;
    this.wm       = null;
    this.players  = [];
    this.pads     = [];
    this.endStats = null;
    this.scores   = [];
    this._leaderboardBtns = null;
    this._floatingTexts = [];

    this._resize();
    this._bindEvents();
    this._loop(0);

    // Ocultar loading screen tras 800ms
    setTimeout(() => {
      const ls = document.getElementById('loadingScreen');
      if (ls) { ls.classList.add('hidden'); setTimeout(()=>ls.remove(), 500); }
    }, 800);
  }

  // ─────────────────────────────────────
  // RESIZE
  // ─────────────────────────────────────
  _resize() {
    const W = window.innerWidth, H = window.innerHeight;
    this.canvas.width  = W;
    this.canvas.height = H;
    this.W = W; this.H = H;
    // Recalcular centros de joystick si hay pads activos
    if (this.pads.length) this.pads.forEach(p => p.recalcJoyCenter());
  }

  // ─────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────
  _bindEvents() {
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(()=>this._resize(), 200));

    // Clicks / taps en la capa del canvas (sólo para el menú)
    this.canvas.addEventListener('click', e => this._handleClick(e.clientX, e.clientY));
    this.canvas.addEventListener('touchend', e => {
      if (this.state === STATE.SELECT || this.state === STATE.GAME_OVER || this.state === STATE.VICTORY) {
        const t = e.changedTouches[0];
        this._handleClick(t.clientX, t.clientY);
      }
    });
  }

  _handleClick(cx, cy) {
    if (this.state === STATE.SELECT) {
      const s = this.selectState;
      // Botones de numero de jugadores
      s.playerBtnBounds.forEach((b, i) => {
        if (cx>=b.x && cx<=b.x+b.w && cy>=b.y && cy<=b.y+b.h) {
          s.playerCount = i+1;
        }
      });
      // Botones de clase por jugador
      if (s.classBtnBounds) {
        s.classBtnBounds.forEach((playerBtns, pi) => {
          if (pi >= s.playerCount) return;
          playerBtns.forEach(b => {
            if (cx>=b.x && cx<=b.x+b.w && cy>=b.y && cy<=b.y+b.h) {
              s.selectedClasses[pi] = b.className;
            }
          });
        });
      }
      // Boton Jugar
      const pb = s.playBtnBounds;
      if (pb && cx>=pb.x && cx<=pb.x+pb.w && cy>=pb.y && cy<=pb.y+pb.h) {
        this._startGame();
      }
    }
    if ((this.state === STATE.GAME_OVER || this.state === STATE.VICTORY) && this._leaderboardBtns) {
      const rb = this._leaderboardBtns.restartBtn;
      if (rb && cx>=rb.x && cx<=rb.x+rb.w && cy>=rb.y && cy<=rb.y+rb.h) {
        this._reset();
      }
    }
  }

  // ─────────────────────────────────────
  // START / RESET
  // ─────────────────────────────────────
  _startGame() {
    const n = this.selectState.playerCount;
    this.particles = new ParticleSystem();
    this.map       = new GameMap();
    this.base      = new Base();
    this.wm        = new WaveManager(this.map, this.particles);

    // Destruir pads anteriores si los hay
    this.pads.forEach(p => p.destroy());
    this.pads = [];
    // Limpiar overlay
    document.getElementById('controlsOverlay').innerHTML = '';

    // Posiciones iniciales de jugadores (en circulo alrededor de la base)
    const cx = this.base.x, cy = this.base.y;
    this.players = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const r = 110;
      const px = cx + Math.cos(angle)*r;
      const py = cy + Math.sin(angle)*r;
      const className = this.selectState.selectedClasses[i];
      const player = createPlayer(className, px, py, i, this.particles);
      this.players.push(player);

      const pad = new VirtualPad(i, CLASSES[className], () => {});
      this.pads.push(pad);
    }

    this.state = STATE.PLAYING;
    this.endStats = null;
    this._leaderboardBtns = null;
  }

  _reset() {
    this.pads.forEach(p => p.destroy());
    this.pads = [];
    document.getElementById('controlsOverlay').innerHTML = '';
    this.state = STATE.SELECT;
    this.scores = [];
  }

  // ─────────────────────────────────────
  // GAME LOOP
  // ─────────────────────────────────────
  _loop(ts) {
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05); // cap a 50ms
    this.lastTs = ts;
    this.time  += dt;

    this._update(dt);
    this._render();

    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    if (this.state !== STATE.PLAYING) return;

    const { players, wm, base, particles } = this;

    // ── Procesar input de cada pad ──────────────────────────
    this.pads.forEach((pad, pi) => {
      const player = players[pi];
      if (!player || !player.alive) { pad.update(dt); return; }

      const inp = pad.input;

      // 1) LEER habilidades ANTES de update() (que limpia flags)
      inp.abilityJustPressed.forEach((pressed, i) => {
        if (pressed && pad.cooldowns[i] <= 0 && !player.isCasting) {
          // Inicia el canal (castTime) y luego dispara la habilidad
          player.startCast(i, wm.enemies, players, base, this.time);
          pad.startCooldown(i);
          // Efecto visual inmediato al iniciar el canal
          const col = player.classData.color;
          const ab  = player.classData.abilities[i];
          particles.shockwaves.push({ x:player.x, y:player.y, r:8, maxR:50,
            alpha:0.8, color:col, speed:260 });
          this._floatingTexts.push({
            text: ab.icon + ' ' + ab.name,
            x: player.x, y: player.y - player.radius - 24,
            color: col, life: Math.max(1.0, ab.castTime + 0.3), maxLife: Math.max(1.0, ab.castTime + 0.3),
            vy: -0.5,
          });
        }
      });

      // 2) Actualizar cooldowns y limpiar flags
      pad.update(dt);

      // 3) Movimiento
      player.move(inp.dx, inp.dy, dt);

      // 4) Ataque manual (boton ataque)
      if (inp.attack) player.autoAttack(wm.enemies, dt);
    });

    // ── Actualizar jugadores (update/projectiles/effects) ──
    players.forEach(p => {
      if (!p.alive) return;
      // auto-attack pasivo si hay enemigos cerca y no se esta moviendo con boton
      p.autoAttack(wm.enemies, dt);
      p.update(dt, wm.enemies, players, base, this.time);
    });

    // ── Wave manager ────────────────────────────────────────
    wm.tick(dt, players, base);

    // ── Partículas y textos flotantes ──────────────────────
    particles.update(dt);
    this._floatingTexts = this._floatingTexts.filter(ft => {
      ft.life -= dt;
      ft.y    += ft.vy;
      return ft.life > 0;
    });

    // ── Game Over / Victoria ─────────────────────────────── 
    if (!base.alive) this._endGame(false);
    if (wm.allWavesDone && wm.enemies.every(e => !e.alive)) this._endGame(true);

    // ── Base ────────────────────────────────────────────────
    base.update(dt);
  }

  async _endGame(victory) {
    this.state = victory ? STATE.VICTORY : STATE.GAME_OVER;
    // Destruir pads
    this.pads.forEach(p => p.destroy());
    this.pads = [];
    document.getElementById('controlsOverlay').innerHTML = '';

    const stats = {
      playerCount:   this.selectState.playerCount,
      wavesSurvived: this.wm.wavesCleared,
      totalWaves:    this.wm.totalWaves,
      totalKills:    this.wm.totalKills,
      victory,
    };
    this.endStats = stats;

    // Guardar puntaje en API
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_count:   stats.playerCount,
          waves_survived: stats.wavesSurvived,
          total_kills:    stats.totalKills,
          victory:        stats.victory,
        })
      });
    } catch(_) {}

    // Cargar leaderboard
    try {
      const r = await fetch('/api/scores');
      const data = await r.json();
      this.scores = data.scores || [];
    } catch(_) {
      this.scores = [];
    }
  }

  // ─────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────
  _render() {
    const { ctx, W, H, time } = this;
    ctx.clearRect(0, 0, W, H);

    if (this.state === STATE.SELECT) {
      drawCharacterSelect(ctx, W, H, this.selectState, time);
      return;
    }

    // === JUGANDO ===
    if (this.state === STATE.PLAYING || this.state === STATE.GAME_OVER || this.state === STATE.VICTORY) {
      // Escalar el mundo del juego al canvas
      const scaleX = W / GAME_W;
      const scaleY = H / GAME_H;
      const scale  = Math.min(scaleX, scaleY);
      const offX   = (W - GAME_W*scale) / 2;
      const offY   = (H - GAME_H*scale) / 2;

      ctx.save();
      ctx.translate(offX, offY);
      ctx.scale(scale, scale);

      // Dibujar mapa
      this.map.draw(ctx);

      // Dibujar base
      this.base.draw(ctx, time);

      // Dibujar jugadores
      this.players.forEach(p => p.draw(ctx, time));

      // Dibujar enemigos
      this.wm.drawEnemies(ctx, time);

      // Partículas
      this.particles.draw(ctx);

      // Textos flotantes de habilidades
      ctx.save();
      for (const ft of this._floatingTexts) {
        const alpha = ft.life / ft.maxLife;
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.round(12 / scale)}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      ctx.restore();

      // HUD (encima, sin escalar)
      drawHUD(ctx, W, H, this.players, this.wm, this.base);
    }

    if (this.state === STATE.GAME_OVER) {
      drawGameOver(ctx, W, H, this.endStats, time);
      this._leaderboardBtns = drawLeaderboard(ctx, W, H, this.scores);
    }

    if (this.state === STATE.VICTORY) {
      drawVictory(ctx, W, H, this.endStats, time);
      this._leaderboardBtns = drawLeaderboard(ctx, W, H, this.scores);
    }
  }
}

// ─────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
