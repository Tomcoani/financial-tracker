const _locExpanded={};
let _dragLocIdx=null;
function renderLocsAutoSummary(){
  const el=document.getElementById('locs-auto-summary');
  if(!el)return;
  const whereMap={};

  (D.goals||[]).filter(g=>!g.done).forEach(g=>{
    const goalCur=g.savedCurrency||'ILS';
    const locs=(g.goalLocs&&g.goalLocs.length)?g.goalLocs
      :(g.where&&g.saved?[{where:g.where,amount:g.saved}]:[]);
    locs.forEach(loc=>{
      const key=(loc.where||'').trim();if(!key)return;
      const amt=parseFloat(loc.amount)||0;if(!amt)return;
      const locILS=toILS(amt,goalCur);
      if(!whereMap[key])whereMap[key]={totalILS:0,currency:goalCur,curCount:{},goals:[]};
      whereMap[key].curCount[goalCur]=(whereMap[key].curCount[goalCur]||0)+1;
      whereMap[key].totalILS+=locILS;
      if(g.name)whereMap[key].goals.push({name:g.name,saved:amt,savedCur:goalCur});
    });
  });
  // Set dominant goal currency per group
  Object.values(whereMap).forEach(d=>{
    d.currency=Object.entries(d.curCount).sort((a,b)=>b[1]-a[1])[0][0];
  });
  if(!Object.keys(whereMap).length){el.innerHTML='';return;}
  const keys=Object.keys(whereMap);
  let html=`<div style="font-size:11px;color:var(--teal);margin-bottom:8px;font-weight:600">🔄 מחושב אוטומטית מהמטרות הפעילות שלך:</div>`;
  html+=`<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:10px">`;
  keys.forEach((where,idx)=>{
    const data=whereMap[where];
    const groupCur=data.currency;
    const displayTotal=fromILS(data.totalILS,groupCur);
    const isExp=!!_locExpanded[where];
    const hasMore=idx<keys.length-1||isExp;
    html+=`<div onclick="toggleLocRow('${where.replace(/'/g,"\\'")}')" style="display:flex;justify-content:space-between;align-items:center;
      min-height:44px;padding:10px 14px;${hasMore?'border-bottom:1px solid var(--border)':''}font-size:13px;cursor:pointer;user-select:none">
      <span style="color:var(--t2);display:flex;align-items:center;gap:6px">
        ${esc(where)} <span style="font-size:10px;color:var(--t3)">${isExp?'▲':'▼'}</span>
      </span>
      <span style="color:var(--teal);font-weight:700">${fmtCur(displayTotal,groupCur)}</span>
    </div>`;
    if(isExp){
      data.goals.forEach((gl,gi)=>{
        const isLastSub=gi===data.goals.length-1&&idx===keys.length-1;
        html+=`<div style="display:flex;justify-content:space-between;align-items:center;min-height:36px;padding:6px 22px;
          ${!isLastSub?'border-bottom:1px solid var(--border)':''}background:rgba(0,0,0,.12)">
          <span style="font-size:12px;color:var(--t3)">↳ ${esc(gl.name)}</span>
          <span style="font-size:12px;color:var(--teal);font-weight:600">${fmtCur(gl.saved,gl.savedCur)}</span>
        </div>`;
      });
    }
  });
  html+=`</div>`;
  el.innerHTML=html;
}
function toggleLocRow(where){_locExpanded[where]=!_locExpanded[where];renderLocsAutoSummary();}

// ══ HISTORY RESTORE + DELETE ══
async function restoreSnap(i){
  if(!confirm('שחזר את המצב מתמונת מצב זו?\n\nהמצב הנוכחי יישמר כתמונת מצב לפני השחזור.'))return;
  const snap=D.snapshots[i];
  if(!snap)return;
  const cur=calcCurrent(),now=new Date();
  D.snapshots.push({date:now.toISOString(),label:'לפני שחזור ('+snap.label+')',...cur});
  D.monthly=String(snap.monthly||'');
  if(snap.goals)D.goals=JSON.parse(JSON.stringify(snap.goals));
  if(snap.locations)D.locations=JSON.parse(JSON.stringify(snap.locations));
  await saveDataFS(CU,D);
  renderAll();showToast('המצב שוחזר ✓');
}
async function deleteSnapDirect(i){
  if(!confirm('למחוק תמונת מצב זו לצמיתות?'))return;
  D.snapshots.splice(i,1);
  await saveDataFS(CU,D);
  renderHistory();renderDash();showToast('נמחק ✓');
}

