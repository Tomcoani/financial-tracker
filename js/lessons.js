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
// Released to every client on 2026-11-12 (Tom). false = back to beta-only (isBeta in core.js).
const LESSONS_FOR_ALL=true;
let _lsnEnt=null,_lsnCache={},_lsnOpen=0,_lsnPreview=null,_lsnObs=null,_lsnOnly=false,_lsnFrom='',_lsnGoalsOk=false;

// Direct link to one summary, for the WhatsApp message after each meeting:
//   https://tomcoani.github.io/financial-tracker/?lesson=3
// Read once on page load; the client signs in (if needed) and lands straight on that summary.
const _lsnDeep=(()=>{
  try{const v=parseInt(new URLSearchParams(location.search).get('lesson'),10);return v>=1&&v<=6?v:0;}catch(e){return 0;}
})();
function lsnLink(n){return 'https://tomcoani.github.io/financial-tracker/?lesson='+n;}

function lessonsEnabled(){
  if(LESSONS_FOR_ALL&&typeof auth!=='undefined'&&auth.currentUser)return true;
  return typeof isBeta==='function'&&isBeta();
}
function lsnIsAdmin(){return !!(auth.currentUser&&String(auth.currentUser.email||'').toLowerCase()===ADMIN_EMAIL);}

// Called on every sign-in (core.js): show/hide the tab and forget the previous account's state.
function syncLessonsNav(){
  _lsnEnt=null;_lsnCache={};_lsnOpen=0;_lsnPreview=null;_lsnFrom='';lsnSetOnly(false);
  lsnSetNav(lessonsEnabled());
  const mm=document.getElementById('mm-links');if(mm)mm.style.display=lessonsEnabled()?'':'none';
}
// The separate "סיכומי מפגשים" tab: for clients in the course (and the admin). Graduates find
// the summaries inside "כלים" instead (renderToolsLessons).
function lsnSetNav(on){
  ['nav-lessons','mm-lessons'].forEach(id=>{const b=document.getElementById(id);if(b)b.style.display=on?'':'none';});
}

// The signed-in user's entitlement: {maxLesson 0..6, graduate true/false/null (null = no doc)}.
async function lsnLoadEnt(){
  if(_lsnEnt)return _lsnEnt;
  const u=auth.currentUser;
  if(!u)return _lsnEnt={maxLesson:0,graduate:null};
  if(lsnIsAdmin())return _lsnEnt={maxLesson:6,graduate:true};
  try{
    const s=await db.collection('entitlements').doc(String(u.email||'').toLowerCase()).get();
    const d=s.exists?s.data():null;
    _lsnEnt=d?{maxLesson:Math.max(0,Math.min(6,parseInt(d.maxLesson,10)||0)),graduate:d.graduate!==false}
             :{maxLesson:0,graduate:null};
  }catch(e){_lsnEnt={maxLesson:0,graduate:null};} // no doc → nothing unlocked, full app as before
  return _lsnEnt;
}
async function lsnLoadMax(){return (await lsnLoadEnt()).maxLesson;}

// ── "Summaries only" mode ──
// A client still in the course (Notion status "Active customer" → entitlements.graduate=false) sees ONLY
// this tab: no budget, goals, pension etc. until they graduate. Users without an entitlements doc
// (private clients, older users) and graduates get the full app as before.
// Called from core.js on sign-in; true = open the app straight into the summaries.
async function lsnApplyMode(){
  lsnSetOnly(false);
  if(!lessonsEnabled()||lsnIsAdmin())return false; // until release only beta users; never the admin
  const e=await lsnLoadEnt();
  lsnSetNav(lsnIsLimited(e)); // graduates: no separate tab — their summaries are in "כלים"
  if(lsnIsLimited(e)){lsnSetOnly(true);return true;}
  return false;
}

