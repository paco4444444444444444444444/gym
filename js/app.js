// ── STORE ─────────────────────────────────────────────────────────────────────
const Store = {
  _get(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
  _set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  getWorkouts() { return this._get('workouts', []); },
  saveWorkout(w) { const ws = this.getWorkouts(); ws.unshift(w); this._set('workouts', ws); },
  getActive() { return this._get('active', null); },
  setActive(w) { this._set('active', w); },
  clearActive() { localStorage.removeItem('active'); },
  getPRs() { return this._get('prs', {}); },
  updatePR(exId, weight, reps, date) {
    const prs = this.getPRs();
    if (!prs[exId] || weight > prs[exId].weight) prs[exId] = { weight, reps, date };
    this._set('prs', prs);
  },
  getSettings() { return this._get('settings', { unit: 'kg', restTime: 90 }); },
  saveSettings(s) { this._set('settings', s); },
  getProgram() { return this._get('program', null); },
  setProgram(p) { this._set('program', p); },
  clearProgram() { localStorage.removeItem('program'); }
};

// ── ROUTER ────────────────────────────────────────────────────────────────────
const Router = {
  stack: [],
  go(view, params = {}) {
    this.stack.push({ view, params });
    App.render(view, params);
  },
  back() {
    this.stack.pop();
    const prev = this.stack[this.stack.length - 1] || { view: 'home', params: {} };
    App.render(prev.view, prev.params);
  },
  reset(view) {
    this.stack = [{ view, params: {} }];
    App.render(view, {});
  }
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
function fmt(n) { return n >= 10 ? n : '0' + n; }
function fmtTime(s) { return `${fmt(Math.floor(s / 60))}:${fmt(s % 60)}`; }
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return `Hace ${diff} días`;
}
function totalVol(exercises, unit) {
  let v = 0;
  exercises.forEach(ex => ex.sets.forEach(s => { if (s.completed) v += (s.weight || 0) * (s.reps || 0); }));
  return v > 0 ? `${v.toLocaleString()} ${unit}` : '—';
}
function getEx(id) { return EXERCISES.find(e => e.id === id); }
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2200);
}
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function el(tag, cls, html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

// ── TIMER ─────────────────────────────────────────────────────────────────────
const WorkoutTimer = {
  _start: null, _iv: null,
  start() { this._start = Date.now(); this._iv = setInterval(() => this._tick(), 1000); },
  stop() { clearInterval(this._iv); this._iv = null; },
  elapsed() { return this._start ? Math.floor((Date.now() - this._start) / 1000) : 0; },
  _tick() {
    const el = document.getElementById('aw-timer');
    if (el) el.textContent = fmtTime(this.elapsed());
  }
};

const RestTimer = {
  _total: 0, _left: 0, _iv: null,
  start(secs) {
    this.stop();
    this._total = secs; this._left = secs;
    this._render();
    this._iv = setInterval(() => {
      this._left--;
      if (this._left <= 0) { this.stop(); this._hide(); return; }
      this._render();
    }, 1000);
  },
  stop() { clearInterval(this._iv); this._iv = null; },
  skip() { this.stop(); this._hide(); },
  _hide() { const r = document.getElementById('rest-timer'); if (r) r.remove(); },
  _render() {
    let r = document.getElementById('rest-timer');
    if (!r) {
      r = document.createElement('div'); r.id = 'rest-timer';
      r.innerHTML = `<div><div class="rt-label">⏱ Descanso</div><div class="rt-time" id="rt-time"></div><div class="rt-bar"><div class="rt-fill" id="rt-fill"></div></div></div><button class="rt-skip" onclick="RestTimer.skip()">Saltar</button>`;
      document.body.appendChild(r);
    }
    document.getElementById('rt-time').textContent = fmtTime(this._left);
    const pct = (this._left / this._total) * 100;
    document.getElementById('rt-fill').style.width = pct + '%';
  }
};

// ── MODAL (exercise picker) ───────────────────────────────────────────────────
const Modal = {
  _cb: null,
  open(cb) {
    this._cb = cb;
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    this._render('');
    qs('#modal-search').focus();
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },
  pick(id) {
    this.close();
    if (this._cb) this._cb(id);
  },
  _render(q) {
    const list = qs('#modal-list');
    const filtered = EXERCISES.filter(e =>
      !q || e.name.toLowerCase().includes(q.toLowerCase()) ||
      e.cat.toLowerCase().includes(q.toLowerCase()) ||
      e.muscles.some(m => m.toLowerCase().includes(q.toLowerCase()))
    );
    list.innerHTML = filtered.map(e => `
      <div class="ex-item" onclick="Modal.pick('${e.id}')">
        <div class="ex-avatar">${e.emoji}</div>
        <div class="ex-info">
          <div class="ex-name">${e.name}</div>
          <div class="ex-meta">${e.cat} · ${e.eq} · ${e.muscles[0]}</div>
        </div>
      </div>`).join('');
  }
};

// ── WORKOUT LOGIC ─────────────────────────────────────────────────────────────
const Workout = {
  _data: null,
  start(template = null) {
    this._data = template ? JSON.parse(JSON.stringify(template)) : {
      id: Date.now().toString(),
      name: 'Entrenamiento',
      date: new Date().toISOString(),
      exercises: []
    };
    this._data.id = Date.now().toString();
    this._data.date = new Date().toISOString();
    Store.setActive(this._data);
    WorkoutTimer.start();
    Router.go('active');
  },
  load() {
    const a = Store.getActive();
    if (a) { this._data = a; WorkoutTimer.start(); }
    return !!a;
  },
  get() { return this._data; },
  save() { if (this._data) Store.setActive(this._data); },
  addExercise(exId) {
    const ex = getEx(exId);
    if (!ex) return;
    this._data.exercises.push({
      exerciseId: exId, name: ex.name, emoji: ex.emoji,
      muscles: ex.muscles,
      sets: [{ reps: '', weight: '', type: 'normal', completed: false }]
    });
    this.save();
    Views.activeWorkout();
  },
  addSet(exIdx) {
    const ex = this._data.exercises[exIdx];
    const last = ex.sets[ex.sets.length - 1] || {};
    ex.sets.push({ reps: last.reps || '', weight: last.weight || '', type: 'normal', completed: false });
    this.save();
    Views.activeWorkout();
  },
  deleteSet(exIdx, setIdx) {
    this._data.exercises[exIdx].sets.splice(setIdx, 1);
    if (this._data.exercises[exIdx].sets.length === 0) {
      this._data.exercises.splice(exIdx, 1);
    }
    this.save();
    Views.activeWorkout();
  },
  updateSet(exIdx, setIdx, field, val) {
    this._data.exercises[exIdx].sets[setIdx][field] = val;
    this.save();
  },
  toggleComplete(exIdx, setIdx) {
    const s = this._data.exercises[exIdx].sets[setIdx];
    s.completed = !s.completed;
    this.save();
    if (s.completed) {
      const ex = this._data.exercises[exIdx];
      const w = parseFloat(s.weight);
      const r = parseInt(s.reps);
      if (w && r) Store.updatePR(ex.exerciseId, w, r, new Date().toISOString());
      RestTimer.start(Store.getSettings().restTime);
    }
    // refresh row
    const row = document.querySelector(`[data-set="${exIdx}-${setIdx}"]`);
    if (row) {
      row.classList.toggle('completed', s.completed);
      const btn = row.querySelector('.set-complete-btn');
      if (btn) btn.innerHTML = checkSVG();
      const num = row.querySelector('.set-num');
      if (num) num.style.background = s.completed ? 'var(--green)' : '';
    }
  },
  finish() {
    const w = this._data;
    w.duration = WorkoutTimer.elapsed();
    WorkoutTimer.stop();
    Store.saveWorkout(w);
    Store.clearActive();
    this._data = null;
    toast('¡Entrenamiento guardado! 💪');
    Router.reset('home');
  },
  discard() {
    WorkoutTimer.stop();
    Store.clearActive();
    this._data = null;
    Router.reset('home');
  }
};

// ── SVG ICONS ─────────────────────────────────────────────────────────────────
const icons = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  dumbbell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16M18 4v16M6 8h12M6 16h12"/><rect x="2" y="6" width="4" height="12" rx="1"/><rect x="18" y="6" width="4" height="12" rx="1"/></svg>`,
  list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  person: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  fire: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4h10v6a5 5 0 0 1-10 0V4z"/><path d="M7 8H5a2 2 0 0 1-2-2V4h4"/><path d="M17 8h2a2 2 0 0 0 2-2V4h-4"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`
};
function checkSVG() { return icons.check; }

