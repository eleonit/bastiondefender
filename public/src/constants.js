// ============================================================
// CONSTANTS.JS — Todos los datos del juego Bastion Defenders
// ============================================================

export const GAME_W = 1280;
export const GAME_H = 720;
export const TILE   = 40;
export const MAP_COLS = Math.floor(GAME_W / TILE); // 32
export const MAP_ROWS = Math.floor(GAME_H / TILE); // 18

// Coordenada del portal base (centro del mapa)
export const BASE_X = Math.floor(MAP_COLS / 2) * TILE;
export const BASE_Y = Math.floor(MAP_ROWS / 2) * TILE;

// ─────────────────────────────────────
// CLASES DE PERSONAJE
// ─────────────────────────────────────
export const CLASSES = {
  Caballero: {
    icon: '⚔️', color: '#4488ff', borderColor: '#88bbff',
    hp: 220, speed: 2.4, atk: 28, range: 55, atkRate: 1.0, radius: 14,
    description: 'Tanque resistente, pelea cuerpo a cuerpo',
    abilities: [
      { name: 'Tajo de Espada',   icon: '⚔️',  cd: 3,  description: 'Golpe amplio que daña a todos en frente' },
      { name: 'Golpe de Escudo',  icon: '🛡️',  cd: 5,  description: 'Aturde enemigos cercanos 1.5s' },
      { name: 'Grito de Guerra',  icon: '📯',  cd: 12, description: 'Aumenta velocidad de ataque aliados 5s' },
      { name: 'Torbellino',       icon: '🌪️',  cd: 8,  description: 'Gira y daña todo alrededor 2s' },
    ],
  },
  Arquero: {
    icon: '🏹', color: '#44cc44', borderColor: '#88ff88',
    hp: 130, speed: 3.5, atk: 20, range: 270, atkRate: 0.7, radius: 12,
    description: 'Ataca desde lejos con flechas rapidas',
    abilities: [
      { name: 'Multiflechas',      icon: '🏹',  cd: 4,  description: 'Dispara 3 flechas en abanico' },
      { name: 'Flecha Perforadora', icon: '➡️',  cd: 6,  description: 'Flecha que atraviesa todos los enemigos en linea' },
      { name: 'Lluvia de Flechas', icon: '🌧️',  cd: 10, description: 'Bombardeo de flechas en area' },
      { name: 'Ojo de Aguila',     icon: '🦅',  cd: 15, description: 'Aumenta rango y dano masivamente 4s' },
    ],
  },
  Mago: {
    icon: '🔮', color: '#cc44ff', borderColor: '#ee88ff',
    hp: 110, speed: 3.0, atk: 35, range: 220, atkRate: 1.4, radius: 12,
    description: 'Magia elemental de area, alta magia',
    abilities: [
      { name: 'Bola de Fuego',    icon: '🔥',  cd: 4,  description: 'Proyectil explosivo con dano en area' },
      { name: 'Muro de Hielo',    icon: '❄️',  cd: 8,  description: 'Crea barrera que ralentiza enemigos' },
      { name: 'Cadena Electrica', icon: '⚡',  cd: 6,  description: 'Rayo encadenado entre 5 enemigos' },
      { name: 'Meteoro',          icon: '☄️',  cd: 18, description: 'Gran explosion retardada en area' },
    ],
  },
  Asesino: {
    icon: '🗡️', color: '#ff4488', borderColor: '#ff88bb',
    hp: 155, speed: 5.0, atk: 45, range: 80, atkRate: 0.5, radius: 11,
    description: 'Velocidad extrema y golpes criticos',
    abilities: [
      { name: 'Apunalada',        icon: '🗡️',  cd: 3,  description: 'Dano critico masivo al enemigo mas cercano' },
      { name: 'Bomba de Humo',    icon: '💨',  cd: 7,  description: 'Nube que ralentiza y ciega en area' },
      { name: 'Clon Oscuro',      icon: '👤',  cd: 12, description: 'Senuelo que atrae enemigos 3s' },
      { name: 'Tormenta de Dagas', icon: '✨', cd: 9,  description: 'Dagas en todas direcciones' },
    ],
  },
  Brujo: {
    icon: '📖', color: '#ff8800', borderColor: '#ffbb44',
    hp: 125, speed: 2.8, atk: 25, range: 190, atkRate: 1.8, radius: 12,
    description: 'Maldiciones, invocaciones y magia oscura',
    abilities: [
      { name: 'Maldicion',      icon: '💀',  cd: 4,  description: 'Reduce dano y velocidad del enemigo' },
      { name: 'Invocar Imp',    icon: '👺',  cd: 10, description: 'Convoca mascota que ataca enemigos' },
      { name: 'Pacto Oscuro',   icon: '🌑',  cd: 14, description: 'Sacrifica HP para explosion en area' },
      { name: 'Grieta del Vacio', icon: '🌀', cd: 20, description: 'Portal que absorbe enemigos cercanos' },
    ],
  },
};

