// ── STORE ─────────────────────────────────────────────────────────────────────
const Store = {
  _get(k,d){try{const v=localStorage.getItem(k);return v!=null?JSON.parse(v):d;}catch{return d;}},
  _set(k,v){localStorage.setItem(k,JSON.stringify(v));},
  getWorkouts(){return this._get('workouts',[]);},
  saveWorkout(w){const ws=this.getWorkouts();ws.unshift(w);this._set('workouts',ws);},
  getActive(){return this._get('active',null);},
  setActive(w){this._set('active',w);},
  clearActive(){localStorage.removeItem('active');},
  getPRs(){return this._get('prs',{});},
  updatePR(id,weight,reps,date){
    const prs=this.getPRs();
    if(!prs[id]||weight>prs[id].weight)prs[id]={weight,reps,date};
    this._set('prs',prs);
  },
  getSettings(){return this._get('settings',{unit:'kg',restTime:90,name:'Atleta'});},
  saveSettings(s){this._set('settings',s);},
  getProgram(){return this._get('program',null);},
  setProgram(p){this._set('program',p);},
  clearProgram(){localStorage.removeItem('program');}
};

// ── ROUTER ────────────────────────────────────────────────────────────────────
const Router={
  stack:[],
  go(view,params={}){this.stack.push({view,params});App.render(view,params);},
  back(){
    this.stack.pop();
    const p=this.stack[this.stack.length-1]||{view:'home',params:{}};
    App.render(p.view,p.params);
  },
  reset(view){this.stack=[{view,params:{}}];App.render(view,{});}
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
const pad=n=>n>=10?n:'0'+n;
const fmtTime=s=>`${pad(Math.floor(s/60))}:${pad(s%60)}`;
const fmtDate=iso=>new Date(iso).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
const daysAgo=iso=>{
  const d=Math.floor((Date.now()-new Date(iso))/86400000);
  return d===0?'Hoy':d===1?'Ayer':`Hace ${d} días`;
};
const totalVol=(exs,unit)=>{
  let v=0;exs.forEach(ex=>ex.sets.forEach(s=>{if(s.completed)v+=(+s.weight||0)*(+s.reps||0);}));
  return v>0?`${v.toLocaleString()} ${unit}`:'—';
};
const getEx=id=>EXERCISES.find(e=>e.id===id);
const qs=(s,ctx=document)=>ctx.querySelector(s);
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.remove('hidden');
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.add('hidden'),2500);
}

// ── WORKOUT TIMER ─────────────────────────────────────────────────────────────
const WorkoutTimer={
  _start:null,_iv:null,
  start(savedStart){
    this._start=savedStart||Date.now();
    clearInterval(this._iv);
    this._iv=setInterval(()=>{
      const el=document.getElementById('aw-timer');
      if(el)el.textContent=fmtTime(this.elapsed());
    },1000);
  },
  stop(){clearInterval(this._iv);this._iv=null;},
  elapsed(){return this._start?Math.floor((Date.now()-this._start)/1000):0;},
  getStart(){return this._start;}
};

// ── REST TIMER ────────────────────────────────────────────────────────────────
const RestTimer={
  _total:0,_left:0,_iv:null,
  start(secs){
    this.stop();this._total=secs;this._left=secs;
    this._render();
    this._iv=setInterval(()=>{
      this._left--;
      if(this._left<=0){this.stop();this._hide();return;}
      this._render();
    },1000);
  },
  stop(){clearInterval(this._iv);this._iv=null;},
  skip(){this.stop();this._hide();},
  _hide(){const r=document.getElementById('rest-timer');if(r)r.remove();},
  _render(){
    let r=document.getElementById('rest-timer');
    if(!r){
      r=document.createElement('div');r.id='rest-timer';
      r.innerHTML=`<div class="rt-info"><div class="rt-label">⏱ Descanso</div><div class="rt-time" id="rt-time"></div><div class="rt-bar"><div class="rt-fill" id="rt-fill"></div></div></div><button class="rt-skip" onclick="RestTimer.skip()">Saltar ›</button>`;
      document.body.appendChild(r);
    }
    document.getElementById('rt-time').textContent=fmtTime(this._left);
    document.getElementById('rt-fill').style.width=(this._left/this._total*100)+'%';
  }
};

// ── MODAL ─────────────────────────────────────────────────────────────────────
const Modal={
  _cb:null,_filter:'Todos',
  open(cb){
    this._cb=cb;this._filter='Todos';
    document.getElementById('modal-overlay').classList.remove('hidden');
    this._render('');
    setTimeout(()=>qs('#modal-search')&&qs('#modal-search').focus(),100);
  },
  close(){document.getElementById('modal-overlay').classList.add('hidden');},
  pick(id){this.close();if(this._cb)this._cb(id);},
  setFilter(f){this._filter=f;this._render(qs('#modal-search').value||'');},
  _render(q){
    const list=qs('#modal-list');
    if(!list)return;
    const cats=['Todos','Pecho','Espalda','Hombros','Brazos','Piernas','Core','Cardio'];
    const chips=cats.map(c=>`<div class="filter-chip${this._filter===c?' active':''}" onclick="Modal.setFilter('${c}')">${c}</div>`).join('');
    const filtered=EXERCISES.filter(e=>(this._filter==='Todos'||e.cat===this._filter)&&(!q||e.name.toLowerCase().includes(q.toLowerCase())||e.muscles.some(m=>m.toLowerCase().includes(q.toLowerCase()))));
    list.innerHTML=`<div class="filter-scroll" style="padding:0 12px 10px">${chips}</div>
      <div class="ex-grid" style="padding:0 12px 16px">${filtered.map(e=>{
        const url=EXERCISE_IMGS[e.id];
        return `<div class="ex-card" onclick="Modal.pick('${e.id}')"
            onmouseenter="startExAnim('${e.id}',this.querySelector('.ex-card-img'))"
            onmouseleave="stopExAnim('${e.id}')">
          <div class="ex-card-img" data-wgerid="${e.id}">${url?`<img src="${url}" loading="lazy" onerror="this.style.display='none'">`:`<div class="ex-card-emoji" style="background:${catColor(e.cat)}22">${e.emoji}</div>`}</div>
          <div class="ex-card-body">
            <div class="ex-card-name">${e.name}</div>
            <div class="ex-card-cat">${e.muscles[0]}</div>
          </div>
        </div>`;}).join('')}</div>`;
    setTimeout(()=>applyWgerImages(list),100);
  }
};

function catColor(cat){
  return{Pecho:'#ef4444',Espalda:'#3b82f6',Hombros:'#8b5cf6',Brazos:'#f59e0b',Piernas:'#10b981',Core:'#06b6d4',Cardio:'#f97316'}[cat]||'#7c3aed';
}