// ── VIEWS ─────────────────────────────────────────────────────────────────────
const Views = {

  home() {
    const main = document.getElementById('main');
    const workouts = Store.getWorkouts();
    const active = Store.getActive();
    const settings = Store.getSettings();
    const streak = calcStreak(workouts);
    const totalW = workouts.length;
    const totalKg = workouts.reduce((s, w) => {
      return s + w.exercises.reduce((s2, ex) => s2 + ex.sets.reduce((s3, set) => s3 + (set.completed ? (set.weight || 0) * (set.reps || 0) : 0), 0), 0);
    }, 0);
    const prs = Object.keys(Store.getPRs()).length;

    const recentHTML = workouts.slice(0, 5).map(w => {
      const exNames = w.exercises.slice(0, 3).map(e => e.name).join(', ');
      return `<div class="workout-card" onclick="Views.workoutDetail('${w.id}')">
        <div class="wc-icon">${icons.dumbbell}</div>
        <div class="wc-info">
          <div class="wc-name">${w.name}</div>
          <div class="wc-meta">${exNames}${w.exercises.length > 3 ? ` +${w.exercises.length - 3}` : ''}</div>
        </div>
        <div class="wc-right">
          <div class="wc-date">${daysAgo(w.date)}</div>
          <div class="wc-vol">${totalVol(w.exercises, settings.unit)}</div>
        </div>
      </div>`;
    }).join('') || `<div class="empty-state"><div class="es-icon">📋</div><h3>Sin historial</h3><p>Completa tu primer entrenamiento</p></div>`;

    main.innerHTML = `
      <div class="home-hero">
        <div class="hero-greeting">Bienvenido de nuevo 👋</div>
        <div class="hero-title">¡A entrenar!</div>
        <div class="hero-streak">${icons.fire} ${streak} días de racha</div>
      </div>

      ${active ? `<div id="active-workout-bar" onclick="Router.go('active')">
        <div class="awb-left"><div class="awb-dot"></div>
          <div><div class="awb-name">${active.name}</div><div class="awb-time">En progreso</div></div>
        </div><div class="awb-resume">Continuar</div>
      </div>` : ''}

      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">${totalW}</div><div class="stat-label">Entrenos</div></div>
        <div class="stat-card"><div class="stat-value">${(totalKg / 1000).toFixed(1)}t</div><div class="stat-label">Volumen</div></div>
        <div class="stat-card"><div class="stat-value">${prs}</div><div class="stat-label">PRs</div></div>
      </div>

      <div class="start-banner" onclick="Views.startEmpty()">
        <div><h2>Iniciar Entreno</h2><p>Vacío o desde plantilla</p></div>
        <div class="start-icon">🏋️</div>
      </div>

      <div class="section-header">
        <div class="section-title">Historial</div>
        <div class="section-link" onclick="Router.go('history')">Ver todo</div>
      </div>
      ${recentHTML}`;
  },

  startEmpty() {
    if (Store.getActive()) {
      if (!confirm('Ya tienes un entrenamiento activo. ¿Descartarlo?')) return;
      Workout.discard(); return;
    }
    Workout.start();
  },

  workoutDetail(id) {
    const w = Store.getWorkouts().find(x => x.id === id);
    if (!w) return;
    const main = document.getElementById('main');
    const settings = Store.getSettings();
    const exHTML = w.exercises.map(ex => {
      const sets = ex.sets.filter(s => s.completed);
      return `<div class="day-block" style="margin-bottom:10px">
        <div class="day-header">${ex.emoji || '💪'} ${ex.name}</div>
        ${sets.map((s, i) => `<div class="day-ex-row">
          <div class="day-ex-name">Serie ${i + 1}</div>
          <div class="day-ex-detail">${s.weight}${settings.unit} × ${s.reps} reps</div>
        </div>`).join('')}
      </div>`;
    }).join('');
    main.innerHTML = `
      <div class="back-header"><div class="back-btn" onclick="Router.back()">${icons.back} Atrás</div></div>
      <div style="padding:0 16px 8px">
        <div style="font-size:22px;font-weight:800">${w.name}</div>
        <div style="color:var(--text2);font-size:14px;margin-top:4px">${fmtDate(w.date)} · ${fmtTime(w.duration || 0)}</div>
        <div style="margin-top:6px;color:var(--accent2);font-weight:600">${totalVol(w.exercises, settings.unit)} de volumen total</div>
      </div>
      <div style="padding:0 16px">${exHTML}</div>
      <div style="padding:12px 16px">
        <button class="btn btn-primary btn-block" onclick="Views.repeatWorkout('${w.id}')">🔁 Repetir entrenamiento</button>
      </div>`;
  },

  repeatWorkout(id) {
    const w = Store.getWorkouts().find(x => x.id === id);
    if (!w) return;
    const template = {
      name: w.name,
      exercises: w.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({ ...s, completed: false }))
      }))
    };
    Workout.start(template);
  },

  history() {
    const workouts = Store.getWorkouts();
    const settings = Store.getSettings();
    const main = document.getElementById('main');
    const list = workouts.map(w => `
      <div class="workout-card" onclick="Views.workoutDetail('${w.id}')">
        <div class="wc-icon">${icons.dumbbell}</div>
        <div class="wc-info">
          <div class="wc-name">${w.name}</div>
          <div class="wc-meta">${w.exercises.length} ejercicios · ${fmtTime(w.duration || 0)}</div>
        </div>
        <div class="wc-right">
          <div class="wc-date">${fmtDate(w.date)}</div>
          <div class="wc-vol">${totalVol(w.exercises, settings.unit)}</div>
        </div>
      </div>`).join('') || `<div class="empty-state"><div class="es-icon">📋</div><h3>Sin historial</h3><p>Completa tu primer entrenamiento para verlo aquí</p></div>`;
    main.innerHTML = `
      <div class="page-header"><div><div class="page-title">Historial</div></div>
      <div class="back-btn" onclick="Router.back()">${icons.back}</div></div>
      ${list}`;
  },

  activeWorkout() {
    const w = Workout.get();
    if (!w) { Router.reset('home'); return; }
    const main = document.getElementById('main');
    const settings = Store.getSettings();

    const exBlocks = w.exercises.map((ex, ei) => {
      const rows = ex.sets.map((s, si) => `
        <tr class="set-row ${s.completed ? 'completed' : ''}" data-set="${ei}-${si}">
          <td><span class="set-num">${si + 1}</span></td>
          <td><button class="set-type-btn ${s.type !== 'normal' ? s.type : ''}"
            onclick="cycleType(${ei},${si})">${s.type === 'warmup' ? 'W' : s.type === 'drop' ? 'D' : 'N'}</button></td>
          <td><input class="set-input" type="number" inputmode="decimal" placeholder="0"
            value="${s.weight}" onchange="Workout.updateSet(${ei},${si},'weight',this.value)"
            onfocus="this.select()"></td>
          <td><input class="set-input" type="number" inputmode="numeric" placeholder="0"
            value="${s.reps}" onchange="Workout.updateSet(${ei},${si},'reps',this.value)"
            onfocus="this.select()"></td>
          <td><button class="set-complete-btn" onclick="Workout.toggleComplete(${ei},${si})">${icons.check}</button></td>
        </tr>`).join('');

      const completedSets = ex.sets.filter(s => s.completed).length;
      return `<div class="exercise-block">
        <div class="ex-block-header">
          <div>
            <div class="ex-block-name">${ex.emoji || '💪'} ${ex.name}</div>
            <div class="ex-block-muscle">${(ex.muscles || []).join(', ')} · ${completedSets}/${ex.sets.length} series</div>
          </div>
          <button class="btn btn-icon" onclick="removeExercise(${ei})" style="background:transparent;color:var(--text3)">${icons.trash}</button>
        </div>
        <table class="sets-table">
          <thead><tr>
            <th>#</th><th>Tipo</th><th>${settings.unit}</th><th>Reps</th><th>✓</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <button class="add-set-btn" onclick="Workout.addSet(${ei})">${icons.plus} Añadir serie</button>
      </div>`;
    }).join('');

    main.innerHTML = `
      <div class="aw-header">
        <input class="aw-title" id="aw-name" value="${w.name}"
          onchange="w_rename(this.value)" placeholder="Nombre del entrenamiento">
        <div id="aw-timer" class="aw-timer">${fmtTime(WorkoutTimer.elapsed())}</div>
      </div>
      ${exBlocks}
      <button class="add-exercise-btn" onclick="Modal.open(id => Workout.addExercise(id))">
        ${icons.plus} Añadir ejercicio
      </button>
      <div class="finish-btn-wrap">
        <button class="btn btn-green btn-block" onclick="confirmFinish()">Finalizar entrenamiento</button>
        <button class="btn btn-danger btn-block" style="margin-top:8px" onclick="confirmDiscard()">Descartar</button>
      </div>`;
  },

  exercises(filter = 'Todos') {
    const cats = ['Todos', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio'];
    const catES = { Todos:'Todos', Chest:'Pecho', Back:'Espalda', Shoulders:'Hombros', Arms:'Brazos', Legs:'Piernas', Core:'Core', Cardio:'Cardio' };
    const main = document.getElementById('main');

    const chips = cats.map(c => `<div class="filter-chip ${filter === c ? 'active' : ''}"
      onclick="Views.exercises('${c}')">${catES[c]}</div>`).join('');

    const list = EXERCISES
      .filter(e => filter === 'Todos' || e.cat === filter)
      .map(e => {
        const pr = Store.getPRs()[e.id];
        return `<div class="ex-item" onclick="Views.exerciseDetail('${e.id}')">
          <div class="ex-avatar">${e.emoji}</div>
          <div class="ex-info">
            <div class="ex-name">${e.name}</div>
            <div class="ex-meta">${e.cat} · ${e.eq} · ${e.muscles[0]}</div>
            ${pr ? `<div style="font-size:11px;color:var(--green);margin-top:1px">PR: ${pr.weight}${Store.getSettings().unit} × ${pr.reps}</div>` : ''}
          </div>
          <div class="ex-chevron">${icons.chevron}</div>
        </div>`;
      }).join('');

    main.innerHTML = `
      <div class="search-bar">
        <div class="page-title" style="margin-bottom:10px">Ejercicios</div>
        <div class="search-wrap">
          <span class="search-icon">${icons.search}</span>
          <input class="search-input" id="ex-search" placeholder="Buscar ejercicio…"
            oninput="searchExercises(this.value, '${filter}')">
        </div>
      </div>
      <div class="filter-scroll">${chips}</div>
      <div class="exercise-list" id="ex-list">${list}</div>`;
  },

  exerciseDetail(id) {
    const ex = getEx(id);
    if (!ex) return;
    const main = document.getElementById('main');
    const pr = Store.getPRs()[id];
    const settings = Store.getSettings();
    const history = Store.getWorkouts()
      .filter(w => w.exercises.some(e => e.exerciseId === id))
      .slice(0, 5);

    const histHTML = history.map(w => {
      const exData = w.exercises.find(e => e.exerciseId === id);
      const best = exData.sets.filter(s => s.completed).reduce((b, s) => (!b || s.weight > b.weight) ? s : b, null);
      return `<div class="day-ex-row" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div class="day-ex-name">${daysAgo(w.date)}</div>
        <div class="day-ex-detail">${best ? `${best.weight}${settings.unit} × ${best.reps}` : '—'}</div>
      </div>`;
    }).join('');

    main.innerHTML = `
      <div class="back-header"><div class="back-btn" onclick="Router.back()">${icons.back} Atrás</div></div>
      <div class="ex-detail-hero">${ex.emoji}</div>
      <div style="padding:0 16px 4px">
        <div style="font-size:24px;font-weight:800">${ex.name}</div>
        <div style="color:var(--text2);font-size:14px;margin-top:4px">${ex.eq}</div>
      </div>
      <div class="muscle-tags">${ex.muscles.map(m => `<span class="muscle-tag">${m}</span>`).join('')}</div>
      ${pr ? `<div class="pr-badge">${icons.trophy} PR: ${pr.weight}${settings.unit} × ${pr.reps} reps</div>` : ''}
      <div class="card">
        <div class="card-title">Historial reciente</div>
        ${histHTML || '<div style="color:var(--text3);font-size:14px">Sin historial</div>'}
      </div>
      <div style="padding:0 16px 20px">
        <button class="btn btn-primary btn-block" onclick="addToActive('${id}')">
          ${icons.plus} Añadir al entrenamiento
        </button>
      </div>`;
  },

  programs() {
    const main = document.getElementById('main');
    const activeP = Store.getProgram();
    const html = PROGRAMS.map(p => `
      <div class="program-card" onclick="Views.programDetail('${p.id}')">
        <div class="pc-banner" style="background:linear-gradient(135deg,${p.color}33,${p.color}11)">${p.emoji}</div>
        <div class="pc-body">
          <div class="pc-name">${p.name}</div>
          <div class="pc-desc">${p.desc}</div>
          <div class="pc-badges">
            <span class="badge badge-level">${p.level}</span>
            <span class="badge badge-days">${p.daysPerWeek}d/semana</span>
            <span class="badge" style="background:rgba(255,255,255,.08);color:var(--text2)">${p.duration}</span>
            ${activeP && activeP.id === p.id ? '<span class="badge badge-active">Activo</span>' : ''}
          </div>
        </div>
      </div>`).join('');
    main.innerHTML = `<div class="page-header"><div class="page-title">Programas</div></div>${html}`;
  },

  programDetail(id) {
    const p = PROGRAMS.find(x => x.id === id);
    if (!p) return;
    const main = document.getElementById('main');
    const activeP = Store.getProgram();
    const isActive = activeP && activeP.id === id;

    const daysHTML = p.days.map((d, di) => {
      const exRows = d.exercises.map(e => {
        const ex = getEx(e.id);
        return `<div class="day-ex-row">
          <div>
            <div class="day-ex-name">${ex ? ex.name : e.id}</div>
            <div class="day-ex-detail">${e.sets} series × ${e.reps} reps · ${e.rest}s descanso</div>
          </div>
          <div style="font-size:20px">${ex ? ex.emoji : '💪'}</div>
        </div>`;
      }).join('');
      return `<div class="day-block">
        <div class="day-header"><span>Día ${di + 1}: ${d.name}</span>
          <button class="btn btn-sm btn-outline" onclick="startProgramDay('${id}',${di})">Iniciar</button>
        </div>${exRows}
      </div>`;
    }).join('');

    main.innerHTML = `
      <div class="back-header"><div class="back-btn" onclick="Router.back()">${icons.back} Atrás</div></div>
      <div class="pc-banner" style="height:120px;background:linear-gradient(135deg,${p.color}55,${p.color}22);font-size:60px;display:flex;align-items:center;justify-content:center;margin:0 16px;border-radius:var(--r)">${p.emoji}</div>
      <div style="padding:14px 16px">
        <div style="font-size:24px;font-weight:800">${p.name}</div>
        <div style="color:var(--text2);font-size:14px;margin-top:6px">${p.desc}</div>
        <div class="pc-badges" style="margin-top:10px">
          <span class="badge badge-level">${p.level}</span>
          <span class="badge badge-days">${p.daysPerWeek}d/semana</span>
          <span class="badge" style="background:rgba(255,255,255,.08);color:var(--text2)">${p.duration}</span>
        </div>
      </div>
      <div style="padding:0 16px 14px">
        <button class="btn btn-block ${isActive ? 'btn-danger' : 'btn-primary'}" onclick="${isActive ? 'stopProgram()' : `startProgram('${id}')`}">
          ${isActive ? '⛔ Dejar programa' : '🚀 Iniciar programa'}
        </button>
      </div>
      ${daysHTML}
      <div style="height:20px"></div>`;
  },

  progress() {
    const workouts = Store.getWorkouts();
    const prs = Store.getPRs();
    const settings = Store.getSettings();
    const main = document.getElementById('main');

    const prRows = Object.entries(prs).map(([id, pr]) => {
      const ex = getEx(id);
      return `<div class="pr-row">
        <div class="pr-ex">${ex ? ex.name : id}</div>
        <div class="text-right">
          <div class="pr-val">${pr.weight}${settings.unit} × ${pr.reps}</div>
          <div class="pr-date">${fmtDate(pr.date)}</div>
        </div>
      </div>`;
    }).join('') || '<div style="color:var(--text3);font-size:14px;padding:12px 0">Completa entrenamientos para ver tus PRs</div>';

    // last 30 days workout frequency
    const today = new Date(); today.setHours(0,0,0,0);
    const cells = Array.from({length:30}, (_,i) => {
      const d = new Date(today); d.setDate(d.getDate() - (29 - i));
      const iso = d.toISOString().slice(0,10);
      const has = workouts.some(w => w.date.slice(0,10) === iso);
      const isToday = i === 29;
      return `<div class="week-cell ${has ? 'has-workout' : ''} ${isToday ? 'today' : ''}" title="${iso}"></div>`;
    }).join('');

    const volumeByWeek = getLast8WeeksVolume(workouts);

    main.innerHTML = `
      <div class="page-header"><div class="page-title">Progreso</div></div>

      <div class="card">
        <div class="card-title">Últimos 30 días</div>
        <div class="week-grid">${cells}</div>
        <div style="margin-top:10px;font-size:13px;color:var(--text2)">${workouts.filter(w => {
          const d = new Date(w.date); const now = new Date();
          return (now - d) < 30 * 86400000;
        }).length} entrenamientos este mes</div>
      </div>

      <div class="card">
        <div class="card-title">Volumen semanal (${settings.unit})</div>
        <canvas id="vol-chart" height="120"></canvas>
      </div>

      <div class="card">
        <div class="card-title">${icons.trophy} Récords personales</div>
        ${prRows}
      </div>`;

    drawVolumeChart('vol-chart', volumeByWeek);
  },

  profile() {
    const s = Store.getSettings();
    const main = document.getElementById('main');
    main.innerHTML = `
      <div class="page-header"><div class="page-title">Perfil</div></div>
      <div style="text-align:center;padding:20px 0">
        <div class="profile-avatar">🏋️</div>
        <div style="font-size:20px;font-weight:700">Mi Perfil</div>
        <div style="color:var(--text2);font-size:14px;margin-top:4px">${Store.getWorkouts().length} entrenos completados</div>
      </div>
      <div class="card">
        <div class="card-title">Configuración</div>
        <div class="setting-row">
          <div class="setting-label">Unidad de peso</div>
          <div class="setting-value">
            <button class="select-btn" onclick="toggleUnit()">${s.unit}</button>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-label">Tiempo de descanso</div>
          <div class="setting-value">
            <button class="select-btn" onclick="cycleRest()">${s.restTime}s</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Datos</div>
        <div class="setting-row">
          <div class="setting-label">Borrar todos los datos</div>
          <button class="btn btn-danger btn-sm" onclick="clearAllData()">Borrar</button>
        </div>
      </div>
      <div style="padding:20px 16px;text-align:center;color:var(--text3);font-size:13px">
        GymTracker v1.0 · Lyfta Clone<br>Hecho con 💜 para iPhone
      </div>`;
  }
};

