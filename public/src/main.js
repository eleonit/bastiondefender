// ============================================================
// MAIN.JS — Game loop, state machine, wiring
// ============================================================
import { GAME_W, GAME_H, CLASSES, CLASS_NAMES, CONFIG } from './constants.js';
import { VirtualPad }      from './input.js';
import { GameMap, Base }   from './world.js';
import { ParticleSystem, WaveManager } from './systems.js';
import { createPlayer }    from './entities.js';
import { drawCharacterSelect, drawHUD, drawGameOver, drawVictory, drawLeaderboard, drawRemotePlayers } from './ui.js';

// ─────────────────────────────────────
// STATE
// ─────────────────────────────────────
const STATE = { LOGIN: 'login', SELECT: 'select', PLAYING: 'playing', GAME_OVER: 'game_over', VICTORY: 'victory' };

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this.state  = STATE.LOGIN;
    this.time   = 0;
    this.lastTs = 0;

    // Socket.io initialization
    this.socket = null;
    this.localPlayerId = null;
    this.remotePlayers = {}; // { id: { name, x, y, className, color, ... } }
    this.nickname = '';

    // Character select state
    this.selectState = {
      playerCount: 1, // En multiplayer local es 1 por dispositivo
      selectedClasses: ['Caballero'],
      playBtnBounds: null,
      playerBtnBounds: [],
      classBtnBounds: [],
    };

    // Game objects
    this.map      = null;
    this.base     = null;
    this.particles= null;
    this.wm       = null;
    this.players  = []; // Solamente contiene al jugador LOCAL [0]
    this.pads     = [];
    this.endStats = null;
    this.scores   = [];
    this._leaderboardBtns = null;
    this._floatingTexts = [];

    this._resize();
    this._bindEvents();
    this._initLogin();
    this._loop(0);
  }

  _initLogin() {
    const loginScreen = document.getElementById('loginScreen');
    const nicknameInput = document.getElementById('nicknameInput');
    const joinBtn = document.getElementById('joinBtn');
    const connectionInfo = document.getElementById('connectionInfo');

    // Mostrar IP solo si se detecta (opcional, el backend ya la imprime)
    connectionInfo.textContent = `Conéctate a la misma red para jugar con amigos`;

    const attemptJoin = () => {
      const name = nicknameInput.value.trim();
      if (!name) return;
      
      this.nickname = name;
      this.socket = io();
      
      this.socket.on('connect', () => {
        console.log('✅ Conectado al servidor con ID:', this.socket.id);
        this.localPlayerId = this.socket.id;
        
        this.socket.emit('joinGame', { name: this.nickname });
        
        loginScreen.classList.add('hidden');
        setTimeout(() => loginScreen.remove(), 500);
        this.state = STATE.SELECT;
      });

      this._setupSocketListeners();
    };

    joinBtn.addEventListener('click', attemptJoin);
    nicknameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') attemptJoin();
    });
  }

  _setupSocketListeners() {
    this.socket.on('currentPlayers', (players) => {
      Object.keys(players).forEach(id => {
        if (id !== this.localPlayerId) {
          this.remotePlayers[id] = players[id];
        }
      });
    });

    this.socket.on('newPlayer', (playerInfo) => {
      this.remotePlayers[playerInfo.id] = playerInfo;
      console.log('👋 Nuevo jugador:', playerInfo.name);
    });

    this.socket.on('playerMoved', (playerInfo) => {
      if (this.remotePlayers[playerInfo.id]) {
        this.remotePlayers[playerInfo.id].x = playerInfo.x;
        this.remotePlayers[playerInfo.id].y = playerInfo.y;
      }
    });

    this.socket.on('playerActionPerformed', (actionData) => {
      // Manejar visuales de ataques de otros jugadores
      console.log('Action from', actionData.playerId, actionData);
    });

    this.socket.on('playerDisconnected', (id) => {
      delete this.remotePlayers[id];
      console.log('🏃 Jugador salió:', id);
    });
  }

  // ─────────────────────────────────────
  // RESIZE
  // ─────────────────────────────────────
  _resize() {
    const W = window.innerWidth, H = window.innerHeight;
    this.canvas.width  = W;
    this.canvas.height = H;
    this.W = W; this.H = H;
    if (this.pads.length) this.pads.forEach(p => p.recalcJoyCenter());
  }

  // ─────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────
  _bindEvents() {
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(()=>this._resize(), 200));

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
      // Botones de clase (fijo a 1 jugador por dispositivo ahora)
      if (s.classBtnBounds && s.classBtnBounds[0]) {
        s.classBtnBounds[0].forEach(b => {
          if (cx>=b.x && cx<=b.x+b.w && cy>=b.y && cy<=b.y+b.h) {
            s.selectedClasses[0] = b.className;
          }
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
    this.particles = new ParticleSystem();
    this.map       = new GameMap();
    this.base      = new Base();
    this.wm        = new WaveManager(this.map, this.particles);

    this.pads.forEach(p => p.destroy());
    this.pads = [];
    document.getElementById('controlsOverlay').innerHTML = '';

    const cx = this.base.x, cy = this.base.y;
    this.players = [];
    
    // Solo un jugador local
    const className = this.selectState.selectedClasses[0];
    const player = createPlayer(className, cx, cy, 0, this.particles);
    player.name = this.nickname;
    this.players.push(player);

    const pad = new VirtualPad(0, CLASSES[className], () => {});
    this.pads.push(pad);

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
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
    this.lastTs = ts;
    this.time  += dt;

    this._update(dt);
    this._render();

    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    if (this.state !== STATE.PLAYING) return;

    const { players, wm, base, particles } = this;
    const player = players[0];
    const pad = this.pads[0];

    if (player && pad) {
      if (player.alive) {
        const inp = pad.input;

        // Movimiento
        const oldX = player.x, oldY = player.y;
        player.move(inp.dx, inp.dy, dt);
        
        // Sync movimiento si cambió
        if (oldX !== player.x || oldY !== player.y) {
          this.socket.emit('playerMovement', { x: player.x, y: player.y });
        }

        // Habilidades
        inp.abilityJustPressed.forEach((pressed, i) => {
          if (pressed && pad.cooldowns[i] <= 0 && !player.isCasting) {
            player.startCast(i, wm.enemies, players, base, this.time);
            pad.startCooldown(i);
            
            this.socket.emit('playerAction', { type: 'ability', index: i });

            const col = player.classData.color;
            const ab  = player.classData.abilities[i];
            particles.shockwaves.push({ x:player.x, y:player.y, r:8, maxR:50, alpha:0.8, color:col, speed:260 });
            this._floatingTexts.push({
              text: ab.icon + ' ' + ab.name,
              x: player.x, y: player.y - player.radius - 24,
              color: col, life: Math.max(1.0, ab.castTime + 0.3), maxLife: Math.max(1.0, ab.castTime + 0.3),
              vy: -0.5,
            });
          }
        });

        if (inp.attack) player.autoAttack(wm.enemies, dt);
      }
      pad.update(dt);
    }

    players.forEach(p => {
      if (!p.alive) return;
      p.autoAttack(wm.enemies, dt);
      p.update(dt, wm.enemies, players, base, this.time);
    });

    wm.tick(dt, players, base);
    particles.update(dt);
    
    this._floatingTexts = this._floatingTexts.filter(ft => {
      ft.life -= dt;
      ft.y    += ft.vy;
      return ft.life > 0;
    });

    if (!base.alive) this._endGame(false);
    if (wm.allWavesDone && wm.enemies.every(e => !e.alive)) this._endGame(true);
    base.update(dt);
  }

  async _endGame(victory) {
    this.state = victory ? STATE.VICTORY : STATE.GAME_OVER;
    this.pads.forEach(p => p.destroy());
    this.pads = [];
    document.getElementById('controlsOverlay').innerHTML = '';

    const stats = {
      playerCount:   1 + Object.keys(this.remotePlayers).length,
      wavesSurvived: this.wm.wavesCleared,
      totalWaves:    this.wm.totalWaves,
      totalKills:    this.wm.totalKills,
      victory,
    };
    this.endStats = stats;

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

    try {
      const r = await fetch('/api/scores');
      const data = await r.json();
      this.scores = data.scores || [];
    } catch(_) {
      this.scores = [];
    }
  }

  _render() {
    const { ctx, W, H, time } = this;
    ctx.clearRect(0, 0, W, H);

    if (this.state === STATE.LOGIN) return; // Se renderiza por HTML/CSS

    if (this.state === STATE.SELECT) {
      drawCharacterSelect(ctx, W, H, this.selectState, time);
      return;
    }

    if (this.state === STATE.PLAYING || this.state === STATE.GAME_OVER || this.state === STATE.VICTORY) {
      const scaleX = W / GAME_W;
      const scaleY = H / GAME_H;
      const scale  = Math.min(scaleX, scaleY);
      const offX   = (W - GAME_W*scale) / 2;
      const offY   = (H - GAME_H*scale) / 2;

      ctx.save();
      ctx.translate(offX, offY);
      ctx.scale(scale, scale);

      this.map.draw(ctx);
      this.base.draw(ctx, time);
      
      // Dibujar jugadores remotos
      drawRemotePlayers(ctx, this.remotePlayers, time);
      
      // Jugador local
      this.players.forEach(p => p.draw(ctx, time));

      this.wm.drawEnemies(ctx, time);
      this.particles.draw(ctx);

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

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