const _B='https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const EXERCISE_IMGS={
  'e001':_B+'Barbell_Bench_Press_-_Medium_Grip/0.jpg',
  'e002':_B+'Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg',
  'e003':_B+'Barbell_Decline_Bench_Press/0.jpg',
  'e004':_B+'Dumbbell_Bench_Press/0.jpg',
  'e005':_B+'Dumbbell_Incline_Bench_Press/0.jpg',
  'e006':_B+'Dumbbell_Flyes/0.jpg',
  'e007':_B+'Cable_Crossovers/0.jpg',
  'e008':_B+'Pushups/0.jpg',
  'e009':_B+'Chest_Dip/0.jpg',
  'e012':_B+'Barbell_Deadlift/0.jpg',
  'e013':_B+'Bent_Over_Barbell_Row/0.jpg',
  'e015':_B+'Pullups/0.jpg',
  'e016':_B+'Chin-Ups/0.jpg',
  'e017':_B+'Wide-Grip_Lat_Pulldown/0.jpg',
  'e018':_B+'Seated_Cable_Rows/0.jpg',
  'e019':_B+'Dumbbell_One-Arm_Row/0.jpg',
  'e021':_B+'Romanian_Deadlift/0.jpg',
  'e022':_B+'Hyperextensions_(Back_Extensions)/0.jpg',
  'e024':_B+'Barbell_Shoulder_Press/0.jpg',
  'e025':_B+'Dumbbell_Shoulder_Press/0.jpg',
  'e026':_B+'Arnold_Dumbbell_Press/0.jpg',
  'e027':_B+'Dumbbell_Lateral_Raise/0.jpg',
  'e028':_B+'Dumbbell_Front_Raise/0.jpg',
  'e031':_B+'Barbell_Upright_Row/0.jpg',
  'e033':_B+'Barbell_Shrug/0.jpg',
  'e034':_B+'Barbell_Curl/0.jpg',
  'e035':_B+'EZ-Bar_Curl/0.jpg',
  'e036':_B+'Dumbbell_Alternate_Bicep_Curl/0.jpg',
  'e037':_B+'Hammer_Curls/0.jpg',
  'e039':_B+'Concentration_Curls/0.jpg',
  'e042':_B+'Barbell_Close-Grip_Bench_Press/0.jpg',
  'e045':_B+'Lying_Triceps_Press/0.jpg',
  'e050':_B+'Barbell_Squat/0.jpg',
  'e051':_B+'Barbell_Front_Squat/0.jpg',
  'e052':_B+'Leg_Press/0.jpg',
  'e053':_B+'Hack_Squat/0.jpg',
  'e054':_B+'Dumbbell_Bulgarian_Split_Squat/0.jpg',
  'e055':_B+'Dumbbell_Lunges/0.jpg',
  'e056':_B+'Leg_Extensions/0.jpg',
  'e057':_B+'Lying_Leg_Curls/0.jpg',
  'e058':_B+'Standing_Calf_Raises/0.jpg',
  'e060':_B+'Barbell_Hip_Thrust/0.jpg',
  'e065':_B+'Sumo_Deadlift/0.jpg',
  'e066':_B+'Crunch/0.jpg',
  'e067':_B+'Plank/0.jpg',
  'e069':_B+'Flat_Bench_Lying_Leg_Raise/0.jpg',
  'e077':_B+'Hanging_Leg_Raise/0.jpg',
};
function exImg(id,size){
  const url=EXERCISE_IMGS[id];
  const ex=getEx(id);
  const fallback=`<div class="ex-emoji-fb" style="background:${catColor(ex?.cat)}22;font-size:${size==='lg'?'52px':'24px'}">${ex?.emoji||'💪'}</div>`;
  if(!url)return fallback;
  return `<img class="ex-thumb${size==='lg'?' ex-thumb-lg':''}" src="${url}" onerror="this.outerHTML='${fallback.replace(/'/g,'&#39;')}'" loading="lazy">`;
}

// ── WGER IMAGE INTEGRATION (3D muscle figures, same source as Lyfta) ──────────
const WGER_NAMES={
  e001:'Bench Press',e002:'Incline Bench Press',e003:'Decline Bench Press',
  e004:'Dumbbell Bench Press',e005:'Dumbbell Incline Bench Press',
  e006:'Dumbbell Flyes',e007:'Cable Crossovers',e008:'Push-ups',
  e009:'Chest Dip',e010:'Chest Press',e011:'Pec Deck Fly',
  e012:'Barbell Deadlift',e013:'Bent Over Row',e014:'T-Bar Row',
  e015:'Pull-ups',e016:'Chin-ups',e017:'Lat Pulldown',
  e018:'Seated Cable Row',e019:'Dumbbell One Arm Row',
  e020:'Face Pull',e021:'Romanian Deadlift',e022:'Hyperextensions',
  e023:'Good Morning',e024:'Overhead Press',e025:'Dumbbell Shoulder Press',
  e026:'Arnold Press',e027:'Dumbbell Lateral Raise',e028:'Dumbbell Front Raise',
  e029:'Dumbbell Rear Delt Raise',e030:'Cable Lateral Raise',
  e031:'Upright Row',e032:'Shoulder Press Machine',e033:'Barbell Shrug',
  e034:'Barbell Curl',e035:'EZ Bar Curl',e036:'Dumbbell Curl',
  e037:'Hammer Curl',e038:'Preacher Curl',e039:'Concentration Curl',
  e040:'Cable Curl',e041:'Incline Dumbbell Curl',
  e042:'Close Grip Bench Press',e043:'Tricep Pushdown',
  e044:'Overhead Tricep Extension',e045:'Skull Crusher',e046:'Tricep Dips',
  e047:'Diamond Push-ups',e048:'Overhead Cable Tricep Extension',
  e050:'Barbell Squat',e051:'Front Squat',e052:'Leg Press',
  e053:'Hack Squat',e054:'Bulgarian Split Squat',
  e055:'Dumbbell Lunges',e056:'Leg Extension',e057:'Leg Curl',
  e058:'Standing Calf Raise',e059:'Seated Calf Raise',
  e060:'Hip Thrust',e061:'Glute Bridge',e062:'Box Jump',
  e063:'Step Up',e064:'Goblet Squat',e065:'Sumo Deadlift',
  e066:'Crunch',e067:'Plank',e068:'Russian Twist',
  e069:'Leg Raise',e070:'Cable Crunch',e071:'Ab Roller',
  e072:'V-Up',e073:'Bicycle Crunch',e074:'Mountain Climbers',
  e075:'Side Plank',e077:'Hanging Leg Raise',
};
const _wc={};
async function fetchWgerData(exId){
  if(_wc[exId]!==undefined)return _wc[exId];
  const stored=sessionStorage.getItem('wg3_'+exId);
  if(stored){const p=JSON.parse(stored);_wc[exId]=p;return p;}
  const name=WGER_NAMES[exId];
  if(!name){_wc[exId]=null;return null;}
  try{
    const r=await fetch(`https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(name)}&language=2&format=json`,{signal:AbortSignal.timeout(6000)});
    if(!r.ok){_wc[exId]=null;return null;}
    const d=await r.json();
    const sug=d.suggestions?.[0];
    if(!sug?.data){_wc[exId]=null;return null;}
    let imgUrl=sug.data.image||null;
    if(imgUrl&&!imgUrl.startsWith('http'))imgUrl='https://wger.de'+imgUrl;
    const result={img:imgUrl,baseId:sug.data.base_id||sug.data.id};
    _wc[exId]=result;
    if(imgUrl)try{sessionStorage.setItem('wg3_'+exId,JSON.stringify(result));}catch(e){}
    return result;
  }catch(e){_wc[exId]=null;return null;}
}
async function applyWgerImages(scope){
  const els=(scope||document).querySelectorAll('[data-wgerid]');
  els.forEach(async el=>{
    const exId=el.dataset.wgerid;
    const data=await fetchWgerData(exId);
    if(!data?.img)return;
    const existing=el.querySelector('img');
    if(existing){existing.src=data.img;existing.classList.add('wger-loaded');}
    else el.innerHTML=`<img src="${data.img}" class="wger-img wger-loaded" loading="lazy" onerror="this.style.display='none'">`;
  });
}

// ── 2-FRAME ANIMATION (0.jpg ↔ 1.jpg from free-exercise-db) ──────────────────
const _animTimers={};
function startExAnim(exId,el){
  const url0=EXERCISE_IMGS[exId];
  if(!url0)return;
  const url1=url0.replace('/0.jpg','/1.jpg');
  let frame=0;
  const img=el.querySelector('img');
  if(!img)return;
  _animTimers[exId]=setInterval(()=>{
    img.src=frame%2===0?url1:url0;
    frame++;
  },700);
}
function stopExAnim(exId){
  clearInterval(_animTimers[exId]);
  delete _animTimers[exId];
}

