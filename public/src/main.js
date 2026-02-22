// ============================================================
// MAIN.JS — Game loop, state machine, wiring
// ============================================================
import { GAME_W, GAME_H, CLASSES, CLASS_NAMES, CONFIG } from './constants.js';
import { VirtualPad }      from './input.js';
import { GameMap, Base }   from './world.js';
import { ParticleSystem, WaveManager } from './systems.js';
import { createPlayer }    from './entities.js';
import { drawCharacterSelect, drawHUD, drawGameOver, drawVictory, drawLeaderboard, drawRemotePlayers, drawStatsPanel } from './ui.js';

// ─────────────────────────────────────
// STATE
// ─────────────────────────────────────
const STATE = { LOGIN: 'login', SELECT: 'select', PLAYING: 'playing', GAME_OVER: 'game_over', VICTORY: 'victory' };

class Game {
    this.waitingRoomVisible = false;
    this.isHost = false;
    this.waitingPlayers = [];
    this.maxPlayers = 6;
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
    this.uiState = {
      showStats: false,
      hudButtons: null,
      statButtons: [],
      closeStatsBtn: null
    };

    this._resize();
    this._bindEvents();
    this._initLogin();
    this._loop(0);
  }

  _initLogin() {
      const waitingRoomScreen = document.getElementById('waitingRoomScreen');
      const waitingPlayersList = document.getElementById('waitingPlayersList');
      const startGameBtn = document.getElementById('startGameBtn');
      const waitingInfo = document.getElementById('waitingInfo');
    const loginScreen = document.getElementById('loginScreen');
    const nicknameInput = document.getElementById('nicknameInput');
    const joinBtn = document.getElementById('joinBtn');
    const connectionInfo = document.getElementById('connectionInfo');

    // Mostrar IP solo si se detecta (opcional, el backend ya la imprime)
    connectionInfo.textContent = `Conéctate a la misma red para jugar con amigos`;

    const attemptJoin = () => {
            this.nickname = name;
            this.socket = io();
            this.socket.on('connect', () => {
              console.log('✅ Conectado al servidor con ID:', this.socket.id);
              this.localPlayerId = this.socket.id;
              this.socket.emit('joinGame', { name: this.nickname });
              loginScreen.classList.add('hidden');
              setTimeout(() => loginScreen.remove(), 500);
              waitingRoomScreen.classList.remove('hidden');
              this.state = 'waiting_room';
            });
            this._setupSocketListeners();
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
          this.waitingPlayers = Object.values(players);
          this.isHost = this.waitingPlayers.length > 0 && this.waitingPlayers[0].id === this.localPlayerId;
          this._updateWaitingRoomUI();
        });
        this.socket.on('newPlayer', (playerInfo) => {
          this.remotePlayers[playerInfo.id] = playerInfo;
          this.waitingPlayers.push(playerInfo);
          this._updateWaitingRoomUI();
          console.log('👋 Nuevo jugador:', playerInfo.name);
        });
        this.socket.on('playerDisconnected', (id) => {
          delete this.remotePlayers[id];
          this.waitingPlayers = this.waitingPlayers.filter(p => p.id !== id);
          this._updateWaitingRoomUI();
          console.log('🏃 Jugador salió:', id);
        });
        this.socket.on('startGame', () => {
          waitingRoomScreen.classList.add('hidden');
          this.state = STATE.SELECT;
        });
      }
      _updateWaitingRoomUI() {
        const waitingRoomScreen = document.getElementById('waitingRoomScreen');
        const waitingPlayersList = document.getElementById('waitingPlayersList');
        const startGameBtn = document.getElementById('startGameBtn');
        const waitingInfo = document.getElementById('waitingInfo');
        if (this.state !== 'waiting_room') return;
        waitingRoomScreen.classList.remove('hidden');
        waitingPlayersList.innerHTML = this.waitingPlayers.map(p => `<div>${p.name}</div>`).join('');
        waitingInfo.textContent = `Jugadores conectados: ${this.waitingPlayers.length} / ${this.maxPlayers}`;
        if (this.isHost && this.waitingPlayers.length >= 2 && this.waitingPlayers.length <= this.maxPlayers) {
          startGameBtn.classList.remove('hidden');
        } else {
          startGameBtn.classList.add('hidden');
        }
        startGameBtn.onclick = () => {
          this.socket.emit('startGame');
        };
      }
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
        if (playerInfo.level) this.remotePlayers[playerInfo.id].level = playerInfo.level;
        if (playerInfo.statsInvested) this.remotePlayers[playerInfo.id].statsInvested = playerInfo.statsInvested;
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
      // Permitir clics táctiles en todos los estados (importante para HUD en PLAYING)
      const t = e.changedTouches[0];
      this._handleClick(t.clientX, t.clientY);
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
    
    // Controles durante el juego
    if (this.state === STATE.PLAYING) {
      const u = this.uiState;
      const player = this.players[0];

      // Botones HUD
      if (u.hudButtons) {
        const hb = u.hudButtons.stats;
        if (cx >= hb.x && cx <= hb.x + hb.w && cy >= hb.y && cy <= hb.y + hb.h) {
          u.showStats = !u.showStats;
          document.getElementById('controlsOverlay').style.display = u.showStats ? 'none' : 'block';
          return;
        }
        const qb = u.hudButtons.quit;
        if (cx >= qb.x && cx <= qb.x + qb.w && cy >= qb.y && cy <= qb.y + qb.h) {
          if (confirm('¿Estás seguro de que quieres salir de la partida?')) {
            this._reset();
          }
          return;
        }
      }

      // Panel de Stats
      if (u.showStats) {
        // Asignar puntos
        u.statButtons.forEach(b => {
          if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
            player.allocateStat(b.type);
          }
        });
        // Boton Cerrar
        const cb = u.closeStatsBtn;
        if (cb && cx >= cb.x && cx <= cb.x + cb.w && cy >= cb.y && cy <= cb.y + cb.h) {
          u.showStats = false;
          document.getElementById('controlsOverlay').style.display = 'block';
        }
        return; // Bloquear otros clics si el panel está abierto
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
    this.uiState.showStats = false;
    
    // Si estamos conectados, notificar salida
    if (this.socket) {
      this.socket.emit('playerLeave');
    }
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

    // No permitir acciones del jugador si el panel de stats está abierto
    if (!this.uiState.showStats) {
      if (player && pad) {
        if (player.alive) {
          const inp = pad.input;

          // Movimiento
          const oldX = player.x, oldY = player.y;
          player.move(inp.dx, inp.dy, dt);
          
          // Sync movimiento si cambió (ahora incluye nivel y stats)
          if (oldX !== player.x || oldY !== player.y) {
            this.socket.emit('playerMovement', { 
              x: player.x, 
              y: player.y, 
              level: player.level,
              statsInvested: player.statsInvested
            });
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
        pad.update(dt, player.level);
      }
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

    const remoteNames = Object.values(this.remotePlayers).map(p => p.name);
    const allNames = [this.nickname, ...remoteNames].filter(Boolean).join(', ');
    
    const localLevel = this.players[0] ? this.players[0].level : 1;
    const remoteLevels = Object.values(this.remotePlayers).map(p => p.level || 1);
    const allLevels = [localLevel, ...remoteLevels].join(', ');

    const localStats = this.players[0]?.statsInvested ? 
      `A:${this.players[0].statsInvested.atk},H:${this.players[0].statsInvested.hp},S:${this.players[0].statsInvested.speed}` : '';
    const remoteStatsArr = Object.values(this.remotePlayers).map(p => 
      p.statsInvested ? `A:${p.statsInvested.atk},H:${p.statsInvested.hp},S:${p.statsInvested.speed}` : '?'
    );
    const allStatsStr = [localStats, ...remoteStatsArr].filter(Boolean).join(' | ');

    const stats = {
      playerCount:   1 + Object.keys(this.remotePlayers).length,
      playerNames:   allNames,
      playerLevels:  allLevels,
      playerStats:   allStatsStr,
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
          player_names:   stats.playerNames,
          player_levels:  stats.playerLevels,
          player_stats:   stats.playerStats,
          waves_survived: stats.wavesSurvived,
          total_kills:    stats.total_kills,
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
    ctx.fillStyle = '#1a2e1a'; // Match background color
    ctx.fillRect(0, 0, W, H);

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

      drawHUD(ctx, W, H, this.players, this.wm, this.base, this.players[0], this.uiState);
      if (this.uiState.showStats) {
        drawStatsPanel(ctx, W, H, this.players[0], this.uiState);
      }
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