// ── HELPER FUNCTIONS ─────────────────────────────────────────────────────────
function calcStreak(workouts) {
  if (!workouts.length) return 0;
  let streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const dates = [...new Set(workouts.map(w => w.date.slice(0,10)))].sort().reverse();
  let cur = new Date(today);
  for (const d of dates) {
    const wd = new Date(d);
    const diff = Math.round((cur - wd) / 86400000);
    if (diff <= 1) { streak++; cur = wd; }
    else break;
  }
  return streak;
}

function getLast8WeeksVolume(workouts) {
  const weeks = Array(8).fill(0);
  const now = Date.now();
  workouts.forEach(w => {
    const daysAgo = Math.floor((now - new Date(w.date)) / 86400000);
    const weekIdx = Math.floor(daysAgo / 7);
    if (weekIdx < 8) {
      weeks[7 - weekIdx] += w.exercises.reduce((s, ex) =>
        s + ex.sets.reduce((s2, set) => s2 + (set.completed ? (set.weight||0)*(set.reps||0) : 0), 0), 0);
    }
  });
  return weeks;
}

function drawVolumeChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width = canvas.parentElement.offsetWidth - 32;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const max = Math.max(...data, 1);
  const barW = (w - 16) / data.length;
  ctx.clearRect(0, 0, w, h);
  data.forEach((v, i) => {
    const barH = (v / max) * (h - 20);
    const x = 8 + i * barW + barW * 0.1;
    const bw = barW * 0.8;
    const grad = ctx.createLinearGradient(0, h - barH, 0, h);
    grad.addColorStop(0, '#7c3aed');
    grad.addColorStop(1, '#5b21b6');
    ctx.fillStyle = v > 0 ? grad : '#2a2a2a';
    ctx.beginPath();
    ctx.roundRect(x, h - barH - 2, bw, barH + 2, 4);
    ctx.fill();
  });
}

