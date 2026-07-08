
// ══ CASH FLOW CALCULATOR ══
function calcCashFlow(){
  // Strip thousands commas so "10,000" parses as 10000 not 10
  const balance=parseFloat((document.getElementById('cf-balance')?.value||'').replace(/,/g,''))||0;
  const zero=parseFloat((document.getElementById('cf-zero')?.value||'').replace(/,/g,''))||0;
  const fixedTotal=(D.cfFixedExpenses||[]).reduce((s,r)=>s+(parseFloat(String(r.amount||0).replace(/,/g,''))||0),0);
  const credit=parseFloat((document.getElementById('cf-credit')?.value||'').replace(/,/g,''))||0;
  const additional=parseFloat((document.getElementById('cf-expenses')?.value||'').replace(/,/g,''))||0;
  const expenses=fixedTotal+credit+additional;
  const cur=(document.getElementById('cf-currency')?.value)||D.cfCurrency||'ILS';
  const el=document.getElementById('cf-result');
  if(!balance&&!zero&&!expenses){el.style.display='none';return;}
  const available=balance-zero-expenses;
  const availableILS=toILS(available,cur);
  el.style.display='block';
  if(available>0){
    D.monthly=String(availableILS);
    const mi=document.getElementById('monthly');
    if(mi)mi.value=availableILS;
    el.className='cf-result good';
    el.innerHTML=`מעולה! 🎉<br>יש לך <strong>${fmtCur(available,cur)}</strong> ש${g('אתה יכול','את יכולה')} להשקיע החודש`+cfAllocationHint();
  } else {
    D.monthly='0';
    const mi=document.getElementById('monthly');
    if(mi)mi.value=0;
    el.className='cf-result bad';
    el.innerHTML=`היי, החודש נראה שאין לך מספיק כדי להשקיע.<br>ממליץ לבדוק מה קרה החודש ולשפר לחודש הבא 💪`;
  }
  markDirty();
}

// "Where should the free money go?" — urgent goals first, otherwise the portfolio.
// The portfolio is treated as an ongoing, no-target destination for free money.
function cfAllocationHint(){
  const urgent=(D.goals||[]).filter(gl=>!gl.done&&(gl.name||'').trim()&&(gl.h||0)===0)
    .map(gl=>({name:gl.name,gap:(parseFloat(gl.needed)||0)-(parseFloat(gl.saved)||0)}))
    .filter(x=>x.gap>0);
  const portTotal=(D.portfolios||[]).flatMap(p=>p.items||[]).reduce((s,p)=>s+(parseFloat(p.value)||0),0);
  let html='<div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.2);text-align:right;font-size:12.5px;font-weight:400;line-height:1.7">';
  html+='<div style="font-weight:800;margin-bottom:4px">לאן להעביר את הכסף? 🤔</div>';
  if(urgent.length){
    html+='יש לך מטרות דחופות (טווח עד 12 חודשים) שעוד חסר בהן כסף — מומלץ להשלים אותן קודם:';
    html+='<div style="margin:6px 0">'+urgent.map(u=>
      `<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0">
        <span>🎯 ${esc(u.name)}</span><span style="font-weight:700;white-space:nowrap">חסרים ${fmt(u.gap)}</span>
      </div>`).join('')+'</div>';
    html+='<div style="font-size:11.5px;opacity:.85">נשאר עודף אחרי השלמת המטרות? הוא עובר לתיק ההשקעות 📈</div>';
  } else {
    html+='אין כרגע מטרות דחופות שחסר בהן כסף — הכסף הפנוי עובר לתיק ההשקעות 📈';
    html+='<div style="font-size:11.5px;opacity:.85;margin-top:2px">תיק ההשקעות הוא "מטרה שוטפת" — אין לו סכום יעד, פשוט מפקידים אליו את מה שפנוי כל חודש.</div>';
  }
  if(portTotal>0)html+=`<div style="margin-top:8px">💼 בתיק ההשקעות שלך יש כרגע <strong>${fmt(portTotal)}</strong></div>`;
  html+='</div>';
  return html;
}