// ══ RESET ══
function confirmReset(){document.getElementById('reset-modal').style.display='flex';}
async function doReset(){
  const fresh=defData();
  D=fresh;
  await saveDataFS(CU,D);
  document.getElementById('reset-modal').style.display='none';
  renderAll();
  showToast('הנתונים אופסו ✓');
}

// ══ DASHBOARD INSIGHTS ══
function renderDashInsights(nwTotal,nwAssets,nwInvest,nwSavings,nwDebts,latestCol,prevSnap){
  const el=document.getElementById('dash-insights');
  if(!el)return;

  // Find last 2 non-future periods with actual data for trend
  const cnt=D.nwPeriodsCount||D.nwPeriods.length||6;
  const periodsWithData=[];
  for(let c=cnt-1;c>=0&&periodsWithData.length<2;c--){
    if(D.nwPeriods[c]&&!isFuturePeriod(D.nwPeriods[c])){
      const tot=sumSec('assets',c)+sumSec('investments',c)+sumSec('savings',c)-sumSec('debts',c);
      if(tot!==0)periodsWithData.push({c,label:D.nwPeriods[c],nw:tot});
    }
  }

  if(nwTotal===0&&periodsWithData.length===0){el.style.display='none';return;}
  el.style.display='block';

  const latestLabel=periodsWithData[0]?.label||'';
  const prevNW=periodsWithData.length>=2?periodsWithData[1].nw:null;
  const nwChange=prevNW!==null?nwTotal-prevNW:null;
  const lines=[];

  // 1. Net worth trend between NW periods
  if(nwChange!==null){
    const abs=Math.abs(nwChange);
    if(nwChange>0)
      lines.push({icon:'📈',color:'var(--teal)',text:`שווי הנטו <strong>עלה ב-${fmt(abs)}</strong> מהתקופה הקודמת (${periodsWithData[1].label}) — כיוון מצוין!`});
    else if(nwChange<0)
      lines.push({icon:'📉',color:'var(--red)',text:`שווי הנטו <strong>ירד ב-${fmt(abs)}</strong> מהתקופה הקודמת (${periodsWithData[1].label}) — ${g('שים','שימי')} לב לשינויים.`});
    else
      lines.push({icon:'→',color:'var(--t2)',text:`שווי הנטו <strong>יציב</strong> — אין שינוי מהתקופה הקודמת.`});
  }else if(nwTotal>0){
    lines.push({icon:'📊',color:'var(--t2)',text:`שווי נטו נוכחי: <strong>${fmt(nwTotal)}</strong> — המשך לעדכן תקופות כדי לראות מגמות.`});
  }

  // 2. Snapshot comparison
  if(prevSnap){
    const snapChange=nwTotal-prevSnap.netWorth;
    if(Math.abs(snapChange)>100){
      const sign=snapChange>=0?'+':'';
      lines.push({icon:'💾',color:snapChange>=0?'var(--teal)':'var(--red)',
        text:`מאז תמונת המצב האחרונה (${fmtDate(prevSnap.date)}): <strong>${sign}${fmt(snapChange)}</strong>`});
    }
  }

  // 3. Asset mix insight
  const totalAssets=nwAssets+nwInvest+nwSavings;
  if(totalAssets>0){
    const liquidPct=Math.round((nwInvest+nwSavings)/totalAssets*100);
    if(liquidPct>=60)
      lines.push({icon:'💧',color:'var(--blue)',text:`נכסים נזילים: <strong>${liquidPct}%</strong> מסך הנכסים — גמישות פיננסית טובה.`});
    else if(nwAssets>0)
      lines.push({icon:'🏠',color:'var(--t2)',text:`רוב הנכסים (<strong>${100-liquidPct}%</strong>) אינם נזילים — ${g('בדוק','בדקי')} איזון.`});
  }

  // 4. Debt ratio
  if(nwDebts>0&&totalAssets>0){
    const debtRatio=Math.round(nwDebts/totalAssets*100);
    if(debtRatio>40)
      lines.push({icon:'⚠️',color:'var(--amber)',text:`יחס חוב לנכסים: <strong>${debtRatio}%</strong> — ${g('שקול','שקלי')} פירעון מוקדם.`});
    else
      lines.push({icon:'✅',color:'var(--teal)',text:`יחס חוב לנכסים סביר: <strong>${debtRatio}%</strong>.`});
  }

  // 5. Goals near completion
  const nearGoals=(D.goals||[]).filter(g=>{
    if(g.done)return false;
    const sv=parseFloat(g.saved)||0,nd=parseFloat(g.needed)||0;
    return nd>0&&sv/nd>=0.8;
  });
  if(nearGoals.length>0){
    const names=nearGoals.map(g=>g.name).join(', ');
    lines.push({icon:'🎯',color:'var(--green)',text:`${nearGoals.length>1?nearGoals.length+' מטרות קרובות להשגה':'המטרה "'+names+'" קרובה להשגה'} (80%+ מהיעד)!`});
  }

  if(lines.length===0){el.style.display='none';return;}

  el.innerHTML=`
    <div class="ch" style="margin-bottom:12px"><span class="dot" style="background:var(--amber)"></span>💡 תובנות${latestLabel?' — '+latestLabel:''}</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${lines.map(l=>`
        <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 13px;background:var(--s2);border-radius:9px;border-right:3px solid ${l.color};text-align:right;direction:rtl">
          <span style="font-size:15px;flex-shrink:0">${l.icon}</span>
          <span style="font-size:13px;color:var(--t2);line-height:1.6">${l.text}</span>
        </div>`).join('')}
    </div>`;
  if(window.lucide)lucide.createIcons();
}

