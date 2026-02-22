// ============================================================
// UI.JS — CharacterSelect, HUD, GameOver/Victory, Leaderboard
// ============================================================
import { CLASSES, CLASS_NAMES, CONFIG, PLAYER_COLORS } from './constants.js';

// ─────────────────────────────────────
// CHARACTER SELECT SCREEN
// ─────────────────────────────────────
export function drawCharacterSelect(ctx, W, H, selectState, time) {
  // ── Fondo ──
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0d0d2a');
  grad.addColorStop(1, '#1a0d2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const selectedName  = selectState.selectedClasses[0];
  const selectedClass = CLASSES[selectedName];
  const selColor      = selectedClass.color;

  // ── Título ──
  ctx.save();
  ctx.font = `bold ${Math.round(W * 0.032)}px 'Press Start 2P', monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 18;
  ctx.fillText('⚔️  EL ULTIMO LEON  🛡️', W / 2, H * 0.09);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.save();
  ctx.font = `${Math.round(W * 0.014)}px 'Exo 2', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7777aa';
  ctx.fillText('ELIGE TU PERSONAJE', W / 2, H * 0.155);
  ctx.restore();

  // ── Tarjetas de clase (fila horizontal) ──
  const cardCount = CLASS_NAMES.length;
  const cardW     = Math.min(W * 0.14, H * 0.30);
  const cardH     = cardW * 1.15;
  const totalCardsW = cardCount * cardW;
  const cardGap   = (W - totalCardsW) / (cardCount + 1);
  const cardY     = H * 0.185;

  selectState.classBtnBounds    = [];
  selectState.classBtnBounds[0] = [];
  selectState.playerBtnBounds   = [];

  CLASS_NAMES.forEach((name, ci) => {
    const cls       = CLASSES[name];
    const cx        = cardGap + ci * (cardW + cardGap);
    const isSelected = (selectedName === name);

    ctx.save();
    if (isSelected) {
      ctx.fillStyle   = cls.color + '44';
      ctx.strokeStyle = cls.color;
      ctx.lineWidth   = 3;
      ctx.shadowColor = cls.color;
      ctx.shadowBlur  = 18;
    } else {
      ctx.fillStyle   = '#111128';
      ctx.strokeStyle = '#2a2a55';
      ctx.lineWidth   = 1;
    }
    _roundRect(ctx, cx, cardY, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Icono
    ctx.font          = `${Math.round(cardH * 0.36)}px serif`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillText(cls.icon, cx + cardW / 2, cardY + cardH * 0.38);

    // Nombre
    ctx.font      = `bold ${Math.round(cardW * 0.13)}px 'Exo 2', sans-serif`;
    ctx.fillStyle = isSelected ? cls.color : '#666688';
    ctx.fillText(name, cx + cardW / 2, cardY + cardH * 0.78);

    // Flecha indicadora
    if (isSelected) {
      ctx.font      = `${Math.round(H * 0.03)}px serif`;
      ctx.fillStyle = cls.color;
      ctx.fillText('▼', cx + cardW / 2, cardY + cardH + H * 0.025);
    }
    ctx.restore();

    selectState.classBtnBounds[0].push({ x: cx, y: cardY, w: cardW, h: cardH, className: name });
  });

  // ── Panel de detalle ──
  const detY  = cardY + cardH + H * 0.065;
  const detH  = H * 0.415;
  const detW  = W * 0.90;
  const detX  = (W - detW) / 2;

  ctx.save();
  ctx.fillStyle   = selColor + '14';
  ctx.strokeStyle = selColor + '55';
  ctx.lineWidth   = 2;
  _roundRect(ctx, detX, detY, detW, detH, 16);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Columna izquierda — icono grande + nombre + descripción
  const colLeft = detW * 0.22;

  ctx.save();
  ctx.font         = `${Math.round(detH * 0.30)}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(selectedClass.icon, detX + colLeft / 2, detY + detH * 0.33);

  ctx.font      = `bold ${Math.round(H * 0.030)}px 'Exo 2', sans-serif`;
  ctx.fillStyle = selColor;
  ctx.shadowColor = selColor;
  ctx.shadowBlur  = 10;
  ctx.fillText(selectedName, detX + colLeft / 2, detY + detH * 0.60);
  ctx.shadowBlur = 0;

  // Descripción (partida por coma si es larga)
  ctx.font      = `${Math.round(H * 0.018)}px 'Exo 2', sans-serif`;
  ctx.fillStyle = '#8888aa';
  const descParts = selectedClass.description.split(',');
  descParts.forEach((part, i) => {
    ctx.fillText(part.trim(), detX + colLeft / 2, detY + detH * 0.74 + i * H * 0.026);
  });
  ctx.restore();

  // Separador vertical izquierdo
  ctx.save();
  ctx.strokeStyle = selColor + '33';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(detX + colLeft, detY + detH * 0.05);
  ctx.lineTo(detX + colLeft, detY + detH * 0.95);
  ctx.stroke();
  ctx.restore();

  // Columna central — barras de estadísticas
  const colMidX = detX + colLeft + detW * 0.03;
  const colMidW = detW * 0.30;

  ctx.save();
  ctx.font      = `bold ${Math.round(H * 0.022)}px 'Exo 2', sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ccccee';
  ctx.fillText('ESTADÍSTICAS', colMidX, detY + detH * 0.12);
  ctx.restore();

  const statData = [
    { label: 'HP',    val: selectedClass.hp,                    max: 220, color: '#e74c3c' },
    { label: 'ATK',   val: selectedClass.atk,                   max: 45,  color: '#f39c12' },
    { label: 'VEL',   val: Math.round(selectedClass.speed * 20), max: 100, color: '#2ecc71' },
    { label: 'RANGO', val: Math.round(selectedClass.range / 2.7), max: 100, color: '#3498db' },
  ];

  statData.forEach((st, i) => {
    const sy      = detY + detH * 0.24 + i * detH * 0.175;
    const barW    = colMidW * 0.58;
    const barH    = Math.max(H * 0.020, 8);
    const fill    = Math.min(st.val / st.max, 1);
    const labelX  = colMidX;
    const barX    = colMidX + colMidW * 0.30;

    ctx.save();
    ctx.font          = `bold ${Math.round(H * 0.018)}px 'Exo 2', sans-serif`;
    ctx.textAlign     = 'left';
    ctx.textBaseline  = 'middle';
    ctx.fillStyle     = '#9999bb';
    ctx.fillText(st.label, labelX, sy + barH / 2);

    // Barra fondo
    ctx.fillStyle = '#1e1e40';
    _roundRect(ctx, barX, sy, barW, barH, barH / 2);
    ctx.fill();

    // Barra relleno
    if (fill > 0) {
      ctx.fillStyle   = st.color;
      ctx.shadowColor = st.color;
      ctx.shadowBlur  = 6;
      _roundRect(ctx, barX, sy, barW * fill, barH, barH / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Valor numérico
    ctx.font      = `bold ${Math.round(H * 0.016)}px 'Exo 2', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = st.color;
    ctx.fillText(st.val, barX + barW + 7, sy + barH / 2);
    ctx.restore();
  });

  // Separador vertical derecho
  const col3X = colMidX + colMidW + detW * 0.03;
  ctx.save();
  ctx.strokeStyle = selColor + '33';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(col3X - detW * 0.01, detY + detH * 0.05);
  ctx.lineTo(col3X - detW * 0.01, detY + detH * 0.95);
  ctx.stroke();
  ctx.restore();

  // Columna derecha — habilidades
  const abilX = col3X;
  const abilW = detX + detW - abilX - detW * 0.02;

  ctx.save();
  ctx.font      = `bold ${Math.round(H * 0.022)}px 'Exo 2', sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ccccee';
  ctx.fillText('HABILIDADES', abilX, detY + detH * 0.12);
  ctx.restore();

  const abilRowH = detH * 0.185;
  selectedClass.abilities.forEach((ab, i) => {
    const ay = detY + detH * 0.22 + i * (abilRowH + detH * 0.005);

    ctx.save();
    ctx.fillStyle   = '#0d0d22cc';
    ctx.strokeStyle = selColor + '33';
    ctx.lineWidth   = 1;
    _roundRect(ctx, abilX, ay, abilW, abilRowH, 8);
    ctx.fill();
    ctx.stroke();

    // Número de habilidad
    const badgeR = Math.min(abilRowH * 0.25, 14);
    ctx.fillStyle   = selColor + 'cc';
    ctx.shadowColor = selColor;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(abilX + badgeR + 5, ay + abilRowH / 2, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font          = `bold ${Math.round(badgeR * 1.1)}px 'Exo 2', sans-serif`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillStyle     = '#000';
    ctx.fillText(`${i + 1}`, abilX + badgeR + 5, ay + abilRowH / 2);

    // Icono habilidad
    ctx.font          = `${Math.round(abilRowH * 0.42)}px serif`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillText(ab.icon, abilX + badgeR * 2 + 24, ay + abilRowH / 2);

    // Nombre habilidad
    ctx.font      = `bold ${Math.round(H * 0.017)}px 'Exo 2', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eeeeff';
    ctx.fillText(ab.name, abilX + badgeR * 2 + 42, ay + abilRowH * 0.30);

    // Descripción
    ctx.font      = `${Math.round(H * 0.013)}px 'Exo 2', sans-serif`;
    ctx.fillStyle = '#7777aa';
    const shortDesc = ab.description.length > 42 ? ab.description.substring(0, 42) + '…' : ab.description;
    ctx.fillText(shortDesc, abilX + badgeR * 2 + 42, ay + abilRowH * 0.68);

    // Cooldown
    ctx.font      = `${Math.round(H * 0.014)}px 'Exo 2', sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#555577';
    ctx.fillText(`⏱ ${ab.cd}s`, abilX + abilW - 8, ay + abilRowH * 0.28);

    ctx.restore();
  });

  // ── Botón JUGAR / LISTO ──
  const pbW = Math.min(W * 0.22, 280);
  const pbH = Math.max(H * 0.070, 40);
  const pbX = W / 2 - pbW / 2;
  const pbY = detY + detH + (H - detY - detH - pbH) / 2;
  const p   = 0.7 + 0.3 * Math.sin(time * 3);

  const isHost   = selectState.isHost;
  const btnColor = isHost ? '#ffd700' : '#3498db';
  const btnLabel = isHost ? '▶  INICIAR PARTIDA' : '✓  LISTO';

  ctx.save();
  ctx.fillStyle   = isHost ? `rgba(255,215,0,${p * 0.92})` : `rgba(52,152,219,${p * 0.85})`;
  ctx.strokeStyle = btnColor;
  ctx.lineWidth   = 3;
  ctx.shadowColor = btnColor;
  ctx.shadowBlur  = 18 * p;
  _roundRect(ctx, pbX, pbY, pbW, pbH, 12);
  ctx.fill();
  ctx.stroke();
  ctx.font          = `bold ${Math.round(pbH * 0.32)}px 'Press Start 2P', monospace`;
  ctx.fillStyle     = '#000';
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  ctx.shadowBlur    = 0;
  ctx.fillText(btnLabel, W / 2, pbY + pbH / 2);
  ctx.restore();

  // Mensaje temporal (ej. "Esperando al anfitrión...")
  if (selectState.message) {
    ctx.save();
    ctx.font      = `bold ${Math.round(H * 0.022)}px 'Exo 2', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffcc44';
    ctx.shadowColor = '#000';
    ctx.shadowBlur  = 6;
    ctx.fillText(selectState.message, W / 2, pbY + pbH + H * 0.035);
    ctx.restore();
  }

  selectState.playBtnBounds = { x: pbX, y: pbY, w: pbW, h: pbH };
}

// ─────────────────────────────────────
// HUD (durante el juego)
export function drawHUD(ctx, W, H, players, waveManager, base, player, uiState) {
  // Barra superior — oleada y descansho
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, 38);

  // Oleada
  const wnum  = waveManager.currentWaveNumber;
  const total = waveManager.totalWaves;
  const state = waveManager.state;

  ctx.font = 'bold 13px "Press Start 2P",monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (state === 'rest') {
    const t = waveManager.getRestTimeLeft();
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`⏳ Próxima oleada en ${t}s`, W/2, 19);
  } else if (state === 'done') {
    ctx.fillStyle = '#44ff44';
    ctx.fillText('¡VICTORIA! ¡Todas las oleadas completadas!', W/2, 19);
  } else {
    ctx.fillStyle = '#ff6644';
    ctx.fillText(`⚔️ OLEADA ${wnum} / ${total}`, W/2, 19);
    // Kills
    ctx.font = '10px "Exo 2",sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'right';
    ctx.fillText(`Kills totales: ${waveManager.totalKills}`, W - 10, 19);
  }

  // BOTONES HUD (Esquina superior izquierda) — Escalados para movil
  const isMobile = W < 768;
  const btnW = isMobile ? 110 : 80;
  const btnH = isMobile ? 38 : 26;
  const gap = 10;
  const statsX = 10, quitX = statsX + btnW + gap, btnY = (38 - btnH) / 2;
  
  // Boton Stats
  ctx.fillStyle = player?.statPoints > 0 ? '#ffcc00' : '#444';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  _roundRect(ctx, statsX, btnY, btnW, btnH, 5);
  ctx.fill(); ctx.stroke();
  ctx.font = 'bold 9px "Press Start 2P"';
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('STATS', statsX + btnW/2, btnY + btnH/2 + 1);
  if (player?.statPoints > 0) {
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(statsX + btnW, btnY, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace';
    ctx.fillText(player.statPoints, statsX + btnW, btnY + 3);
  }

  // Boton Salir
  ctx.fillStyle = '#aa2222';
  _roundRect(ctx, quitX, btnY, btnW, btnH, 5);
  ctx.fill(); ctx.stroke();
  ctx.font = 'bold 9px "Press Start 2P"';
  ctx.fillStyle = '#fff';
  ctx.fillText('SALIR', quitX + btnW/2, btnY + btnH/2 + 1);

  // Vidas del jugador local (esquina superior derecha)
  if (player) {
    const livesX = W - 10;
    const dotR = isMobile ? 8 : 6;
    const dotGap = isMobile ? 5 : 4;
    const totalLives = 3;
    const livesW = totalLives * dotR*2 + (totalLives-1) * dotGap;
    const livesStartX = livesX - livesW;
    const livesY = 19;
    for (let i = 0; i < totalLives; i++) {
      const dx = livesStartX + i * (dotR*2 + dotGap) + dotR;
      ctx.beginPath(); ctx.arc(dx, livesY, dotR, 0, Math.PI*2);
      ctx.fillStyle = i < player.lives ? '#ff4466' : '#333344';
      ctx.fill();
      ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Muerto permanente
    if (!player.alive && player.lives === 0) {
      ctx.font = `bold ${isMobile ? 11 : 9}px "Press Start 2P", monospace`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff4466';
      ctx.fillText('KO', livesX, livesY);
    }
  }

  // Guardar bounds para clics (usamos la altura total de la barra para mayor facilidad)
  if (uiState) {
    uiState.hudButtons = {
      stats: { x: statsX, y: 0, w: btnW, h: 38 },
      quit: { x: quitX, y: 0, w: btnW, h: 38 }
    };
  }

  ctx.restore();
}

/** 
 * PANEL DE ESTADÍSTICAS — Rediseñado para mostrar todos los datos
 */
export function drawStatsPanel(ctx, W, H, player, uiState) {
  const isMobile = W < 768;
  const panW = isMobile ? Math.min(W * 0.9, 450) : 400;
  const panH = isMobile ? Math.min(H * 0.9, 500) : 460;
  const panX = W/2 - panW/2, panY = H/2 - panH/2;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.95)';
  ctx.strokeStyle = player.color || '#ffd700'; ctx.lineWidth = 4;
  _roundRect(ctx, panX, panY, panW, panH, 20);
  ctx.fill(); ctx.stroke();

  // Titulo y Clase
  const className = player.className || "Héroe";
  const icon = player.classData.icon || "👤";
  ctx.font = 'bold 20px "Press Start 2P"';
  ctx.fillStyle = player.color || '#ffd700'; ctx.textAlign = 'center';
  ctx.fillText(`${icon} ${className.toUpperCase()}`, W/2, panY + 45);

  ctx.font = '12px "Press Start 2P"';
  ctx.fillStyle = '#fff';
  ctx.fillText(`Nivel ${player.level}`, W/2, panY + 75);

  const startX = panX + 35;
  const barW = panW - 70;

  // Barra HP
  const hpPerc = Math.min(1, player.hp / player.maxHp);
  ctx.fillStyle = '#333';
  _roundRect(ctx, startX, panY + 100, barW, 20, 5); ctx.fill();
  ctx.fillStyle = '#ff4444';
  _roundRect(ctx, startX, panY + 100, barW * hpPerc, 20, 5); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
  ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, W/2, panY + 114);

  // Barra XP
  const xpPerc = Math.min(1, player.xp / player.nextLevelXp);
  ctx.fillStyle = '#333';
  _roundRect(ctx, startX, panY + 130, barW, 20, 5); ctx.fill();
  ctx.fillStyle = '#44ccff';
  _roundRect(ctx, startX, panY + 130, barW * xpPerc, 20, 5); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(`XP: ${player.xp} / ${player.nextLevelXp}`, W/2, panY + 144);

  // Puntos Disponibles
  ctx.font = '12px "Press Start 2P"';
  ctx.textAlign = 'left';
  ctx.fillStyle = player.statPoints > 0 ? '#ffcc00' : '#888';
  ctx.fillText(`PUNTOS: ${player.statPoints}`, startX, panY + 185);

  const statsList = [
    { label: '⚔️ ATAQUE', val: player.atk, type: 'atk' },
    { label: '❤️ SALUD', val: player.maxHp, type: 'hp' },
    { label: '🏃 VELOC.', val: player.speed.toFixed(1), type: 'speed' }
  ];

  uiState.statButtons = [];
  statsList.forEach((s, i) => {
    const y = panY + 225 + i * 45;
    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${s.label}: ${s.val}`, startX, y);
    
    if (player.statPoints > 0) {
      const bx = panX + panW - 70, bw = 35, bh = 35;
      ctx.fillStyle = '#ffd700';
      _roundRect(ctx, bx, y - 22, bw, bh, 8);
      ctx.fill();
      ctx.fillStyle = '#000'; ctx.textAlign = 'center';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('+', bx + bw/2, y + 6);
      ctx.textAlign = 'left'; // Reset
      uiState.statButtons.push({ x: bx, y: y - 22, w: bw, h: bh, type: s.type });
    }
  });

  // Habilidades Unlock info
  const abY = panY + 360;
  ctx.font = 'bold 10px "Press Start 2P"';
  ctx.fillStyle = '#aaa';
  ctx.fillText('HABILIDADES:', startX, abY);
  
  player.classData.abilities.forEach((ab, i) => {
    const unlockLvl = CONFIG.ABILITY_UNLOCK_LEVELS[i] || 1;
    const isLocked = player.level < unlockLvl;
    const y = abY + 25 + i * 18;
    ctx.font = '9px "Press Start 2P"';
    ctx.fillStyle = isLocked ? '#555' : '#44ff44';
    ctx.fillText(`${ab.icon} ${ab.name.padEnd(20)} ${isLocked ? '(Nvl '+unlockLvl+')' : '✅'}`, startX, y);
  });

  // Boton Cerrar
  const cbW = 160, cbH = 40, cbX = W/2 - cbW/2, cbY = panY + panH - 60;
  ctx.fillStyle = '#444';
  _roundRect(ctx, cbX, cbY, cbW, cbH, 10);
  ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = 'bold 12px "Press Start 2P"';
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('CERRAR', W/2, cbY + cbH/2 + 4);
  uiState.closeStatsBtn = { x: cbX, y: cbY, w: cbW, h: cbH };

  ctx.restore();
}

// ─────────────────────────────────────
// GAME OVER SCREEN
// ─────────────────────────────────────
export function drawGameOver(ctx, W, H, stats, time) {
  // Fondo oscuro
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, W, H);

  // Titulo
  const p = 0.7 + 0.3*Math.sin(time*2);
  ctx.font = `bold ${Math.round(W*0.05)}px 'Press Start 2P',monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255,60,60,${p})`;
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 30*p;
  ctx.fillText('💀 GAME OVER', W/2, H*0.22);
  ctx.shadowBlur = 0;

  // Stats
  ctx.font = `${Math.round(W*0.022)}px 'Exo 2',sans-serif`;
  ctx.fillStyle = '#ccc';
  const lines = [
    `Jugadores: ${stats.playerCount}`,
    `Oleadas superadas: ${stats.wavesSurvived} / ${stats.totalWaves}`,
    `Enemigos eliminados: ${stats.totalKills}`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, W/2, H*0.38 + i*H*0.065));
  ctx.restore();
}

// ─────────────────────────────────────
// VICTORY SCREEN
// ─────────────────────────────────────
export function drawVictory(ctx, W, H, stats, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,20,0.88)';
  ctx.fillRect(0, 0, W, H);

  const p = 0.7 + 0.3*Math.sin(time*3);
  ctx.font = `bold ${Math.round(W*0.045)}px 'Press Start 2P',monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255,215,0,${p})`;
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 40*p;
  ctx.fillText('🏆 ¡VICTORIA! 🏆', W/2, H*0.22);
  ctx.shadowBlur = 0;

  ctx.font = `${Math.round(W*0.022)}px 'Exo 2',sans-serif`;
  ctx.fillStyle = '#eee';
  const lines = [
    `Jugadores: ${stats.playerCount}`,
    `¡Todas las ${stats.totalWaves} oleadas completadas!`,
    `Enemigos eliminados: ${stats.totalKills}`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, W/2, H*0.38 + i*H*0.065));
  ctx.restore();
}

// ─────────────────────────────────────
// LEADERBOARD OVERLAY
// ─────────────────────────────────────
export function drawLeaderboard(ctx, W, H, scores) {
  const panW = W*0.55, panH = H*0.55;
  const panX = W/2 - panW/2, panY = H*0.58;

  ctx.save();
  ctx.fillStyle = 'rgba(10,10,30,0.95)';
  ctx.strokeStyle = '#ffd70077';
  ctx.lineWidth = 2;
  _roundRect(ctx, panX, panY, panW, panH, 14);
  ctx.fill(); ctx.stroke();

  ctx.font = `bold ${Math.round(panH*0.065)}px 'Press Start 2P',monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('🏅 MEJORES PUNTAJES', W/2, panY + panH*0.08);

  ctx.font = `${Math.round(panH*0.058)}px 'Exo 2',sans-serif`;
  ctx.fillStyle = '#888';
  ctx.fillText('#   Jugadores   Oleadas   Kills   Resultado   Fecha', W/2, panY + panH*0.16);

  if (!scores || scores.length === 0) {
    ctx.fillStyle = '#666';
    ctx.fillText('Sin puntajes guardados aún', W/2, panY + panH*0.55);
  } else {
    scores.slice(0,8).forEach((s, i) => {
      const ry = panY + panH*0.22 + i * panH*0.09;
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'  ';
      ctx.fillStyle = i < 3 ? '#ffd700' : '#ccc';
      ctx.font = `${Math.round(panH*0.066)}px 'Exo 2',sans-serif`;
      
      const rawNames = s.player_names || `${s.player_count}P`;
      const rawLevels = s.player_levels || '';
      
      let combined = rawNames;
      if (rawLevels) {
        const nArr = rawNames.split(', ');
        const lArr = rawLevels.split(', ');
        combined = nArr.map((n, idx) => `${n}(L${lArr[idx]||'?'})`).join(',');
      }
      
      const truncatedNames = combined.length > 20 ? combined.substring(0, 17) + '...' : combined;

      ctx.fillText(
        `${medal} ${i+1}  ${truncatedNames}   ${s.waves_survived}   ${s.total_kills}   ${s.victory?'Victoria':'Derrota'}  ${s.fecha}`,
        W/2, ry
      );
    });
  }

  // Boton jugar de nuevo
  const bx=W/2-panW*0.22, by=panY+panH*0.87, bw=panW*0.44, bh=panH*0.1;
  ctx.fillStyle = '#ffd700cc';
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  _roundRect(ctx, bx, by, bw, bh, 10);
  ctx.fill(); ctx.stroke();
  ctx.font = `bold ${Math.round(bh*0.38)}px 'Press Start 2P',monospace`;
  ctx.fillStyle = '#000';
  ctx.fillText('↩ JUGAR DE NUEVO', W/2, by+bh/2+2);
  ctx.restore();

  return { restartBtn: { x:bx, y:by, w:bw, h:bh } };
}

// ─────────────────────────────────────
// REMOTE PLAYERS
// ─────────────────────────────────────
export function drawRemotePlayers(ctx, remotePlayers, time) {
  Object.values(remotePlayers).forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    
    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo (Simple circle for now, matching entity style)
    ctx.fillStyle = p.color || '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Nombre + Nivel
    ctx.font = 'bold 9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    const remoteLabel = `${p.name || ''} Lvl ${p.level || 1}`;
    ctx.strokeText(remoteLabel, 0, -22);
    ctx.fillText(remoteLabel, 0, -22);
    
    ctx.restore();
  });
}

// ─────────────────────────────────────
// UTIL
// ─────────────────────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}