function renderCfFixed(){
  const el=document.getElementById('cf-fixed-expenses');
  if(!el)return;
  if(!D.cfFixedExpenses)D.cfFixedExpenses=[];
  el.innerHTML='';
  if(!D.cfFixedExpenses.length){
    el.innerHTML='<div style="font-size:12px;color:var(--t3);padding:3px 0">לא הוגדרו הוצאות קבועות עדיין</div>';
    return;
  }
  D.cfFixedExpenses.forEach((row,i)=>{
    const div=document.createElement('div');
    div.style.cssText='display:flex;gap:8px;align-items:center;margin-bottom:6px';
    div.innerHTML=`
      <input type="text" placeholder='שכ"ד, ביטוחים...'
        value="${esc(row.name||'')}"
        oninput="D.cfFixedExpenses[${i}].name=this.value;markDirty()"
        style="flex:1;min-width:0;background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--t1);font-family:var(--font);font-size:13px;padding:7px 10px;direction:rtl"/>
      <input type="number" placeholder="0"
        value="${row.amount||''}"
        oninput="D.cfFixedExpenses[${i}].amount=this.value;markDirty();calcCashFlow()"
        style="width:100px;background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--t1);font-family:var(--font);font-size:13px;padding:7px 10px"
        data-no-fmt/>
      <button onclick="removeCfFixed(${i})"
        style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:18px;padding:0 2px;line-height:1;flex-shrink:0">×</button>`;
    el.appendChild(div);
  });
  const total=D.cfFixedExpenses.reduce((s,r)=>s+(parseFloat(String(r.amount||0).replace(/,/g,''))||0),0);
  if(total>0){
    const cur=D.cfCurrency||'ILS';
    const tot=document.createElement('div');
    tot.style.cssText='display:flex;justify-content:space-between;padding:6px 0 2px;border-top:1px solid var(--border);margin-top:2px';
    tot.innerHTML=`<span style="font-size:12px;color:var(--t3)">סה"כ הוצאות קבועות</span><span style="font-size:13px;font-weight:800;color:var(--amber)">${fmtCur(total,cur)}</span>`;
    el.appendChild(tot);
  }
}

function addCfFixed(){
  if(!D.cfFixedExpenses)D.cfFixedExpenses=[];
  D.cfFixedExpenses.push({name:'',amount:''});
  markDirty();
  renderCfFixed();
  const el=document.getElementById('cf-fixed-expenses');
  if(el){const inputs=el.querySelectorAll('input[type="text"]');if(inputs.length)inputs[inputs.length-1].focus();}
}

function removeCfFixed(i){
  if(!D.cfFixedExpenses)return;
  D.cfFixedExpenses.splice(i,1);
  markDirty();
  renderCfFixed();
  calcCashFlow();
}


