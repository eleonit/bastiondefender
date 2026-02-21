// ============================================================
// INPUT.JS — Sistema de entrada tactil multi-jugador
// VirtualPad: crea y gestiona los paneles de control en DOM
// TouchInput: maneja eventos touch y traduce a acciones de jugador
// ============================================================
import { PAD_POSITIONS, PLAYER_COLORS, CLASSES, CLASS_NAMES } from './constants.js';

// Estado de entrada para cada jugador
export class PlayerInput {
  constructor() {
    this.dx = 0;         // -1..1 joystick X
    this.dy = 0;         // -1..1 joystick Y
    this.attack = false; // boton de ataque presionado
    this.ability = [-1]; // indice de habilidad presionada (-1 = ninguna)
    this.abilityJustPressed = new Array(4).fill(false);
  }
  reset() {
    this.attack = false;
    this.abilityJustPressed = new Array(4).fill(false);
  }
}

// ─────────────────────────────────────────────────────────
// VirtualPad — Construye el panel de controles en el DOM
// ─────────────────────────────────────────────────────────
export class VirtualPad {
  constructor(playerIndex, classData, onSizeReady) {
    this.idx     = playerIndex;
    this.input   = new PlayerInput();
    this.classData = classData;
    this.el      = null;
    this.joystickZone = null;
    this.knob    = null;
    this.joyCenter = { x: 0, y: 0 };
    this.joyRadius = 40;
    this.activeTouchId = { joy: null, atk: null, ab: [null,null,null,null] };
    this.cooldowns = [0,0,0,0]; // tiempo restante por habilidad
    this.abilityBtns = [];
    this._onSizeReady = onSizeReady;
    this._build();
  }

  _build() {
    const overlay = document.getElementById('controlsOverlay');
    const pos = PAD_POSITIONS[this.idx];
    const color = PLAYER_COLORS[this.idx];
    const colorClass = `p-color-${this.idx}`;
    const btnClass   = `p-btn-${this.idx}`;

    // Tamaño adaptativo
    const isSmall = window.innerWidth < 600;
    const padW = isSmall ? 170 : 210;
    const joyR = isSmall ? 36 : 46;
    const btnS = isSmall ? 50 : 62;
    const atkS = isSmall ? 52 : 66;
    this.joyRadius = joyR;

    // Contenedor principal
    this.el = document.createElement('div');
    this.el.className = `player-pad ${colorClass}`;
    this.el.style.cssText = `
      width:${padW}px;
      ${pos.top    != null ? `top:${pos.top}${typeof pos.top==='number'?'px':''}` : ''};
      ${pos.bottom != null ? `bottom:${pos.bottom}px` : ''};
      ${pos.left   != null ? `left:${pos.left}px` : ''};
      ${pos.right  != null ? `right:${pos.right}px` : ''};
    `;

    // Etiqueta del jugador
    const label = document.createElement('div');
    label.style.cssText = `
      position:absolute; top:-22px; left:50%; transform:translateX(-50%);
      font-size:9px; font-family:'Press Start 2P',monospace;
      color:${color}; white-space:nowrap; text-shadow:0 0 8px ${color};
    `;
    const className = CLASS_NAMES.find(k => CLASSES[k] === this.classData) || '?';
    label.textContent = `J${this.idx+1} ${this.classData?.icon||''} ${className}`;
    this.el.appendChild(label);

    // JOYSTICK
    this.joystickZone = document.createElement('div');
    this.joystickZone.className = 'joystick-zone';
    const joySize = joyR * 2 + 8;
    this.joystickZone.style.cssText = `width:${joySize}px;height:${joySize}px;flex-shrink:0;`;

    this.knob = document.createElement('div');
    this.knob.className = 'joystick-knob';
    const knobSize = Math.round(joyR * 0.7);
    this.knob.style.cssText = `
      width:${knobSize}px;height:${knobSize}px;
      background:radial-gradient(circle at 35% 35%,${color}cc,${color}44);
      border-color:${color};
    `;
    this.joystickZone.appendChild(this.knob);
    this.el.appendChild(this.joystickZone);

    // BOTON ATAQUE
    this.atkBtn = document.createElement('div');
    this.atkBtn.className = `attack-btn ${btnClass}`;
    this.atkBtn.style.cssText = `width:${atkS}px;height:${atkS}px;font-size:${atkS*0.38}px;`;
    this.atkBtn.textContent = '⚔';
    this.atkBtn.title = 'Atacar';
    this.el.appendChild(this.atkBtn);

    // BOTONES DE HABILIDADES (2x2)
    const grid = document.createElement('div');
    grid.className = 'btn-group';
    grid.style.cssText = `width:${btnS*2+5}px;`;

    this.abilityBtns = this.classData.abilities.map((ab, i) => {
      const btn = document.createElement('div');
      btn.className = `action-btn ${btnClass}`;
      btn.style.cssText = `width:${btnS}px;height:${btnS}px;font-size:${btnS*0.32}px;`;
      btn.innerHTML = `
        <span class="btn-icon">${ab.icon}</span>
        <span class="btn-label">${this._abbr(ab.name)}</span>
        <div class="cooldown-overlay" style="height:0%"></div>
      `;
      btn.title = ab.description;
      grid.appendChild(btn);
      return btn;
    });
    this.el.appendChild(grid);

    overlay.appendChild(this.el);

    // Calcular centro del joystick tras insertar en DOM
    requestAnimationFrame(() => {
      const r = this.joystickZone.getBoundingClientRect();
      this.joyCenter = { x: r.left + r.width/2, y: r.top + r.height/2 };
      if (this._onSizeReady) this._onSizeReady();
    });

    this._bindTouch();
  }

