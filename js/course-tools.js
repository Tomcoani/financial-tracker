// ══ COURSE TOOLS — "הדרך לעושר" materials that used to live in Google Drive ══
// Shown in "כלים" next to the lesson summaries, each unlocked by the meeting it belongs to:
//   odysseus — "מסמך אודיסאוס": personal emergency plan (meeting 4). Saved per user in D.odysseus.
//   invest   — opening an independent investment account (meeting 5): first steps, broker benefits,
//              Excellence + Psagot sign-up form guides.
// Beta (isBeta in core.js) until Tom releases it: then set CT_FOR_ALL=true.
const CT_FOR_ALL=false;
const CT_TOOLS=[
  {id:'odysseus',n:4,icon:'🛟',title:'תוכנית החירום שלי — מסמך אודיסאוס',ds:'תמונת מצב, קיצוצים, קרן חירום ומה עושים (ומה לא) כשמגיע משבר'},
  {id:'invest',n:5,icon:'📈',title:'פותחים תיק השקעות עצמאי',ds:'הצעדים הראשונים, הטבות בבתי ההשקעות ומדריך מילוי טופס ההצטרפות'}
];
function ctEnabled(){
  if(typeof lessonsEnabled!=='function'||!lessonsEnabled())return false;
  return CT_FOR_ALL||(typeof isBeta==='function'&&isBeta());
}

// The "כלים מהתוכנית" card under the summaries card (called from renderToolsLessons).
function ctToolsCard(vis){
  if(!ctEnabled())return '';
  const cards=CT_TOOLS.map(t=>{
    const open=t.n<=vis;
    return `<div class="lsn-card${open?'':' locked'}"${open?` onclick="ctOpen('${t.id}')"`:''}>
      ${open?'':`<span class="lock">🔒 ייפתח אחרי מפגש ${t.n}</span>`}
      <div class="no">${t.icon} ממפגש ${t.n}</div>
      <div class="tt">${t.title}</div>
      <div class="ds">${t.ds}</div>
    </div>`;}).join('');
  return `<div class="card card-teal">
      <div class="ch-title">כלים מהתוכנית</div>
      <div class="ch-hint">המשימות והמדריכים מהמפגשים — הכל כאן, בלי קבצים.</div>
      <div class="lsn-list">${cards}</div>
    </div>`;
}
// A call-to-action under summaries 4 and 5.
function ctLessonCta(n){
  if(!ctEnabled())return '';
  const t=CT_TOOLS.find(x=>x.n===n);if(!t)return '';
  const txt=t.id==='odysseus'?'המשימה מהמפגש: למלא את תוכנית החירום האישית שלכם.':'כל מה שצריך כדי לפתוח תיק השקעות עצמאי — צעד אחרי צעד.';
  return `<div class="ct-cta" onclick="ctOpen('${t.id}')"><span class="ic">${t.icon}</span>
    <span><b>${t.title}</b><br><span style="color:var(--t2);font-size:13.5px">${txt}</span></span><span class="go">פתיחה ←</span></div>`;
}
function ctOpen(id){
  _lsnFrom='links';_lsnOpen=id;
  goTo('lessons',document.getElementById('nav-links'));
}
async function ctRender(id){
  const el=document.getElementById('lsn-root');if(!el)return;
  const t=CT_TOOLS.find(x=>x.id===id);
  if(!t||!ctEnabled()){lsnBack();return;}
  const vis=lsnVisibleMax(await lsnLoadMax());
  if(_lsnOpen!==id)return;
  const bar=`<div class="lsn-bar"><button class="btnout" onclick="lsnBack()">→ חזרה לכלים</button>
    <span style="font-size:13px;color:var(--t3)">${t.icon} כלי ממפגש ${t.n}</span></div>`;
  if(t.n>vis){el.innerHTML=bar+`<div class="card"><div class="ch-title">${t.title}</div><div class="ch-hint" style="margin:0">🔒 הכלי הזה ייפתח אחרי מפגש ${t.n}.</div></div>`;return;}
  el.innerHTML=bar+(id==='odysseus'?ctOdyHtml():ctInvestHtml());
  if(id==='odysseus')ctOdyCalc();
  lsnLogo(el);
  const p=document.getElementById('p-lessons');if(p)p.scrollIntoView({block:'start'});
}