function searchExercises(q, filter) {
  const list = document.getElementById('ex-list');
  if (!list) return;
  const filtered = EXERCISES.filter(e =>
    (filter === 'Todos' || e.cat === filter) &&
    (!q || e.name.toLowerCase().includes(q.toLowerCase()) || e.muscles.some(m => m.toLowerCase().includes(q.toLowerCase())))
  );
  const settings = Store.getSettings();
  list.innerHTML = filtered.map(e => {
    const pr = Store.getPRs()[e.id];
    return `<div class="ex-item" onclick="Views.exerciseDetail('${e.id}')">
      <div class="ex-avatar">${e.emoji}</div>
      <div class="ex-info">
        <div class="ex-name">${e.name}</div>
        <div class="ex-meta">${e.cat} · ${e.eq} · ${e.muscles[0]}</div>
        ${pr ? `<div style="font-size:11px;color:var(--green);margin-top:1px">PR: ${pr.weight}${settings.unit} × ${pr.reps}</div>` : ''}
      </div>
      <div class="ex-chevron">${icons.chevron}</div>
    </div>`;
  }).join('');
}

function addToActive(exId) {
  if (!Store.getActive()) {
    if (confirm('No hay entrenamiento activo. ¿Iniciar uno nuevo?')) Workout.start();
    else return;
  }
  if (!Workout.get()) Workout.load();
  Workout.addExercise(exId);
}