// ══ GOALS ══
let goalsTab='active';
function switchGoalTab(tab){
  goalsTab=tab;
  document.getElementById('gt-active').classList.toggle('on',tab==='active');
  document.getElementById('gt-done').classList.toggle('on',tab==='done');
  document.getElementById('goals-by-horizon').style.display=tab==='active'?'block':'none';
  document.getElementById('goals-done-list').style.display=tab==='done'?'block':'none';
}
let _collapsedGoals=new Set();
function renderGoals(){
  const hzEl=document.getElementById('goals-by-horizon');hzEl.innerHTML='';
  const active=(D.goals||[]).filter(g=>!g.done);
  if(!active.length){
    hzEl.innerHTML=`<p style="color:var(--t3);font-size:13px;text-align:right;padding:10px 0">${g('לחץ','לחצי')} "הוספת מטרה חדשה" כדי להתחיל</p>`;
  } else {
    const ctrl=document.createElement('div');
    ctrl.style.cssText='text-align:left;margin-bottom:10px';
    ctrl.innerHTML=`<button onclick="toggleAllGoals()" style="background:none;border:none;color:var(--t2);font-family:var(--font);font-size:12px;cursor:pointer;padding:0">▾ קווץ / פרוש הכל</button>`;
    hzEl.appendChild(ctrl);
    const byH=[[],[],[],[]];const unset=[];
    active.forEach(goal=>{
      const idx=(D.goals||[]).indexOf(goal);
      (goal.h>=0&&goal.h<=3)?byH[goal.h].push({goal,idx}):unset.push({goal,idx});
    });
    const appendGoal=({goal,idx},grp)=>{
      const card=mkGoal(goal,idx);
      grp.appendChild(card);
      if(_collapsedGoals.has(idx)){
        const body=card.querySelector('.goal-body');
        if(body)body.style.display='none';
        const btn=card.querySelector('.goal-toggle');
        if(btn)btn.textContent='▸';
      }
    };
    HZ.forEach((hz,hi)=>{
      if(!byH[hi].length)return;
      const grp=document.createElement('div');grp.className='hz-group';
      grp.innerHTML=`<div class="hz-group-title">${hz}</div>`;
      byH[hi].forEach(item=>appendGoal(item,grp));
      hzEl.appendChild(grp);
    });
    if(unset.length){
      const grp=document.createElement('div');grp.className='hz-group';
      unset.forEach(item=>appendGoal(item,grp));
      hzEl.appendChild(grp);
    }
  }
  const doneEl=document.getElementById('goals-done-list');doneEl.innerHTML='';
  const done=(D.goals||[]).filter(g=>g.done);
  if(!done.length)doneEl.innerHTML='<p style="color:var(--t3);font-size:13px;text-align:right;padding:10px 0">עוד לא הושלמו מטרות — המשך לעבוד! 💪</p>';
  done.forEach(g=>doneEl.appendChild(mkGoal(g,(D.goals||[]).indexOf(g))));
  setTimeout(attachAllNumFormats,0);
}
function toggleGoalCollapse(i){
  const body=document.getElementById('goal-body-'+i);
  const card=document.getElementById('goal-card-'+i);
  if(!body)return;
  const collapsed=body.style.display==='none';
  body.style.display=collapsed?'':'none';
  const btn=card&&card.querySelector('.goal-toggle');
  if(btn)btn.textContent=collapsed?'▾':'▸';
  if(collapsed)_collapsedGoals.delete(i);
  else _collapsedGoals.add(i);
}
function toggleAllGoals(){
  const bodies=document.querySelectorAll('.goal-body');
  const anyOpen=Array.from(bodies).some(b=>b.style.display!=='none');
  bodies.forEach(b=>b.style.display=anyOpen?'none':'');
  document.querySelectorAll('.goal-toggle').forEach(b=>b.textContent=anyOpen?'▸':'▾');
  if(anyOpen){
    bodies.forEach(b=>{const id=+b.id.replace('goal-body-','');_collapsedGoals.add(id);});
  } else {
    _collapsedGoals.clear();
  }
}
// Months per horizon index — matches HZ labels: 12m / 1-5y / 5-10y / 10+y
const GOAL_HZ_MONTHS=[12,36,84,180];
function mkGoal(g,i){
  const sv=parseFloat(g.saved)||0,nd=parseFloat(g.needed)||0;
  const pct=nd>0?Math.min(100,Math.round(sv/nd*100)):0;
  const hi=g.h>=0&&g.h<=3?g.h:null;
  const isDone=g.done;
  const remaining=nd-sv;
  const hzMonths=hi!==null?GOAL_HZ_MONTHS[hi]:GOAL_HZ_MONTHS[0];
  const monthlyNeeded=(!isDone&&remaining>0&&nd>0&&hi!==null)?Math.ceil(remaining/hzMonths):0;
  const hzLabel=hi===0?'12 חודשים':hi===1?'3 שנים':hi===2?'7 שנים':'15 שנה';
  const d=document.createElement('div');
  d.id='goal-card-'+i;
  d.className='goal-card'+(isDone?' completed':'');
  const hzSel=!isDone
    ?`<select class="htag ${hi!==null?HC[hi]:'htag-new'}" onchange="setH(${i},+this.value,this)">
        <option value="-1"${hi===null?' selected':''} style="background:#1e2d45;color:#94a3b8">בחר טווח</option>
        ${HZ.map((h,hi2)=>`<option value="${hi2}"${hi2===hi?' selected':''} style="background:#1e2d45;color:#e2e8f0">${h}</option>`).join('')}
      </select>`
    :'<span style="font-size:11px;color:var(--green);font-weight:700">✅ הושלם</span>';
  const cur=g.savedCurrency||'ILS';
  const inpStyle='background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--t1);font-family:var(--font);font-size:13px;padding:6px 10px;direction:rtl;width:100%';
  const curSel=(field,val)=>`<select data-i="${i}" data-f="${field}" onchange="gu(this)" style="background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--teal);font-family:var(--font);font-size:12px;font-weight:700;padding:2px 4px;width:52px;flex-shrink:0">
    <option value="ILS"${(val||'ILS')==='ILS'?' selected':''}>₪</option>
    <option value="USD"${val==='USD'?' selected':''}>$</option>
    <option value="EUR"${val==='EUR'?' selected':''}>€</option>
  </select>`;
  const neededBlock=`<div class="mf"><label>סכום יעד<span class="q-tip">?<span class="q-popup">כמה כסף סה"כ תצטרך כדי להשיג את המטרה?</span></span></label>
    <div style="display:flex;gap:6px;align-items:center">
      ${curSel('neededCurrency',g.neededCurrency)}
      <input type="number" value="${g.needed||''}" placeholder="0" data-i="${i}" data-f="needed" oninput="gu(this)" onblur="validateNum(this.value,'goalNeeded',this)" style="flex:1"/>
    </div>
  </div>`;
  // Inline migration: init goalLocs for any goal that doesn't have it yet
  if(!g.goalLocs){
    const migratedWhere=g.where||'',migratedAmt=g.saved||'';
    g.goalLocs=migratedWhere||migratedAmt?[{where:migratedWhere,amount:migratedAmt}]:[];
    g.where='';
    setTimeout(markDirty,0);
  }
  let bodyContent;
  if(Array.isArray(g.goalLocs)){
    const locsTotal=g.goalLocs.reduce((s,l)=>s+(parseFloat(l.amount)||0),0);
    const locsRows=g.goalLocs.map((loc,li)=>`
      <div style="display:grid;grid-template-columns:1fr 110px 22px;gap:6px;align-items:center;margin-bottom:6px">
        <input value="${esc(loc.where||'')}" placeholder='עו"ש, קרן כספית...'
          oninput="updateGoalLoc(${i},${li},'where',this.value)"
          style="${inpStyle}"/>
        <input type="number" value="${loc.amount||''}" placeholder="0" data-no-fmt
          oninput="updateGoalLoc(${i},${li},'amount',this.value)"
          style="background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--t1);font-family:var(--font);font-size:13px;padding:6px 10px;width:100%"/>
        <button onclick="removeGoalLoc(${i},${li})" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:18px;padding:0;line-height:1">×</button>
      </div>`).join('');
    const emptyHint=!g.goalLocs.length?`<div style="font-size:12px;color:var(--t3);padding:4px 0;text-align:right">לחץ + כדי לפרט איפה הכסף נמצא</div>`:'';
    const totalDisplay=locsTotal>0?`<span class="goal-locs-total" style="font-size:13px;font-weight:800;color:var(--teal)">${fmtCur(locsTotal,cur)}</span>`:'';
    bodyContent=`
      <div class="mf" style="margin-bottom:10px">
        <label>איפה הכסף נמצא?<span class="q-tip">?<span class="q-popup">פרט את המיקומים שבהם הכסף נמצא וכמה יש בכל אחד. הסכום הכולל הוא "כמה חסכת".</span></span></label>
        <div id="goal-locs-${i}" style="margin-top:6px">${locsRows}${emptyHint}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          <button onclick="addGoalLoc(${i})" style="background:none;border:1px dashed var(--border);border-radius:8px;color:var(--t2);font-family:var(--font);font-size:12px;padding:4px 10px;cursor:pointer">+ הוסף מיקום</button>
          ${totalDisplay}
        </div>
      </div>
      <div class="gnums">${neededBlock}</div>`;
  } else {
    bodyContent=`
      <div class="gnums">
        <div class="mf"><label>כמה חסכת<span class="q-tip">?<span class="q-popup">כמה כסף כבר חסכת עד היום למטרה הזאת?</span></span></label>
          <div style="display:flex;gap:6px;align-items:center">
            ${curSel('savedCurrency',g.savedCurrency)}
            <input type="number" value="${g.saved||''}" placeholder="0" data-i="${i}" data-f="saved" oninput="gu(this)" onblur="validateNum(this.value,'goalSaved',this)" style="flex:1"/>
          </div>
        </div>
        ${neededBlock}
      </div>
      <div class="mf" style="margin-bottom:9px"><label>איפה הכסף<span class="q-tip">?<span class="q-popup">היכן הכסף הזה מופקד? לדוגמה: עו"ש, תיק השקעות, קרן כספית.</span></span></label>
        <input value="${esc(g.where)}" placeholder="עובר ושב / קרן כספית וכד׳" data-i="${i}" data-f="where" oninput="gu(this)"
          style="width:100%;background:transparent;border:none;outline:none;color:var(--white);font-family:var(--font);font-size:13px;text-align:right"/>
      </div>`;
  }
  d.innerHTML=`
    <div class="goal-top">
      <input class="nin" value="${esc(g.name)}" placeholder="שם המטרה" data-i="${i}" data-f="name" oninput="gu(this)"/>
      ${hzSel}
      <button class="goal-toggle" onclick="toggleGoalCollapse(${i})" title="קווץ/הרחב">▾</button>
      <button class="htag" style="background:rgba(16,185,129,.15);color:#6ee7b7;font-size:10px" onclick="toggleDone(${i})">${isDone?'↩ פתח':'✓ סמן כהושלם'}</button>
      <button class="bdel" onclick="delGoal(${i})">×</button>
    </div>
    <div class="goal-body" id="goal-body-${i}">
      ${bodyContent}
      <div class="pbar"><div class="pfill${isDone?' done':''}" style="width:${pct}%"></div></div>
      <div class="plbl">${pct}% הושג${nd>0?' · נשאר '+fmtCur(nd-sv,g.neededCurrency||'ILS'):''}${isDone?' 🎉':''}</div>
      ${monthlyNeeded>0?`<div class="goal-monthly-hint">💡 כדי להגיע ליעד תוך <strong>${hzLabel}</strong> — חיסכון של <strong>${fmt(monthlyNeeded)}</strong> בחודש</div>`:''}
    </div>`;
  return d;
}
function gu(el){
  const i=+el.dataset.i,f=el.dataset.f;
  D.goals[i][f]=el.value;
  const card=el.closest('.goal-card');
  const sv=parseFloat(D.goals[i].saved)||0,nd=parseFloat(D.goals[i].needed)||0;
  const pct=nd>0?Math.min(100,Math.round(sv/nd*100)):0;
  const fill=card.querySelector('.pfill');if(fill)fill.style.width=pct+'%';
  const lbl=card.querySelector('.plbl');if(lbl)lbl.textContent=pct+'% הושג'+(nd>0?' · נשאר '+fmt(nd-sv):'');
  if(f==='where'||f==='saved')renderLocsAutoSummary();
  if(f==='saved'){updateLocFooter();touchSection('goals');}
  if(f==='needed')touchSection('goals');
  markDirty();
}
function updateGoalLoc(goalIdx,locIdx,field,val){
  if(!D.goals[goalIdx].goalLocs)return;
  D.goals[goalIdx].goalLocs[locIdx][field]=val;
  if(field==='amount'){
    const total=D.goals[goalIdx].goalLocs.reduce((s,l)=>s+(parseFloat(l.amount)||0),0);
    D.goals[goalIdx].saved=String(total||'');
    const card=document.getElementById('goal-card-'+goalIdx);
    if(card){
      const nd=parseFloat(D.goals[goalIdx].needed)||0;
      const pct=nd>0?Math.min(100,Math.round(total/nd*100)):0;
      const fill=card.querySelector('.pfill');if(fill)fill.style.width=pct+'%';
      const lbl=card.querySelector('.plbl');if(lbl)lbl.textContent=pct+'% הושג'+(nd>0?' · נשאר '+fmtCur(nd-total,D.goals[goalIdx].neededCurrency||'ILS'):'');
      const totEl=card.querySelector('.goal-locs-total');if(totEl)totEl.textContent=fmtCur(total,D.goals[goalIdx].savedCurrency||'ILS');
    }
    updateLocFooter();touchSection('goals');renderLocsAutoSummary();
  }
  markDirty();
}
function addGoalLoc(i){
  if(!D.goals[i].goalLocs)D.goals[i].goalLocs=[];
  D.goals[i].goalLocs.push({where:'',amount:''});
  markDirty();
  const el=document.getElementById('goal-locs-'+i);
  if(!el)return;
  const li=D.goals[i].goalLocs.length-1;
  const inpStyle='background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--t1);font-family:var(--font);font-size:13px;padding:6px 10px;direction:rtl;width:100%';
  const div=document.createElement('div');
  div.style.cssText='display:grid;grid-template-columns:1fr 110px 22px;gap:6px;align-items:center;margin-bottom:6px';
  div.innerHTML=`<input value="" placeholder='עו"ש, קרן כספית...' oninput="updateGoalLoc(${i},${li},'where',this.value)" style="${inpStyle}"/>
    <input type="number" value="" placeholder="0" data-no-fmt oninput="updateGoalLoc(${i},${li},'amount',this.value)" style="background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--t1);font-family:var(--font);font-size:13px;padding:6px 10px;width:100%"/>
    <button onclick="removeGoalLoc(${i},${li})" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:18px;padding:0;line-height:1">×</button>`;
  el.appendChild(div);
  div.querySelector('input').focus();
}
function removeGoalLoc(i,li){
  if(!D.goals[i].goalLocs)return;
  D.goals[i].goalLocs.splice(li,1);
  const total=D.goals[i].goalLocs.reduce((s,l)=>s+(parseFloat(l.amount)||0),0);
  D.goals[i].saved=String(total||'');
  markDirty();
  renderGoals();
}
function migrateGoalLocs(){
  (D.goals||[]).forEach(g=>{
    if(g.name==='קרן חירום'&&!g.goalLocs){
      g.goalLocs=[{where:g.where||'',amount:g.saved||''},{where:'',amount:''}];
      g.where='';
    }
  });
}
function setH(i,h,sel){D.goals[i].h=h;renderGoals();touchSection('goals');markDirty();}
function toggleDone(i){// also refresh locations

  const gl=D.goals[i];
  // Validate all fields before marking as done
  if(!gl.done){
    const missing=[];
    if(!gl.name||!gl.name.trim())missing.push('שם המטרה');
    if(!gl.saved||parseFloat(gl.saved)<=0)missing.push('כמה חסכת');
    if(!gl.needed||parseFloat(gl.needed)<=0)missing.push('סכום יעד');
    if(!gl.goalLocs&&(!gl.where||!gl.where.trim()))missing.push('איפה הכסף');
    // h is always set (0-3), so horizon is always valid
    if(missing.length>0){
      showGoalError(i,'לא ניתן לסמן כהושלם — חסרים הפרטים הבאים: '+missing.join(', '));
      return;
    }
    if(parseFloat(gl.saved)<parseFloat(gl.needed)){
      if(!confirm('הסכום שחסכת ('+fmt(parseFloat(gl.saved))+') קטן מהיעד ('+fmt(parseFloat(gl.needed))+'). בכל זאת לסמן כהושלם?'))return;
    }
  }
  D.goals[i].done=!D.goals[i].done;
  renderGoals();renderLocsAutoSummary();markDirty();
}
function showGoalError(i,msg){
  // Show error inline inside the goal card
  const cards=document.querySelectorAll('.goal-card');
  if(cards[i]){
    let err=cards[i].querySelector('.goal-err');
    if(!err){err=document.createElement('div');err.className='goal-err';
      err.style.cssText='font-size:12px;color:#fca5a5;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:8px 12px;margin-top:8px;text-align:right;';
      cards[i].appendChild(err);}
    err.textContent='⚠️ '+msg;
    setTimeout(()=>err.remove(),4000);
  }
}
function addGoal(){
  D.goals.push({name:'',where:'',saved:'',needed:'',h:-1,done:false,goalLocs:[]});
  renderGoals();touchSection('goals');markDirty();
  setTimeout(()=>{const last=document.querySelector('#goals-by-horizon .goal-card:last-child');if(last)last.scrollIntoView({behavior:'smooth',block:'nearest'});},60);
}
function delGoal(i){D.goals.splice(i,1);renderGoals();renderLocsAutoSummary();markDirty();}

