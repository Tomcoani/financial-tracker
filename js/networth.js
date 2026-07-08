
// ══ NET WORTH ══
// includeCurrent=true → manual pull (button): also fills the current month's column.
// includeCurrent=false → automatic sync (tab switch): skips the current period.
// Returns the number of cells filled. Never overwrites user-entered values.
function syncNWFromPension(includeCurrent){
  const cnt=D.nwPeriodsCount||6;
  let syncCol=0;
  for(let c=cnt-1;c>=0;c--){if(D.nwPeriods[c]&&!isFuturePeriod(D.nwPeriods[c])){syncCol=c;break;}}
  // Don't auto-fill the current period — user should enter data manually
  if(!includeCurrent&&isCurrentPeriod(D.nwPeriods[syncCol]))return 0;
  let filled=0;
  const fill=(row,val)=>{if(!row.vals[syncCol]){row.vals[syncCol]=String(val);filled++;}};
  // Generic rows locked against location-fill when their money already synced into named rows
  // (prevents double-counting the same money in both a named row and the generic row)
  const lockedRows=new Set();

  // Find or create a named row in a section (only creates if no exact name match exists)
  const findOrMakeRow=(sec,name)=>{
    let row=D.nwData[sec].rows.find(r=>r.name===name);
    if(!row){row={name,vals:Array(cnt).fill('')};D.nwData[sec].rows.push(row);}
    return row;
  };

  // ── Portfolio(s) → תיק השקעות ──────────────────────────────────────────────
  // Only fills empty cells — never overwrites a value the user entered manually.
  const portfolios=D.portfolios||[];
  const namedPorts=portfolios.filter(p=>(p.brokerName||'').trim());
  if(namedPorts.length>1){
    // Multiple named portfolios (e.g., couple with separate brokerage accounts): one NW row each
    lockedRows.add('תיק השקעות');lockedRows.add('תיק');
    namedPorts.forEach(port=>{
      const portVal=(port.items||[]).reduce((s,p)=>s+(parseFloat(p.value)||0),0);
      if(!portVal)return;
      fill(findOrMakeRow('investments',port.brokerName.trim()),portVal);
    });
  } else {
    // Single portfolio or unnamed: sum all into the generic "תיק השקעות" row
    const portTotal=portfolios.flatMap(p=>p.items||[]).reduce((s,p)=>s+(parseFloat(p.value)||0),0);
    if(portTotal>0){
      D.nwData.investments.rows.forEach(row=>{
        if(row.name==='תיק השקעות'||row.name==='תיק')fill(row,portTotal);
      });
    }
  }

  // ── Pension & study funds → investments ────────────────────────────────────
  // Matching strategy: exact name → generic type row (only when single of that
  // type) → create a separate row per pension (handles couples with 2 pensions).
  const activePensions=(D.pension||[]).filter(p=>p.amount);
  activePensions.forEach(p=>{
    // 1. Exact name match
    let row=D.nwData.investments.rows.find(r=>r.name===p.name);
    if(!row){
      const isPen=p.name.includes('פנסי'),isHT=p.name.includes('השתלמות');
      const sameType=activePensions.filter(pp=>isPen?pp.name.includes('פנסי'):isHT?pp.name.includes('השתלמות'):false);
      if(sameType.length===1){
        // 2. Only one active pension of this type → use any existing generic row of that type
        const typeRows=D.nwData.investments.rows.filter(r=>isPen?r.name.includes('פנסי'):r.name.includes('השתלמות'));
        if(typeRows.length===1)row=typeRows[0];
      }
      // 3. Multiple of same type, or no generic row: find/create a row named after this pension
      if(!row){
        row=findOrMakeRow('investments',p.name);
        if(isPen)lockedRows.add('פנסיה');
        if(isHT)lockedRows.add('קרן השתלמות');
      }
    }
    fill(row,p.amount);
  });

  // ── Locations → matching NW rows ───────────────────────────────────────────
  (D.locations||[]).forEach(loc=>{
    if(!loc.name||!loc.amount)return;
    ['assets','investments','savings'].forEach(sec=>{
      D.nwData[sec].rows.forEach(row=>{
        if(sec==='investments'&&lockedRows.has(row.name))return;
        if(row.name===loc.name)fill(row,loc.amount);
      });
    });
  });
  return filled;
}
// Called when pension data changes — offer to sync locations
function autoSyncLocations(){
  // Only re-render - don't push pension into D.locations (causes duplication)
  // Pension shows separately in the illiquid donut chart
  renderLocs();
}
function getLatestNWCol(){
  const cnt=(D.nwPeriodsCount||D.nwPeriods.length||6);
  // First try: rightmost non-future period that has actual data (matches renderNWSummary logic)
  for(let c=cnt-1;c>=0;c--){
    if(D.nwPeriods[c]&&!isFuturePeriod(D.nwPeriods[c])){
      if(sumSec('assets',c)||sumSec('investments',c)||sumSec('savings',c)||sumSec('debts',c))return c;
    }
  }
  // Fallback: rightmost non-future period (even if empty)
  for(let c=cnt-1;c>=0;c--)
    if(D.nwPeriods[c]&&!isFuturePeriod(D.nwPeriods[c]))return c;
  return 0;
}
function isCurrentPeriod(periodLabel){
  if(!periodLabel)return false;
  const parsed=parsePeriodDate(periodLabel);
  if(!parsed)return false;
  const now=new Date();
  return parsed.m===now.getMonth()+1&&parsed.y===now.getFullYear();
}
function isFuturePeriod(periodLabel){
  if(!periodLabel)return false;
  const parsed=parsePeriodDate(periodLabel);
  if(!parsed)return false;
  const now=new Date();
  const periodDate=new Date(parsed.y, parsed.m-1, 1);
  // Future = more than current month
  return periodDate > new Date(now.getFullYear(), now.getMonth(), 1);
}
// ── Mobile: show only the last 2 periods by default, with a toggle ──
let nwMobileShowAll=false;
function isMobileNW(){return window.innerWidth<=640;}
function applyMobileNWCols(){
  // Only when no manual column choices exist — a user's ▼/▶ clicks win
  if(!isMobileNW()||nwMobileShowAll||Object.keys(nwColHidden).length)return;
  const cnt=D.nwPeriodsCount||6;
  const keep=[];
  for(let c=cnt-1;c>=0&&keep.length<2;c--){
    const p=D.nwPeriods[c];
    if(p&&!isFuturePeriod(p))keep.push(c);
  }
  if(!keep.length)return;
  for(let c=0;c<cnt;c++)if(!keep.includes(c))nwColHidden[c]=true;
}
function toggleNWMobileCols(){
  nwMobileShowAll=!nwMobileShowAll;
  nwColHidden={};
  renderNW();
}
function renderNW(){
  applyMobileNWCols();
  const mt=document.getElementById('nw-mobile-toggle');
  if(mt){
    mt.innerHTML=isMobileNW()?`<button class="btnadd" style="width:100%;margin:0 0 10px" onclick="toggleNWMobileCols()">
      ${nwMobileShowAll?'הצג רק את התקופות האחרונות':'הצג את כל התקופות'}</button>`:'';
  }
  const ph=document.getElementById('period-heads');ph.innerHTML='';
  // Hint row above period inputs
  const hint=document.createElement('div');
  hint.style.cssText='font-size:11px;color:var(--t3);text-align:right;margin-bottom:6px;grid-column:1/-1;';
  hint.textContent='הכנס את התאריך הראשון — לדוגמה: 9/2023 (ספטמבר 2023). שאר העמודות יתמלאו אוטומטית.';
  ph.appendChild(hint);
  const count=D.nwPeriodsCount||6;
  for(let i=0;i<count;i++){
    const d=document.createElement('div');
    d.style.cssText='display:flex;flex-direction:column;gap:3px;';
    d.innerHTML=`<input class="period-date-input" value="${D.nwPeriods[i]||''}"
      placeholder="${i===0?'חודש/שנה':'הבא'}"
      data-i="${i}" oninput="nwPeriodChange(this)" onblur="nwPeriodBlur(this)"
      title="הכנס חודש ושנה, לדוגמה: 5/2025"/>`;
    ph.appendChild(d);
  }
  // Add/remove period buttons
  const btnWrap=document.createElement('div');
  btnWrap.style.cssText='display:flex;gap:8px;margin-top:12px;';
  btnWrap.innerHTML=`
    <button onclick="addNWPeriod()" class="btnadd" style="flex:1;margin-top:0">+ הוסף תקופה</button>
    ${count>1?`<button onclick="removeNWPeriod()" style="background:transparent;border:1.5px dashed rgba(239,68,68,.4);color:var(--red);border-radius:10px;padding:10px 16px;font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;">− הסר תקופה</button>`:''}
  `;
  ph.appendChild(btnWrap);
  renderNWSection('nw-assets','assets');
  renderNWSection('nw-investments','investments');
  renderNWSection('nw-savings','savings');
  renderNWSection('nw-debts','debts');
  renderNWSummary();
}
// Build a grid-template-columns string respecting column collapse
function nwGridCols(cnt){
  const lbl=isMobileNW()?'104px':'160px',del='24px';
  const cols=Array.from({length:cnt},(_,i)=>nwColHidden[i]?'22px':'minmax(0,1fr)').join(' ');
  return `${lbl} ${cols} ${del}`;
}
function renderNWSection(elId,sec){
  const el=document.getElementById(elId);el.innerHTML='';
  const cnt=D.nwPeriodsCount||6;
  document.documentElement.style.setProperty('--nw-count',cnt);
  const tpl=nwGridCols(cnt);
  document.documentElement.style.setProperty('--nw-tpl',tpl);
  const secLabels={assets:'סה"כ נכסים',investments:'סה"כ השקעות',savings:'סה"כ חסכונות',debts:'סה"כ חובות'};
  // ── Header row ──
  const hr=document.createElement('div');hr.className='nwrow';hr.style.gridTemplateColumns=tpl;
  hr.innerHTML=`<div style="font-size:10px;color:var(--t2);font-weight:700;text-align:right;overflow:hidden;min-width:0;max-width:160px">סעיף</div>
    ${D.nwPeriods.slice(0,cnt).map((p,i)=>{
      const future=p&&isFuturePeriod(p);
      const isHidden=!!nwColHidden[i];
      if(isHidden){
        return `<div class="nw-col-hidden-ph" title="הצג עמודה ${p||'ת'+(i+1)}" onclick="toggleNWCol(${i})">▶</div>`;
      }
      const style=future
        ?'text-align:center;font-size:10px;color:rgba(71,85,105,0.5);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:italic;min-width:0'
        :'text-align:center;font-size:10px;color:var(--t2);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0';
      const label=p||(future?'עתיד':'ת'+(i+1));
      return `<div style="${style}"><span>${label}</span>
        <button class="col-toggle" onclick="toggleNWCol(${i})" title="הסתר עמודה">▼</button></div>`;
    }).join('')}
    <div></div>`;
  el.appendChild(hr);
  // ── Data rows ──
  (D.nwData[sec].rows||[]).forEach((row,ri)=>{
    const r=document.createElement('div');r.className='nwrow';r.style.gridTemplateColumns=tpl;
    r.innerHTML=`
      <div style="overflow:hidden;min-width:0;max-width:160px;">
        <input value="${esc(row.name)}" placeholder="שם" data-sec="${sec}" data-ri="${ri}" oninput="nwRowName(this)" style="text-align:right;direction:rtl;width:100%;background:transparent;border:none;outline:none;color:var(--t2);font-family:var(--font);font-size:12px;border-bottom:1px dashed var(--border);"/>
      </div>
      ${row.vals.slice(0,cnt).map((val,ci)=>{
        if(nwColHidden[ci]){
          return `<div class="nw-col-hidden-ph" title="הצג עמודה" onclick="toggleNWCol(${ci})">▶</div>`;
        }
        const periodLabel=D.nwPeriods[ci]||'';
        const isFuture=isFuturePeriod(periodLabel);
        if(isFuture){
          return `<div class="nwcell" style="background:rgba(30,45,80,0.5);border-color:rgba(66,100,150,0.4);display:flex;align-items:center;justify-content:center;color:rgba(148,163,184,0.5);font-size:11px;font-style:italic">עתיד</div>`;
        }
        const cellCur=getCellCurrency(row,ci);
        const isForex=cellCur!=='ILS';
        const n=parseFloat(val)||0;
        let dispVal='';
        if(val&&!isNaN(n)&&n!==0){
          if(isForex){
            const ilsVal=toILS(n,cellCur);
            dispVal=n.toLocaleString('he-IL')+' '+getCurrSymbol(cellCur)+' (₪'+Math.round(ilsVal).toLocaleString('he-IL')+')';
          } else {
            dispVal=n.toLocaleString('he-IL');
          }
        }
        const inputType=dispVal?'text':'number';
        const cellColor=isForex?'var(--amber)':'var(--teal)';
        return `<div class="nwcell-wrap" style="position:relative;min-width:0;">
          <input class="nwcell" type="${inputType}" value="${dispVal||''}" placeholder="${getCurrSymbol(cellCur)||'₪'}" data-sec="${sec}" data-ri="${ri}" data-ci="${ci}" data-raw="${val||''}" oninput="nwCellUpdate(this)" onfocus="nwCellFocus(this)" onblur="nwCellBlur(this)" style="color:${cellColor};font-weight:700;width:100%;font-size:10px;" />
          <select class="nwcell-curr" data-sec="${sec}" data-ri="${ri}" data-ci="${ci}" onchange="nwCellCurrency(this)"
            style="position:absolute;bottom:1px;left:1px;background:transparent;border:none;outline:none;font-family:var(--font);font-size:9px;color:${isForex?'var(--amber)':'rgba(66,235,214,0.4)'};cursor:pointer;padding:0;appearance:none;-webkit-appearance:none;width:auto;z-index:2;">
            ${buildCurrOptions(cellCur)}
          </select>
        </div>`;
      }).join('')}
      <button class="bdel" style="font-size:14px" onclick="delNWRow('${sec}',${ri})">×</button>`;
    el.appendChild(r);
  });
  // ── Section total row ──
  const totalRow=document.createElement('div');
  totalRow.className='nwrow nw-total-row';totalRow.style.gridTemplateColumns=tpl;
  // Use running best-estimate per column so sections with infrequent updates
  // don't show "—" in periods where the value simply wasn't re-entered.
  const prevColTotals=D.nwPeriods.slice(0,cnt).map((_,c)=>sumSecBestAtCol(sec,c));
  totalRow.innerHTML=`
    <div class="nw-total-lbl">${secLabels[sec]||'סה"כ'}</div>
    ${prevColTotals.map((sum,c)=>{
      if(nwColHidden[c])return `<div></div>`;
      const p=D.nwPeriods[c]||'';
      if(p&&isFuturePeriod(p))return `<div class="nw-total-cell" id="nwtot-${sec}-${c}" style="color:rgba(66,235,214,.3);">—</div>`;
      return `<div class="nw-total-cell" id="nwtot-${sec}-${c}">${sum>0?fmt(sum):'—'}</div>`;
    }).join('')}
    <div></div>`;
  el.appendChild(totalRow);
  // ── Delta row (change vs previous non-empty period) ──
  const hasAnyData=prevColTotals.some(v=>v>0);
  if(hasAnyData){
    const deltaRow=document.createElement('div');
    deltaRow.className='nwrow nw-delta-row';deltaRow.style.gridTemplateColumns=tpl;
    deltaRow.innerHTML=`
      <div style="font-size:10px;color:var(--t2);text-align:right;padding-right:2px;overflow:hidden;max-width:160px;">Δ פער</div>
      ${prevColTotals.map((sum,c)=>{
        if(nwColHidden[c])return `<div></div>`;
        const p=D.nwPeriods[c]||'';
        if(!p||isFuturePeriod(p))return `<div class="nw-delta-cell" id="nwdlt-${sec}-${c}"></div>`;
        // Find previous non-empty period
        let prevSum=null;
        for(let pc=c-1;pc>=0;pc--){
          const pp=D.nwPeriods[pc]||'';
          if(pp&&!isFuturePeriod(pp)&&prevColTotals[pc]>0){prevSum=prevColTotals[pc];break;}
        }
        if(prevSum===null||sum===0)return `<div class="nw-delta-cell" id="nwdlt-${sec}-${c}"></div>`;
        const d=sum-prevSum;
        if(d===0)return `<div class="nw-delta-cell" id="nwdlt-${sec}-${c}" style="color:var(--t3)">ללא שינוי</div>`;
        const col=d>0?'var(--green)':'var(--red)';
        const arrow=d>0?'↑':'↓';
        return `<div class="nw-delta-cell" id="nwdlt-${sec}-${c}" style="color:${col}">${arrow} ${d>0?'+':''}${fmt(d)}</div>`;
      }).join('')}
      <div></div>`;
    el.appendChild(deltaRow);
  }
}
function liveUpdateNWSec(sec){
  const cnt=D.nwPeriodsCount||6;
  const totals=D.nwPeriods.slice(0,cnt).map((_,c)=>sumSecBestAtCol(sec,c));
  totals.forEach((sum,c)=>{
    const p=D.nwPeriods[c]||'';
    const totEl=document.getElementById('nwtot-'+sec+'-'+c);
    if(totEl){
      if(p&&isFuturePeriod(p)){totEl.style.color='rgba(66,235,214,.3)';totEl.textContent='—';}
      else{totEl.style.color='';totEl.textContent=sum>0?fmt(sum):'—';}
    }
    const dltEl=document.getElementById('nwdlt-'+sec+'-'+c);
    if(dltEl){
      if(!p||isFuturePeriod(p)){dltEl.style.color='';dltEl.textContent='';return;}
      let prevSum=null;
      for(let pc=c-1;pc>=0;pc--){
        const pp=D.nwPeriods[pc]||'';
        if(pp&&!isFuturePeriod(pp)&&totals[pc]>0){prevSum=totals[pc];break;}
      }
      if(prevSum===null||sum===0){dltEl.style.color='';dltEl.textContent='';return;}
      const d=sum-prevSum;
      if(d===0){dltEl.style.color='var(--t3)';dltEl.textContent='ללא שינוי';return;}
      dltEl.style.color=d>0?'var(--green)':'var(--red)';
      dltEl.textContent=(d>0?'↑ +':'↓ ')+fmt(d);
    }
  });
}
function renderNWSummary(){
  const cnt=D.nwPeriodsCount||D.nwPeriods.length||6;
  // Running best-estimate per column: each row carries forward its last known value.
  // This keeps the history table and KPI tiles consistent (no false drops when only
  // one section was updated in a period).
  const totals=D.nwPeriods.slice(0,cnt).map((_,c)=>{
    const a=sumSecBestAtCol('assets',c),iv=sumSecBestAtCol('investments',c);
    const sv=sumSecBestAtCol('savings',c),d=sumSecBestAtCol('debts',c);
    return {a,iv,sv,d,nw:a+iv+sv-d};
  });
  // KPI summary tiles removed from NW tab — calculation lives on Dashboard only.

  // Multi-period history table — only periods with a label
  const activePeriods=D.nwPeriods.slice(0,cnt).map((p,i)=>({p,i})).filter(({p})=>p);
  if(activePeriods.length>1){
    const rows=[
      {key:'a',label:'נכסים',color:'var(--green)'},
      {key:'iv',label:'השקעות',color:'var(--blue)'},
      {key:'sv',label:'חסכונות',color:'var(--purple)'},
      {key:'d',label:'(-) חובות',color:'var(--red)'},
    ];
    // Build per-column delta for NW
    const nwDeltas=activePeriods.map(({i},ai)=>{
      if(ai===0)return null;
      const prevAi=ai-1;
      if(totals[activePeriods[prevAi].i].nw===0)return null;
      return totals[i].nw - totals[activePeriods[prevAi].i].nw;
    });
    let tableHtml=`<div class="nw-history-wrap"><table class="nw-history-table"><thead><tr>
      <th class="th-label">קטגוריה</th>
      ${activePeriods.map(({p,i})=>{
        const fut=isFuturePeriod(p);
        return `<th style="${fut?'color:rgba(71,85,105,.5);font-style:italic':''}">${p}</th>`;
      }).join('')}
    </tr></thead><tbody>`;
    rows.forEach(({key,label,color})=>{
      tableHtml+=`<tr><td class="td-label"><span style="color:${color}">●</span> ${label}</td>
        ${activePeriods.map(({i})=>{
          const v=totals[i][key];
          return `<td style="color:var(--white)">${v>0?fmt(v):'—'}</td>`;
        }).join('')}</tr>`;
    });
    // NW totals row
    tableHtml+=`<tr class="nw-row-total"><td class="td-label">שווי נטו</td>
      ${activePeriods.map(({i})=>`<td>${fmt(totals[i].nw)}</td>`).join('')}
    </tr>`;
    // Delta row
    tableHtml+=`<tr class="delta-row"><td class="td-label">Δ שינוי</td>
      ${nwDeltas.map(d=>{
        if(d===null)return '<td>—</td>';
        const col=d>0?'var(--green)':'var(--red)';
        return `<td style="color:${col}">${d>0?'↑ +':'↓ '}${fmt(d)}</td>`;
      }).join('')}
    </tr>`;
    tableHtml+=`</tbody></table></div>`;
    // Write into dedicated container (cleared each render, no stacking)
    let histEl=document.getElementById('nw-history-container');
    if(!histEl){
      histEl=document.createElement('div');histEl.id='nw-history-container';
      document.getElementById('nw-summary-stats').insertAdjacentElement('afterend',histEl);
    }
    histEl.innerHTML=tableHtml;
  } else {
    const histEl=document.getElementById('nw-history-container');
    if(histEl)histEl.innerHTML='';
  }
}
function toggleNWCol(i){
  nwColHidden[i]=!nwColHidden[i];
  renderNW();
}
function addNWPeriod(){
  if(!D.nwPeriodsCount)D.nwPeriodsCount=6;
  D.nwPeriodsCount++;
  D.nwPeriods.push('');
  nwColHidden={};  // reset collapse when structure changes
  // extend all rows
  ['assets','investments','savings','debts'].forEach(sec=>{
    (D.nwData[sec].rows||[]).forEach(row=>{row.vals.push('');});
  });
  renderNW();markDirty();
}
function removeNWPeriod(){
  if(!D.nwPeriodsCount||D.nwPeriodsCount<=1)return;
  D.nwPeriodsCount--;
  D.nwPeriods.pop();
  nwColHidden={};  // reset collapse when structure changes
  ['assets','investments','savings','debts'].forEach(sec=>{
    (D.nwData[sec].rows||[]).forEach(row=>{row.vals.pop();});
  });
  renderNW();markDirty();
}
function nwPeriodChange(el){
  const i=+el.dataset.i;
  D.nwPeriods[i]=el.value;
  markDirty();
  // Don't re-render while typing - only update period labels display
  document.querySelectorAll('.nw-period-header-'+i).forEach(h=>h.textContent=el.value||'ת'+(i+1));
}
function parsePeriodDate(val){
  if(!val)return null;
  val=val.trim();
  const parts=val.split('/');
  let m,y;
  if(parts.length===3){
    // d/m/yyyy Israeli format
    m=parseInt(parts[1]);
    y=parseInt(parts[2]);
  } else if(parts.length===2){
    // m/yyyy or m/yy
    m=parseInt(parts[0]);
    y=parseInt(parts[1]);
  } else return null;
  if(isNaN(m)||isNaN(y))return null;
  if(y<100)y+=2000;
  if(m<1||m>12)return null;
  return {m,y};
}
function formatPeriodLabel(val){
  // Convert any date format to clean m/yyyy display
  const p=parsePeriodDate(val);
  if(!p)return val||'';
  return p.m+'/'+p.y;
}
function nwPeriodBlur(el){
  const i=+el.dataset.i;
  const raw=el.value.trim();
  // Normalize to m/yyyy format
  const parsed=parsePeriodDate(raw);
  const normalized=parsed?(parsed.m+'/'+parsed.y):raw;
  D.nwPeriods[i]=normalized;
  el.value=normalized;
  // Auto-fill subsequent empty periods (6-month intervals) only from first field
  if(i===0&&normalized&&parsed){
    try{
      let {m,y}=parsed;
      const cnt=D.nwPeriodsCount||6;
      for(let j=1;j<cnt;j++){
        m+=6;if(m>12){m-=12;y++;}
        if(!D.nwPeriods[j]||D.nwPeriods[j].includes('NaN')||D.nwPeriods[j]===''){
          D.nwPeriods[j]=m+'/'+y;
        }
      }
    }catch(e){}
  }
  renderNW();markDirty();
}

