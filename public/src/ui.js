// ============================================================
// UI.JS — CharacterSelect, HUD, GameOver/Victory, Leaderboard
// ============================================================
import { CLASSES, CLASS_NAMES, CONFIG, PLAYER_COLORS } from './constants.js';

// ─────────────────────────────────────
// CHARACTER SELECT SCREEN
// ─────────────────────────────────────
export function drawCharacterSelect(ctx, W, H, selectState, time) {
  // Fondo
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0d0d2a');
  grad.addColorStop(1, '#1a0d2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Titulo
  ctx.save();
  ctx.font = `bold ${Math.round(W*0.038)}px 'Press Start 2P', monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 20;
  ctx.fillText('⚔️  EL ULTIMO LEON  🛡️', W/2, H*0.12);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Subtitulo
  ctx.save();
  ctx.font = `${Math.round(W*0.018)}px 'Exo 2', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aaaacc';
  ctx.fillText('- Defiende la base de las hordas enemigas -', W/2, H*0.19);
  ctx.restore();

  // Selector de numero de jugadores
  const btnY = H*0.26, btnH = H*0.065, btnW = W*0.055, gap = W*0.01;
  const totalBtnsW = (CONFIG.MAX_PLAYERS * (btnW + gap)) - gap;
  const startBtnsX = W/2 - totalBtnsW/2;
  ctx.save();
  ctx.font = `${Math.round(H*0.025)}px 'Exo 2', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aaaacc';
  ctx.fillText('Número de Jugadores:', W/2, btnY - H*0.02);
  ctx.restore();
  for (let i = 1; i <= CONFIG.MAX_PLAYERS; i++) {
    const bx = startBtnsX + (i-1)*(btnW+gap);
    const selected = (selectState.playerCount === i);
    ctx.save();
    ctx.fillStyle = selected ? '#ffd700' : '#33336a';
    ctx.strokeStyle = selected ? '#ffd700' : '#5555aa';
    ctx.lineWidth = selected ? 3 : 1;
    _roundRect(ctx, bx, btnY, btnW, btnH, 8);
    ctx.fill(); ctx.stroke();
    ctx.font = `bold ${Math.round(btnH*0.5)}px 'Exo 2', sans-serif`;
    ctx.fillStyle = selected ? '#000' : '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i}P`, bx + btnW/2, btnY + btnH/2);
    ctx.restore();
  }

  // Panel de seleccion de clases por jugador
  const n = selectState.playerCount;
  const isMobile = W < 768;
  const classCount = CLASS_NAMES.length;
  const panelW = isMobile ? Math.min(W*0.9/n, W*0.28) : Math.min(W*0.95/n, W*0.22);
  const panelH = isMobile ? H*0.65 : H*0.50;
  const panelStartX = W/2 - (n * panelW + (n-1)*W*0.01)/2;
  const panelY = H*0.37;

  for (let pi = 0; pi < n; pi++) {
    const px = panelStartX + pi * (panelW + W*0.01);
    const selected = selectState.selectedClasses[pi];
    const pcolor = PLAYER_COLORS[pi];

    // Panel jugador
    ctx.save();
    ctx.fillStyle = `${pcolor}22`;
    ctx.strokeStyle = pcolor;
    ctx.lineWidth = 2;
    _roundRect(ctx, px, panelY, panelW, panelH, 10);
    ctx.fill(); ctx.stroke();
    ctx.font = `bold ${Math.round(panelW*0.11)}px 'Exo 2', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = pcolor;
    ctx.fillText(`J${pi+1}`, px + panelW/2, panelY + panelH*0.08);
    ctx.restore();

    // Opciones de clase
    const itemH = panelH * 0.17;
    CLASS_NAMES.forEach((name, ci) => {
      const cls = CLASSES[name];
      const iy = panelY + panelH*0.14 + ci * (itemH + 3);
      const isSelected = (selected === name);
      ctx.save();
      ctx.fillStyle = isSelected ? pcolor + 'bb' : '#22224488';
      ctx.strokeStyle = isSelected ? pcolor : '#44445588';
      ctx.lineWidth = isSelected ? 2 : 1;
      _roundRect(ctx, px+4, iy, panelW-8, itemH, 6);
      ctx.fill(); ctx.stroke();
      ctx.font = `${Math.round(itemH*0.38)}px serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(cls.icon, px+10, iy + itemH/2);
      ctx.font = `bold ${Math.round(itemH*0.28)}px 'Exo 2', sans-serif`;
      ctx.fillStyle = isSelected ? '#fff' : '#aaa';
      ctx.fillText(name, px+30, iy + itemH/2 - itemH*0.08);
      ctx.font = `${Math.round(itemH*0.22)}px 'Exo 2', sans-serif`;
      ctx.fillStyle = '#aaa';
      ctx.fillText(cls.description, px+30, iy + itemH/2 + itemH*0.18);
      ctx.restore();
    });
  }

  // Boton Jugar
  const playBtnW = W*0.18, playBtnH = H*0.072;
  const playBtnX = W/2 - playBtnW/2, playBtnY = H*0.91;
  const p = 0.7 + 0.3*Math.sin(time*3);
  ctx.save();
  ctx.fillStyle = `rgba(255, 215, 0, ${p*0.9})`;
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 20*p;
  _roundRect(ctx, playBtnX, playBtnY, playBtnW, playBtnH, 12);
  ctx.fill(); ctx.stroke();
  ctx.font = `bold ${Math.round(playBtnH*0.38)}px 'Press Start 2P', monospace`;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 0;
  ctx.fillText('▶  JUGAR', W/2, playBtnY + playBtnH/2);
  ctx.restore();

  selectState.playBtnBounds = { x: playBtnX, y: playBtnY, w: playBtnW, h: playBtnH };
  selectState.playerBtnBounds = Array.from({length:CONFIG.MAX_PLAYERS}, (_,i) => ({
    x: startBtnsX + i*(btnW+gap), y: btnY, w: btnW, h: btnH
  }));
  selectState.classBtnBounds = [];
  for (let pi = 0; pi < n; pi++) {
    const px = panelStartX + pi*(panelW+W*0.01);
    selectState.classBtnBounds[pi] = CLASS_NAMES.map((_, ci) => ({
      x: px+4, y: panelY+panelH*0.14+ci*(panelH*0.17+3),
      w: panelW-8, h: panelH*0.17, className: CLASS_NAMES[ci]
    }));
  }
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
 * PANEL DE ESTADÍSTICAS
 */
