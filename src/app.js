
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('fieldCanvas'), ctx=canvas.getContext('2d');
const tctx=$('thresholdMap').getContext('2d'), gctx=$('grayMap').getContext('2d'), dctx=$('deviationMap').getContext('2d');
let state, timer, flashTimer, current=null, responsive=false, responded=false, fpWindow=false;
const VERSION='4.0.0';
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))};

function degreesForPattern(pattern){
  if(pattern==='10-2') return 10;
  if(pattern==='30-2') return 30;
  return 24;
}

function isQuickCheck(){
  const sel = $('pattern');
  const label = sel?.selectedOptions?.[0]?.textContent || '';
  return !!sel && (sel.value === '15-check' || /15\s*Flash\s*Check/i.test(label));
}
function pct(n,d){ return d ? Math.round(100*n/d) + '%' : 'N/A'; }
function quickShown(){ return state ? (state.stim || 0) : 0; }
function quickSeen(){ return state ? (state.seen || 0) : 0; }
function quickMissed(){ return Math.max(0, quickShown() - quickSeen()); }
function quickExtra(){ return state ? (state.extraPresses || 0) : 0; }
function quickAccuracy(){ return quickShown() ? Math.round(100*quickSeen()/quickShown()) + '%' : 'N/A'; }
function reliabilitySummary(){
  if(!state || !state.stim) return '—';
  if(isQuickCheck()) return quickAccuracy() + ' accuracy';
  const fixRate = state.fixTrials ? state.fixLossN/state.fixTrials : 0;
  const fpRate = state.fpTrials ? state.fpN/state.fpTrials : 0;
  const fnRate = state.fnTrials ? state.fnN/state.fnTrials : 0;
  if(fixRate > .20 || fpRate > .15 || fnRate > .25) return 'Low';
  if(fixRate > .10 || fpRate > .08 || fnRate > .15) return 'Borderline';
  return 'Good';
}