function removeExercise(ei) {
  if (!confirm('¿Eliminar ejercicio?')) return;
  Workout.get().exercises.splice(ei, 1);
  Workout.save();
  Views.activeWorkout();
}

function cycleType(ei, si) {
  const s = Workout.get().exercises[ei].sets[si];
  const types = ['normal','warmup','drop'];
  s.type = types[(types.indexOf(s.type) + 1) % types.length];
  Workout.save();
  Views.activeWorkout();
}

function w_rename(val) {
  if (Workout.get()) { Workout.get().name = val; Workout.save(); }
}

function confirmFinish() {
  const w = Workout.get();
  const done = w.exercises.reduce((n, ex) => n + ex.sets.filter(s => s.completed).length, 0);
  if (done === 0 && !confirm('No has completado ninguna serie. ¿Finalizar igualmente?')) return;
  Workout.finish();
}

function confirmDiscard() {
  if (confirm('¿Descartar entrenamiento? Se perderán todos los datos.')) Workout.discard();
}

function startProgram(id) {
  Store.setProgram({ id, dayIdx: 0 });
  toast('¡Programa iniciado!');
  Router.back();
}

function stopProgram() {
  Store.clearProgram();
  toast('Programa detenido');
  Router.back();
}

function startProgramDay(programId, dayIdx) {
  const p = PROGRAMS.find(x => x.id === programId);
  if (!p) return;
  const day = p.days[dayIdx];
  const template = {
    name: `${p.name} – ${day.name}`,
    exercises: day.exercises.map(e => {
      const ex = getEx(e.id);
      return {
        exerciseId: e.id,
        name: ex ? ex.name : e.id,
        emoji: ex ? ex.emoji : '💪',
        muscles: ex ? ex.muscles : [],
        sets: Array.from({length: e.sets}, () => ({ reps: e.reps, weight: '', type: 'normal', completed: false }))
      };
    })
  };
  if (Store.getActive() && !confirm('Ya tienes un entreno activo. ¿Reemplazarlo?')) return;
  Workout.start(template);
}

