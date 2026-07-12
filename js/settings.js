// ══ CURRENCY ══
const CURR_SYMBOLS={ILS:'₪',USD:'$',EUR:'€',GBP:'£'};
// Extra currencies added by user
function getAllCurrencies(){
  const extra=Object.keys(D.exchangeRates||{}).filter(c=>!['ILS','USD','EUR','GBP'].includes(c));
  return ['ILS','USD','EUR','GBP',...extra];
}
function buildCurrOptions(selected){
  return getAllCurrencies().map(c=>`<option value="${c}"${c===selected?' selected':''}>${getCurrSymbol(c)} ${c}</option>`).join('')+
    `<option value="__add__">+ הוסף מטבע...</option>`;
}
function getCurrSymbol(c){return CURR_SYMBOLS[c]||c;}


function toILS(amount,currency){
  if(!currency||currency==='ILS')return parseFloat(amount)||0;
  if(!D.exchangeRates||!D.exchangeRates[currency]){
    console.warn('No exchange rate for',currency,'rates:',D.exchangeRates);
  }
  const rate=(D.exchangeRates||{})[currency]||1;
  return (parseFloat(amount)||0)*rate;
}
function fromILS(amountILS,currency){
  if(!currency||currency==='ILS')return amountILS;
  const rate=(D.exchangeRates||{})[currency]||1;
  return amountILS/rate;
}
function fmtCur(amount,currency){
  const sym=getCurrSymbol(currency||'ILS');
  const n=Math.abs(Math.round(amount));
  return sym+(n.toLocaleString('he-IL'));
}

function nwRowName(el){
  const sec=el.dataset.sec,ri=+el.dataset.ri;
  D.nwData[sec].rows[ri].name=el.value;markDirty();
}
function nwRowCurrency(el){
  const sec=el.dataset.sec,ri=+el.dataset.ri;
  if(el.value==='__add__'){
    const code=prompt('הכנס קוד מטבע (לדוגמא: CHF, JPY, CAD):','');
    if(!code){el.value=D.nwData[sec].rows[ri].currency||'ILS';return;}
    const upper=code.trim().toUpperCase();
    if(!D.exchangeRates[upper]){
      const rate=parseFloat(prompt(`שער חליפין: כמה ₪ שווה 1 ${upper}?`,''));
      if(isNaN(rate)||rate<=0){el.value=D.nwData[sec].rows[ri].currency||'ILS';return;}
      D.exchangeRates[upper]=rate;
      CURR_SYMBOLS[upper]=upper;
    }
    D.nwData[sec].rows[ri].currency=upper;
    renderNW();renderNWSummary();markDirty();
    return;
  }
  D.nwData[sec].rows[ri].currency=el.value;
  renderNWSummary();markDirty();
}

// Override sumSec to convert currencies
function getCellCurrency(row,ci){
  return (row.cellCurrencies&&row.cellCurrencies[ci])||row.currency||'ILS';
}
function sumSec(sec,col){
  return(D.nwData[sec].rows||[]).reduce((s,r)=>{
    const raw=parseFloat(r.vals[col])||0;
    const cur=getCellCurrency(r,col);
    return s+toILS(raw,cur);
  },0);
}
// Net worth is literal: a value counts only in the period column where it was
// entered — no carry-forward. All views (tiles, donuts, table) read the latest
// period column that actually has data.
function rowLatestILS(row){
  const c=getLatestNWCol();
  const raw=parseFloat(row.vals[c])||0;
  return raw?toILS(raw,getCellCurrency(row,c)):0;
}
function sumSecBest(sec){
  return sumSec(sec,getLatestNWCol());
}

function touchSection(sec){
  if(!D.lastUpdated)D.lastUpdated={};
  D.lastUpdated[sec]=new Date().toISOString();
}