// Open one summary from anywhere (tools card, direct link). Graduates see it under the "כלים" tab.
function lsnOpen(n,from){
  _lsnFrom=from||'';
  _lsnOpen=n;
  const viaTools=_lsnFrom==='links';
  goTo('lessons',document.getElementById(viaTools?'nav-links':'nav-lessons'));
}
// Called by core.js right after sign-in: the ?lesson=N link from WhatsApp.
async function lsnDeepOpen(){
  if(!_lsnDeep||!lessonsEnabled())return;
  const n=_lsnDeep;
  try{history.replaceState(null,'',location.pathname);}catch(e){} // a refresh shouldn't reopen it
  const e=await lsnLoadEnt();
  lsnOpen(n,(!lsnIsAdmin()&&!lsnIsLimited(e))?'links':'');
}

// ── Graduates: the summaries as a card at the top of "כלים" ──
async function renderToolsLessons(){
  const el=document.getElementById('links-lessons');if(!el)return;
  if(!lessonsEnabled()){el.innerHTML='';return;}
  const e=await lsnLoadEnt();
  const admin=lsnIsAdmin();
  if(!admin&&(lsnIsLimited(e)||e.maxLesson<1)){el.innerHTML='';return;}
  const max=admin?6:e.maxLesson;
  const cards=LESSONS.filter(l=>l.n<=max).map(l=>`<div class="lsn-card" onclick="lsnOpen(${l.n},'links')">
      <div class="no">מפגש ${String(l.n).padStart(2,'0')}</div>
      <div class="tt">${l.title}</div>
      <div class="ds">${l.ds}</div>
    </div>`).join('');
  el.innerHTML=`<div class="card card-teal">
      <div class="ch-title">סיכומי המפגשים — הדרך לעושר</div>
      <div class="ch-hint">כל החומר מהתוכנית במקום אחד. אפשר לחזור לכל סיכום בכל זמן.</div>
      <div class="lsn-list">${cards}</div>
    </div>`;
}
// "Before lesson 6": still in the course AND fewer than 6 summaries open. Reaching meeting 6 (or being marked
// Done in Notion) opens the whole app — so a client never stays stuck after finishing.
function lsnIsLimited(e){return !!e&&e.graduate===false&&e.maxLesson<6;}
function lsnSetOnly(on){
  _lsnOnly=!!on;
  document.body.classList.toggle('lsn-only',_lsnOnly);
  // After meeting 1 the "מטרות" tab opens too, for the goals homework (Tom, 2026-11-12).
  _lsnGoalsOk=_lsnOnly&&!!_lsnEnt&&_lsnEnt.maxLesson>=1;
  document.body.classList.toggle('lsn-goals',_lsnGoalsOk);
}
// Tabs a client in the course may open: the summaries, and "מטרות" once meeting 1 is behind them.
function lsnAllowedTab(id){return id==='lessons'||(id==='goals'&&_lsnGoalsOk);}
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
  const onlyNote=_lsnOnly?`<div class="card card-teal" style="padding:16px 20px">
      ${lsnIsAdmin()?`<div style="font-size:12.5px;color:var(--purple);margin-bottom:6px">👁 תצוגה כמשתמש בתהליך — כך הוא רואה את המערכת.
        <a href="#" onclick="lsnPreviewOnly(false);return false" style="color:var(--teal)">יציאה מהתצוגה</a></div>`:''}
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">ברוכים הבאים לתוכנית ״הדרך לעושר״ 👋</div>
      <div style="font-size:13.5px;color:var(--t2);line-height:1.7">כאן מחכים לכם הסיכומים של המפגשים — כל סיכום נפתח אחרי שהמפגש שלו מתקיים.
        ${_lsnGoalsOk?'בטאב <b>״מטרות״</b> ממלאים את המטרות הפיננסיות שלכם (המשימה מהמפגש הראשון). ':''}בסיום התוכנית תיפתח לכם כל המערכת הפיננסית: תקציב, פנסיה, תיק השקעות ושווי נטו.</div>
    </div>`:'';
  el.innerHTML=`${onlyNote}<div class="card">
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
      <button class="btnout" onclick="lsnBack()">${_lsnFrom==='links'?'→ חזרה לכלים':'→ כל המפגשים'}</button>
      <span style="font-size:13px;color:var(--t3)">מפגש ${n} מתוך 6 · ${d.title||meta.title}</span>
    </div>
    <article class="lsn">${d.html||''}</article>
    <div class="lsn-nav">${prev}${next}</div>`;
  lsnLogo(el);
  lsnWire(el);
  const p=document.getElementById('p-lessons');if(p)p.scrollIntoView({block:'start'});
}
function lsnMsg(n,txt){
  const el=document.getElementById('lsn-root');if(!el)return;
  el.innerHTML=`<div class="lsn-bar"><button class="btnout" onclick="lsnBack()">→ כל המפגשים</button></div>
    <div class="card"><div class="ch-title">מפגש ${n}</div><div class="ch-hint" style="margin:0">${txt}</div></div>`;
}
function lsnBack(){
  _lsnOpen=0;
  if(_lsnFrom==='links'){_lsnFrom='';goTo('links',document.getElementById('nav-links'));return;}
  renderLessons();
}