function nwCellUpdate(el){
  const sec=el.dataset.sec,ri=+el.dataset.ri,ci=+el.dataset.ci;
  // Strip commas in case user pasted formatted number
  const v=el.value.replace(/,/g,'').trim();
  el.dataset.raw=v;
  D.nwData[sec].rows[ri].vals[ci]=v;
  touchSection('nw');
  liveUpdateNWSec(sec);
  renderNWSummary();markDirty();
}
function nwCellCurrency(el){
  const sec=el.dataset.sec,ri=+el.dataset.ri,ci=+el.dataset.ci;
  if(el.value==='__add__'){
    const code=prompt('הכנס קוד מטבע (לדוגמא: CHF, JPY):','');
    if(!code){el.value=getCellCurrency(D.nwData[sec].rows[ri],+ci);return;}
    const upper=code.trim().toUpperCase();
    if(!D.exchangeRates[upper]){
      const rate=parseFloat(prompt('כמה ₪ שווה 1 '+upper+'?',''));
      if(isNaN(rate)||rate<=0){el.value=getCellCurrency(D.nwData[sec].rows[ri],+ci);return;}
      D.exchangeRates[upper]=rate;
      CURR_SYMBOLS[upper]=upper;
    }
    if(!D.nwData[sec].rows[ri].cellCurrencies)D.nwData[sec].rows[ri].cellCurrencies={};
    D.nwData[sec].rows[ri].cellCurrencies[ci]=upper;
    refreshCellDisplay(sec,ri,ci);
    renderNWSummary();markDirty();
    return;
  }
  if(!D.nwData[sec].rows[ri].cellCurrencies)D.nwData[sec].rows[ri].cellCurrencies={};
  if(el.value==='ILS'){
    delete D.nwData[sec].rows[ri].cellCurrencies[ci];
  } else {
    D.nwData[sec].rows[ri].cellCurrencies[ci]=el.value;
  }
  // Immediately update the cell display with converted value
  refreshCellDisplay(sec,ri,ci);
  renderNWSummary();markDirty();
}