function pointsFor(pattern){
  const pts=[];
  if(pattern === '15-check' || pattern === '20-check'){
    const coords = [
      [0,8], [0,-8], [-8,0], [8,0],
      [-8,8], [8,8], [-8,-8], [8,-8],
      [-16,0], [16,0], [0,16], [0,-16],
      [-18,10], [18,10], [0,22]
    ];
    return coords.map(([x,y])=>({x,y}));
  }
  if(pattern==='10-2'){
    for(let x=-9;x<=9;x+=2) for(let y=-9;y<=9;y+=2) if(!(Math.abs(x)<1&&Math.abs(y)<1)) pts.push({x,y});
  } else {
    const max=pattern==='30-2'?27:21, lim=pattern==='30-2'?30:24;
    for(let x=-max;x<=max;x+=6) for(let y=-max;y<=max;y+=6){
      const ecc=Math.sqrt(x*x+y*y);
      if(ecc<=lim && !(Math.abs(x)<3&&Math.abs(y)<3)) pts.push({x,y});
    }
  }
  return pts;
}
function ageNorm(pt, age){
  const ecc=Math.sqrt(pt.x*pt.x+pt.y*pt.y);
  const agePenalty=Math.max(0,age-35)*0.055;
  return clamp(35.5 - ecc*0.24 - agePenalty + rand(-1.2,1.2), 4, 39);
}
function defectLoss(pt, defect, eye){
  const x=pt.x, y=pt.y, r=Math.sqrt(x*x+y*y);
  if(defect==='normal') return 0;
  if(defect==='mild_glaucoma'){
    const superiorArc = y>5 && y<19 && x>-22 && x<16 && Math.abs(y-(15-0.018*(x+5)*(x+5)))<6;
    const nasal = (eye==='Right'?x>12:x<-12) && Math.abs(y)<13;
    return superiorArc?rand(5,12):nasal?rand(4,10):0;
  }
  if(defect==='advanced_glaucoma'){
    const sup = y>0 && y<23 && x>-25 && x<19 && Math.abs(y-(15-0.016*(x+4)*(x+4)))<9;
    const inf = y<0 && y>-20 && x>-20 && x<20 && Math.abs(y+12-0.014*(x-4)*(x-4))<7;
    const nasal = (eye==='Right'?x>8:x<-8) && Math.abs(y)<17;
    return sup?rand(12,27):inf?rand(8,19):nasal?rand(9,22):0;
  }
  if(defect==='central') return r<8 ? rand(12,26)*(1-r/9) : 0;
  if(defect==='hemianopia') return x<0 ? rand(14,28) : 0;
  if(defect==='quadrantanopia') return (x<0 && y>0) ? rand(14,28) : 0;
  if(defect==='rim') return r>19 ? rand(10,25) : 0;
  if(defect==='random') return rand(0,24);
  return 0;
}
function buildPatientField(){
  const pattern=$('pattern').value, age=+$('age').value, defect=$('defect').value, eye=$('eye').value;
  return pointsFor(pattern).map((p,i)=>{
    const normal=ageNorm(p,age);
    const trueT=clamp(normal-defectLoss(p,defect,eye),0,39);
    return {...p,i,normal,trueT,est:null,seen:0,presented:0,lastDb:null};
  });
}
function strategyRepeats(){
  const strat=$('strategy').value, dur=$('duration').value;
  if(strat==='screen') return dur==='long'?2:1;
  if(strat==='full') return dur==='short'?2:dur==='long'?4:3;
  return dur==='short'?1:dur==='long'?3:2;
}
function buildSchedule(){
  let pts=buildPatientField();

  if(isQuickCheck()){
    pts = pts.slice(0,15);
    const sched = pts.map((p,i)=>({type:'stim',idx:i,round:0}));
    return {pts,sched};
  }

  const reps=strategyRepeats();
  let sched=[];
  pts.forEach((p,i)=>{for(let r=0;r<reps;r++) sched.push({type:'stim',idx:i,round:r});});
  const catchBase=Math.max(4,Math.round(pts.length*0.10));
  for(let i=0;i<catchBase;i++) sched.push({type:'fp'});
  for(let i=0;i<catchBase;i++) sched.push({type:'fix'});
  for(let i=0;i<Math.max(3,Math.round(pts.length*0.055));i++) sched.push({type:'fn'});
  sched.sort(()=>Math.random()-0.5);
  return {pts,sched};
}
function setupState(){
  const b=buildSchedule();
  state={running:false,paused:false,complete:false,start:0,elapsed:0,pts:b.pts,sched:b.sched,pos:0,
    stim:0,seen:0,missed:0,extraPresses:0,fixLossN:0,fixTrials:0,fpN:0,fpTrials:0,fnN:0,fnTrials:0,
    responseTimes:[],log:[],cal:{distance:+$('distance').value,screen:+$('screenSize').value}};
}
function pxPoint(x,y){
  const w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,R=w*.47,max=30;
  return {px:cx+(x/max)*R, py:cy-(y/max)*R, R, cx, cy};
}
function drawField(stim=null){
  const w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,R=w*.47;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#808080'; ctx.fillRect(0,0,w,h);
  const grad=ctx.createRadialGradient(cx,cy,R*.05,cx,cy,R);
  grad.addColorStop(0,'#848484'); grad.addColorStop(1,'#767676');
  ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();
  ctx.strokeStyle='rgba(235,235,235,.20)'; ctx.lineWidth=1;
  [10,20,30].forEach(d=>{ctx.beginPath();ctx.arc(cx,cy,R*d/30,0,Math.PI*2);ctx.stroke();});
  ctx.strokeStyle='rgba(235,235,235,.16)';
  for(let d=-30; d<=30; d+=10){
    ctx.beginPath(); ctx.moveTo(cx+d/30*R,cy-R); ctx.lineTo(cx+d/30*R,cy+R); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx-R,cy-d/30*R); ctx.lineTo(cx+R,cy-d/30*R); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle='rgba(255,255,255,.96)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(cx-14,cy);ctx.lineTo(cx-5,cy);ctx.moveTo(cx+5,cy);ctx.lineTo(cx+14,cy);
  ctx.moveTo(cx,cy-14);ctx.lineTo(cx,cy-5);ctx.moveTo(cx,cy+5);ctx.lineTo(cx,cy+14);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.95)';ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();
  if(stim){
    const pt=pxPoint(stim.x,stim.y);
    const lum=clamp(stim.db/39,0,1);
    const alpha=0.25+0.75*lum;
    const radius=stim.fix?5:clamp(4+(39-stim.db)*0.13,4,9);
    ctx.fillStyle=`rgba(255,255,255,${alpha})`;
    ctx.beginPath(); ctx.arc(pt.px,pt.py,radius,0,Math.PI*2); ctx.fill();
  }
}
function drawMap(mctx,mode){
  const W=320,H=320,cx=W/2,cy=H/2,R=W*.46;
  mctx.fillStyle=mode==='gray'?'#eeeeee':'#ffffff'; mctx.fillRect(0,0,W,H);
  mctx.strokeStyle='#222'; mctx.lineWidth=1; mctx.beginPath(); mctx.arc(cx,cy,R,0,Math.PI*2); mctx.stroke();
  mctx.strokeStyle='#bbb'; [10,20,30].forEach(d=>{mctx.beginPath();mctx.arc(cx,cy,R*d/30,0,Math.PI*2);mctx.stroke();});
  if(!state) return;
  state.pts.forEach(p=>{
    const val=p.est ?? p.trueT;
    const dev=val-p.normal;
    const px=cx+(p.x/30)*R, py=cy-(p.y/30)*R;
    if(mode==='threshold'){
      mctx.fillStyle='#111'; mctx.font='10px monospace'; mctx.textAlign='center'; mctx.textBaseline='middle';
      mctx.fillText(p.est===null?'—':Math.round(val),px,py);
    } else if(mode==='gray'){
      const shade=clamp(255-val*6.1,8,248);
      mctx.fillStyle=`rgb(${shade},${shade},${shade})`;
      mctx.beginPath();mctx.arc(px,py,7,0,Math.PI*2);mctx.fill();
    } else {
      let shade = dev>-4 ? 245 : dev>-8 ? 190 : dev>-14 ? 120 : 45;
      mctx.fillStyle=`rgb(${shade},${shade},${shade})`;
      mctx.beginPath();mctx.arc(px,py,7,0,Math.PI*2);mctx.fill();
    }
  });
}
function updateMaps(){drawMap(tctx,'threshold');drawMap(gctx,'gray');drawMap(dctx,'deviation');}
function setStatus(s){$('statusOverlay').textContent=s}
function elapsedSeconds(){return state.running?Math.floor((Date.now()-state.start+state.elapsed)/1000):Math.floor(state.elapsed/1000)}
function updateStats(){
  if(!state) return;
  const e=elapsedSeconds();
  $('elapsed').textContent=Math.floor(e/60)+':'+String(e%60).padStart(2,'0');
  $('stimCount').textContent=state.stim;
  $('seenCount').textContent=state.seen;

  if(isQuickCheck()){
    $('fixLoss').textContent='N/A';
    $('falsePos').textContent=`${quickExtra()} extra`;
    $('falseNeg').textContent=`${quickMissed()} / ${quickShown()} missed`;
    $('reliability').textContent=reliabilitySummary();
  } else {
    $('fixLoss').textContent=state.fixTrials?`${state.fixLossN} / ${state.fixTrials}`:'N/A';
    $('falsePos').textContent=state.fpTrials?`${state.fpN} / ${state.fpTrials}`:'N/A';
    $('falseNeg').textContent=state.fnTrials?`${state.fnN} / ${state.fnTrials}`:'N/A';
    $('reliability').textContent=reliabilitySummary();
  }

  $('meanRt').textContent=state.responseTimes.length?Math.round(mean(state.responseTimes))+' ms':'—';
  $('progress').textContent=state.sched.length?Math.round(100*state.pos/state.sched.length)+'%':'0%';
  $('miniHUD').textContent=`${$('pattern').selectedOptions[0].textContent} | ${state.pos}/${state.sched.length} | ${$('elapsed').textContent}`;
  if(state.complete) buildReport();
}
function recordResponse(){
  if(!state||!state.running||state.paused) return;

  if(isQuickCheck() && (!responsive || responded)){
    state.extraPresses++;
    state.log.push({t:Date.now(),event:'extra_press_15_check'});
    updateStats();
    return;
  }

  if(fpWindow){
    state.fpN++;
    state.log.push({t:Date.now(),event:'false_positive'});
    fpWindow=false;
    updateStats();
    return;
  }

  if(!responsive || responded) return;
  responded=true;
  const rt = current?.flashAt ? performance.now()-current.flashAt : null;
  if(rt) state.responseTimes.push(rt);

  if(current?.type==='stim'){
    const p=state.pts[current.idx]; p.seen++; state.seen++;
    const db=current.db; p.est = p.est===null ? db : clamp(p.est*0.55 + db*0.45,0,39); p.lastDb=db;
    state.log.push({t:Date.now(),event:'seen',x:p.x,y:p.y,db,rt});
  } else if(current?.type==='fix'){
    state.fixLossN++;
    state.log.push({t:Date.now(),event:'fixation_loss',rt});
  } else if(current?.type==='fn'){
    state.log.push({t:Date.now(),event:'fn_catch_seen_pass',x:current.x,y:current.y,db:current.db,rt});
  }
  updateStats(); updateMaps();
}
function dbForTrial(p, round){
  const strat=$('strategy').value;
  if(strat==='screen') return clamp(p.normal-6,0,39);
  if(strat==='full'){
    if(round===0) return clamp(p.normal-4,0,39);
    if(p.est===null) return clamp(p.normal-10,0,39);
    return clamp(p.est + rand(-4,4),0,39);
  }
  if(round===0) return clamp(p.normal-5,0,39);
  return p.est===null ? clamp(p.normal-12,0,39) : clamp(p.est+rand(-3.5,3.5),0,39);
}
function expectedSee(p, db){
  const sens=+$('sensitivity').value/100;
  const slope=+$('fatigue').value/100;
  const fatigueLoss = (state.pos/state.sched.length)*slope*0.35;
  const probability = sens * clamp((db-p.trueT+8)/16,0.03,0.99) * (1-fatigueLoss);
  return Math.random()<probability;
}
function nextTrial(){
  if(!state.running||state.paused) return;
  if(state.pos>=state.sched.length){finish();return}
  current=state.sched[state.pos++]; responded=false; responsive=false; fpWindow=false;
  drawField(); setStatus(`Running ${state.pos}/${state.sched.length}`);
  const iti=rand(650,1200);
  setTimeout(()=>{
    if(!state.running||state.paused) return;

    if(current.type==='fp'){
      state.fpTrials++; fpWindow=true;
      if(Math.random() < (+$('fpTendency').value/100)) setTimeout(recordResponse, rand(180,650));
      setTimeout(()=>{fpWindow=false; updateStats(); nextTrial();}, rand(900,1400));
      return;
    }

    let stim=null;
    if(current.type==='stim'){
      const p=state.pts[current.idx]; p.presented++; state.stim++;
      const db=dbForTrial(p,current.round);
      current.db=db; current.x=p.x; current.y=p.y;
      stim={x:p.x,y:p.y,db};
      current.autoSeen=expectedSee(p,db);
      if(current.autoSeen && $('autoPatient').checked) setTimeout(recordResponse, rand(260,680));
    } else if(current.type==='fix'){
      state.fixTrials++;
      const blindX=$('eye').value==='Right'?15:-15;
      current.x=blindX; current.y=-2; current.db=35;
      stim={x:blindX,y:-2,db:35,fix:true};
    } else if(current.type==='fn'){
      const seenPts=state.pts.filter(p=>p.seen>0);
      const p=seenPts.length?seenPts[Math.floor(Math.random()*seenPts.length)]:state.pts[Math.floor(Math.random()*state.pts.length)];
      state.fnTrials++; current.x=p.x; current.y=p.y; current.db=39; stim={x:p.x,y:p.y,db:39};
    }

    drawField(stim); responsive=true; current.flashAt=performance.now();
    flashTimer=setTimeout(()=>drawField(), +$('flashMs').value);

    setTimeout(()=>{
      responsive=false;
      if(current?.type==='stim'){
        const p=state.pts[current.idx];
        if(!responded){
          state.missed++;
          const estimate=clamp(current.db-rand(5,10),0,39);
          p.est = p.est===null ? estimate : clamp(p.est*0.70+estimate*0.30,0,39);
          state.log.push({t:Date.now(),event:'missed',x:p.x,y:p.y,db:current.db});
        }
      } else if(current?.type==='fn'){
        if(!responded){
          state.fnN++;
          state.log.push({t:Date.now(),event:'false_negative_missed_fn_catch',x:current.x,y:current.y,db:current.db});
        }
      }
      updateStats(); updateMaps(); setTimeout(nextTrial, rand(250,600));
    }, +$('responseWindow').value);
  },iti);
}
function start(){
  setupState(); state.running=true; state.start=Date.now(); drawField(); updateMaps(); updateStats(); setStatus('Starting…');
  timer=setInterval(updateStats,250); nextTrial();
}
function pause(){
  if(!state||!state.running) return;
  state.paused=!state.paused;
  if(state.paused){state.elapsed += Date.now()-state.start; setStatus('Paused'); $('pauseBtn').textContent='Resume'; drawField();}
  else{state.start=Date.now(); $('pauseBtn').textContent='Pause'; nextTrial();}
}
function finish(){
  state.running=false; state.complete=true; state.elapsed += Date.now()-state.start; clearInterval(timer); drawField(); updateStats(); updateMaps(); buildReport(); setStatus('Complete');
  $('startBtn').disabled=false; $('pauseBtn').disabled=true;
}
function reset(){
  clearInterval(timer); clearTimeout(flashTimer); setupState(); drawField(); updateStats(); updateMaps(); setStatus('Ready');
  $('report').textContent='No test completed.'; $('startBtn').disabled=false; $('pauseBtn').disabled=true; $('pauseBtn').textContent='Pause';
}
function reportMetrics(){
  const vals=state.pts.map(p=>p.est ?? p.trueT);
  const devs=state.pts.map((p,i)=>vals[i]-p.normal);
  const md=mean(devs), psd=sd(devs);
  const vfi=clamp(100 + md*2.2,0,100);
  return {vals,devs,md,psd,vfi};
}
function buildReport(){
  if(!state){
    $('report').textContent='No test completed.';
    return 'No test completed.';
  }
  const m=reportMetrics();
  let resultsText='';

  if(isQuickCheck()){
    resultsText=`Training results / FP-FN accounting
Mode: 15 Flash Check
Flashes shown: ${quickShown()}
Seen / responded: ${quickSeen()}/${quickShown()}
Missed flashes / FN-like: ${quickMissed()}/${quickShown()}
Extra presses / FP-like: ${quickExtra()}
Response accuracy: ${quickAccuracy()}

For 15 Flash Check:
FN-like means a flash was shown but no response was recorded.
FP-like means a response occurred outside an active flash window.`;
  } else {
    resultsText=`Training results / FP-FN accounting
Mode: HVF-style training
Stimuli presented: ${state.stim}
Seen responses: ${state.seen}
Fixation losses: ${state.fixTrials ? `${state.fixLossN}/${state.fixTrials} (${pct(state.fixLossN,state.fixTrials)})` : 'No fixation catch trials completed'}
False positives: ${state.fpTrials ? `${state.fpN}/${state.fpTrials} (${pct(state.fpN,state.fpTrials)})` : 'No FP catch trials completed'}
False negatives: ${state.fnTrials ? `${state.fnN}/${state.fnTrials} (${pct(state.fnN,state.fnTrials)})` : 'No FN catch trials completed'}
Reliability summary: ${reliabilitySummary()}

For HVF-style modes:
FP is a response during a no-stimulus catch window.
FN is no response to a bright stimulus at a location expected to be seen.
Fixation loss is a response to a blind-spot/fixation catch stimulus.`;
  }

  const txt=`HVF TRAINER PRO v${VERSION} — SIMULATED REPORT
Educational use only — NOT FOR CLINICAL DIAGNOSIS

Patient/training setup
Test: ${$('pattern').selectedOptions[0].textContent}   Eye: ${$('eye').value}
Strategy: ${$('strategy').selectedOptions[0].text}
Simulated defect: ${$('defect').selectedOptions[0].text}
Age: ${$('age').value}   Viewing distance: ${$('distance').value} cm

${resultsText}

Global indices, simulated
VFI approximation: ${m.vfi.toFixed(0)}%
Mean deviation: ${m.md.toFixed(1)} dB
Pattern SD: ${m.psd.toFixed(1)} dB
Elapsed: ${$('elapsed').textContent}
Mean response time: ${$('meanRt').textContent}

Important limitations
This app is an educational simulation. Do not use it for diagnosis, screening, treatment decisions, or patient records.`;
  $('report').textContent=txt;
  updateMaps();
  return txt;
}
function exportJSON(){
  const blob=new Blob([JSON.stringify({version:VERSION,generated:new Date().toISOString(),report:buildReport(),state},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='hvf-trainer-pro-simulated-result.json'; a.click();
}
$('startBtn').onclick=()=>{$('startBtn').disabled=true;$('pauseBtn').disabled=false;start()};
$('pauseBtn').onclick=pause; $('resetBtn').onclick=reset; $('responseBtn').onclick=recordResponse;
canvas.addEventListener('pointerdown',recordResponse);
document.addEventListener('keydown',e=>{if(e.code==='Space'||e.key==='Enter'){e.preventDefault();recordResponse();}});
['sensitivity','fpTendency','fatigue','flashMs','responseWindow'].forEach(id=>$(id).oninput=e=>$(id+'Val').textContent=e.target.value+(id==='flashMs'||id==='responseWindow'?' ms':'%'));
$('printBtn').onclick=()=>window.print();
$('copyBtn').onclick=async()=>{await navigator.clipboard.writeText(buildReport()); setStatus('Report copied');};
$('exportBtn').onclick=exportJSON;
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));}
setupState(); drawField(); updateMaps(); updateStats();