// Tom's logo at the top of every summary (the same embedded logo as the app's top bar — LOGO_B64 in core.js),
// added here so the lesson content in Firestore doesn't have to carry it.
function lsnLogo(el){
  const hero=el.querySelector('.lsn .hero');
  if(!hero||hero.querySelector('.lsn-logo')||typeof LOGO_B64==='undefined')return;
  const img=document.createElement('img');
  img.className='lsn-logo';img.alt='Tom Ani';img.src='data:image/jpeg;base64,'+LOGO_B64;
  hero.appendChild(img);
}

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

// ── Admin page: who has access to the summaries (in-process clients vs graduates) ──
function lsnEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function lsnDate(iso){const t=iso?Date.parse(iso):NaN;return isNaN(t)?'—':new Date(t).toLocaleDateString('he-IL',{day:'2-digit',month:'2-digit',year:'2-digit'});}
async function renderAdminLessons(){
  const el=document.getElementById('admin-lessons');if(!el)return;
  if(!lsnIsAdmin()){el.innerHTML='';return;}
  el.innerHTML='<p style="color:var(--t3);font-size:13px;text-align:right">טוען…</p>';
  try{
    const [entSnap,usersSnap]=await Promise.all([db.collection('entitlements').get(),db.collection('users').get()]);
    const acc={};
    usersSnap.forEach(d=>{const x=d.data()||{};const em=String(x.email||'').toLowerCase().trim();
      if(em)acc[em]={name:x.displayName||'',lastLogin:x.lastLogin||null};});
    const rows=[];
    entSnap.forEach(d=>{const x=d.data()||{};
      rows.push({email:d.id,max:Math.max(0,Math.min(6,parseInt(x.maxLesson,10)||0)),grad:x.graduate!==false,upd:x.updatedAt||'',a:acc[d.id]||null});});
    const limited=r=>lsnIsLimited({graduate:r.grad,maxLesson:r.max});
    const inProc=rows.filter(limited).sort((a,b)=>b.max-a.max||a.email.localeCompare(b.email));
    const grads=rows.filter(r=>!limited(r)).sort((a,b)=>a.email.localeCompare(b.email));
    const dots=n=>[1,2,3,4,5,6].map(k=>`<span style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-left:2px;background:${k<=n?'var(--teal)':'var(--s3)'}"></span>`).join('');
    const row=r=>`<tr>
        <td style="padding:7px 8px">${lsnEsc(r.a&&r.a.name||'')}<div style="font-size:11.5px;color:var(--t3);direction:ltr;text-align:right">${lsnEsc(r.email)}</div></td>
        <td style="padding:7px 8px;white-space:nowrap">${dots(r.max)} <b style="margin-right:4px">${r.max}/6</b></td>
        <td style="padding:7px 8px;font-size:12.5px">${r.a?`<span style="color:var(--teal)">✓ יש חשבון</span><div style="color:var(--t3);font-size:11.5px">כניסה אחרונה ${lsnDate(r.a.lastLogin)}</div>`
          :`<span style="color:var(--amber)">✗ עוד לא נרשם</span><div style="color:var(--t3);font-size:11.5px">ההרשאה מחכה לו</div>`}</td>
        <td style="padding:7px 8px;font-size:12px;color:var(--t3)">${lsnDate(r.upd)}</td></tr>`;
    const table=list=>list.length?`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13.5px;text-align:right">
        <thead><tr style="color:var(--t3);font-size:12px;border-bottom:1px solid var(--border)">
          <th style="padding:6px 8px;font-weight:600">לקוח</th><th style="padding:6px 8px;font-weight:600">סיכומים פתוחים</th>
          <th style="padding:6px 8px;font-weight:600">חשבון במערכת</th><th style="padding:6px 8px;font-weight:600">עודכן</th></tr></thead>
        <tbody>${list.map(row).join('')}</tbody></table></div>`
      :'<p style="color:var(--t3);font-size:13px;margin:6px 0">אין כרגע.</p>';
    const noAcc=inProc.filter(r=>!r.a).length;
    el.innerHTML=`
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <div class="stat"><label>בתהליך</label><div class="val vt">${inProc.length}</div></div>
        <div class="stat"><label>בתהליך בלי חשבון</label><div class="val vr">${noAcc}</div></div>
        <div class="stat"><label>גישה מלאה (6/6)</label><div class="val vg">${grads.length}</div></div>
      </div>
      <div style="font-weight:700;margin:4px 0 6px">לקוחות בתהליך (לפני מפגש 6) — רואים במערכת רק את הסיכומים שנפתחו להם</div>
      ${table(inProc)}
      <details style="margin-top:14px"><summary style="cursor:pointer;color:var(--t2);font-size:13.5px">בוגרים ומי שעבר מפגש 6 — כל 6 הסיכומים + כל המערכת (${grads.length})</summary>
        <div style="margin-top:8px">${table(grads)}</div></details>`;
  }catch(e){
    el.innerHTML=`<p style="color:var(--red);font-size:13px">לא הצלחתי לקרוא את ההרשאות (${lsnEsc(e.code||e.message)}).</p>`;
  }
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
      <label style="font-size:13px;color:var(--t2);display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" ${_lsnOnly?'checked':''} onchange="lsnPreviewOnly(this.checked)"> כמשתמש בתהליך (רק סיכומים)</label>
    </div>
    <div id="lsn-up-log" style="font-size:13px;margin-top:10px;line-height:1.7"></div>
    <div id="lsn-up-status" style="font-size:12.5px;color:var(--t3);margin-top:8px"></div>
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">🔗 קישורים לוואטסאפ</div>
      <div style="font-size:12.5px;color:var(--t3);margin-bottom:8px">כל קישור פותח את הסיכום של המפגש (אחרי כניסה למערכת). מי שהסיכום עוד לא נפתח לו יראה הודעה שהוא ייפתח אחרי המפגש.</div>
      ${LESSONS.map(l=>`<div style="display:flex;align-items:center;gap:10px;padding:5px 0;flex-wrap:wrap">
        <span style="min-width:62px;font-size:13px;color:var(--teal);font-weight:700">מפגש ${l.n}</span>
        <span style="font-size:12.5px;color:var(--t2);direction:ltr;unicode-bidi:isolate">${lsnLink(l.n)}</span>
        <button class="btnout" style="padding:3px 10px;font-size:12px" onclick="lsnCopyLink(${l.n},this)">העתקה</button>
      </div>`).join('')}
    </div>
  </div>`;
}
function lsnCopyLink(n,btn){
  const done=()=>{if(btn){btn.textContent='הועתק ✓';setTimeout(()=>{btn.textContent='העתקה';},1500);}};
  try{navigator.clipboard.writeText(lsnLink(n)).then(done,()=>prompt('העתיקו את הקישור:',lsnLink(n)));}
  catch(e){prompt('העתיקו את הקישור:',lsnLink(n));}
}
function lsnSetPreview(v){_lsnPreview=v===''?null:parseInt(v,10);renderLessons();}
// Admin only: see the app the way a client in the course sees it (only this tab), and back.
function lsnPreviewOnly(on){
  if(!lsnIsAdmin())return;
  if(on&&_lsnPreview===null)_lsnPreview=2; // a typical mid-course client
  lsnSetOnly(on);
  _lsnOpen=0;renderLessons();
}
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