export function drawStatsPanel(ctx, W, H, player, uiState) {
  const isMobile = W < 768;
  const panW = isMobile ? Math.min(W * 0.9, 360) : 320;
  const panH = isMobile ? Math.min(H * 0.8, 400) : 340;
  const panX = W/2 - panW/2, panY = H/2 - panH/2;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.92)';
  ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
  _roundRect(ctx, panX, panY, panW, panH, 15);
  ctx.fill(); ctx.stroke();

  // Titulo
  ctx.font = 'bold 16px "Press Start 2P"';
  ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center';
  ctx.fillText('ESTADÍSTICAS', W/2, panY + 40);

  // Stats
  ctx.font = '14px "Press Start 2P"';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  const startX = panX + 30;
  ctx.fillText(`Nivel: ${player.level}`, startX, panY + 80);
  ctx.fillText(`Puntos: ${player.statPoints}`, startX, panY + 110);

  const stats = [
    { label: '⚔️ ATK', val: player.atk, type: 'atk' },
    { label: '❤️ HP ', val: player.maxHp, type: 'hp' },
    { label: '🏃 SPD', val: player.speed.toFixed(1), type: 'speed' }
  ];

  uiState.statButtons = [];
  stats.forEach((s, i) => {
    const y = panY + 160 + i * 50;
    ctx.fillText(`${s.label}: ${s.val}`, startX, y);
    
    if (player.statPoints > 0) {
      const bx = panX + panW - 60, bw = 30, bh = 30;
      ctx.fillStyle = '#ffd700';
      _roundRect(ctx, bx, y - 20, bw, bh, 5);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('+', bx + 9, y + 4);
      uiState.statButtons.push({ x: bx, y: y - 20, w: bw, h: bh, type: s.type });
    }
  });

  // Boton Cerrar
  const cbW = 120, cbH = 35, cbX = W/2 - cbW/2, cbY = panY + panH - 50;
  ctx.fillStyle = '#444';
  _roundRect(ctx, cbX, cbY, cbW, cbH, 8);
  ctx.fill(); ctx.stroke();
  ctx.font = 'bold 11px "Press Start 2P"';
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('CERRAR', W/2, cbY + cbH/2 + 2);
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