// ══ LOCATIONS ══
function renderLocs(){
  renderLocsInventory();
  renderLocsTransfer();
}
function renderLocsInventory(){
  const el=document.getElementById('locs-inventory');
  if(!el)return;
  el.innerHTML='';
  const manualLocs=(D.locations||[]).filter(l=>!l._auto);
  if(!manualLocs.length){
    el.innerHTML='<div style="font-size:13px;color:var(--t3);text-align:right;padding:4px 0 10px">טרם הוספת נכסים — לחץ "+ הוסף נכס" כדי להתחיל.</div>';
    return;
  }
  const hdr=document.createElement('div');
  hdr.style.cssText='display:flex;gap:0;font-size:10px;color:var(--t3);font-weight:700;padding:0 0 7px;border-bottom:1px solid var(--border);margin-bottom:4px;text-align:right';
  hdr.innerHTML='<span style="flex:1">שם נכס</span><span style="width:120px;text-align:right">סכום</span><span style="width:28px"></span>';
  el.appendChild(hdr);
  manualLocs.forEach(l=>{
    const ri=(D.locations||[]).indexOf(l);
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid rgba(30,45,69,.5)';
    const lc=l.currency||'ILS';
    row.innerHTML=`
      <input value="${esc(l.name)}" placeholder="שם הנכס..." data-i="${ri}" data-f="name" oninput="lu(this)"
        style="flex:1;background:transparent;border:none;outline:none;color:var(--white);font-family:var(--font);font-size:13px;font-weight:600;text-align:right"/>
      <select data-i="${ri}" data-f="currency" onchange="lu(this);renderLocsInventory();renderLocsTransfer()"
        style="background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--teal);font-family:var(--font);font-size:12px;font-weight:700;padding:2px 4px;width:52px;flex-shrink:0">
        <option value="ILS"${lc==='ILS'?' selected':''}>₪</option>
        <option value="USD"${lc==='USD'?' selected':''}>$</option>
        <option value="EUR"${lc==='EUR'?' selected':''}>€</option>
      </select>
      <input type="number" value="${l.amount||''}" placeholder="0" data-i="${ri}" data-f="amount" oninput="lu(this);renderLocsTransfer()"
        style="width:110px;background:transparent;border:none;outline:none;font-family:var(--font);font-size:14px;font-weight:800;color:var(--teal);text-align:right;direction:rtl"/>
      <button class="bdel" onclick="delLoc(${ri})" style="flex-shrink:0;width:28px">×</button>`;
    el.appendChild(row);
  });
  // total per currency
  const totByCur={};
  manualLocs.forEach(l=>{
    const c=l.currency||'ILS',a=parseFloat(l.amount)||0;
    if(a)totByCur[c]=(totByCur[c]||0)+a;
  });
  if(Object.keys(totByCur).length){
    const ftr=document.createElement('div');
    ftr.style.cssText='padding:9px 0 2px;margin-top:2px;border-top:1px solid var(--border)';
    const rows=Object.entries(totByCur).map(([c,a])=>
      `<div style="display:flex;justify-content:space-between;padding:3px 0">
        <span style="font-size:12px;color:var(--t3)">סה"כ ${c==='ILS'?'שקל':c==='USD'?'דולר':'אירו'}</span>
        <span style="font-size:14px;font-weight:800;color:var(--teal)">${fmtCur(a,c)}</span>
      </div>`).join('');
    ftr.innerHTML=rows;
    el.appendChild(ftr);
  }
  setTimeout(attachAllNumFormats,0);
}
function renderLocsTransfer(){
  const el=document.getElementById('locs-transfer');
  if(!el)return;
  el.innerHTML='';
  const withAmt=(D.locations||[]).filter(l=>!l._auto&&parseFloat(l.amount)>0);
  if(!withAmt.length){
    el.innerHTML='<div style="font-size:13px;color:var(--t3);text-align:right;padding:4px 0">מלא את רשימת הנכסים למעלה כדי לתכנן העברות.</div>';
    updateLocFooter();return;
  }
  withAmt.forEach(l=>{
    const ri=(D.locations||[]).indexOf(l);
    const hasTo=(l.whereTo||'').trim();
    const row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:1fr 32px 1fr 26px;align-items:stretch;margin-bottom:8px;transition:opacity .15s';
    row.setAttribute('draggable','true');
    row.dataset.locIdx=ri;
    row.innerHTML=`
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:0 10px 10px 0;padding:9px 12px;text-align:right">
        <div style="font-size:13px;font-weight:600;color:var(--white)">${esc(l.name||'ללא שם')}</div>
        <div style="font-size:13px;font-weight:800;color:var(--teal);margin-top:2px">${fmtCur(parseFloat(l.amount)||0,l.currency||'ILS')}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;background:var(--s2);
        border-top:1px solid var(--border);border-bottom:1px solid var(--border);
        font-size:20px;user-select:none;color:${hasTo?'var(--teal)':'var(--border)'}">⟵</div>
      <div style="background:${hasTo?'rgba(66,235,214,.06)':'transparent'};
        border:1px solid ${hasTo?'var(--teal-border)':'var(--border)'};
        border-radius:10px 0 0 10px;border-left:none;
        padding:9px 12px;display:flex;align-items:center">
        <textarea placeholder="לאן מועבר הכסף" data-i="${ri}" data-f="whereTo"
          oninput="lu(this);autoResize(this)" ondragstart="event.stopPropagation()"
          rows="1"
          style="background:transparent;border:none;outline:none;resize:none;overflow:hidden;
            color:${hasTo?'var(--teal)':'var(--t2)'};font-family:var(--font);font-size:13px;
            font-weight:${hasTo?'600':'400'};text-align:right;width:100%;line-height:1.55;
            padding:0;min-height:1.55em;direction:rtl">${esc(l.whereTo||'')}</textarea>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;color:var(--t3);
        font-size:18px;cursor:grab;user-select:none;padding:0 2px" title="גרור לשינוי סדר">⠿</div>`;
    // Drag events
    row.addEventListener('dragstart',e=>{
      _dragLocIdx=ri;
      e.dataTransfer.effectAllowed='move';
      setTimeout(()=>{row.style.opacity='0.35';},0);
    });
    row.addEventListener('dragend',()=>{
      row.style.opacity='';
      _dragLocIdx=null;
      el.querySelectorAll('.loc-drop-target').forEach(r=>r.classList.remove('loc-drop-target'));
    });
    row.addEventListener('dragover',e=>{
      if(_dragLocIdx===null||_dragLocIdx===ri)return;
      e.preventDefault();
      e.dataTransfer.dropEffect='move';
      el.querySelectorAll('.loc-drop-target').forEach(r=>r.classList.remove('loc-drop-target'));
      row.classList.add('loc-drop-target');
    });
    row.addEventListener('dragleave',()=>{
      row.classList.remove('loc-drop-target');
    });
    row.addEventListener('drop',e=>{
      e.preventDefault();
      const fromIdx=_dragLocIdx;
      const toIdx=ri;
      row.classList.remove('loc-drop-target');
      if(fromIdx===null||fromIdx===toIdx)return;
      const loc=D.locations.splice(fromIdx,1)[0];
      D.locations.splice(fromIdx<toIdx?toIdx-1:toIdx,0,loc);
      _dragLocIdx=null;
      renderLocs();
      markDirty();
    });
    el.appendChild(row);
  });
  setTimeout(()=>{el.querySelectorAll('textarea').forEach(autoResize);},0);
  updateLocFooter();
}
function updateLocFooter(){
  const el=document.getElementById('loc-footer');
  if(!el)return;
  // Assets total per currency
  const assetsByCur={};
  (D.locations||[]).filter(l=>!l._auto).forEach(l=>{
    const c=l.currency||'ILS',a=parseFloat(l.amount)||0;
    if(a)assetsByCur[c]=(assetsByCur[c]||0)+a;
  });
  if(!Object.keys(assetsByCur).length){el.innerHTML='';return;}
  const totalILS=Object.entries(assetsByCur).reduce((s,[c,a])=>s+toILS(a,c),0);
  // Goals allocated per currency
  const goalsByCur={};
  (D.goals||[]).filter(g=>!g.done&&parseFloat(g.saved)).forEach(g=>{
    const c=g.savedCurrency||'ILS';goalsByCur[c]=(goalsByCur[c]||0)+(parseFloat(g.saved)||0);
  });
  const allocatedILS=Object.entries(goalsByCur).reduce((s,[c,a])=>s+toILS(a,c),0);
  const unallocatedILS=Math.max(0,totalILS-allocatedILS);
  const fmtMulti=(byCur)=>Object.entries(byCur).map(([c,a])=>`<span style="margin-right:6px">${fmtCur(a,c)}</span>`).join('');
  // Dominant goal currency for unallocated display
  const goalCurList=Object.keys(goalsByCur);
  const domGoalCur=goalCurList.length?goalCurList[0]:'ILS';
  el.innerHTML=`<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
    ${allocatedILS>0?`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;flex-wrap:wrap;gap:4px">
      <span style="color:var(--t2)">מוקצה למטרות</span>
      <span style="color:var(--teal);font-weight:700;direction:ltr">${fmtMulti(goalsByCur)}</span>
    </div>`:''}
    ${unallocatedILS>100?`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px">
      <span style="color:var(--amber)">⚠ טרם הוקצה למטרה</span>
      <span style="color:var(--amber);font-weight:700">${fmtCur(fromILS(unallocatedILS,domGoalCur),domGoalCur)}</span>
    </div>`:(allocatedILS>0?'<div style="font-size:12px;color:var(--teal);padding:5px 0">✓ כל הכסף הוקצה למטרות</div>':'')}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0 2px;margin-top:2px;border-top:1px solid var(--border);flex-wrap:wrap;gap:4px">
      <span style="font-size:12px;color:var(--t3)">סה"כ נכסים</span>
      <span style="font-size:14px;font-weight:800;color:var(--teal);direction:ltr">${fmtMulti(assetsByCur)}</span>
    </div>
  </div>`;
}
function lu(el){
  const i=+el.dataset.i,f=el.dataset.f;
  if(!D.locations[i])return;
  D.locations[i][f]=el.value;
  if(f==='amount')D.locations[i]._manual=true;
  if(f==='whereTo')updateLocFooter();
  markDirty();
}
function addLoc(){D.locations.push({name:'',amount:'',whereTo:'',_manual:true});renderLocs();markDirty();}
function delLoc(i){D.locations.splice(i,1);renderLocs();markDirty();}