// ── WORKOUT LOGIC ─────────────────────────────────────────────────────────────
const Workout={
  _data:null,
  start(template){
    const w=template?JSON.parse(JSON.stringify(template)):{id:'',name:'Entrenamiento',date:'',exercises:[]};
    w.id=Date.now().toString();
    w.date=new Date().toISOString();
    w._timerStart=Date.now();
    this._data=w;
    Store.setActive(w);
    WorkoutTimer.start(w._timerStart);
    Router.go('active');
  },
  load(){
    const a=Store.getActive();
    if(a){this._data=a;WorkoutTimer.start(a._timerStart||Date.now());return true;}
    return false;
  },
  get(){return this._data;},
  save(){if(this._data){this._data._timerStart=WorkoutTimer.getStart();Store.setActive(this._data);}},
  addExercise(exId){
    const ex=getEx(exId);if(!ex)return;
    const prev=this._getPrev(exId);
    const defW=prev?prev.weight:'';
    const defR=prev?prev.reps:'';
    this._data.exercises.push({exerciseId:exId,name:ex.name,emoji:ex.emoji,muscles:ex.muscles,cat:ex.cat,
      sets:[{reps:defR,weight:defW,type:'normal',completed:false}]});
    this.save();Views.activeWorkout();
  },
  _getPrev(exId){
    for(const w of Store.getWorkouts()){
      const ex=w.exercises.find(e=>e.exerciseId===exId);
      if(ex){const done=ex.sets.filter(s=>s.completed&&s.weight);if(done.length)return done[done.length-1];}
    }
    return null;
  },
  addSet(ei){
    const ex=this._data.exercises[ei];
    const last=ex.sets[ex.sets.length-1]||{};
    ex.sets.push({reps:last.reps||'',weight:last.weight||'',type:'normal',completed:false});
    this.save();Views.activeWorkout();
  },
  removeSet(ei,si){
    this._data.exercises[ei].sets.splice(si,1);
    if(!this._data.exercises[ei].sets.length)this._data.exercises.splice(ei,1);
    this.save();Views.activeWorkout();
  },
  removeExercise(ei){
    this._data.exercises.splice(ei,1);
    this.save();Views.activeWorkout();
  },
  updateSet(ei,si,field,val){
    this._data.exercises[ei].sets[si][field]=val;
    this.save();
  },
  toggleComplete(ei,si){
    const s=this._data.exercises[ei].sets[si];
    s.completed=!s.completed;
    this.save();
    if(s.completed){
      const ex=this._data.exercises[ei];
      const w=parseFloat(s.weight),r=parseInt(s.reps);
      if(w&&r)Store.updatePR(ex.exerciseId,w,r,new Date().toISOString());
      RestTimer.start(Store.getSettings().restTime);
    }
    const row=document.querySelector(`[data-row="${ei}-${si}"]`);
    if(row){
      row.classList.toggle('completed',s.completed);
      const btn=row.querySelector('.set-check');
      if(btn)btn.innerHTML=s.completed?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':'';
      const num=row.querySelector('.set-num');
      if(num)num.textContent=si+1;
    }
  },
  cycleType(ei,si){
    const types=['normal','warmup','drop'];
    const s=this._data.exercises[ei].sets[si];
    s.type=types[(types.indexOf(s.type)+1)%types.length];
    this.save();Views.activeWorkout();
  },
  rename(val){if(this._data){this._data.name=val;this.save();}},
  finish(){
    const w=this._data;
    w.duration=WorkoutTimer.elapsed();
    WorkoutTimer.stop();
    Store.saveWorkout(w);Store.clearActive();
    this._data=null;
    toast('¡Entrenamiento guardado! 💪');
    Router.reset('home');
  },
  discard(){
    WorkoutTimer.stop();Store.clearActive();
    this._data=null;Router.reset('home');
  }
};

// ── MUSCLE SVG ────────────────────────────────────────────────────────────────
function muscleSVG(active=[]){
  const hi=m=>active.includes(m)?'var(--accent)':'#2a2a2a';
  const stroke=m=>active.includes(m)?'var(--accent2)':'#444';
  return `<svg viewBox="0 0 200 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:180px">
    <!-- Cabeza -->
    <ellipse cx="100" cy="28" rx="18" ry="22" fill="#1e1e1e" stroke="#444" stroke-width="1.5"/>
    <!-- Cuello -->
    <rect x="93" y="48" width="14" height="14" rx="4" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
    <!-- HOMBROS -->
    <ellipse cx="68" cy="74" rx="16" ry="12" fill="${hi('hombros')}" stroke="${stroke('hombros')}" stroke-width="1.5"/>
    <ellipse cx="132" cy="74" rx="16" ry="12" fill="${hi('hombros')}" stroke="${stroke('hombros')}" stroke-width="1.5"/>
    <!-- PECHO -->
    <path d="M84 62 Q100 58 116 62 L118 92 Q100 98 82 92 Z" fill="${hi('pecho')}" stroke="${stroke('pecho')}" stroke-width="1.5"/>
    <!-- TRÍCEPS (espalda brazo) -->
    <path d="M55 78 Q46 86 47 108 Q52 116 57 110 L60 88 Z" fill="${hi('triceps')}" stroke="${stroke('triceps')}" stroke-width="1.5"/>
    <path d="M145 78 Q154 86 153 108 Q148 116 143 110 L140 88 Z" fill="${hi('triceps')}" stroke="${stroke('triceps')}" stroke-width="1.5"/>
    <!-- BÍCEPS -->
    <path d="M60 88 Q52 96 53 112 Q58 120 63 114 L66 96 Z" fill="${hi('biceps')}" stroke="${stroke('biceps')}" stroke-width="1.5"/>
    <path d="M140 88 Q148 96 147 112 Q142 120 137 114 L134 96 Z" fill="${hi('biceps')}" stroke="${stroke('biceps')}" stroke-width="1.5"/>
    <!-- Antebrazos -->
    <path d="M53 112 Q48 128 52 142 Q57 148 62 142 L63 114 Z" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
    <path d="M147 112 Q152 128 148 142 Q143 148 138 142 L137 114 Z" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
    <!-- ABDOMINALES -->
    <rect x="88" y="94" width="24" height="12" rx="3" fill="${hi('abs')}" stroke="${stroke('abs')}" stroke-width="1.5"/>
    <rect x="88" y="110" width="24" height="12" rx="3" fill="${hi('abs')}" stroke="${stroke('abs')}" stroke-width="1.5"/>
    <rect x="88" y="126" width="24" height="12" rx="3" fill="${hi('abs')}" stroke="${stroke('abs')}" stroke-width="1.5"/>
    <!-- ESPALDA (detrás - representado como borde) -->
    <path d="M84 62 Q72 66 72 86 L82 92 Q84 72 100 70 Q116 72 118 92 L128 86 Q128 66 116 62 Q100 58 84 62Z" fill="${hi('espalda')}" stroke="${stroke('espalda')}" stroke-width="1.5" opacity="0.7"/>
    <!-- Cadera -->
    <path d="M82 140 Q70 148 70 162 L130 162 Q130 148 118 140Z" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
    <!-- CUÁDRICEPS -->
    <path d="M70 162 Q62 180 64 210 Q70 222 78 214 L82 180 L82 162Z" fill="${hi('cuadriceps')}" stroke="${stroke('cuadriceps')}" stroke-width="1.5"/>
    <path d="M130 162 Q138 180 136 210 Q130 222 122 214 L118 180 L118 162Z" fill="${hi('cuadriceps')}" stroke="${stroke('cuadriceps')}" stroke-width="1.5"/>
    <!-- ISQUIOTIBIALES (visible en la parte posterior) -->
    <path d="M74 214 Q70 234 72 254 Q78 264 84 256 L86 224 Q82 218 78 214Z" fill="${hi('isquiotibiales')}" stroke="${stroke('isquiotibiales')}" stroke-width="1.5"/>
    <path d="M126 214 Q130 234 128 254 Q122 264 116 256 L114 224 Q118 218 122 214Z" fill="${hi('isquiotibiales')}" stroke="${stroke('isquiotibiales')}" stroke-width="1.5"/>
    <!-- GLÚTEOS -->
    <ellipse cx="83" cy="170" rx="14" ry="18" fill="${hi('gluteos')}" stroke="${stroke('gluteos')}" stroke-width="1.5"/>
    <ellipse cx="117" cy="170" rx="14" ry="18" fill="${hi('gluteos')}" stroke="${stroke('gluteos')}" stroke-width="1.5"/>
    <!-- Rodillas -->
    <ellipse cx="78" cy="258" rx="10" ry="8" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
    <ellipse cx="122" cy="258" rx="10" ry="8" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
    <!-- Espinillas -->
    <path d="M68 266 Q66 294 68 316 Q74 324 82 320 L84 290 L80 266Z" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
    <path d="M132 266 Q134 294 132 316 Q126 324 118 320 L116 290 L120 266Z" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
    <!-- GEMELOS -->
    <path d="M64 266 Q58 284 60 306 Q66 318 74 312 L76 284 Q70 274 68 266Z" fill="${hi('gemelos')}" stroke="${stroke('gemelos')}" stroke-width="1.5"/>
    <path d="M136 266 Q142 284 140 306 Q134 318 126 312 L124 284 Q130 274 132 266Z" fill="${hi('gemelos')}" stroke="${stroke('gemelos')}" stroke-width="1.5"/>
    <!-- Pies -->
    <ellipse cx="70" cy="320" rx="12" ry="7" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
    <ellipse cx="130" cy="320" rx="12" ry="7" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
    <!-- LUMBAR -->
    <rect x="88" y="140" width="24" height="20" rx="4" fill="${hi('lumbar')}" stroke="${stroke('lumbar')}" stroke-width="1.5"/>
  </svg>`;
}