// ══ UPDATE ALERTS ══
function daysSince(isoDate){
  if(!isoDate)return null;
  return Math.floor((Date.now()-new Date(isoDate))/(1000*60*60*24));
}
function daysUntil(isoDate){
  if(!isoDate)return null;
  return Math.ceil((new Date(isoDate)-Date.now())/(1000*60*60*24));
}
function renderUpdateAlerts(){
  const el=document.getElementById('update-alerts');
  if(!el)return;
  const lu=D.lastUpdated||{};
  const freq=parseInt(D.settings?.freq||'30');
  const sections=[
    {key:'goals',label:'מטרות',icon:'🎯',threshold:freq,tab:'goals'},
    {key:'pension',label:'פנסיה',icon:'🏦',threshold:180,tab:'pension'},
    {key:'nw',label:'שווי נטו',icon:'📈',threshold:180,tab:'nw'},
  ];
  let html='';
  sections.forEach(s=>{
    const days=daysSince(lu[s.key]);
    const remaining=days===null?null:s.threshold-days;
    let cls,title,sub;
    if(days===null){
      cls='warning';
      title=`${s.icon} ${s.label} — טרם עודכן`;
      sub=`לא עדכנת את ה${s.label} עדיין — ${g('לחץ','לחצי')} לעדכן`;
    } else if(remaining<=0){
      cls='urgent';
      title=`${s.icon} ${s.label} — הגיע הזמן לעדכן!`;
      sub=`עדכנת לפני ${days} ימים — כדאי לעדכן את הנתונים עכשיו`;
    } else if(remaining<=7){
      cls='warning';
      title=`${s.icon} ${s.label} — בקרוב צריך לעדכן`;
      sub=`נשארו עוד ${remaining} ימים עד שצריך לעדכן את ה${s.label}`;
    } else {
      cls='ok';
      title=`${s.icon} ${s.label} — מעודכן ✓`;
      sub=`נשארו עוד ${remaining} ימים עד העדכון הבא (עדכנת לפני ${days} ימים)`;
    }
    html+=`<div class="update-alert ${cls}">
      <div class="al-left">
        <div class="al-count" style="font-size:${remaining===null||remaining<=0?'16px':'22px'}">${remaining===null?'—':remaining<=0?'עכשיו!':remaining}</div>
        <div class="al-text">
          <div class="al-title">${title}</div>
          <div class="al-sub">${sub}</div>
        </div>
      </div>
      <button class="btn-update-now" onclick="goToTab('${s.tab}')">עדכן עכשיו →</button>
    </div>`;
  });
  el.innerHTML=html;
}
function goToTab(id){
  const btn=document.querySelector(`.nbtn[onclick*="'${id}'"]`);
  if(btn)goTo(id,btn);
}

// ══ SETTINGS ══
function renderSettings(){
  if(!D.settings)D.settings={displayName:'',email:'',age:'',freq:'30',gender:'male'};
  const s=D.settings;
  ['set-name','set-age','set-email','set-freq','set-phone'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    if(id==='set-name')el.value=s.displayName||'';
    if(id==='set-age')el.value=s.age||'';
    if(id==='set-email')el.value=s.email||'';
    if(id==='set-freq')el.value=s.freq||'30';
    if(id==='set-phone')el.value=s.phone||'';
  });
  const gEl=document.getElementById('set-gender');
  if(gEl)gEl.value=s.gender||'male';
  const hintEl=document.getElementById('settings-gender-hint');
  if(hintEl)hintEl.style.display=(CU&&localStorage.getItem('onboarding_gender_'+CU))?'block':'none';
  renderCalendar();
}
async function saveSettings(){
  collectAll();
  if(!D.settings)D.settings={};
  D.settings.displayName=document.getElementById('set-name').value||'';
  D.settings.age=document.getElementById('set-age').value||'';
  D.settings.email=document.getElementById('set-email').value||'';
  D.settings.freq=document.getElementById('set-freq').value||'30';
  D.settings.phone=document.getElementById('set-phone')?.value||'';
  D.settings.gender=document.getElementById('set-gender')?.value||'male';
  if(!D.settings.notifyEmail)D.settings.notifyEmail=D.settings.email;
  D.lastSaved=new Date().toISOString();
  // Update header name immediately
  const unameEl=document.getElementById('uname');
  if(unameEl&&D.settings.displayName)unameEl.textContent=D.settings.displayName;
  if(CU)localStorage.removeItem('onboarding_gender_'+CU);
  const hintEl=document.getElementById('settings-gender-hint');
  if(hintEl)hintEl.style.display='none';
  // Keep the Firebase Auth profile in sync so nothing reverts the name later
  if(auth.currentUser&&D.settings.displayName){
    try{await auth.currentUser.updateProfile({displayName:D.settings.displayName});}catch(e){}
  }
  await saveDataFS(CU,D);
  showToast('הגדרות נשמרו ✓');
}