// ══ ANALYSIS ══
function renderAnalysis(snaps){
  const card=document.getElementById('dash-analysis');
  const content=document.getElementById('analysis-content');
  if(!snaps||snaps.length<2){card.style.display='none';return;}
  card.style.display='block';

  const latest=snaps[snaps.length-1];
  const prev=snaps[snaps.length-2];
  const first=snaps[0];

  const nwChange=latest.netWorth-(prev.netWorth||0);
  const nwTotalChange=latest.netWorth-(first.netWorth||0);
  const savingsChange=latest.monthly-(prev.monthly||0);
  const penChange=latest.penTotal-(prev.penTotal||0);
  const goalsChange=latest.goalsSaved-(prev.goalsSaved||0);

  function insight(label,val,positive,unit=''){
    const good=positive?val>0:val<0;
    const neutral=val===0;
    const color=neutral?'var(--t2)':good?'var(--teal)':'var(--red)';
    const icon=neutral?'→':good?'↑':'↓';
    const formatted=unit==='%'?(Math.abs(val).toFixed(1)+'%'):fmt(Math.abs(val));
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="color:var(--t2)">${label}</span>
      <span style="color:${color};font-weight:700">${icon} ${formatted}</span>
    </div>`;
  }

  // Goal completion rate
  const totalGoals=(latest.goals||[]).length;
  const doneGoals=(latest.goals||[]).filter(g=>g.done).length;
  const goalPct=totalGoals>0?Math.round(doneGoals/totalGoals*100):0;

  // Trend over all snapshots
  const nwTrend=snaps.length>=3?snaps.slice(-3).every((s,i,a)=>i===0||s.netWorth>=a[i-1].netWorth):null;

  let trendMsg='';
  if(snaps.length>=3){
    trendMsg=`<div style="margin-top:14px;padding:12px 16px;border-radius:10px;font-size:13px;text-align:right;line-height:1.7;${nwTrend?'background:rgba(66,235,214,.08);border:1px solid var(--teal-border);color:var(--teal)':'background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);color:#fcd34d'}">
      ${nwTrend
        ? `📈 מגמה חיובית! שווי הנטו שלך עלה ב-${snaps.length-1} תקופות רצופות. סה"כ גדלת ב-${fmt(nwTotalChange)} מאז התחלת.`
        : `📊 שווי הנטו לא ממשיך לעלות בעקביות. ${g('בדוק','בדקי')} מה השתנה ואיפה אפשר לשפר.`
      }
    </div>`;
  }

  content.innerHTML=`
    <div style="font-size:11px;color:var(--t3);margin-bottom:10px;text-align:right">בהשוואה לתמונת המצב הקודמת (${fmtDate(prev.date)})</div>
    ${insight('שווי נטו',nwChange,true)}
    ${insight('חיסכון חודשי',savingsChange,true)}
    ${insight('פנסיה וחסכונות',penChange,true)}
    ${insight('חסכון למטרות',goalsChange,true)}
    ${trendMsg}
    <div style="margin-top:14px;display:flex;gap:12px;flex-wrap:wrap">
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;flex:1;text-align:right">
        <div style="font-size:10px;color:var(--t3);margin-bottom:5px;font-weight:700;text-transform:uppercase">מטרות שהושלמו</div>
        <div style="font-size:20px;font-weight:800;color:var(--green)">${doneGoals} / ${totalGoals}</div>
      </div>
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;flex:1;text-align:right">
        <div style="font-size:10px;color:var(--t3);margin-bottom:5px;font-weight:700;text-transform:uppercase">גדילה מתחילת המעקב</div>
        <div style="font-size:20px;font-weight:800;color:${nwTotalChange>=0?'var(--teal)':'var(--red)'}">${fmt(nwTotalChange)}</div>
      </div>
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;flex:1;text-align:right">
        <div style="font-size:10px;color:var(--t3);margin-bottom:5px;font-weight:700;text-transform:uppercase">מספר תמונות מצב</div>
        <div style="font-size:20px;font-weight:800;color:var(--teal)">${snaps.length}</div>
      </div>
    </div>`;
}


// sumSec replaced by currency-aware version above
function fmt(n){
  if(n===null||n===undefined||isNaN(n))return '₪0';
  const a=Math.abs(Math.round(n));
  const s='₪'+a.toLocaleString('he-IL');
  return n<0?'('+s+')':s;
}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function autoResize(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}
function fmtDate(iso){try{return new Date(iso).toLocaleDateString('he-IL',{day:'numeric',month:'short',year:'numeric'})}catch{return iso;}}
function v(id){return document.getElementById(id).value.trim();}
function deltaBadge(d){
  if(!d)return '<span class="delta eq">ללא שינוי</span>';
  return `<span class="delta ${d>0?'up':'dn'}">${d>0?'↑':'↓'} ${d>0?'+':''}${fmt(d)}</span>`;
}
function showToast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'||CU)return;
  if(document.getElementById('lf').style.display!=='none')doLogin();else doReg();
});

// ── Number formatting: show formatted value in a sibling span ──
// Pure approach: input stays type=number, we show a <span> overlay when not focused
function attachNumFormat(el){
  if(el._numFormatAttached)return;
  el._numFormatAttached=true;
  // On blur: show formatted text
  el.addEventListener('blur',()=>{
    const raw=el.dataset.numRaw||el.value;
    const n=parseFloat(raw);
    if(raw!==''&&!isNaN(n)&&n!==0){
      el.dataset.numRaw=String(n);
      el.type='text';
      el.value=Math.round(n).toLocaleString('he-IL');
      el.style.color='var(--teal)';
      el.style.fontWeight='700';
    }
  });
  // On focus: show raw number for editing
  el.addEventListener('focus',()=>{
    const raw=el.dataset.numRaw||el.value.replace(/,/g,'');
    el.type='number';
    el.value=raw;
    el.style.color='';
    el.style.fontWeight='';
  });
  // On input: update raw storage
  el.addEventListener('input',()=>{
    el.dataset.numRaw=el.value;
  });
  // Initial display if has value
  if(el.value!==''&&el.value!=='0'){
    const n=parseFloat(el.value);
    if(!isNaN(n)&&n!==0&&document.activeElement!==el){
      el.dataset.numRaw=String(n);
      el.type='text';
      el.value=Math.round(n).toLocaleString('he-IL');
      el.style.color='var(--teal)';
      el.style.fontWeight='700';
    }
  }
}

function attachAllNumFormats(){
  document.querySelectorAll('input[type="number"]:not([data-no-fmt])').forEach(attachNumFormat);
}

// Auto-attach number formatting after renders
window.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{if(typeof lucide!=='undefined')lucide.createIcons();},300);
});
window.addEventListener('load',()=>setTimeout(()=>{
  document.querySelectorAll('input[type="number"]').forEach(attachNumFormat);
},300));

// Warn before leaving if dirty
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

// ══ PWA SERVICE WORKER ══
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}

// ══ MOBILE BOTTOM NAV ══
function syncMobileNav(tabId){
  document.querySelectorAll('.mbn-btn').forEach(b=>b.classList.remove('on'));
  const btn=document.getElementById('mbn-'+tabId);
  if(btn)btn.classList.add('on');
  else{
    // Tabs in "more" menu — highlight "more" button
    const moreBtn=document.getElementById('mbn-more');
    if(moreBtn)moreBtn.classList.add('on');
  }
}
function toggleMobileMore(){
  const m=document.getElementById('mobile-more-menu');
  if(!m)return;
  m.style.display=m.style.display==='none'?'block':'none';
}
function closeMobileMore(){
  const m=document.getElementById('mobile-more-menu');
  if(m)m.style.display='none';
}
// Close more menu when tapping elsewhere
document.addEventListener('click',e=>{
  const menu=document.getElementById('mobile-more-menu');
  if(!menu||menu.style.display==='none')return;
  if(!menu.contains(e.target)&&!e.target.closest('#mbn-more'))closeMobileMore();
});;

// ══ ONBOARDING TOUR ══
let tourStep=0;
// Tour steps are computed lazily (inside startTour) so g() uses the correct gender setting
function getTourSteps(){
  return [
    {
      el:'nav-dash',
      title:g('ברוך הבא','ברוכה הבאה')+' למערכת! 👋',
      text:`עמוד הבית הוא מרכז הבקרה הפיננסי שלך — כאן ${g('תראה','תראי')} שווי נטו, התקדמות במטרות, סיכום פנסיה ותזרים חודשי בתצוגה אחת.<br><br>לאחר שת${g('עדכן','עדכני')} נתונים בשאר הלשוניות, ${g('חזור','חזרי')} לכאן ו${g('לחץ','לחצי')} <strong>"שמור תמונת מצב"</strong> כדי לתעד את המצב הנוכחי ולעקוב אחרי השינויים לאורך זמן.`
    },
    {
      el:'nav-goals',
      title:'מטרות פיננסיות 🎯',
      text:`${g('הגדר','הגדירי')} כאן את המטרות הכלכליות שלך — קרן חירום, רכישת דירה, חופשה, רכב וכל מה שחשוב לך.<br><br>לכל מטרה ${g('הכנס','הכניסי')}: שם, כמה חסכת עד כה, סכום יעד ואיפה הכסף נמצא. ${g('לחץ','לחצי')} <strong>"הוספת מטרה חדשה"</strong> כדי להתחיל — המטרות יסתדרו אוטומטית לפי אופק הזמן שת${g('בחר','בחרי')} לכל אחת.`
    },
    {
      el:'nav-pension',
      title:'פנסיה ואפיקי חיסכון 🏦',
      text:`כאן ${g('תנהל','תנהלי')} את כל המוצרים הפנסיוניים שלך — פנסיה מקיפה, פנסיה משלימה, קרן השתלמות ועוד.<br><br>לכל מוצר ${g('הכנס','הכניסי')}: יתרה עדכנית, תאריך הדוח האחרון, שם חברת הביטוח ודמי ניהול. המערכת תתריע אוטומטית כשמגיע הזמן לעדכן — ${g('שמור','שמרי')} תאריך מדויק לכל מוצר.`
    },
    {
      el:'nav-nw',
      title:'שווי נטו לאורך זמן 📈',
      text:`כאן ${g('תעקוב','תעקבי')} אחרי שווי הנכסים וההתחייבויות שלך לאורך תקופות שונות.<br><br>${g('מלא','מלאי')} תאריך בכל עמודה (לדוגמה: 5/2025) ו${g('הכנס','הכניסי')} ערכים: נכסים (בית, רכב, עו"ש), השקעות, חסכונות וחובות. ${g('עדכן','עדכני')} עמודה חדשה אחת לכמה חודשים — המערכת תצייר את גרף ההתקדמות אוטומטית.`
    },
    {
      el:'nav-portfolio',
      title:'תיק השקעות 💼',
      text:`כאן ${g('תנהל','תנהלי')} את ההשקעות שלך לפי ברוקרים (מיטב, פסגות, IBI וכד').<br><br>${g('הוסף','הוסיפי')} לכל ברוקר ניירות ערך עם שווי ואחוז יעד לכל קטגוריה. ${g('קבל','קבלי')} תרשים פיזור עדכני — המערכת תציג המלצה אוטומטית לאיזון מחדש כשנדרש.`
    },
    {
      el:'nav-history',
      title:'היסטוריה ותמונות מצב 🕐',
      text:`כל פעם שת${g('שמור','שמרי')} "תמונת מצב" מעמוד הבית, היא תופיע כאן עם תאריך וכל הנתונים המרכזיים.<br><br>${g('ראה','ראי')} גרף שווי נטו לאורך זמן ו${g('עקוב','עקבי')} אחרי השינויים בין תקופות — ככל שת${g('צבור','צברי')} יותר תמונות מצב, הניתוח יהיה מדויק ומשמעותי יותר.`
    },
    {
      el:'nav-settings',
      title:'הגדרות אישיות ⚙️',
      text:`${g('עדכן','עדכני')} כאן שם, גיל ואימייל, ו${g('בחר','בחרי')} תדירות עדכון כדי לקבל תזכורות. ב<strong>"לשון פנייה מועדפת"</strong> ${g('בחר','בחרי')} זכר או נקבה — זה משפיע על הניסוח בכל המערכת.<br><br>${g('לחץ','לחצי')} "הצג סיור מחדש" בכל עת אם ${g('תרצה','תרצי')} לחזור על ההסבר. עכשיו ${g('התחל','התחילי')} למלא נתונים — בהצלחה! 🎉`,
      last:true
    }
  ];
}
let TOUR_STEPS=[];