// Re-display a single cell after currency change without full re-render
function refreshCellDisplay(sec,ri,ci){
  const row=D.nwData[sec].rows[ri];
  const val=row.vals[ci]||'';
  const cur=getCellCurrency(row,ci);
  const isForex=cur!=='ILS';
  const n=parseFloat(val)||0;
  // Find the input for this cell
  const input=document.querySelector(
    `input.nwcell[data-sec="${sec}"][data-ri="${ri}"][data-ci="${ci}"]`
  );
  const currSelect=document.querySelector(
    `select.nwcell-curr[data-sec="${sec}"][data-ri="${ri}"][data-ci="${ci}"]`
  );
  if(input&&val!==''&&!isNaN(n)&&n!==0){
    input.type='text';
    if(isForex){
      const ilsVal=toILS(n,cur);
      input.value=n.toLocaleString('he-IL')+' '+getCurrSymbol(cur)+' (₪'+Math.round(ilsVal).toLocaleString('he-IL')+')';
      input.style.color='var(--amber)';
    } else {
      input.value=n.toLocaleString('he-IL');
      input.style.color='var(--teal)';
    }
    input.style.fontWeight='700';
    input.dataset.raw=val;
  }
  if(currSelect){
    currSelect.style.color=isForex?'var(--amber)':'rgba(66,235,214,0.4)';
    // Update select value to reflect new currency
    currSelect.value=cur;
  }
}
// NW cell blur: show formatted
function nwCellBlur(el){
  const sec=el.dataset.sec,ri=el.dataset.ri!=null?+el.dataset.ri:null;
  const ci=el.dataset.ci!=null?+el.dataset.ci:null;
  // Get the stored raw value (set by nwCellUpdate)
  let rawNum=el.dataset.raw||'';
  if(rawNum===''){
    // Fallback: strip formatting from display value
    rawNum=el.value.replace(/[,\s₪$€£]/g,'').replace(/\(.*\)/,'').trim();
  }
  const n=parseFloat(rawNum);
  if(rawNum!==''&&!isNaN(n)&&n!==0){
    el.dataset.raw=String(n);
    const row=sec!=null&&ri!=null?D.nwData[sec]?.rows[ri]:null;
    const cur=row&&ci!=null?getCellCurrency(row,ci):'ILS';
    const isForex=cur!=='ILS';
    el.type='text';
    if(isForex){
      // Ensure rates exist
        const rate=D.exchangeRates[cur]||1;
      const ilsVal=n*rate;
      el.value=n.toLocaleString('he-IL')+' '+getCurrSymbol(cur)+' = ₪'+Math.round(ilsVal).toLocaleString('he-IL');
      el.style.color='var(--amber)';
    } else {
      el.value=n.toLocaleString('he-IL');
      el.style.color='var(--teal)';
    }
    el.style.fontWeight='700';
  } else {
    el.dataset.raw='';
    el.type='number';
    el.value='';
    el.style.color='';
    el.style.fontWeight='';
  }
}

function nwCellFocus(el){
  el.type='number';
  el.value=el.dataset.raw||el.dataset.numRaw||'';
  el.style.color='';
  el.style.fontWeight='';
}
function addNWRow(sec){D.nwData[sec].rows.push({name:'',vals:nw6()});renderNW();touchSection('nw');markDirty();}
function delNWRow(sec,ri){D.nwData[sec].rows.splice(ri,1);renderNW();markDirty();}
// sumSec replaced by currency-aware version above