function toggleUnit() {
  const s = Store.getSettings();
  s.unit = s.unit === 'kg' ? 'lbs' : 'kg';
  Store.saveSettings(s);
  Views.profile();
}

function cycleRest() {
  const s = Store.getSettings();
  const opts = [30, 60, 90, 120, 180, 240];
  const idx = opts.indexOf(s.restTime);
  s.restTime = opts[(idx + 1) % opts.length];
  Store.saveSettings(s);
  Views.profile();
}

function clearAllData() {
  if (confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) {
    localStorage.clear();
    toast('Datos borrados');
    Router.reset('home');
  }
}

// ── APP ───────────────────────────────────────────────────────────────────────
const App = {
  render(view, params = {}) {
    // update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = { home:'nav-home', exercises:'nav-ex', programs:'nav-prog', progress:'nav-prog2', profile:'nav-prof' };
    const navEl = document.getElementById(navMap[view]);
    if (navEl) navEl.classList.add('active');

    // render view
    const views = { home: Views.home, active: Views.activeWorkout, exercises: Views.exercises,
      programs: Views.programs, progress: Views.progress, profile: Views.profile,
      history: Views.history };
    if (views[view]) views[view].call(Views, params);
    document.getElementById('main').scrollTo(0, 0);
  },

  init() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');

    // check for active workout
    if (Workout.load()) {
      // has active workout, go home which will show banner
    }

    Router.reset('home');

    // nav listeners
    document.getElementById('nav-home').onclick = () => Router.reset('home');
    document.getElementById('nav-workout').onclick = () => {
      if (Store.getActive()) Router.go('active');
      else Views.startEmpty();
    };
    document.getElementById('nav-ex').onclick = () => Router.go('exercises');
    document.getElementById('nav-prog').onclick = () => Router.go('programs');
    document.getElementById('nav-prof').onclick = () => Router.go('profile');

    // modal search
    document.getElementById('modal-search').addEventListener('input', e => Modal._render(e.target.value));
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) Modal.close();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