export const CLASS_NAMES = Object.keys(CLASSES);

// ─────────────────────────────────────
// TIPOS DE ENEMIGOS
// ─────────────────────────────────────
export const ENEMY_TYPES = {
  OrcGrunt: {
    name: 'Orco Soldado', icon: '👹',
    color: '#558833', borderColor: '#88bb44',
    hp: 80, speed: 1.2, atk: 10, atkRate: 1.0, radius: 14,
    reward: 10, xp: 5,
  },
  OrcShaman: {
    name: 'Orco Chaman', icon: '🧙',
    color: '#885533', borderColor: '#bbaa44',
    hp: 55, speed: 1.0, atk: 15, atkRate: 2.0, radius: 12,
    reward: 18, xp: 10, ranged: true, projectileRange: 200,
  },
  OrcBerserker: {
    name: 'Berserker', icon: '😤',
    color: '#aa2222', borderColor: '#ff5555',
    hp: 60, speed: 2.8, atk: 18, atkRate: 0.6, radius: 13,
    reward: 20, xp: 12,
  },
  Harpy: {
    name: 'Arpia', icon: '🦅',
    color: '#6644aa', borderColor: '#9966cc',
    hp: 45, speed: 2.2, atk: 12, atkRate: 1.2, radius: 11,
    reward: 22, xp: 14, flying: true,
  },
  Cyclops: {
    name: 'Ciclope', icon: '👁️',
    color: '#225588', borderColor: '#4488cc',
    hp: 500, speed: 0.9, atk: 40, atkRate: 2.0, radius: 28,
    reward: 150, xp: 80, boss: true,
  },
  Minotaur: {
    name: 'Minotauro', icon: '🐂',
    color: '#772222', borderColor: '#cc4444',
    hp: 350, speed: 1.4, atk: 30, atkRate: 1.5, radius: 22,
    reward: 100, xp: 60, miniBoss: true,
  },
  MiNotaurKing: {
    name: 'Rey Minotauro', icon: '👑',
    color: '#440000', borderColor: '#ff0000',
    hp: 1800, speed: 1.1, atk: 55, atkRate: 1.8, radius: 36,
    reward: 500, xp: 300, boss: true, finalBoss: true,
  },
};