// ══ SMART TRANSFER PLAN ══
// Computes how much to move from each asset to each destination, based on:
// goal gaps (most urgent horizon first), the "אפס החדש" reserve for עו"ש
// accounts, and money already sitting at a goal's location. Amounts in ₪.
function buildTransferPlan(){
  const zero=parseFloat(String(D.cfZero||'0').replace(/,/g,''))||0;
  // Money already assigned to goals, keyed by the location it sits in — it stays put
  const goalsAt={};
  (D.goals||[]).filter(gl=>!gl.done).forEach(gl=>{
    (gl.goalLocs||[]).forEach(l=>{
      const k=(l.where||'').trim();if(!k)return;
      goalsAt[k]=(goalsAt[k]||0)+toILS(parseFloat(l.amount)||0,gl.savedCurrency||'ILS');
    });
  });
  // Destinations: active goals that still have a gap, most urgent horizon first
  const targets=(D.goals||[]).filter(gl=>!gl.done&&(gl.name||'').trim())
    .map(gl=>({name:gl.name,h:gl.h||0,gap:toILS((parseFloat(gl.needed)||0)-(parseFloat(gl.saved)||0),gl.savedCurrency||'ILS')}))
    .filter(t=>t.gap>0).sort((a,b)=>a.h-b.h);
  const plan=[];
  let zeroReserved=false;
  (D.locations||[]).filter(l=>!l._auto&&(l.name||'').trim()&&parseFloat(l.amount)>0).forEach(l=>{
    let avail=toILS(parseFloat(l.amount)||0,l.currency||'ILS');
    const parked=goalsAt[(l.name||'').trim()]||0;
    if(parked>0)avail-=parked; // goal money already there doesn't move
    if(avail<=0)return;
    // Reserve the "new zero" in the first עו"ש account
    if(!zeroReserved&&l.name.includes('עו"ש')&&zero>0){
      const stay=Math.min(zero,avail);
      avail-=stay;zeroReserved=true;
      plan.push({from:l.name,to:'נשאר בעו"ש — האפס החדש',amount:Math.round(stay),keep:true});
    }
    targets.forEach(t=>{
      if(avail<=0||t.gap<=0)return;
      const mv=Math.min(avail,t.gap);
      plan.push({from:l.name,to:t.name,amount:Math.round(mv)});
      avail-=mv;t.gap-=mv;
    });
    if(avail>=100)plan.push({from:l.name,to:'תיק השקעות',amount:Math.round(avail)});
  });
  if(!plan.length){showToast('אין נכסים פנויים לתכנון — מלא את רשימת הנכסים והמטרות');return;}
  D.transferPlan=plan;
  renderTransferPlan();
  markDirty();
}
function renderTransferPlan(){
  const el=document.getElementById('locs-plan');
  if(!el)return;
  const plan=D.transferPlan||[];
  if(!plan.length){el.innerHTML='';return;}
  let html=`<div style="font-size:11px;color:var(--t3);margin:10px 0 8px;line-height:1.6">
    מחושב לפי סדר דחיפות המטרות, ה"אפס החדש" מהתזרים, והכסף שכבר משויך למטרות. אפשר לערוך כל סכום או למחוק שורה.</div>`;
  plan.forEach((p,i)=>{
    html+=`<div style="display:grid;grid-template-columns:1fr 22px 1fr 92px 24px;gap:6px;align-items:center;margin-bottom:6px">
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-size:12px;font-weight:600;color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.from)}</div>
      <div style="text-align:center;color:${p.keep?'var(--amber)':'var(--teal)'};font-size:15px">⟵</div>
      <div style="background:${p.keep?'rgba(245,158,11,.07)':'rgba(66,235,214,.06)'};border:1px solid ${p.keep?'rgba(245,158,11,.3)':'var(--teal-border)'};border-radius:8px;padding:7px 10px;font-size:12px;font-weight:600;color:${p.keep?'var(--amber)':'var(--teal)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.keep?'🏦 ':'🎯 '}${esc(p.to)}</div>
      <input type="number" value="${p.amount||''}" data-no-fmt
        oninput="D.transferPlan[${i}].amount=parseFloat(this.value)||0;markDirty();updatePlanTotal()"
        style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:7px 8px;color:var(--white);font-family:var(--font);font-size:12px;font-weight:700;text-align:right;width:100%"/>
      <button class="bdel" onclick="D.transferPlan.splice(${i},1);renderTransferPlan();markDirty()">×</button>
    </div>`;
  });
  html+=`<div id="plan-total" style="display:flex;justify-content:space-between;padding:8px 0 2px;margin-top:4px;border-top:1px solid var(--border);font-size:12px">
    <span style="color:var(--t3)">סה"כ מועבר</span>
    <span style="font-weight:800;color:var(--teal)">${fmt(planMovedTotal())}</span>
  </div>`;
  el.innerHTML=html;
}
function planMovedTotal(){return (D.transferPlan||[]).filter(p=>!p.keep).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);}
function updatePlanTotal(){
  const el=document.querySelector('#plan-total span:last-child');
  if(el)el.textContent=fmt(planMovedTotal());
}