// ── helpers ──
function ctE(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function ctNum(v){const n=parseFloat(String(v==null?'':v).replace(/[^\d.\-]/g,''));return isNaN(n)?0:n;}
function ctMoney(n){return Math.round(n).toLocaleString('he-IL')+' ₪';}

// ══ ODYSSEUS — personal emergency plan ══
const CT_FIXED=[['rent','שכירות / משכנתא'],['bills','חשמל, מים וגז'],['arnona','ארנונה'],['comm','אינטרנט וטלפון'],['food','אוכל'],
  ['ins','ביטוחים'],['car','תחבורה / רכב'],['kids','חינוך / ילדים'],['health','בריאות'],['other','אחר']];
const CT_DONTS=[['pension','לא למשוך כסף מקרן השתלמות או פנסיה'],['redeem','לא לממש השקעות בלחץ'],['loan','לא לקחת הלוואה בחופזה'],['spend','לא להתחייב להוצאות חדשות']];
const CT_BAD=['השוק קורס ב־50% ויותר','אחד מבני הזוג מפוטר','מלחמה / מילואים ארוכים'];
const CT_TASKS=['לסיים את המסמך ולסכם צעדים הבאים עם בן/בת הזוג','לבצע לפחות קיצוץ אחד בפועל','להפקיד לקרן החירום','לקבוע יום קבוע בחודש לבדיקה'];
function ctOdy(){
  if(!D.odysseus||typeof D.odysseus!=='object')D.odysseus={};
  const o=D.odysseus;
  if(!Array.isArray(o.inc))o.inc=[{n:'',a:''},{n:'',a:''},{n:'',a:''}];
  if(!o.fixed)o.fixed={};
  if(!Array.isArray(o.cuts))o.cuts=[{n:'',a:''},{n:'',a:''},{n:'',a:''}];
  if(!o.ef)o.ef={};
  if(!o.inv)o.inv={};
  if(!Array.isArray(o.tasks))o.tasks=CT_TASKS.map(t=>({t,who:'',done:false}));
  if(!Array.isArray(o.bad))o.bad=CT_BAD.map(s=>({s,a:''}));
  if(!o.donts)o.donts={};
  if(!o.sum)o.sum={};
  return o;
}
// Write one field. path like "ef.amt" or "inc.1.a"; kind 'b' = checkbox.
function ctSet(path,el,kind){
  const o=ctOdy();const k=path.split('.');let t=o;
  for(let i=0;i<k.length-1;i++){t=t[k[i]];if(t==null)return;}
  t[k[k.length-1]]=kind==='b'?!!el.checked:el.value;
  o.updatedAt=new Date().toISOString();
  ctOdyCalc();
  if(typeof markDirty==='function')markDirty();
}
function ctYN(path,val){
  const v=ctGet(path);
  return `<div class="ct-yn">${[['yes','כן'],['no','לא']].map(([k,l])=>
    `<label class="${v===k?'on':''}"><input type="radio" name="ct-${path}" value="${k}" ${v===k?'checked':''} onchange="ctSet('${path}',this);this.closest('.ct-yn').querySelectorAll('label').forEach(x=>x.classList.toggle('on',x.contains(this)))">${l}</label>`).join('')}</div>`;
}
function ctGet(path){let t=ctOdy();for(const k of path.split('.')){if(t==null)return '';t=t[k];}return t==null?'':t;}
function ctIn(path,ph,num){
  return `<input class="ct-in${num?' num':''}" ${num?'inputmode="decimal"':''} value="${ctE(ctGet(path))}" placeholder="${ctE(ph||'')}" oninput="ctSet('${path}',this)">`;
}
function ctTa(path,ph){return `<textarea class="ct-in ct-ta" placeholder="${ctE(ph||'')}" oninput="ctSet('${path}',this)">${ctE(ctGet(path))}</textarea>`;}
function ctOdyCalc(){
  const o=ctOdy();
  const inc=o.inc.reduce((s,r)=>s+ctNum(r.a),0);
  const fixed=CT_FIXED.reduce((s,[k])=>s+ctNum(o.fixed[k]),0);
  const cuts=o.cuts.reduce((s,r)=>s+ctNum(r.a),0);
  const monthly=ctNum(o.ef.monthly)||fixed;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('ct-inc-total',ctMoney(inc));
  set('ct-fixed-total',ctMoney(fixed));
  set('ct-gap',ctMoney(inc-fixed));
  const gap=document.getElementById('ct-gap');if(gap)gap.style.color=inc-fixed<0?'var(--red,#ef4444)':'var(--teal)';
  set('ct-cuts-total',ctMoney(cuts));
  set('ct-ef-3',ctMoney(monthly*3));
  set('ct-ef-6',ctMoney(monthly*6));
  const m=document.getElementById('ct-ef-monthly');if(m)m.placeholder=fixed?Math.round(fixed).toLocaleString('he-IL')+' (סך ההוצאות הקבועות)':'';
  const have=ctNum(o.ef.amt);
  const pct=monthly?Math.min(100,Math.round(have/(monthly*6)*100)):0;
  const bar=document.getElementById('ct-ef-bar');if(bar)bar.style.width=pct+'%';
  set('ct-ef-pct',monthly?`יש לכם ${pct}% מקרן חירום של 6 חודשים`:'');
  const tr=ctNum(o.ef.transfer);
  set('ct-ef-eta',tr>0&&monthly*6>have?`בקצב של ${ctMoney(tr)} בחודש — עוד כ־${Math.ceil((monthly*6-have)/tr)} חודשים ל־6 חודשי ביטחון`:'');
  const done=o.tasks.filter(t=>t.done).length;
  set('ct-tasks-n',`${done}/${o.tasks.length} בוצעו`);
  const st=document.getElementById('ct-saved');
  if(st)st.textContent=o.updatedAt?'עודכן לאחרונה: '+new Date(o.updatedAt).toLocaleDateString('he-IL'):'כל מה שתכתבו כאן נשמר אוטומטית בחשבון שלכם';
}
function ctAddRow(list){
  const o=ctOdy();
  if(list==='tasks')o.tasks.push({t:'',who:'',done:false});else o[list].push({n:'',a:''});
  markDirty();ctRender('odysseus');
}
function ctOdyHtml(){
  const o=ctOdy();
  const rows=(list,phN,phA)=>o[list].map((r,i)=>`<div class="ct-row">${ctIn(list+'.'+i+'.n',phN)}${ctIn(list+'.'+i+'.a',phA||'סכום ₪',true)}</div>`).join('');
  const sec=(num,title,kicker,body)=>`<section class="ct-sec"><div class="sec-head"><span class="sec-num">${num}</span><div><span class="kicker">${kicker}</span><h2>${title}</h2></div></div>${body}</section>`;
  return `<article class="lsn ct">
  <div class="hero"><span class="badge">🛟 משימה ממפגש 4</span><h1>מסמך אודיסאוס — תוכנית החירום האישית שלי</h1>
    <p class="sub">כמו אודיסאוס שקשר את עצמו לתורן לפני שעבר ליד הסירנות — מחליטים עכשיו, ברוגע, מה עושים כשמגיע משבר. ככה לא מקבלים החלטות בלחץ.</p>
    <div class="ct-saved" id="ct-saved"></div></div>

  ${sec(1,'תמונת מצב','איפה אני עומד היום',`
    <div class="ct-box"><div class="ct-h">הכנסות חודשיות (נטו)</div>${rows('inc','מקור ההכנסה (משכורת, עסק, שכירות…)')}
      <button class="ct-add" onclick="ctAddRow('inc')">+ עוד מקור הכנסה</button>
      <div class="ct-total">סה״כ הכנסות <b id="ct-inc-total"></b></div></div>
    <div class="ct-box"><div class="ct-h">אפשר להגדיל הכנסות?</div>${ctTa('incQ','יש מקור הכנסה נוסף שאפשר להפעיל אם צריך? (עבודה נוספת, השכרה, מכירת ציוד…)')}</div>
    <div class="ct-box"><div class="ct-h">הוצאות קבועות בחודש</div>
      <div class="ct-grid">${CT_FIXED.map(([k,l])=>`<label class="ct-f"><span>${l}</span>${ctIn('fixed.'+k,'₪',true)}</label>`).join('')}</div>
      <div class="ct-total">סה״כ הוצאות קבועות <b id="ct-fixed-total"></b></div>
      <div class="ct-total">נשאר בחודש אחרי ההוצאות הקבועות <b id="ct-gap"></b></div></div>`)}

  ${sec(2,'תוכנית קיצוץ','מה יורד ראשון אם צריך',`
    <p class="muted">3–5 הוצאות שאפשר לוותר עליהן מהר אם ההכנסה נפגעת (מנויים, מסעדות, ביטוח מיותר…)</p>
    <div class="ct-box">${rows('cuts','מה מקצצים','חיסכון בחודש ₪')}
      <button class="ct-add" onclick="ctAddRow('cuts')">+ עוד קיצוץ</button>
      <div class="ct-total">סה״כ מתפנה בחודש <b id="ct-cuts-total"></b></div></div>`)}

  ${sec(3,'קרן החירום שלי','רשת הביטחון',`
    <div class="ct-box">
      <div class="ct-q"><span>יש לי קרן חירום</span>${ctYN('ef.has')}</div>
      <div class="ct-grid">
        <label class="ct-f"><span>כמה יש בה היום</span>${ctIn('ef.amt','₪',true)}</label>
        <label class="ct-f"><span>איפה היא מוחזקת</span>${ctIn('ef.where','קרן כספית, פיקדון…')}</label>
        <label class="ct-f"><span>תאריך עדכון אחרון</span><input class="ct-in" type="date" value="${ctE(ctGet('ef.date'))}" onchange="ctSet('ef.date',this)"></label>
        <label class="ct-f"><span>הוצאה חודשית ממוצעת</span><input id="ct-ef-monthly" class="ct-in num" inputmode="decimal" value="${ctE(ctGet('ef.monthly'))}" oninput="ctSet('ef.monthly',this)"></label>
      </div>
      <div class="ct-kpis"><div><span>3 חודשי ביטחון</span><b id="ct-ef-3"></b></div><div><span>6 חודשי ביטחון</span><b id="ct-ef-6"></b></div></div>
      <div class="ct-prog"><i id="ct-ef-bar"></i></div><div class="ct-note" id="ct-ef-pct"></div>
      <div class="ct-grid">
        <label class="ct-f"><span>כמה אעביר לקרן כל חודש</span>${ctIn('ef.transfer','₪',true)}</label>
        <label class="ct-f"><span>איך אשמור אותה נפרדת מהעו״ש</span>${ctIn('ef.separate','חשבון נפרד, קרן כספית…')}</label>
      </div><div class="ct-note" id="ct-ef-eta"></div></div>`)}

  ${sec(4,'השקעות בזמן משבר','לא לשבור את התוכנית',`
    <div class="ct-box">
      <div class="ct-q"><span>יש לי השקעות</span>${ctYN('inv.has')}</div>
      <label class="ct-f"><span>איפה</span>${ctIn('inv.where','תיק עצמאי, קופת גמל להשקעה, פוליסה…')}</label>
      <div class="ct-q"><span>אצטרך את הכסף הזה בשנים הקרובות?</span>${ctYN('inv.soon')}</div>
      <div class="ct-h" style="margin-top:12px">הצעדים שלי כדי לא להחליט בפאניקה</div>
      ${ctTa('inv.steps','למשל: לא נכנס לאפליקציה בשבוע של ירידות, מדבר עם תום לפני כל מכירה, זוכר שזה כסף ל־10 שנים…')}</div>`)}

  ${sec(5,'רשימת משימות','מה עושים השבוע',`
    <div class="ct-box"><div class="ct-h" style="display:flex;justify-content:space-between"><span>משימות</span><span id="ct-tasks-n" style="color:var(--teal);font-weight:600"></span></div>
      ${o.tasks.map((t,i)=>`<div class="ct-task"><input type="checkbox" ${t.done?'checked':''} onchange="ctSet('tasks.${i}.done',this,'b')">
        ${ctIn('tasks.'+i+'.t','משימה')}${ctIn('tasks.'+i+'.who','מי אחראי')}</div>`).join('')}
      <button class="ct-add" onclick="ctAddRow('tasks')">+ עוד משימה</button></div>`)}

  ${sec(6,'מה לא לעשות','כשהסירנות שרות',`
    <div class="ct-box"><div class="ct-h">3 תרחישים — ומה אני עושה בכל אחד</div>
      ${o.bad.map((b,i)=>`<div class="ct-bad"><div class="s">⚠️ ${ctE(b.s)}</div>${ctTa('bad.'+i+'.a','ההתמודדות שלי…')}</div>`).join('')}</div>
    <div class="ct-box"><div class="ct-h">אני מתחייב/ת ש…</div>
      ${CT_DONTS.map(([k,l])=>`<label class="ct-chk"><input type="checkbox" ${o.donts[k]?'checked':''} onchange="ctSet('donts.${k}',this,'b')"> ${l}</label>`).join('')}
      <label class="ct-f" style="margin-top:8px"><span>אחר</span>${ctIn('donts.other','עוד דבר שלא אעשה')}</label></div>
    <div class="ct-box ct-gold"><div class="ct-h">משפט החירום שלי</div>
      ${ctTa('sentence','משפט אחד שאקרא כשיהיה לי קשה. למשל: ״יש לנו תוכנית, יש לנו קרן חירום, ואנחנו לא מוכרים בפאניקה.״')}</div>`)}

  <section class="ct-sec"><div class="ct-box ct-sum"><div class="ct-h">סיכום</div>
    <div class="ct-q"><span>יש לי תוכנית חירום</span>${ctYN('sum.plan')}</div>
    <div class="ct-q"><span>אפשר להפעיל אותה מיד</span>${ctYN('sum.exec')}</div>
    <label class="ct-f"><span>מתי אעדכן את המסמך שוב</span><input class="ct-in" type="date" value="${ctE(ctGet('sum.next'))}" onchange="ctSet('sum.next',this)"></label></div></section>
  </article>`;
}

// ══ INVEST — opening an independent investment account ══
const CT_BROKERS=[
  {name:'מיטב טרייד',min:'10,000 ₪',il:'0.07% לעסקה, מינ׳ 4.65 ₪',us:'0.01$ למניה, מינ׳ 7.5$',fee:'15 ₪',perk:'פטור מדמי ניהול לשנתיים',url:'https://landing.meitav.co.il/he-IL/landing/trade/tradeleadsfreinds?utm_medium=1EC4FA32D71CA253F271E27320A98925'},
  {name:'פסגות',min:'10,000 ₪',il:'0.06% לעסקה, מינ׳ 2 ₪',us:'0.01$ למניה, מינ׳ 6$',fee:'אין',perk:'פטור מדמי ניהול לתמיד + 200 ₪',url:'https://www.psagotrade.com/en/%D7%A2%D7%9E%D7%95%D7%93-%D7%A0%D7%97%D7%99%D7%AA%D7%94-%D7%97%D7%91%D7%A8-%D7%9E%D7%91%D7%99%D7%90-%D7%97%D7%91%D7%A8-3/?ref=354a3b4132'},
  {name:'אקסלנס',min:'10,000 ₪',il:'0.07% לעסקה, מינ׳ 3 ₪',us:'0.01$ למניה, מינ׳ 6$',fee:'15 ₪, מתקזז עם פעולות',perk:'פטור מדמי ניהול ל־3 שנים + 100 ₪',url:'https://xnestrade.xnes.co.il/page/101?customerCode=bc2be109'},
  {name:'אינטראקטיב ישראל',min:'0 ₪',il:'אין בורסה ישראלית',us:'0.01$ למניה, מינ׳ 2.5$',fee:'אין',perk:'החזר עמלות עד 50$',url:'https://lp3.inter-il.com/ab/760'}
];
const CT_GUIDE={
  excellence:{name:'אקסלנס',steps:[
    ['פרטים אישיים','ממלאים פרטים אישיים. פותחים את החשבון עם עוד מישהו? מסמנים את זה כאן. מסמנים גם את הבנק שממנו תעבירו כסף לחשבון המסחר.'],
    ['פרטים באנגלית','ממלאים את אותם פרטים — באנגלית.'],
    ['מסך ההטבות','לוחצים ״המשך״ <b>בלי לשנות כלום</b> — כך נשמרות הטבות ההצטרפות של חברי הקורס.'],
    ['עוד פרטים אישיים','ממלאים את הפרטים שמבקשים.'],
    ['מערכת המסחר','בוחרים במערכת המסחר שמוצעת בטופס.'],
    ['שאלות אבטחה','סדרת שאלות שמגינה על החשבון. בחרו תשובות שתזכרו — ישאלו אתכם עליהן בהמשך.'],
    ['חשבון הבנק','החשבון שממנו תעבירו כסף לתיק ואליו יחזור הכסף כשתמשכו. <b>חשוב:</b> אפשר להחליף אותו בעתיד, אבל זה דורש הגעה למשרדי החברה או שיחה עם נציג.'],
    ['העלאת מסמכים','מעלים רק מסמכים <b>בתוקף</b>. אפשר להתקדם גם בלי, אבל תצטרכו להעלות אותם בהמשך.'],
    ['חשבון יחיד או משותף','פותחים חשבון לבד — מסמנים <b>כן</b>. עם בן/בת זוג — מסמנים <b>לא</b>.'],
    ['הצהרות','מסמנים את שתי התיבות. בשני המסכים שאחרי — מסמנים ״אין צורך״.'],
    ['אזרחות נוספת','יש לכם אזרחות נוספת? מסמנים כן וממלאים את הפרטים. אין — לא.'],
    ['מס במדינה אחרת','צריכים לשלם מס במדינה אחרת כי אתם אזרחים שלה? כן. אחרת — לא.'],
    ['תעסוקה','מסמנים מה שנכון עבורכם (שלושה מסכים). עצמאים ממלאים את פרטי העסק, שכירים את פרטי מקום העבודה.'],
    ['שאלות רגולציה','99% מכם יסמנו את המשבצת שמסומנת כברירת מחדל — אלא אם באמת עוסקים במשהו מהרשימה, סורבתם לפתיחת חשבון בבנק או בבית השקעות, או שהשאלה באמת רלוונטית אליכם.'],
    ['מקור הכסף','מסמנים <b>משכורות</b>. את המסך שאחריו מדלגים — לא רלוונטי.'],
    ['סיום','לוחצים ״המשך״ בלי לסמן שום דבר נוסף, חותמים — ומזל טוב, סיימתם למלא את הטופס 🎉']]},
  psagot:{name:'פסגות',steps:[
    ['פרטים אישיים','ממלאים פרטים אישיים — <b>באנגלית</b>. חשבון הבנק שממנו תעבירו כסף לפסגות משותף עם מישהו (למשל בן/בת זוג)? מסמנים את זה כאן.'],
    ['אישורים','מסמנים בשני המקומות.'],
    ['נתונים אישיים','מסמנים את מה שרלוונטי עבורכם. אם התשובה לאחת השאלות היא ״כן״ — דברו עם תום. יש בחשבון ההשקעות מישהו שהוא לא בעל חשבון הבנק? <b>לא</b>, אלא אם באמת יש.'],
    ['תעסוקה ומקור הכסף','מסמנים שכיר/עצמאי ורושמים מקום עבודה, תפקיד ותחום (כדי לוודא שאתם לא מתעשיית ההשקעות). מקור הכספים: <b>״חסכונות שנצברו״</b>. בשאלה אם עבדתם בתפקיד כזה — <b>לא</b>, אלא אם באמת עבדתם.'],
    ['אבטחה','2 שאלות אבטחה — בחרו שאלות ותשובות שלעולם לא תשכחו. בנוסף קוד אבטחה של 4 ספרות (לא ספרות עוקבות כמו 1234).'],
    ['מטרת החשבון וחשבון הבנק','מסמנים <b>לא</b>; מטרת החשבון: ״מסחר עצמאי בניירות ערך ובנכסים פיננסיים אחרים״. ממלאים את חשבון הבנק שממנו תעבירו כסף — <b>חשוב</b> לבחור נכון, כי שינוי אחר כך הוא בירוקרטיה.'],
    ['שאלות כלליות','אלה לא התחייבויות — פסגות רק אוספים נתונים על הלקוחות. סכום ההעברה הראשונה: כמה שתכננתם. מקור: ״חסכונות שנצברו״ (כולל חיסכון עתידי מהשכר). הפקדות צפויות: אין צפי — לא (רובכם), יש — בוחרים תדירות. אשראי בחשבון ההשקעות (אפשרות להיכנס למינוס): <b>לא</b>. קרוב משפחה עם חשבון בפסגות? רושמים את הפרטים, ואם אין — לא.'],
    ['מסמכים','מסמנים מה שרלוונטי ומעלים את הקבצים. בלי הקבצים אי אפשר לשלוח את הטופס.']]}
};
let _ctGuide='excellence';
function ctGuideTab(k){_ctGuide=k;const el=document.getElementById('ct-guide');if(el)el.innerHTML=ctGuideHtml();}
function ctGuideHtml(){
  const g=CT_GUIDE[_ctGuide];
  return `<div class="ct-tabs">${Object.keys(CT_GUIDE).map(k=>`<button class="${k===_ctGuide?'on':''}" onclick="ctGuideTab('${k}')">${CT_GUIDE[k].name}</button>`).join('')}</div>
    <ol class="ct-steps">${g.steps.map(([h,t])=>`<li><b>${h}</b><span>${t}</span></li>`).join('')}</ol>`;
}
function ctInvestHtml(){
  const step=(n,h,body)=>`<div class="ct-step"><span class="sec-num">${n}</span><div><h3>${h}</h3>${body}</div></div>`;
  return `<article class="lsn ct">
  <div class="hero"><span class="badge">📈 מדריך ממפגש 5</span><h1>פותחים תיק השקעות עצמאי</h1>
    <p class="sub">הצעדים הראשונים, ההטבות שקיבלתם כחברי הקורס, ואיך ממלאים את טופס ההצטרפות בלי להיתקע.</p></div>

  <section class="ct-sec"><div class="sec-head"><span class="sec-num">א</span><div><span class="kicker">לפני הכל</span><h2>הצעדים הראשונים למשקיע המתחיל</h2></div></div>
    ${step('01','בונים בסיס','<p>סוגרים חובות. קובעים סכום חודשי להשקעה — גם 50 ₪ זו התחלה. בונים קרן חירום של 3–6 חודשי הוצאות, למשל בקרן כספית.</p>')}
    ${step('02','בוחרים בית השקעות','<p>אזרחים אמריקאים — אינטראקטיב ישראל. סכום התחלתי קטן (עד כ־5,000 ₪) — אפשר להתחיל בבנק. בלי אזרחות אמריקאית — אקסלנס, פסגות או מיטב טרייד.</p>')}
    ${step('03','ממלאים טופס הצטרפות','<p>ממלאים את הטופס (המדריך המלא נמצא למטה) ומעבירים כסף לחשבון.</p>')}
    ${step('04','בוחרים מה לקנות','<p>מניות, אג״ח, מדדים או קרן כספית — לפי מה שלמדנו במפגשים 3–5.</p>')}
    ${step('05','קובעים אסטרטגיה','<p>אחוז קבוע מהמשכורת בכל חודש, ומאטמטים את ההפקדה כדי שזה יקרה לבד.</p>')}
  </section>

  <section class="ct-sec"><div class="sec-head"><span class="sec-num">ב</span><div><span class="kicker">רק לחברי הקהילה</span><h2>הטבות מסחר בבתי ההשקעות</h2></div></div>
    <div class="ct-brokers">${CT_BROKERS.map(b=>`<div class="ct-broker">
      <div class="bn">${b.name}</div><div class="perk">🎁 ${b.perk}</div>
      <dl><dt>מינימום לפתיחת תיק</dt><dd>${b.min}</dd><dt>עמלה — ניירות ערך בישראל</dt><dd>${b.il}</dd>
        <dt>עמלה — ניירות ערך בחו״ל</dt><dd>${b.us}</dd><dt>דמי ניהול חודשיים</dt><dd>${b.fee}</dd></dl>
      <a class="btnsave" href="${b.url}" target="_blank" rel="noopener">פותחים חשבון ב${b.name} ←</a></div>`).join('')}</div>
    <p class="muted" style="font-size:13px;margin-top:10px">ההטבות ניתנות רק דרך הקישורים האלה. התנאים נקבעים על ידי בתי ההשקעות ועשויים להשתנות.</p>
  </section>

  <section class="ct-sec"><div class="sec-head"><span class="sec-num">ג</span><div><span class="kicker">צעד אחרי צעד</span><h2>איך ממלאים את טופס ההצטרפות</h2></div></div>
    <p class="muted">פתחו את הטופס בחלון אחד ואת המדריך הזה בחלון שני. נתקעתם? כתבו לתום.</p>
    <div id="ct-guide">${ctGuideHtml()}</div>
  </section>
  </article>`;
}
