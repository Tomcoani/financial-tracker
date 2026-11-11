// ══ LESSON SUMMARIES — "הדרך לעושר" ══
// Beta (admin + BETA_USERS, see isBeta in core.js) until Tom releases it.
// The lesson text is NOT in this public repo. It lives in Firestore:
//   lessons/{1..6}       {n,title,sub,html,updatedAt} — uploaded by the admin from this tab
//   entitlements/{email} {maxLesson}                  — written by the Make sync from Notion
//                                                        (Customers → "מספר פגישות שעבר", capped at 6)
// Firestore rules let a user read lessons/{n} only when their entitlements doc has maxLesson >= n,
// so a locked lesson never reaches the device. The admin can read and write everything.
const LESSONS=[
  {n:1,title:'היכרות עם כסף ומושגי היסוד',ds:'ריבית, ריבית דריבית, אינפלציה, קרן חירום ו־50/30/20'},
  {n:2,title:'פסיכולוגיה של כסף והיכרות עם שוק ההון',ds:'למה להשקיע, מה זו מניה, הנפקה, FOMO ואיך עשירים מתנהלים'},
  {n:3,title:'מתחילים להשקיע: מה קונים בשוק ההון',ds:'תנודתיות, מניה מול מדד, אג״ח, קרן כספית ומס'},
  {n:4,title:'סיכונים, סבלנות ומי ינהל את הכסף',ds:'שיטת הממוצע, מבחן הסבלנות, קופת גמל להשקעה מול פוליסה'},
  {n:5,title:'תיק השקעות עצמאי מא׳ עד ת׳',ds:'מדדים, בית השקעות, קרן מחקה, מט״ח ואזרחות אמריקאית'},
  {n:6,title:'פנסיה וקרן השתלמות',ds:'כלל ה־4%, סוגי פנסיה, מסלולים, דמי ניהול וקרן השתלמות'}
];
let _lsnMax=null,_lsnCache={},_lsnOpen=0,_lsnPreview=null,_lsnObs=null;

function lessonsEnabled(){return typeof isBeta==='function'&&isBeta();}
function lsnIsAdmin(){return !!(auth.currentUser&&String(auth.currentUser.email||'').toLowerCase()===ADMIN_EMAIL);}

// Called on every sign-in (core.js): show/hide the tab and forget the previous account's state.
function syncLessonsNav(){
  _lsnMax=null;_lsnCache={};_lsnOpen=0;_lsnPreview=null;
  const on=lessonsEnabled();
  ['nav-lessons','mm-lessons'].forEach(id=>{const b=document.getElementById(id);if(b)b.style.display=on?'':'none';});
}

async function lsnLoadMax(){
  if(_lsnMax!==null)return _lsnMax;
  const u=auth.currentUser;if(!u){_lsnMax=0;return 0;}
  if(lsnIsAdmin()){_lsnMax=6;return 6;}
  try{
    const s=await db.collection('entitlements').doc(String(u.email||'').toLowerCase()).get();
    _lsnMax=s.exists?Math.max(0,Math.min(6,parseInt(s.data().maxLesson,10)||0)):0;
  }catch(e){_lsnMax=0;} // no doc / rules not published yet → nothing unlocked
  return _lsnMax;
}
// What the list shows as unlocked. The admin can preview the list as a graduate with N lessons.
function lsnVisibleMax(max){return lsnIsAdmin()&&_lsnPreview!==null?_lsnPreview:max;}