  _abbr(name) {
    const words = name.split(' ');
    return words.length > 2 ? words[0] : name.substring(0,8);
  }

  _bindTouch() {
    // JOYSTICK
    this.joystickZone.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (this.activeTouchId.joy == null) {
        this.activeTouchId.joy = t.identifier;
        this._moveKnob(t.clientX, t.clientY);
      }
    }, { passive: false });

    // Usar el overlay entero para capturar movimiento del joystick
    document.addEventListener('touchmove', e => {
      for (let t of e.changedTouches) {
        if (t.identifier === this.activeTouchId.joy) {
          e.preventDefault();
          this._moveKnob(t.clientX, t.clientY);
        }
      }
    }, { passive: false });

    document.addEventListener('touchend', e => {
      for (let t of e.changedTouches) {
        if (t.identifier === this.activeTouchId.joy) {
          this.activeTouchId.joy = null;
          this.input.dx = 0;
          this.input.dy = 0;
          this.knob.style.transform = `translate(-50%,-50%)`;
        }
        if (t.identifier === this.activeTouchId.atk) {
          this.activeTouchId.atk = null;
          this.input.attack = false;
          this.atkBtn.classList.remove('pressed');
        }
        for (let i = 0; i < 4; i++) {
          if (t.identifier === this.activeTouchId.ab[i]) {
            this.activeTouchId.ab[i] = null;
            this.abilityBtns[i].classList.remove('pressed');
          }
        }
      }
    });

    // BOTON ATAQUE
    this.atkBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (this.activeTouchId.atk == null) {
        this.activeTouchId.atk = t.identifier;
        this.input.attack = true;
        this.atkBtn.classList.add('pressed');
      }
    }, { passive: false });

    // BOTONES HABILIDADES
    this.abilityBtns.forEach((btn, i) => {
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.changedTouches[0];
        if (this.activeTouchId.ab[i] == null && this.cooldowns[i] <= 0) {
          this.activeTouchId.ab[i] = t.identifier;
          this.input.abilityJustPressed[i] = true;
          btn.classList.add('pressed');
          setTimeout(() => btn.classList.remove('pressed'), 150);
        }
      }, { passive: false });
    });

    // Soporte mouse para pruebas en escritorio
    this._bindMouse();
  }

  _bindMouse() {
    const bindBtn = (el, onDown, onUp) => {
      el.addEventListener('mousedown', e => { e.preventDefault(); onDown(); });
      el.addEventListener('mouseup',   () => onUp());
    };

    let joydragging = false;
    this.joystickZone.addEventListener('mousedown', e => {
      joydragging = true;
      this._moveKnob(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', e => {
      if (joydragging) this._moveKnob(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', () => {
      if (joydragging) {
        joydragging = false;
        this.input.dx = 0; this.input.dy = 0;
        this.knob.style.transform = 'translate(-50%,-50%)';
      }
    });
    bindBtn(this.atkBtn, () => { this.input.attack = true; this.atkBtn.classList.add('pressed'); },
                         () => { this.input.attack = false; this.atkBtn.classList.remove('pressed'); });
    this.abilityBtns.forEach((btn, i) => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        if (this.cooldowns[i] <= 0) {
          this.input.abilityJustPressed[i] = true;
          btn.classList.add('pressed');
          setTimeout(() => btn.classList.remove('pressed'), 150);
        }
      });
    });
  }

  _moveKnob(cx, cy) {
    const dx = cx - this.joyCenter.x;
    const dy = cy - this.joyCenter.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const capped = Math.min(dist, this.joyRadius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * capped;
    const ky = Math.sin(angle) * capped;
    this.knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    this.input.dx = kx / this.joyRadius;
    this.input.dy = ky / this.joyRadius;
  }

  // Llamar cada frame con dt en segundos
  update(dt) {
    for (let i = 0; i < 4; i++) {
      if (this.cooldowns[i] > 0) {
        this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt);
        const pct = (this.cooldowns[i] / this.classData.abilities[i].cd) * 100;
        const overlay = this.abilityBtns[i].querySelector('.cooldown-overlay');
        if (overlay) overlay.style.height = pct + '%';
      }
    }
    this.input.abilityJustPressed = new Array(4).fill(false);
  }

  startCooldown(abilityIndex) {
    const cd = this.classData.abilities[abilityIndex].cd;
    this.cooldowns[abilityIndex] = cd;
  }

  recalcJoyCenter() {
    const r = this.joystickZone.getBoundingClientRect();
    this.joyCenter = { x: r.left + r.width/2, y: r.top + r.height/2 };
  }

  destroy() {
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
  }
}