// v2.4 independent panel toggles
function closePanels(){
  $('leftPanel').classList.remove('open');
  $('rightPanel').classList.remove('open');
  document.body.classList.remove('focus-mode','hide-left','hide-right');
  setTimeout(resizeRedraw,80);
}
function toggleSettings(){
  document.body.classList.remove('focus-mode','hide-left','hide-right');
  $('leftPanel').classList.toggle('open');
  setTimeout(resizeRedraw,80);
}
function toggleReport(){
  document.body.classList.remove('focus-mode','hide-left','hide-right');
  $('rightPanel').classList.toggle('open');
  setTimeout(resizeRedraw,80);
}
function testView(){
  closePanels();
}
function resetView(){
  closePanels();
  drawField();
  updateMaps();
  setStatus('Test view');
}
$('settingsToggle').onclick = toggleSettings;
$('reportToggle').onclick = toggleReport;
$('focusModeBtn').textContent = 'Test View';
$('focusModeBtn').onclick = testView;
$('resetViewBtn').onclick = resetView;
if ($('exitFocusBtn')) $('exitFocusBtn').onclick = resetView;

document.querySelectorAll('.panelClose').forEach(btn => {
  btn.onclick = () => btn.closest('.panel').classList.remove('open');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePanels();
  if (e.key === '[') toggleSettings();
  if (e.key === ']') toggleReport();
});