async function renderLessons(){
  const el=document.getElementById('lsn-root');if(!el)return;
  if(!lessonsEnabled()){el.innerHTML='';return;}
  if(_lsnOpen)return lsnShow(_lsnOpen);
  el.innerHTML='<div class="card"><div class="ch-title">סיכומי מפגשים — הדרך לעושר</div><div class="ch-hint">טוען…</div></div>';
  const max=await lsnLoadMax();
  const vis=lsnVisibleMax(max);
  const hint=vis>=6?'כל ששת הסיכומים פתוחים. אפשר לחזור אליהם בכל זמן.'
    :vis>0?`פתוחים ${vis===1?'הסיכום של המפגש הראשון':'הסיכומים של '+vis+' המפגשים הראשונים'}. כל סיכום נפתח אחרי שהמפגש שלו מתקיים.`
    :'הסיכומים נפתחים אחד־אחד, אחרי כל מפגש בקורס. כבר היית במפגש והסיכום לא נפתח? אפשר לכתוב לתום.';
  const cards=LESSONS.map(l=>{
    const open=l.n<=vis;
    return `<div class="lsn-card${open?'':' locked'}"${open?` onclick="lsnShow(${l.n})"`:''}>
      ${open?'':`<span class="lock">🔒 ייפתח אחרי מפגש ${l.n}</span>`}
      <div class="no">מפגש ${String(l.n).padStart(2,'0')}</div>
      <div class="tt">${l.title}</div>
      <div class="ds">${l.ds}</div>
    </div>`;}).join('');
  el.innerHTML=`<div class="card">
      <div class="ch-title">סיכומי מפגשים — הדרך לעושר</div>
      <div class="ch-hint">${hint}</div>
      <div class="lsn-list">${cards}</div>
    </div>${lsnIsAdmin()?lsnAdminCard():''}`;
  if(lsnIsAdmin())lsnAdminStatus();
}

async function lsnShow(n){
  const el=document.getElementById('lsn-root');if(!el)return;
  _lsnOpen=n;
  const meta=LESSONS.find(l=>l.n===n)||{title:''};
  el.innerHTML=`<div class="card"><div class="ch-hint" style="margin:0">טוען את מפגש ${n}…</div></div>`;
  let d=_lsnCache[n];
  if(!d){
    try{
      const s=await db.collection('lessons').doc(String(n)).get();
      if(!s.exists){lsnMsg(n,lsnIsAdmin()?'הסיכום עוד לא הועלה. אפשר להעלות אותו בכרטיס הניהול שבעמוד הסיכומים.':'הסיכום של המפגש הזה עוד לא זמין. נסו שוב בקרוב.');return;}
      d=s.data();_lsnCache[n]=d;
    }catch(e){lsnMsg(n,'🔒 הסיכום הזה עוד לא נפתח עבורך. הוא ייפתח אחרי מפגש '+n+'.');return;}
  }
  if(_lsnOpen!==n)return; // the user moved on while loading
  const max=lsnVisibleMax(await lsnLoadMax());
  const prev=n>1?`<button class="btnout" onclick="lsnShow(${n-1})">→ מפגש ${n-1}</button>`:'<span></span>';
  const next=n<6&&n+1<=max?`<button class="btnsave" onclick="lsnShow(${n+1})">מפגש ${n+1} ←</button>`:'<span></span>';
  el.innerHTML=`<div class="lsn-bar">
      <button class="btnout" onclick="lsnBack()">→ כל המפגשים</button>
      <span style="font-size:13px;color:var(--t3)">מפגש ${n} מתוך 6 · ${d.title||meta.title}</span>
    </div>
    <article class="lsn">${d.html||''}</article>
    <div class="lsn-nav">${prev}${next}</div>`;
  lsnWire(el);
  const p=document.getElementById('p-lessons');if(p)p.scrollIntoView({block:'start'});
}
function lsnMsg(n,txt){
  const el=document.getElementById('lsn-root');if(!el)return;
  el.innerHTML=`<div class="lsn-bar"><button class="btnout" onclick="lsnBack()">→ כל המפגשים</button></div>
    <div class="card"><div class="ch-title">מפגש ${n}</div><div class="ch-hint" style="margin:0">${txt}</div></div>`;
}
function lsnBack(){_lsnOpen=0;renderLessons();}

// In-page table of contents (anchors would otherwise touch the page URL) + vertical reveal on scroll.
function lsnWire(el){
  el.querySelectorAll('.lsn .toc a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
      e.preventDefault();
      let t=null;try{t=el.querySelector(a.getAttribute('href'));}catch(_){}
      if(t)t.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
  if(_lsnObs){_lsnObs.disconnect();_lsnObs=null;}
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce||!('IntersectionObserver' in window))return;
  const items=el.querySelectorAll('.lsn section, .lsn .recap');
  _lsnObs=new IntersectionObserver(ents=>ents.forEach(en=>{
    if(en.isIntersecting){en.target.classList.add('in');_lsnObs&&_lsnObs.unobserve(en.target);}
  }),{rootMargin:'0px 0px -8% 0px'});
  items.forEach(s=>{s.classList.add('rv');_lsnObs.observe(s);});
}