// ─────────────────────────────────────
// OLEADAS (20 oleadas)
// ─────────────────────────────────────
export const WAVES = [
  /* 1 */ [{ type:'OrcGrunt', count:6, interval:1.8 }],
  /* 2 */ [{ type:'OrcGrunt', count:9, interval:1.5 }],
  /* 3 */ [{ type:'OrcGrunt', count:8, interval:1.4 }, { type:'OrcShaman', count:2, interval:4 }],
  /* 4 */ [{ type:'OrcGrunt', count:10, interval:1.3 }, { type:'OrcShaman', count:4, interval:3 }],
  /* 5 */ [{ type:'OrcGrunt', count:8, interval:1.2 }, { type:'OrcBerserker', count:4, interval:2.5 }],
  /* 6 */ [{ type:'OrcBerserker', count:8, interval:1.8 }, { type:'OrcShaman', count:5, interval:3 }],
  /* 7 */ [{ type:'OrcGrunt', count:12, interval:1.0 }, { type:'OrcBerserker', count:6, interval:2 }, { type:'Harpy', count:3, interval:3 }],
  /* 8 */ [{ type:'Harpy', count:8, interval:1.5 }, { type:'OrcShaman', count:6, interval:2.5 }],
  /* 9 */ [{ type:'OrcGrunt', count:14, interval:0.9 }, { type:'OrcBerserker', count:8, interval:1.8 }, { type:'Harpy', count:5, interval:2 }],
  /* 10 — JEFE */ [{ type:'OrcGrunt', count:6, interval:1.5 }, { type:'Cyclops', count:1, interval:999 }],
  /* 11 */ [{ type:'OrcBerserker', count:10, interval:1.2 }, { type:'OrcShaman', count:6, interval:2 }],
  /* 12 */ [{ type:'OrcGrunt', count:16, interval:0.8 }, { type:'Harpy', count:8, interval:1.5 }, { type:'Minotaur', count:1, interval:999 }],
  /* 13 */ [{ type:'OrcBerserker', count:12, interval:1.0 }, { type:'Minotaur', count:2, interval:8 }],
  /* 14 */ [{ type:'OrcShaman', count:10, interval:1.5 }, { type:'Harpy', count:10, interval:1.2 }, { type:'Minotaur', count:1, interval:999 }],
  /* 15 */ [{ type:'OrcGrunt', count:18, interval:0.7 }, { type:'OrcBerserker', count:10, interval:1.0 }, { type:'Cyclops', count:1, interval:999 }],
  /* 16 */ [{ type:'Minotaur', count:4, interval:5 }, { type:'OrcShaman', count:10, interval:2 }],
  /* 17 */ [{ type:'OrcBerserker', count:16, interval:0.8 }, { type:'Harpy', count:12, interval:1.0 }, { type:'Minotaur', count:2, interval:10 }],
  /* 18 */ [{ type:'OrcGrunt', count:20, interval:0.6 }, { type:'OrcBerserker', count:14, interval:0.9 }, { type:'Cyclops', count:2, interval:12 }],
  /* 19 */ [{ type:'OrcGrunt', count:20, interval:0.6 }, { type:'Harpy', count:15, interval:0.8 }, { type:'Minotaur', count:4, interval:5 }],
  /* 20 — JEFE FINAL */ [{ type:'OrcGrunt', count:10, interval:0.8 }, { type:'OrcBerserker', count:8, interval:1.0 }, { type:'MiNotaurKing', count:1, interval:999 }],
];

// Spawn points (borde del mapa, coordenadas en pixeles)
export function getSpawnPoints() {
  return [
    { x: 0,         y: GAME_H / 2 },  // izquierda
    { x: GAME_W,    y: GAME_H / 2 },  // derecha
    { x: GAME_W/2,  y: 0 },           // arriba
    { x: GAME_W/2,  y: GAME_H },      // abajo
    { x: 0,         y: GAME_H * 0.25 },
    { x: GAME_W,    y: GAME_H * 0.75 },
  ];
}

// ─────────────────────────────────────
// CONFIGURACION DE JUEGO
// ─────────────────────────────────────
export const CONFIG = {
  WAVE_REST_TIME: 10,        // segundos entre oleadas
  BASE_HP: 1000,
  REGEN_BETWEEN_WAVES: 0.10, // 10% de vida regenerada entre oleadas
  GOLD_PER_KILL: 0,          // (para futura expansion de upgrades)
  MAX_PLAYERS: 6,
};

// Posiciones del panel de control por jugador (porcentaje de pantalla)
export const PAD_POSITIONS = [
  { corner: 'bottom-left',   bottom: 8, left: 8   },
  { corner: 'bottom-right',  bottom: 8, right: 8  },
  { corner: 'top-left',      top: 8,    left: 8   },
  { corner: 'top-right',     top: 8,    right: 8  },
  { corner: 'middle-left',   top: '42%', left: 8  },
  { corner: 'middle-right',  top: '42%', right: 8 },
];

// Colores de jugadores
export const PLAYER_COLORS = ['#4488ff','#ff4444','#44cc44','#bb44ff','#ff8800','#22ccdd'];