function syncCanvasResolution(){
  const rect = canvas.getBoundingClientRect();
  const size = Math.max(320, Math.round(Math.min(rect.width, rect.height) * window.devicePixelRatio));
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
}
const originalResizeRedrawV24 = resizeRedraw;
resizeRedraw = function(){
  syncCanvasResolution();
  drawField();
  updateMaps();
};
setTimeout(resizeRedraw,100);



// v2.9: ensure report text/maps are generated immediately before Print/PDF
const originalPrintClickV29 = $('printBtn').onclick;
$('printBtn').onclick = () => {
  if (state) {
    buildReport();
    updateMaps();
  }
  $('rightPanel').classList.add('open');
  setTimeout(() => window.print(), 150);
};

// v4.0 variable point counts for clinical and training modes.
function selectedPointCountV40(){
  const el = $('pointCount');
  if(!el || el.value === 'standard') return null;
  const n = parseInt(el.value,10);
  return Number.isFinite(n) ? n : null;
}
function extentForPatternV40(pattern){
  if(pattern === '10-2') return 10;
  if(pattern === '30-2') return 30;
  return 24;
}
function generateVariableClinicalPointsV40(pattern, count){
  if(!count) return null;
  if(pattern === '15-check') return pointsFor(pattern);
  const extent = extentForPatternV40(pattern);
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for(let i=0;i<count;i++){
    const t = (i + 0.5) / count;
    const r = Math.sqrt(t) * extent;
    const a = i * golden;
    let x = r * Math.cos(a);
    let y = r * Math.sin(a);
    if(Math.abs(x) < 1.5 && Math.abs(y) < 1.5){ x += 3; y += 3; }
    pts.push({x: Math.round(x*10)/10, y: Math.round(y*10)/10});
  }
  return pts;
}
const originalPointsForV40 = pointsFor;
pointsFor = function(pattern){
  const n = selectedPointCountV40();
  if(n && pattern !== '15-check'){
    return generateVariableClinicalPointsV40(pattern, n);
  }
  return originalPointsForV40(pattern);
};
const originalBuildReportV40 = buildReport;
buildReport = function(){
  const txt = originalBuildReportV40();
  const n = selectedPointCountV40();
  if(state && $('report') && !isQuickCheck()){
    const setting = n ? (n + ' selected locations') : 'Clinical standard';
    $('report').textContent = $('report').textContent.replace(
      'Mode: HVF-style training',
      'Mode: HVF-style training\nPoint count setting: ' + setting
    );
    return $('report').textContent;
  }
  return txt;
};
if($('pointCount')){
  $('pointCount').addEventListener('change', ()=>{
    if(!state || !state.running){
      setupState();
      drawField();
      updateMaps();
      updateStats();
      setStatus('Point count updated');
    }
  });
}
