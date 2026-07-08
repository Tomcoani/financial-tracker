
// ══ PENSION ══
function renderPension(){
  const el=document.getElementById('pension-list');el.innerHTML='';
  (D.pension||[]).forEach((p,i)=>el.appendChild(mkPen(p,i)));
  renderPenSum();
}
function mkPen(p,i){
  const isKeren=(p.name||'').includes('השתלמות');
  const feeDepNum=parseFloat(p.feesDeposit)||0;
  const feeAccNum=parseFloat(p.feesAccum)||0;
  // deposit fees: keren target 0%, others 1.5%
  const feeDepTarget=isKeren?0:1.5;
  const feeDepClass=!p.feesDeposit?'':isKeren?(feeDepNum===0?'fee-good':'fee-bad'):(feeDepNum<=1.5?'fee-good':feeDepNum<=2?'fee-ok':'fee-bad');
  const feeDepHint=!p.feesDeposit?'':(isKeren?(feeDepNum===0?'✓ מצוין':'גבוה מדי'):(feeDepNum<=1.5?'✓ מצוין':feeDepNum<=2?'ניתן לשפר':'גבוה מדי'));
  // accum fees: keren target 0.6%, others 0.1%
  const feeAccTarget=isKeren?0.6:0.1;
  const feeAccClass=!p.feesAccum?'':feeAccNum<=(isKeren?0.6:0.1)?'fee-good':feeAccNum<=(isKeren?0.8:0.2)?'fee-ok':'fee-bad';
  const feeAccHint=!p.feesAccum?'':(feeAccNum<=(isKeren?0.6:0.1)?'✓ מצוין':feeAccNum<=(isKeren?0.8:0.2)?'ניתן לשפר':'גבוה מדי');
  const tracksHtml=(p.tracks||[{name:'',pct:''}]).map((t,ti)=>`
    <div class="track-row">
      <input value="${esc(t.name)}" placeholder="שם המסלול (לדוגמא: פנסיה 2060)" data-i="${i}" data-ti="${ti}" data-f="name" oninput="trackUpdate(this)"/>
      <div style="position:relative;min-width:0;overflow:hidden;">
        <input type="number" value="${t.pct||''}" placeholder="%" data-i="${i}" data-ti="${ti}" data-f="pct" oninput="trackUpdate(this)" style="width:100%;"/>
      </div>
      <button class="bdel" onclick="delTrack(${i},${ti})">×</button>
    </div>`).join('');
  const d=document.createElement('div');d.className='pen-card';
  d.innerHTML=`
    <div class="pen-head">
      <input class="pnin" value="${esc(p.name)}" placeholder="שם המוצר (${g('לחץ','לחצי')} לעריכה)" data-i="${i}" data-f="name" oninput="pu(this)"/>
      <div class="pbadge">${p.amount?fmt(parseFloat(p.amount)):''}</div>
      <button class="bdel" onclick="delPen(${i})">×</button>
    </div>
    <div class="pr2">
      <div class="pf"><label>סה"כ כסף (₪)</label><input type="number" value="${p.amount||''}" placeholder="0" data-i="${i}" data-f="amount" oninput="pu(this)" onblur="validateNum(this.value,'penAmount',this)"/></div>
      <div class="pf"><label>בית השקעות</label><input value="${esc(p.house)}" placeholder="הפניקס / הראל..." data-i="${i}" data-f="house" oninput="pu(this)"/></div>
    </div>
    <div class="pr2">
      <div class="pf">
        <label>דמי ניהול מהפקדה <span style="color:var(--t3)">(יעד: עד ${feeDepTarget}%${isKeren?' — 0% לקרן השתלמות':''})</span></label>
        <input type="number" value="${p.feesDeposit||''}" placeholder="%" data-i="${i}" data-f="feesDeposit" data-no-fmt oninput="pu(this)"/>
        ${feeDepHint?`<span class="fee-hint ${feeDepClass}">${feeDepHint}</span>`:''}
      </div>
      <div class="pf">
        <label>דמי ניהול מצבירה <span style="color:var(--t3)">(יעד: עד ${feeAccTarget}%)</span></label>
        <input type="number" value="${p.feesAccum||''}" placeholder="%" data-i="${i}" data-f="feesAccum" data-no-fmt oninput="pu(this)"/>
        ${feeAccHint?`<span class="fee-hint ${feeAccClass}">${feeAccHint}</span>`:''}
      </div>
    </div>
    <div class="pr2">
      <div class="pf"><label>תאריך בדיקה אחרונה <span style="font-size:10px;color:var(--t3);font-weight:400">— מתי בדקת לאחרונה כמה כסף יש לך?</span></label><input type="date" value="${p.date||''}" data-i="${i}" data-f="date" oninput="pu(this)"/></div>
    </div>
    <div class="pen-section-title">מסלולי השקעה</div>
    <div style="font-size:10px;color:var(--t3);margin-bottom:8px;display:grid;grid-template-columns:2fr 1fr 80px;gap:8px;text-align:right">
      <span>שם המסלול</span><span>% הקצאה</span><span></span>
    </div>
    <div id="tracks-${i}">${tracksHtml}</div>
    <button class="btnadd-sm" onclick="addTrack(${i})">+ הוסף מסלול</button>`;
  return d;
}
function pu(el){
  const i=+el.dataset.i,f=el.dataset.f;
  D.pension[i][f]=el.value;
  const badge=el.closest('.pen-card').querySelector('.pbadge');
  if(badge)badge.textContent=(parseFloat(D.pension[i].amount)||0)?fmt(parseFloat(D.pension[i].amount)):'';
  renderPenSum();autoSyncLocations();touchSection('pension');markDirty();
  // Only re-render fee hints on blur, not on every keypress
  if((f==='feesDeposit'||f==='feesAccum')&&el.tagName==='INPUT'){
    el.addEventListener('blur',()=>renderPension(),{once:true});
  }
}
function trackUpdate(el){
  const i=+el.dataset.i,ti=+el.dataset.ti,f=el.dataset.f;
  if(!D.pension[i].tracks)D.pension[i].tracks=[];
  if(!D.pension[i].tracks[ti])D.pension[i].tracks[ti]={name:'',pct:''};
  D.pension[i].tracks[ti][f]=el.value;
  markDirty();
}
function addTrack(i){
  if(!D.pension[i].tracks)D.pension[i].tracks=[];
  D.pension[i].tracks.push({name:'',pct:''});
  renderPension();markDirty();
}
function delTrack(i,ti){
  D.pension[i].tracks.splice(ti,1);
  if(!D.pension[i].tracks.length)D.pension[i].tracks=[{name:'',pct:''}];
  renderPension();markDirty();
}
function renderPenSum(){
  let pen=0,keren=0,other=0;
  (D.pension||[]).forEach(p=>{
    const val=parseFloat(p.amount)||0,n=(p.name||'').toLowerCase();
    if(n.includes('פנסי'))pen+=val;
    else if(n.includes('השתלמות'))keren+=val;
    else other+=val;
  });
  document.getElementById('pen-summary').innerHTML=`
    <div class="stat"><label>פנסיה</label><div class="val vt">${fmt(pen)}</div></div>
    <div class="stat"><label>קרן השתלמות</label><div class="val vg">${fmt(keren)}</div></div>
    <div class="stat"><label>סה"כ</label><div class="val va">${fmt(pen+keren+other)}</div></div>`;
}
function addPension(){D.pension.push({name:'',amount:'',date:'',house:'',feesDeposit:'',feesAccum:'',tracks:[{name:'',pct:''}]});renderPension();touchSection('pension');markDirty();}
function delPen(i){D.pension.splice(i,1);renderPension();markDirty();}