async function userChangePassword(){
  const statusEl=document.getElementById('sec-pass-status');
  const show=(msg,ok)=>{statusEl.style.display='block';statusEl.style.color=ok?'var(--green)':'var(--red)';statusEl.textContent=msg;};
  const curPass=document.getElementById('sec-cur-pass').value;
  const newPass=document.getElementById('sec-new-pass').value;
  const confPass=document.getElementById('sec-conf-pass').value;
  if(!curPass)return show('הכנס סיסמה נוכחית',false);
  if(!newPass||newPass.length<6)return show('סיסמה חדשה חייבת להכיל לפחות 6 תווים',false);
  if(newPass!==confPass)return show('הסיסמאות אינן תואמות',false);
  try{
    const user=auth.currentUser;
    const cred=firebase.auth.EmailAuthProvider.credential(user.email,curPass);
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(newPass);
    show('סיסמה עודכנה בהצלחה ✓',true);
    ['sec-cur-pass','sec-new-pass','sec-conf-pass'].forEach(id=>{document.getElementById(id).value='';});
  }catch(e){
    if(e.code==='auth/wrong-password'||e.code==='auth/invalid-credential')show('הסיסמה הנוכחית שגויה',false);
    else if(e.code==='auth/requires-recent-login')show('נדרשת כניסה מחדש — התנתק והתחבר שוב',false);
    else show(fbErr(e.code),false);
  }
}
async function userChangeEmail(){
  const statusEl=document.getElementById('sec-email-status');
  const show=(msg,ok)=>{statusEl.style.display='block';statusEl.style.color=ok?'var(--green)':'var(--red)';statusEl.textContent=msg;};
  const newEmail=document.getElementById('sec-new-email').value.trim().replace(/[​-‏‪-‮⁦-⁩﻿]/g,'').toLowerCase();
  const pass=document.getElementById('sec-email-pass').value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))return show('כתובת מייל לא תקינה',false);
  if(!pass)return show('הכנס סיסמה לאימות',false);
  try{
    const user=auth.currentUser;
    const cred=firebase.auth.EmailAuthProvider.credential(user.email,pass);
    await user.reauthenticateWithCredential(cred);
    await user.verifyBeforeUpdateEmail(newEmail);
    show('נשלח אימות ל-'+newEmail+' — לחץ על הקישור בהודעה לאשר את השינוי',true);
    document.getElementById('sec-new-email').value='';
    document.getElementById('sec-email-pass').value='';
  }catch(e){
    if(e.code==='auth/wrong-password'||e.code==='auth/invalid-credential')show('הסיסמה שגויה',false);
    else if(e.code==='auth/email-already-in-use')show('המייל הזה כבר בשימוש',false);
    else if(e.code==='auth/requires-recent-login')show('נדרשת כניסה מחדש — התנתק והתחבר שוב',false);
    else show(fbErr(e.code),false);
  }
}

// ══ CALENDAR ══
function toggleCal(){
  const b=document.getElementById('cal-body'),a=document.getElementById('cal-arrow');
  const open=b.classList.toggle('open');
  if(a)a.textContent=open?'▲':'▼';
  if(open)renderCalendar();
}
function renderCalendar(){
  const el=document.getElementById('cal-items');if(!el)return;
  const items=[];
  (D.goals||[]).filter(g=>!g.done&&g.name).forEach(g=>{
    const months=[6,30,90,180][Math.max(0,g.h||0)];
    const d=new Date();d.setMonth(d.getMonth()+months);
    const sv=parseFloat(g.saved)||0,nd=parseFloat(g.needed)||0;
    if(nd>0)items.push({name:g.name,date:d,saved:sv,needed:nd});
  });
  (D.nwPeriods||[]).filter(p=>p).forEach(p=>{
    const parsed=parsePeriodDate(p);
    if(parsed){const d=new Date(parsed.y,parsed.m-1,1);items.push({name:'עדכון שווי נטו — '+p,date:d});}
  });
  items.sort((a,b)=>a.date-b.date);
  if(!items.length){el.innerHTML='<p style="color:var(--t3);font-size:13px;text-align:right">הוסף מטרות כדי לראות לוח יעדים</p>';return;}
  el.innerHTML=items.map(item=>{
    const days=daysUntil(item.date.toISOString());
    const cls=days<0?'days-overdue':days<30?'days-past':'days-future';
    const label=days<0?`${Math.abs(days)} ימים אחרי`:days===0?'היום':`${days} ימים`;
    const pct=item.needed?Math.min(100,Math.round((item.saved/item.needed)*100)):null;
    return `<div class="cal-item">
      <span class="ci-name">${esc(item.name)}</span>
      ${pct!==null?`<span style="font-size:11px;color:var(--t2)">${pct}%</span>`:''}
      <span class="ci-date">${item.date.toLocaleDateString('he-IL',{month:'short',year:'numeric'})}</span>
      <span class="ci-days ${cls}">${label}</span>
    </div>`;
  }).join('');
}