// ── VIEWS: HOME ───────────────────────────────────────────────────────────────
const Views={
  home(){
    const workouts=Store.getWorkouts(),active=Store.getActive(),s=Store.getSettings();
    const streak=calcStreak(workouts);
    const weekWorkouts=workouts.filter(w=>(Date.now()-new Date(w.date))<7*86400000);
    const weekVol=weekWorkouts.reduce((a,w)=>a+w.exercises.reduce((b,ex)=>b+ex.sets.reduce((c,s)=>c+(s.completed?(+s.weight||0)*(+s.reps||0):0),0),0),0);
    const weekTime=weekWorkouts.reduce((a,w)=>a+(w.duration||0),0);
    const recent=workouts.slice(0,5).map(w=>`
      <div class="history-card" onclick="Views.workoutDetail('${w.id}')">
        <div class="hc-icon">🏋️</div>
        <div class="hc-info">
          <div class="hc-name">${w.name}</div>
          <div class="hc-meta">${w.exercises.map(e=>e.name).slice(0,2).join(', ')}${w.exercises.length>2?` +${w.exercises.length-2} más`:''}</div>
        </div>
        <div class="hc-right">
          <div class="hc-date">${daysAgo(w.date)}</div>
          <div class="hc-vol">${totalVol(w.exercises,s.unit)}</div>
        </div>
      </div>`).join('');
    const hasWorkouts=workouts.length>0;
    document.getElementById('main').innerHTML=`
      <div class="home-hdr">
        <div class="home-hdr-title">Inicio</div>
        <div class="streak-badge">🔥 ${streak}</div>
      </div>
      ${active?`<div class="active-banner" onclick="Router.go('active')">
        <div class="ab-dot"></div>
        <div class="ab-info"><div class="ab-name">${active.name}</div><div class="ab-sub">Entrenamiento en curso · Toca para continuar</div></div>
        <div class="ab-btn">›</div>
      </div>`:''}
      <div class="home-weekly">
        <div class="home-weekly-hdr"><span class="home-weekly-ttl">Tu resumen semanal</span><span class="home-weekly-link" onclick="Router.go('progress')">Ver más</span></div>
        <div class="home-stats-row">
          <div class="home-stat"><div class="home-stat-val">${weekWorkouts.length}</div><div class="home-stat-lbl">Entrenamientos</div><div class="home-stat-badge">▲ ${weekWorkouts.length}</div></div>
          <div class="home-stat"><div class="home-stat-val">${Math.floor(weekTime/3600)}h${Math.floor((weekTime%3600)/60)>0?Math.floor((weekTime%3600)/60)+'m':''}</div><div class="home-stat-lbl">Duración</div><div class="home-stat-badge">▲ ${Math.floor(weekTime/3600)}h</div></div>
          <div class="home-stat"><div class="home-stat-val">${weekVol>=1000?(weekVol/1000).toFixed(1)+'t':weekVol+'kg'}</div><div class="home-stat-lbl">Volumen</div><div class="home-stat-badge home-stat-badge-grn">▲ ${weekVol>=1000?(weekVol/1000).toFixed(1)+'t':weekVol+'kg'}</div></div>
        </div>
      </div>
      <div class="home-divider"></div>
      ${!hasWorkouts?`
      <div class="home-cta">
        <div class="home-cta-ttl">¿Listo para entrenar?</div>
        <div class="home-cta-sub">Empieza tu entrenamiento y añade tus ejercicios favoritos. Tus estadísticas estarán listas al terminar.</div>
        <button class="btn-start-white" onclick="startEmpty()">Empezar mi primer entrenamiento</button>
      </div>`:`
      <div class="home-cta-compact">
        <button class="btn-start-white" onclick="startEmpty()">▶ Nuevo entrenamiento</button>
      </div>`}
      <div class="home-divider"></div>
      ${hasWorkouts?`<div class="section-row"><div class="section-ttl">Historial reciente</div><div class="section-link" onclick="Router.go('history')">Ver todo ›</div></div>${recent}`:''}
      <div style="padding:0 16px 12px">
        <div class="section-ttl" style="margin-bottom:10px">Programas populares</div>
        <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none">
          ${PROGRAMS.slice(0,3).map(p=>`<div class="prog-mini-card" style="background:linear-gradient(135deg,${p.color}88,${p.color}33)" onclick="Router.go('programs')">
            <div style="font-size:28px">${p.emoji}</div>
            <div style="font-size:12px;font-weight:700;margin-top:4px;line-height:1.2">${p.name}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.7);margin-top:2px">${p.daysPerWeek}d/sem · ${p.level}</div>
          </div>`).join('')}
        </div>
      </div>`;
  },

  workoutDetail(id){
    const w=Store.getWorkouts().find(x=>x.id===id);if(!w)return;
    const s=Store.getSettings();
    const main=document.getElementById('main');
    main.innerHTML=`
      <div class="subpage-header">
        <button class="back-btn" onclick="Router.back()">‹ Atrás</button>
        <div class="subpage-title">${w.name}</div>
      </div>
      <div style="padding:0 16px 12px">
        <div style="color:var(--text2);font-size:14px">${fmtDate(w.date)} · ⏱ ${fmtTime(w.duration||0)} · ${totalVol(w.exercises,s.unit)}</div>
      </div>
      ${w.exercises.map(ex=>`
        <div class="card" style="margin-bottom:10px">
          <div style="font-size:15px;font-weight:700;margin-bottom:8px">${ex.emoji||'💪'} ${ex.name}</div>
          ${ex.sets.filter(s=>s.completed).map((s,i)=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-top:1px solid var(--border);font-size:14px"><span>Serie ${i+1}</span><span style="color:var(--accent2);font-weight:600">${s.weight}${Store.getSettings().unit} × ${s.reps}</span></div>`).join('')}
        </div>`).join('')}
      <div style="padding:12px 16px 24px">
        <button class="btn btn-primary btn-block" onclick="repeatWorkout('${id}')">🔁 Repetir este entrenamiento</button>
      </div>`;
  },

  history(){
    const workouts=Store.getWorkouts(),s=Store.getSettings();
    const main=document.getElementById('main');
    const list=workouts.map(w=>`
      <div class="history-card" onclick="Views.workoutDetail('${w.id}')">
        <div class="hc-icon">🏋️</div>
        <div class="hc-info">
          <div class="hc-name">${w.name}</div>
          <div class="hc-meta">${w.exercises.length} ejercicios · ${fmtTime(w.duration||0)}</div>
        </div>
        <div class="hc-right">
          <div class="hc-date">${fmtDate(w.date)}</div>
          <div class="hc-vol">${totalVol(w.exercises,s.unit)}</div>
        </div>
      </div>`).join('')||`<div class="empty-state"><div class="es-icon">📋</div><h3>Sin historial</h3><p>Completa tu primer entrenamiento</p></div>`;
    main.innerHTML=`<div class="subpage-header"><button class="back-btn" onclick="Router.back()">‹ Atrás</button><div class="subpage-title">Historial</div></div>${list}`;
  }
};

// ── VIEW: ACTIVE WORKOUT ──────────────────────────────────────────────────────
Views.activeWorkout=function(){
  const w=Workout.get();if(!w){Router.reset('home');return;}
  const s=Store.getSettings();
  const blocks=w.exercises.map((ex,ei)=>{
    const prev=Workout._getPrev(ex.exerciseId);
    const rows=ex.sets.map((set,si)=>{
      const prevText=prev?`${prev.weight}${s.unit}×${prev.reps}`:'—';
      const typeLabel={normal:'N',warmup:'W',drop:'D'}[set.type]||'N';
      const typeClass={normal:'',warmup:'type-w',drop:'type-d'}[set.type]||'';
      return `<div class="set-row${set.completed?' completed':''}" data-row="${ei}-${si}">
        <div class="set-num">${si+1}</div>
        <div class="set-prev">${prevText}</div>
        <button class="set-type ${typeClass}" onclick="Workout.cycleType(${ei},${si})">${typeLabel}</button>
        <input class="set-inp" type="number" inputmode="decimal" placeholder="${s.unit}" value="${set.weight}"
          onchange="Workout.updateSet(${ei},${si},'weight',this.value)" onfocus="this.select()">
        <input class="set-inp" type="number" inputmode="numeric" placeholder="reps" value="${set.reps}"
          onchange="Workout.updateSet(${ei},${si},'reps',this.value)" onfocus="this.select()">
        <button class="set-check${set.completed?' done':''}" onclick="Workout.toggleComplete(${ei},${si})">
          ${set.completed?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':''}
        </button>
      </div>`;}).join('');
    const done=ex.sets.filter(s=>s.completed).length;
    return `<div class="ex-block">
      <div class="ex-block-hdr">
        <div class="ex-block-icon" style="background:${catColor(ex.cat||'Pecho')}22">${ex.emoji||'💪'}</div>
        <div class="ex-block-info">
          <div class="ex-block-name">${ex.name}</div>
          <div class="ex-block-sub">${(ex.muscles||[]).slice(0,2).join(' · ')} · ${done}/${ex.sets.length} series</div>
        </div>
        <button class="ex-block-del" onclick="Workout.removeExercise(${ei})">🗑</button>
      </div>
      <div class="sets-hdr">
        <span>#</span><span>Anterior</span><span>Tipo</span><span>${s.unit}</span><span>Reps</span><span>✓</span>
      </div>
      ${rows}
      <button class="add-set-btn" onclick="Workout.addSet(${ei})">+ Añadir serie</button>
    </div>`;}).join('');

  document.getElementById('main').innerHTML=`
    <div class="aw-top">
      <button class="aw-back" onclick="Router.reset('home')">‹</button>
      <input class="aw-name" value="${w.name}" onchange="Workout.rename(this.value)" placeholder="Nombre">
      <div class="aw-clock" id="aw-timer">${fmtTime(WorkoutTimer.elapsed())}</div>
    </div>
    ${blocks}
    <button class="add-ex-btn" onclick="Modal.open(id=>Workout.addExercise(id))">
      <span style="font-size:22px">＋</span> Añadir ejercicio
    </button>
    <div style="padding:12px 16px 8px">
      <button class="btn btn-green btn-block" onclick="confirmFinish()">✓ Finalizar entrenamiento</button>
      <button class="btn btn-danger btn-block" style="margin-top:8px" onclick="confirmDiscard()">✕ Descartar</button>
    </div>`;
  document.getElementById('main').scrollTo(0,document.getElementById('main').scrollHeight);
};

// ── VIEW: EXERCISES ───────────────────────────────────────────────────────────
Views.exercises=function(filter){
  filter=filter||'Todos';
  const cats=['Todos','Pecho','Espalda','Hombros','Brazos','Piernas','Core','Cardio'];
  const chips=cats.map(c=>`<button class="fchip${filter===c?' active':''}" onclick="Views.exercises('${c}')">${c}</button>`).join('');
  const s=Store.getSettings();
  const exs=EXERCISES.filter(e=>filter==='Todos'||e.cat===filter);
  const grid=exs.map(e=>{
    const pr=Store.getPRs()[e.id];
    const url=EXERCISE_IMGS[e.id];
    const catCol=catColor(e.cat);
    return `<div class="ex-card" onclick="Views.exerciseDetail('${e.id}')"
        onmouseenter="startExAnim('${e.id}',this.querySelector('.ex-card-img'))"
        onmouseleave="stopExAnim('${e.id}')"
        ontouchstart="startExAnim('${e.id}',this.querySelector('.ex-card-img'))"
        ontouchend="stopExAnim('${e.id}')">
      <div class="ex-card-img" data-wgerid="${e.id}">${url?`<img src="${url}" loading="lazy" onerror="this.style.display='none'">`:`<div class="ex-card-emoji" style="background:${catCol}22">${e.emoji}</div>`}</div>
      <div class="ex-card-body">
        <div class="ex-card-name">${e.name}</div>
        <div class="ex-card-cat">${e.muscles[0]}</div>
        ${pr?`<div class="ex-card-pr">🏆 ${pr.weight}${s.unit}×${pr.reps}</div>`:''}
      </div>
    </div>`;}).join('');
  document.getElementById('main').innerHTML=`
    <div class="page-hdr"><div class="page-ttl">Ejercicios</div><div style="color:var(--t3);font-size:13px">${exs.length} ejercicios</div></div>
    <div style="padding:0 16px 10px"><div class="search-box"><span class="search-ico">🔍</span><input class="search-inp" placeholder="Buscar ejercicio…" oninput="searchEx(this.value,'${filter}')"></div></div>
    <div class="fchips">${chips}</div>
    <div class="ex-grid" id="ex-list">${grid}</div>`;
  setTimeout(()=>applyWgerImages(),50);
};

Views.exerciseDetail=function(id){
  const ex=getEx(id);if(!ex)return;
  const pr=Store.getPRs()[id];
  const s=Store.getSettings();
  const history=Store.getWorkouts().filter(w=>w.exercises.some(e=>e.exerciseId===id)).slice(0,5);
  const color=catColor(ex.cat);
  const histHTML=history.map(w=>{
    const exd=w.exercises.find(e=>e.exerciseId===id);
    const best=exd.sets.filter(s=>s.completed&&s.weight).reduce((b,s)=>(!b||+s.weight>+b.weight)?s:b,null);
    return `<div class="hist-row"><span>${daysAgo(w.date)}</span><span style="color:var(--acc2);font-weight:600">${best?`${best.weight}${s.unit} × ${best.reps} reps`:'Sin datos'}</span></div>`;
  }).join('')||'<div style="color:var(--t3);font-size:14px;padding:8px 0">Sin historial todavía</div>';
  const stepsHTML=ex.steps?ex.steps.map((st,i)=>`<div class="step-row"><div class="step-num">${i+1}</div><div class="step-txt">${st}</div></div>`).join(''):'';
  const ytQuery=encodeURIComponent(ex.ytSearch||ex.name+' tecnica correcta español');
  const ytUrl=`https://www.youtube.com/results?search_query=${ytQuery}`;
  const img0=EXERCISE_IMGS[id]||'';
  const img1=img0?img0.replace('/0.jpg','/1.jpg'):'';
  document.getElementById('main').innerHTML=`
    <div class="subpage-header">
      <button class="back-btn" onclick="Router.back()">‹ Atrás</button>
      <div class="subpage-title">${ex.cat}</div>
    </div>
    <div class="ex-anim-hero" id="ex-anim-${id}">
      <div class="ex-anim-loading">
        ${img0?`<img id="ex-hero-img-${id}" src="${img0}" class="ex-anim-fallback">`:`<div style="font-size:60px;position:relative;z-index:1">${ex.emoji}</div>`}
      </div>
      <div class="ex-anim-overlay">
        <div style="font-size:22px;font-weight:800;line-height:1.2">${ex.name}</div>
        <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:4px">${ex.eq} · ${ex.cat}</div>
      </div>
      <div class="muscle-svg-hero">${muscleSVG(ex.muscleMap||[])}</div>
    </div>
    <div class="muscle-pills" style="padding:8px 16px 4px">${(ex.muscles||[]).map(m=>`<span class="mpill">${m}</span>`).join('')}</div>
    ${pr?`<div class="pr-banner">🥇 Récord Personal: <strong>${pr.weight}${s.unit} × ${pr.reps} reps</strong></div>`:''}
    <a href="${ytUrl}" target="_blank" class="yt-link-card">
      <div class="yt-link-left">
        <div class="yt-link-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#ff0000"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>
        </div>
        <div>
          <div class="yt-link-ttl">Ver demostración</div>
          <div class="yt-link-sub">${ex.ytSearch}</div>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </a>
    ${stepsHTML?`<div class="card"><div class="card-ttl">✅ Cómo hacerlo</div>${stepsHTML}</div>`:''}
    <div class="card"><div class="card-ttl">📖 Descripción</div><p style="font-size:14px;color:var(--t2);line-height:1.6">${ex.desc||''}</p></div>
    <div class="card"><div class="card-ttl">📊 Historial reciente</div>${histHTML}</div>
    <div style="padding:0 16px 8px;display:flex;gap:10px">
      <a href="${ytUrl}" target="_blank" class="btn btn-outline" style="flex:1;text-align:center;text-decoration:none">▶ YouTube</a>
      <button class="btn btn-primary" style="flex:1" onclick="addToActive('${id}')">＋ Añadir</button>
    </div>`;
  if(img0&&img1)loadWgerDetail(id);
};

// ── VIEW: PROGRAMS ────────────────────────────────────────────────────────────
Views.programs=function(){
  const activeP=Store.getProgram();
  const html=PROGRAMS.map(p=>`
    <div class="prog-card" onclick="Views.programDetail('${p.id}')">
      <div class="prog-card-top" style="background:linear-gradient(135deg,${p.color}55,${p.color}22)">
        <div style="font-size:48px">${p.emoji}</div>
        ${activeP&&activeP.id===p.id?'<div class="prog-active-pill">Activo</div>':''}
      </div>
      <div class="prog-card-body">
        <div class="prog-card-name">${p.name}</div>
        <div class="prog-card-desc">${p.desc}</div>
        <div class="prog-badges">
          <span class="pbadge" style="background:${p.color}33;color:${p.color}">${p.level}</span>
          <span class="pbadge pbadge-g">${p.daysPerWeek}d/semana</span>
          <span class="pbadge pbadge-m">${p.duration}</span>
        </div>
      </div>
    </div>`).join('');
  document.getElementById('main').innerHTML=`<div class="page-hdr"><div class="page-ttl">Programas</div></div>${html}`;
};

Views.programDetail=function(id){
  const p=PROGRAMS.find(x=>x.id===id);if(!p)return;
  const isActive=Store.getProgram()&&Store.getProgram().id===id;
  const days=p.days.map((d,di)=>{
    const rows=d.exercises.map(e=>{
      const ex=getEx(e.id);
      return `<div class="day-ex-row">
        <div class="day-ex-left"><div style="font-size:20px">${ex?ex.emoji:'💪'}</div><div><div style="font-size:14px;font-weight:600">${ex?ex.name:e.id}</div><div style="font-size:12px;color:var(--text2)">${e.sets}×${e.reps} · ${e.rest}s descanso</div></div></div>
        <div style="color:var(--text3);font-size:12px">${ex?(ex.muscles[0]):'—'}</div>
      </div>`;}).join('');
    return `<div class="day-block">
      <div class="day-block-hdr"><span>Día ${di+1}: ${d.name}</span>
        <button class="btn btn-sm btn-outline" onclick="startDay('${id}',${di})">Iniciar ›</button>
      </div>${rows}</div>`;}).join('');
  document.getElementById('main').innerHTML=`
    <div class="subpage-header"><button class="back-btn" onclick="Router.back()">‹ Atrás</button></div>
    <div class="prog-hero" style="background:linear-gradient(135deg,${p.color}44,${p.color}11)">
      <div style="font-size:60px">${p.emoji}</div>
      <div>
        <div style="font-size:22px;font-weight:800">${p.name}</div>
        <div style="color:var(--text2);font-size:13px;margin-top:4px">${p.desc}</div>
        <div class="prog-badges" style="margin-top:8px">
          <span class="pbadge" style="background:${p.color}33;color:${p.color}">${p.level}</span>
          <span class="pbadge pbadge-g">${p.daysPerWeek}d/sem</span>
          <span class="pbadge pbadge-m">${p.duration}</span>
        </div>
      </div>
    </div>
    <div style="padding:12px 16px">
      <button class="btn btn-block ${isActive?'btn-danger':'btn-primary'}" onclick="${isActive?'stopProgram()':'startProg(\''+id+'\')'}">
        ${isActive?'⛔ Dejar programa':'🚀 Empezar programa'}
      </button>
    </div>
    ${days}<div style="height:24px"></div>`;
};

// ── VIEW: PROGRESS ────────────────────────────────────────────────────────────
Views.progress=function(tab){
  tab=tab||'resumen';
  const s=Store.getSettings();
  const workouts=Store.getWorkouts();
  const prs=Store.getPRs();
  const tabs=['resumen','records','historial'].map(t=>`<button class="ptab${tab===t?' active':''}" onclick="Views.progress('${t}')">${{resumen:'Resumen',records:'Récords',historial:'Historial'}[t]}</button>`).join('');

  let body='';
  if(tab==='resumen'){
    const streak=calcStreak(workouts);
    const maxStreak=calcMaxStreak(workouts);
    const totalKg=workouts.reduce((a,w)=>a+w.exercises.reduce((b,ex)=>b+ex.sets.reduce((c,s)=>c+(s.completed?(+s.weight||0)*(+s.reps||0):0),0),0),0);
    const totalTime=workouts.reduce((a,w)=>a+(w.duration||0),0);
    const today=new Date();today.setHours(0,0,0,0);
    const cells=Array.from({length:60},(_,i)=>{
      const d=new Date(today);d.setDate(d.getDate()-(59-i));
      const iso=d.toISOString().slice(0,10);
      const has=workouts.some(w=>w.date.slice(0,10)===iso);
      const isT=i===59;
      return `<div class="cal-cell${has?' has':''}${isT?' today':''}" title="${iso}"></div>`;
    }).join('');
    body=`
      <div class="stats-grid" style="margin:0 16px 12px">
        <div class="stat-box"><div class="stat-val">${streak}</div><div class="stat-lbl">🔥 Racha</div></div>
        <div class="stat-box"><div class="stat-val">${maxStreak}</div><div class="stat-lbl">Récord racha</div></div>
        <div class="stat-box"><div class="stat-val">${workouts.length}</div><div class="stat-lbl">Entrenos</div></div>
        <div class="stat-box"><div class="stat-val">${(totalKg/1000).toFixed(1)}t</div><div class="stat-lbl">Vol. total</div></div>
        <div class="stat-box"><div class="stat-val">${Math.floor(totalTime/3600)}h</div><div class="stat-lbl">Tiempo</div></div>
        <div class="stat-box"><div class="stat-val">${Object.keys(prs).length}</div><div class="stat-lbl">PRs</div></div>
      </div>
      <div class="card"><div class="card-ttl">Últimos 60 días</div><div class="cal-grid">${cells}</div></div>
      <div class="card"><div class="card-ttl">Volumen semanal (${s.unit})</div><canvas id="vol-chart" height="120"></canvas></div>`;
  } else if(tab==='records'){
    const rows=Object.entries(prs).map(([id,pr])=>{
      const ex=getEx(id);
      return `<div class="pr-row" onclick="Views.exerciseDetail('${id}')">
        <div class="pr-emoji">${ex?ex.emoji:'💪'}</div>
        <div class="pr-info"><div style="font-size:14px;font-weight:600">${ex?ex.name:id}</div><div style="font-size:12px;color:var(--text3)">${fmtDate(pr.date)}</div></div>
        <div style="text-align:right"><div style="color:var(--accent2);font-weight:700;font-size:16px">${pr.weight}${s.unit}</div><div style="color:var(--text3);font-size:12px">× ${pr.reps} reps</div></div>
      </div>`;}).join('')||'<div class="empty-state"><div class="es-icon">🏆</div><h3>Sin récords aún</h3><p>Completa series para registrar tus PRs</p></div>';
    body=`<div class="card" style="margin-top:12px">${rows}</div>`;
  } else {
    body=`<div style="padding-top:8px">${workouts.slice(0,20).map(w=>`
      <div class="history-card" onclick="Views.workoutDetail('${w.id}')">
        <div class="hc-icon">🏋️</div>
        <div class="hc-info"><div class="hc-name">${w.name}</div><div class="hc-meta">${w.exercises.length} ejercicios · ${fmtTime(w.duration||0)}</div></div>
        <div class="hc-right"><div class="hc-date">${fmtDate(w.date)}</div><div class="hc-vol">${totalVol(w.exercises,s.unit)}</div></div>
      </div>`).join('')||'<div class="empty-state"><div class="es-icon">📋</div><h3>Sin historial</h3></div>'}</div>`;
  }
  document.getElementById('main').innerHTML=`
    <div class="page-hdr"><div class="page-ttl">Progreso</div></div>
    <div class="ptabs">${tabs}</div>${body}`;
  if(tab==='resumen')setTimeout(()=>drawChart('vol-chart',getLast8Weeks(workouts)),50);
};

// ── VIEW: PROFILE ─────────────────────────────────────────────────────────────
Views.profile=function(){
  const s=Store.getSettings();
  document.getElementById('main').innerHTML=`
    <div class="page-hdr"><div class="page-ttl">Perfil</div></div>
    <div style="text-align:center;padding:16px 0 20px">
      <div class="avatar-circle">🏋️</div>
      <div style="font-size:20px;font-weight:700;margin-top:8px">${s.name}</div>
      <div style="color:var(--text2);font-size:13px">${Store.getWorkouts().length} entrenamientos completados</div>
    </div>
    <div class="card">
      <div class="card-ttl">Configuración</div>
      <div class="setting-row"><span>Nombre</span><input class="setting-inp" value="${s.name}" onchange="saveName(this.value)" placeholder="Tu nombre"></div>
      <div class="setting-row"><span>Unidades</span><button class="toggle-btn" onclick="toggleUnit()">${s.unit==='kg'?'kg ⇄ lbs':'lbs ⇄ kg'}</button></div>
      <div class="setting-row"><span>Descanso entre series</span><button class="toggle-btn" onclick="cycleRest()">${s.restTime}s</button></div>
    </div>
    <div class="card">
      <div class="card-ttl">Datos</div>
      <div class="setting-row"><span>Exportar datos</span><button class="toggle-btn" onclick="exportData()">Exportar JSON</button></div>
      <div class="setting-row"><span>Borrar todo</span><button class="toggle-btn" style="color:var(--red)" onclick="clearAll()">Borrar</button></div>
    </div>
    <div style="text-align:center;color:var(--text3);font-size:12px;padding:20px">GymTracker v2.0 · Réplica de Lyfta</div>`;
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function calcStreak(ws){
  if(!ws.length)return 0;
  let streak=0;
  const today=new Date();today.setHours(0,0,0,0);
  const dates=[...new Set(ws.map(w=>w.date.slice(0,10)))].sort().reverse();
  let cur=new Date(today);
  for(const d of dates){const wd=new Date(d);const diff=Math.round((cur-wd)/86400000);if(diff<=1){streak++;cur=wd;}else break;}
  return streak;
}
function calcMaxStreak(ws){
  if(!ws.length)return 0;
  const dates=[...new Set(ws.map(w=>w.date.slice(0,10)))].sort();
  let max=1,cur=1;
  for(let i=1;i<dates.length;i++){
    const diff=(new Date(dates[i])-new Date(dates[i-1]))/86400000;
    if(diff===1){cur++;max=Math.max(max,cur);}else cur=1;
  }
  return max;
}
function getLast8Weeks(ws){
  const weeks=Array(8).fill(0);const now=Date.now();
  ws.forEach(w=>{
    const dAgo=Math.floor((now-new Date(w.date))/86400000);
    const idx=Math.floor(dAgo/7);
    if(idx<8)weeks[7-idx]+=w.exercises.reduce((a,ex)=>a+ex.sets.reduce((b,s)=>b+(s.completed?(+s.weight||0)*(+s.reps||0):0),0),0);
  });
  return weeks;
}
function drawChart(id,data){
  const canvas=document.getElementById(id);if(!canvas)return;
  canvas.width=canvas.parentElement.clientWidth-32;
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,max=Math.max(...data,1);
  ctx.clearRect(0,0,w,h);
  const bw=(w-20)/data.length;
  data.forEach((v,i)=>{
    const bh=Math.max((v/max)*(h-24),v>0?4:0);
    const x=10+i*bw+bw*.1,bww=bw*.8;
    const g=ctx.createLinearGradient(0,h-bh,0,h);
    g.addColorStop(0,'#7c3aed');g.addColorStop(1,'#4c1d95');
    ctx.fillStyle=v>0?g:'#2a2a2a';
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(x,h-bh-4,bww,bh,4);
    else ctx.rect(x,h-bh-4,bww,bh);
    ctx.fill();
    const lbl=['S-7','S-6','S-5','S-4','S-3','S-2','S-1','Hoy'][i];
    ctx.fillStyle='#6b7280';ctx.font='10px sans-serif';ctx.textAlign='center';
    ctx.fillText(lbl,x+bww/2,h-1);
  });
}
function searchEx(q,filter){
  const list=document.getElementById('ex-list');if(!list)return;
  const s=Store.getSettings();
  const filtered=EXERCISES.filter(e=>(filter==='Todos'||e.cat===filter)&&(!q||e.name.toLowerCase().includes(q.toLowerCase())||e.muscles.some(m=>m.toLowerCase().includes(q.toLowerCase()))));
  list.className='ex-grid';
  list.innerHTML=filtered.map(e=>{
    const pr=Store.getPRs()[e.id];
    const url=EXERCISE_IMGS[e.id];
    return `<div class="ex-card" onclick="Views.exerciseDetail('${e.id}')">
      <div class="ex-card-img">${url?`<img src="${url}" loading="lazy" onerror="this.style.display='none'">`:`<div class="ex-card-emoji" style="background:${catColor(e.cat)}22">${e.emoji}</div>`}</div>
      <div class="ex-card-body">
        <div class="ex-card-name">${e.name}</div>
        <div class="ex-card-cat">${e.muscles[0]}</div>
        ${pr?`<div class="ex-card-pr">🏆 ${pr.weight}${s.unit}×${pr.reps}</div>`:''}
      </div>
    </div>`;}).join('');
}
function addToActive(id){
  if(!Store.getActive()&&!Workout.get()){if(confirm('No hay entrenamiento activo. ¿Iniciar uno nuevo?'))Workout.start();else return;}
  if(!Workout.get())Workout.load();
  Workout.addExercise(id);
}
function startEmpty(){
  if(Store.getActive()){if(!confirm('Ya hay un entrenamiento activo. ¿Descartarlo?'))return;Workout.discard();return;}
  Workout.start();
}
function repeatWorkout(id){
  const w=Store.getWorkouts().find(x=>x.id===id);if(!w)return;
  Workout.start({name:w.name,exercises:w.exercises.map(ex=>({...ex,sets:ex.sets.map(s=>({...s,completed:false}))}))});
}
function confirmFinish(){
  const w=Workout.get();if(!w)return;
  const done=w.exercises.reduce((n,ex)=>n+ex.sets.filter(s=>s.completed).length,0);
  if(!done&&!confirm('No completaste ninguna serie. ¿Finalizar igual?'))return;
  Workout.finish();
}
function confirmDiscard(){if(confirm('¿Descartar entrenamiento? Se perderán los datos.'))Workout.discard();}
function startProg(id){Store.setProgram({id});toast('¡Programa iniciado! 🎯');Router.back();}
function stopProgram(){Store.clearProgram();toast('Programa detenido');Router.back();}
function startDay(progId,dayIdx){
  const p=PROGRAMS.find(x=>x.id===progId);if(!p)return;
  const day=p.days[dayIdx];
  const template={name:`${p.name} – ${day.name}`,exercises:day.exercises.map(e=>{
    const ex=getEx(e.id);
    return{exerciseId:e.id,name:ex?ex.name:e.id,emoji:ex?ex.emoji:'💪',muscles:ex?ex.muscles:[],cat:ex?ex.cat:'',
      sets:Array.from({length:e.sets},()=>({reps:e.reps,weight:'',type:'normal',completed:false}))};})};
  if(Store.getActive()&&!confirm('Ya hay un entreno activo. ¿Reemplazarlo?'))return;
  Workout.start(template);
}
function toggleUnit(){const s=Store.getSettings();s.unit=s.unit==='kg'?'lbs':'kg';Store.saveSettings(s);Views.profile();}
function cycleRest(){const s=Store.getSettings();const opts=[30,60,90,120,180,240];s.restTime=opts[(opts.indexOf(s.restTime)+1)%opts.length];Store.saveSettings(s);Views.profile();}
function saveName(v){const s=Store.getSettings();s.name=v;Store.saveSettings(s);}
function exportData(){
  const data={workouts:Store.getWorkouts(),prs:Store.getPRs(),settings:Store.getSettings()};
  const a=document.createElement('a');a.href='data:application/json,'+encodeURIComponent(JSON.stringify(data,null,2));
  a.download='gymtracker-backup.json';a.click();
}
function clearAll(){if(confirm('¿Borrar TODOS los datos? Esto no se puede deshacer.')){localStorage.clear();toast('Datos borrados');Router.reset('home');}}
async function loadWgerDetail(exId){
  const url0=EXERCISE_IMGS[exId];
  if(url0){
    const url1=url0.replace('/0.jpg','/1.jpg');
    const heroImg=document.getElementById('ex-hero-img-'+exId);
    if(heroImg){
      let frame=0;
      setInterval(()=>{
        heroImg.src=frame%2===0?url1:url0;
        frame++;
      },900);
    }
  }
  const data=await fetchWgerData(exId);
  if(!data?.img)return;
  const heroImg=document.getElementById('ex-hero-img-'+exId);
  if(heroImg){heroImg.src=data.img;heroImg.classList.add('wger-loaded');}
  const thumb=document.getElementById('video-thumb-'+exId);
  if(thumb)thumb.style.backgroundImage=`url('${data.img}')`;
}
function loadVideo(id,embedUrl,ytUrl){
  const wrap=document.getElementById('video-wrap-'+id);
  if(!wrap)return;
  wrap.innerHTML=`<div class="video-iframe-wrap">
    <iframe src="${embedUrl}" frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen loading="lazy"
      onerror="this.parentNode.innerHTML='<a href=\\'${ytUrl}\\' target=\\'_blank\\' class=\\'video-fallback\\'>▶ Ver en YouTube →</a>'">
    </iframe>
  </div>`;
}
function calcORM(id){
  const pr=Store.getPRs()[id];
  if(!pr){toast('Necesitas un PR registrado primero');return;}
  const orm=(pr.weight*(1+pr.reps/30)).toFixed(1);
  const s=Store.getSettings();
  alert(`1RM estimado para ${getEx(id)?.name||id}:\n\n${orm} ${s.unit}\n\n(Fórmula Epley: peso × (1 + reps/30))\nBased en PR: ${pr.weight}${s.unit} × ${pr.reps} reps`);
}

// ── APP ───────────────────────────────────────────────────────────────────────
const App={
  render(view,params={}){
    const navIds={home:'nav-home',active:'nav-workout',exercises:'nav-ex',programs:'nav-prog',progress:'nav-prog',profile:'nav-prof',history:'nav-home'};
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    const nEl=document.getElementById(navIds[view]||'nav-home');
    if(nEl)nEl.classList.add('active');
    const viewFns={home:Views.home,active:Views.activeWorkout,exercises:Views.exercises,programs:Views.programs,progress:Views.progress,profile:Views.profile,history:Views.history,workoutDetail:()=>Views.workoutDetail(params.id)};
    if(viewFns[view])viewFns[view](params);
    const m=document.getElementById('main');if(m)m.scrollTop=0;
  },
  init(){
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
    Workout.load();
    Router.reset('home');
    document.getElementById('nav-home').onclick=()=>Router.reset('home');
    document.getElementById('nav-workout').onclick=()=>{if(Store.getActive()||Workout.get())Router.go('active');else startEmpty();};
    document.getElementById('nav-ex').onclick=()=>Router.go('exercises');
    document.getElementById('nav-prog').onclick=()=>Router.go('programs');
    document.getElementById('nav-prof').onclick=()=>Router.go('profile');
    const ms=document.getElementById('modal-search');
    if(ms)ms.addEventListener('input',e=>Modal._render(e.target.value));
    const mo=document.getElementById('modal-overlay');
    if(mo)mo.addEventListener('click',e=>{if(e.target===mo)Modal.close();});
  }
};
document.addEventListener('DOMContentLoaded',()=>App.init());