// ── Admin: upload lesson files + preview as a graduate ──
function lsnAdminCard(){
  const opts=['<option value="">כמנהל (הכול פתוח)</option>'].concat([0,1,2,3,4,5,6].map(k=>
    `<option value="${k}"${_lsnPreview===k?' selected':''}>כבוגר עם ${k} מפגשים</option>`)).join('');
  return `<div class="card" style="border-color:rgba(139,92,246,.35)">
    <div class="ch-title">ניהול סיכומים <span style="font-size:12px;color:var(--purple)">· רק לך</span></div>
    <div class="ch-hint">העלאת קובצי lesson-N.html מהתיקייה ״סיכומי מפגשים - הדרך לעושר״. כל קובץ מחליף את הגרסה שבמערכת. אפשר לבחור כמה קבצים בבת אחת.</div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <input type="file" id="lsn-files" accept=".html,text/html" multiple style="font-size:13px;color:var(--t2)">
      <button class="btnsave" onclick="lsnUpload()">העלאה ↑</button>
      <label style="font-size:13px;color:var(--t2);display:flex;align-items:center;gap:6px">תצוגה:
        <select onchange="lsnSetPreview(this.value)" style="background:var(--s2);color:var(--white);border:1px solid var(--border);border-radius:8px;padding:4px 8px;font-family:inherit">${opts}</select></label>
    </div>
    <div id="lsn-up-log" style="font-size:13px;margin-top:10px;line-height:1.7"></div>
    <div id="lsn-up-status" style="font-size:12.5px;color:var(--t3);margin-top:8px"></div>
  </div>`;
}
function lsnSetPreview(v){_lsnPreview=v===''?null:parseInt(v,10);renderLessons();}
async function lsnAdminStatus(){
  const el=document.getElementById('lsn-up-status');if(!el)return;
  try{
    const snap=await db.collection('lessons').get();
    const have={};snap.forEach(s=>{have[s.id]=s.data();});
    el.innerHTML='במערכת: '+LESSONS.map(l=>{
      const x=have[String(l.n)];
      return x?`<span style="color:var(--teal)">✓ ${l.n}</span> <span>(${new Date(x.updatedAt).toLocaleDateString('he-IL')})</span>`:`<span style="color:var(--red)">✗ ${l.n}</span>`;
    }).join(' · ');
  }catch(e){el.textContent='לא הצלחתי לקרוא את lessons — כנראה שחוקי Firestore עוד לא מאפשרים את זה ('+(e.code||e.message)+').';}
}
async function lsnUpload(){
  const inp=document.getElementById('lsn-files'),log=document.getElementById('lsn-up-log');
  if(!inp||!inp.files||!inp.files.length){if(log)log.textContent='לא נבחרו קבצים.';return;}
  const lines=[];
  for(const f of inp.files){
    try{
      const doc=new DOMParser().parseFromString(await f.text(),'text/html');
      const art=doc.querySelector('article.lsn');
      if(!art){lines.push(`<span style="color:var(--red)">✗ ${f.name}: לא נמצא בו &lt;article class="lsn"&gt;</span>`);continue;}
      const n=parseInt(art.getAttribute('data-lesson'),10);
      if(!(n>=1&&n<=6)){lines.push(`<span style="color:var(--red)">✗ ${f.name}: חסר data-lesson בין 1 ל־6</span>`);continue;}
      // Defense in depth: lesson HTML is rendered with innerHTML, so drop scripts and inline handlers.
      art.querySelectorAll('script,iframe,object,embed').forEach(x=>x.remove());
      art.querySelectorAll('*').forEach(x=>[...x.attributes].forEach(a=>{
        if(/^on/i.test(a.name)||/^\s*javascript:/i.test(a.value))x.removeAttribute(a.name);}));
      const html=art.innerHTML.trim();
      await db.collection('lessons').doc(String(n)).set({
        n,title:art.getAttribute('data-title')||'',sub:art.getAttribute('data-sub')||'',
        html,updatedAt:new Date().toISOString(),updatedBy:auth.currentUser.email||''});
      delete _lsnCache[n];
      lines.push(`<span style="color:var(--teal)">✓ מפגש ${n} הועלה</span> (${f.name}, ${Math.round(html.length/1024)}KB)`);
    }catch(e){lines.push(`<span style="color:var(--red)">✗ ${f.name}: ${e.code||e.message}</span>`);}
  }
  if(log)log.innerHTML=lines.join('<br>');
  inp.value='';
  lsnAdminStatus();
}