function startTour(){
  TOUR_STEPS=getTourSteps(); // Recompute with current gender preference
  tourStep=0;
  showTourStep();
}

function showTourStep(){
  const step=TOUR_STEPS[tourStep];
  if(!step){closeTour();return;}

  const overlay=document.getElementById('tour-overlay');
  const ring=document.getElementById('tour-ring');
  const card=document.getElementById('tour-card');
  const counter=document.getElementById('tour-step-counter');
  const titleEl=document.getElementById('tour-title');
  const textEl=document.getElementById('tour-text');
  const nextBtn=document.getElementById('tour-next-btn');

  // Navigate to the tab this step points to (for nav buttons)
  const targetEl=document.getElementById(step.el);
  if(targetEl&&targetEl.classList.contains('nbtn')){
    targetEl.click();
  }

  // Position the highlight ring around the target element
  setTimeout(()=>{
    const t=document.getElementById(step.el);
    if(t){
      const r=t.getBoundingClientRect();
      const pad=6;
      ring.style.top=(r.top-pad)+'px';
      ring.style.left=(r.left-pad)+'px';
      ring.style.width=(r.width+pad*2)+'px';
      ring.style.height=(r.height+pad*2)+'px';
      ring.style.display='block';
    } else {
      ring.style.display='none';
    }
  },180);

  overlay.style.display='block';
  card.style.display='block';

  counter.textContent='שלב '+(tourStep+1)+' מתוך '+TOUR_STEPS.length;
  titleEl.textContent=step.title;
  textEl.innerHTML=step.text;
  nextBtn.textContent=step.last?'סיים ✓':'הבא →';
}

function nextTourStep(){
  tourStep++;
  if(tourStep>=TOUR_STEPS.length){
    closeTour();
  } else {
    showTourStep();
  }
}

function closeTour(){
  document.getElementById('tour-overlay').style.display='none';
  document.getElementById('tour-ring').style.display='none';
  document.getElementById('tour-card').style.display='none';
  // Mark tour as done for this user so it won't auto-show again
  if(CU)localStorage.setItem('tour_done_'+CU,'1');
}

// Re-position highlight ring on resize
window.addEventListener('resize',()=>{
  if(document.getElementById('tour-card').style.display==='block'&&TOUR_STEPS[tourStep]){
    const t=document.getElementById(TOUR_STEPS[tourStep].el);
    if(t){
      const r=t.getBoundingClientRect(),pad=6;
      const ring=document.getElementById('tour-ring');
      ring.style.top=(r.top-pad)+'px';ring.style.left=(r.left-pad)+'px';
      ring.style.width=(r.width+pad*2)+'px';ring.style.height=(r.height+pad*2)+'px';
    }
  }
});
