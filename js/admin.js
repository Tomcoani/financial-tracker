// ══ ADMIN ══
async function renderAdmin(){
  if(!CU)return;
  const me=auth.currentUser;
  if(!me||me.email!==ADMIN_EMAIL){
    // Hide the entire admin tab and redirect to dashboard
    document.getElementById('admin-nav-btn').style.display='none';
    goTo('dash',document.getElementById('nav-dash'));
    return;
  }
  const statsEl=document.getElementById('admin-stats');
  const listEl=document.getElementById('admin-users-list');
  if(listEl)listEl.innerHTML='<p style="color:var(--t3);font-size:13px;text-align:right">טוען נתוני לקוחות...</p>';
  try{
    const usersSnap=await db.collection('users').get();
    const users=[];
    const allFeedback=[];
    for(const userDoc of usersSnap.docs){
      try{
        const dataSnap=await db.collection('users').doc(userDoc.id).collection('data').doc('main').get();
        if(!dataSnap.exists)continue;
        const d=dataSnap.data();
        const lu=d.lastUpdated||{};
        const freq=parseInt(d.settings?.freq||'30');
        const parentData=userDoc.data()||{};
        const email=d.settings?.email||parentData.email||'';
        const phone=d.settings?.phone||'';
        const name=d.settings?.displayName||parentData.displayName||email||userDoc.id.substring(0,8);
        (d.feedback||[]).forEach(f=>{
          if(f&&f.message)allFeedback.push({uid:userDoc.id,name,email,message:f.message,date:f.date||''});
        });
        const alerts=[];
        const goalsAge=daysSince(lu.goals),penAge=daysSince(lu.pension),nwAge=daysSince(lu.nw);
        if(goalsAge===null||goalsAge>freq)alerts.push({label:'מטרות',cls:'tag-urgent'});
        if(penAge===null||penAge>180)alerts.push({label:'פנסיה',cls:'tag-urgent'});
        if(nwAge===null||nwAge>180)alerts.push({label:'שווי נטו',cls:'tag-urgent'});
        const lastSnap=(d.snapshots||[]).length>0?d.snapshots[d.snapshots.length-1]:null;
        users.push({uid:userDoc.id,name,email,phone,alerts,goalsAge,penAge,nwAge,
          nw:lastSnap?lastSnap.netWorth:null,lastSaved:d.lastSaved||null,
          snapshots:(d.snapshots||[]).map(s=>({label:s.label,date:s.date,netWorth:s.netWorth||0,penTotal:s.penTotal||0,goalsSaved:s.goalsSaved||0}))});
      }catch(e){}
    }
    renderAdminFeedback(allFeedback);
    const totalUsers=users.length,needUpdate=users.filter(u=>u.alerts.length>0).length;
    if(statsEl)statsEl.innerHTML=`
      <div class="stat"><label>סה"כ לקוחות</label><div class="val vt">${totalUsers}</div></div>
      <div class="stat"><label>צריכים עדכון</label><div class="val vr">${needUpdate}</div></div>
      <div class="stat"><label>מעודכנים</label><div class="val vg">${totalUsers-needUpdate}</div></div>`;
    users.sort((a,b)=>b.alerts.length-a.alerts.length);
    if(listEl){
      if(!users.length){listEl.innerHTML='<p style="color:var(--t3);font-size:13px;text-align:right">אין לקוחות רשומים עדיין</p>';return;}
      listEl.innerHTML=users.map(u=>`
        <div class="admin-user-card" style="cursor:pointer" onclick="toggleAdminCard('${u.uid}')">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <div class="admin-user-name" style="margin:0">${esc(u.name)}</div>
              ${u.nw!==null?`<div style="font-size:13px;color:var(--teal);font-weight:700">${fmt(u.nw)}</div>`:''}
              <div class="admin-alerts" style="margin:0">
                ${u.alerts.length===0
                  ? '<span class="admin-alert-tag tag-ok"><i data-lucide="check-circle" style="width:12px;height:12px;vertical-align:middle"></i> מעודכן</span>'
                  : u.alerts.map(a=>`<span class="admin-alert-tag ${a.cls}">⚠️ ${a.label}</span>`).join('')}
              </div>
            </div>
          </div>
          <div style="font-size:13px;color:var(--t3);transition:transform .2s" id="acarrow-${u.uid}">▼</div>
        </div>
        <div id="acd-${u.uid}" style="display:none;padding:12px 16px 14px;border:1px solid var(--border);border-top:none;border-radius:0 0 12px 12px;background:var(--s1);margin-bottom:2px">
          <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:space-between;align-items:flex-start">
            <div>
              <div class="admin-user-email">${esc(u.email)}</div>
              ${u.lastSaved?`<div style="font-size:11px;color:var(--t3);margin-top:4px">עדכון אחרון: ${fmtDate(u.lastSaved)}</div>`:'<div style="font-size:11px;color:var(--red);margin-top:4px">טרם עדכן</div>'}
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
              <div style="font-size:10px;color:var(--t3)">מטרות: ${u.goalsAge!==null?u.goalsAge+' ימים':'טרם'}</div>
              <div style="font-size:10px;color:var(--t3)">פנסיה: ${u.penAge!==null?u.penAge+' ימים':'טרם'}</div>
              <div style="font-size:10px;color:var(--t3)">שווי נטו: ${u.nwAge!==null?u.nwAge+' ימים':'טרם'}</div>
              ${u.alerts.length>0?`<div style="display:flex;gap:6px;margin-top:4px">
                <button onclick="event.stopPropagation();adminSendReminder('${esc(u.email)}','${esc(u.name)}','wa','${esc(u.phone)}')"
                  style="background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);color:#86efac;
                  border-radius:7px;padding:4px 10px;font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">
                  <i data-lucide="message-circle" style="width:12px;height:12px;vertical-align:middle;margin-left:3px"></i> תזכורת בוואטסאפ
                </button>
                ${u.email?`<button onclick="event.stopPropagation();adminSendReminder('${esc(u.email)}','${esc(u.name)}','mail')"
                  style="background:rgba(45,212,191,.12);border:1px solid rgba(45,212,191,.3);color:#5eead4;
                  border-radius:7px;padding:4px 10px;font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">
                  <i data-lucide="send" style="width:12px;height:12px;vertical-align:middle;margin-left:3px"></i> תזכורת במייל
                </button>`:''}
              </div>`:''}
              ${u.email?`<button onclick="event.stopPropagation();adminSendPasswordReset('${u.email}')"
                style="margin-top:4px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);color:#fcd34d;
                border-radius:7px;padding:4px 10px;font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">
                <i data-lucide="key-round" style="width:12px;height:12px;vertical-align:middle;margin-left:3px"></i> שלח איפוס סיסמה
              </button>`:''}
              ${u.email?`<button onclick="event.stopPropagation();adminChangeEmail('${u.uid}','${esc(u.email)}','${esc(u.name)}')"
                style="margin-top:4px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.3);color:#a5b4fc;
                border-radius:7px;padding:4px 10px;font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">
                <i data-lucide="mail" style="width:12px;height:12px;vertical-align:middle;margin-left:3px"></i> שנה מייל
              </button>`:''}
              <button onclick="event.stopPropagation();adminDeleteUser('${u.uid}','${esc(u.name)}')"
                style="margin-top:4px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#fca5a5;
                border-radius:7px;padding:4px 10px;font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">
                <i data-lucide="trash-2" style="width:12px;height:12px;vertical-align:middle;margin-left:3px"></i> מחק לקוח
              </button>
            </div>
          </div>
          ${u.snapshots&&u.snapshots.length>1?`
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
            <div style="font-size:10px;color:var(--t3);font-weight:700;margin-bottom:8px;text-align:right">שווי נטו לאורך זמן</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              ${[...u.snapshots].reverse().slice(0,6).map(s=>`
                <div style="text-align:center;background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;min-width:70px">
                  <div style="font-size:10px;color:var(--t3);margin-bottom:3px">${s.label}</div>
                  <div style="font-size:12px;font-weight:700;color:${s.netWorth>=0?'var(--teal)':'var(--red)'}">${fmt(s.netWorth)}</div>
                </div>`).join('')}
            </div>
          </div>`:''}
          <!-- ADVISOR NOTES -->
          <div id="notes-section-${u.uid}" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
            <div style="font-size:11px;color:var(--t3);font-weight:700;margin-bottom:8px;text-align:right">📝 הערות יועץ</div>
            <div id="notes-list-${u.uid}" style="margin-bottom:8px"></div>
            <div style="display:flex;gap:8px;align-items:flex-end">
              <textarea id="note-input-${u.uid}" placeholder="כתוב הערה עבור ${esc(u.name)}..." dir="rtl"
                style="flex:1;background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;
                color:var(--white);font-family:var(--font);font-size:13px;resize:vertical;min-height:56px;outline:none"
                onfocus="this.style.borderColor='var(--teal)'" onblur="this.style.borderColor='var(--border)'"></textarea>
              <button onclick="event.stopPropagation();adminAddNote('${u.uid}')"
                style="background:var(--teal);border:none;border-radius:8px;padding:8px 14px;color:#080c14;
                font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0">
                + הוסף
              </button>
            </div>
          </div>
        </div>
        `).join('');
      lucide.createIcons();
    }
  }catch(e){
    console.error('Admin error:',e);
    if(listEl)listEl.innerHTML=`<p style="color:var(--red);font-size:13px;text-align:right">שגיאה: ${e.message}</p>`;
  }
}

// ══ ADMIN TOOLS ══
async function adminDeleteUser(uid,name){
  if(!confirm('למחוק את הלקוח "'+name+'"?\n\nכל הנתונים שלו יימחקו לצמיתות ולא ניתן לשחזר.'))return;
  try{
    await db.collection('users').doc(uid).collection('data').doc('main').delete();
    await db.collection('users').doc(uid).delete();
    showToast('לקוח נמחק ✓');
    renderAdmin();
  }catch(e){
    alert('שגיאה במחיקה: '+e.message);
  }
}
async function adminChangeEmail(uid,oldEmail,name){
  const newEmail=prompt(`שינוי מייל עבור ${name}\n\nמייל נוכחי: ${oldEmail}\n\nהכנס מייל חדש:`);
  if(!newEmail||!newEmail.trim())return;
  const cleaned=newEmail.trim().replace(/[​-‏‪-‮⁦-⁩﻿]/g,'').toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)){alert('כתובת מייל לא תקינה');return;}
  if(cleaned===oldEmail.toLowerCase()){alert('המייל החדש זהה לישן');return;}
  if(!confirm(`לשנות מייל של "${name}"?\n\n${oldEmail}  →  ${cleaned}\n\nכל הנתונים יועברו לחשבון החדש ויישלח איפוס סיסמה.`))return;
  try{
    // 1. Load existing Firestore data
    const [parentSnap,dataSnap]=await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(uid).collection('data').doc('main').get()
    ]);
    if(!dataSnap.exists){alert('לא נמצאו נתונים עבור משתמש זה');return;}
    const oldData=dataSnap.data();
    const oldParent=parentSnap.data()||{};
    // 2. Create new auth user with correct email (via secondary app)
    const secondaryApp=firebase.apps.find(a=>a.name==='secondary')||firebase.initializeApp(firebase.app().options,'secondary');
    const secondaryAuth=secondaryApp.auth();
    const tempPass='TomAni'+Math.floor(Math.random()*9000+1000)+'!';
    const cred=await secondaryAuth.createUserWithEmailAndPassword(cleaned,tempPass);
    const newUid=cred.user.uid;
    await cred.user.updateProfile({displayName:oldParent.displayName||oldData.settings?.displayName||name});
    // 3. Write data under new UID with updated email
    const newData={...oldData,settings:{...(oldData.settings||{}),email:cleaned}};
    await db.collection('users').doc(newUid).set({...oldParent,email:cleaned,displayName:oldParent.displayName||oldData.settings?.displayName||name});
    await db.collection('users').doc(newUid).collection('data').doc('main').set(newData);
    // 4. Send password reset to new email
    await secondaryAuth.sendPasswordResetEmail(cleaned,{url:'https://tomcoani.github.io/financial-tracker/',handleCodeInApp:false});
    await secondaryAuth.signOut();
    // 5. Delete old Firestore data (Auth account stays but has no data)
    await db.collection('users').doc(uid).collection('data').doc('main').delete();
    await db.collection('users').doc(uid).delete();
    showToast('מייל שונה ✓ — נשלח איפוס סיסמה ל-'+cleaned);
    renderAdmin();
  }catch(e){
    if(e.code==='auth/email-already-in-use')alert('המייל '+cleaned+' כבר קיים במערכת');
    else alert('שגיאה: '+fbErr(e.code||e.message));
  }
}
function toggleAdminCard(uid){
  const det=document.getElementById('acd-'+uid);
  const arr=document.getElementById('acarrow-'+uid);
  if(!det)return;
  const open=det.style.display==='none';
  det.style.display=open?'block':'none';
  if(arr)arr.style.transform=open?'rotate(180deg)':'';
  if(open)adminLoadUserNotes(uid);
}
async function adminLoadUserNotes(uid){
  const listEl=document.getElementById('notes-list-'+uid);
  if(!listEl)return;
  try{
    const snap=await db.collection('users').doc(uid).collection('data').doc('main').get();
    const notes=(snap.exists?snap.data().advisorNotes:null)||[];
    if(!notes.length){listEl.innerHTML='<div style="font-size:12px;color:var(--t3);text-align:right">אין הערות עדיין</div>';return;}
    listEl.innerHTML=notes.map((n,idx)=>`
      <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;background:var(--s2);
        border-right:3px solid var(--teal-border);border-radius:0 8px 8px 0;margin-bottom:6px">
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;color:var(--t3);margin-bottom:3px">${fmtDate(n.date)}</div>
          <div style="font-size:13px;color:var(--white);line-height:1.5;white-space:pre-wrap;text-align:right">${esc(n.text)}</div>
        </div>
        <button onclick="event.stopPropagation();adminDeleteNote('${uid}',${idx})"
          style="background:transparent;border:none;color:var(--t3);cursor:pointer;font-size:14px;padding:0;flex-shrink:0;line-height:1"
          title="מחק הערה">×</button>
      </div>`).join('');
  }catch(e){listEl.innerHTML='<div style="font-size:12px;color:var(--red)">שגיאה בטעינת הערות</div>';}
}
async function adminAddNote(uid){
  const ta=document.getElementById('note-input-'+uid);
  const text=(ta?.value||'').trim();
  if(!text)return;
  try{
    const ref=db.collection('users').doc(uid).collection('data').doc('main');
    const snap=await ref.get();
    if(!snap.exists)return;
    const data=snap.data();
    if(!data.advisorNotes)data.advisorNotes=[];
    data.advisorNotes.push({text,date:new Date().toISOString()});
    await ref.set(data);
    ta.value='';
    adminLoadUserNotes(uid);
    showToast('הערה נשמרה ✓');
  }catch(e){alert('שגיאה: '+e.message);}
}
async function adminDeleteNote(uid,idx){
  if(!confirm('למחוק הערה זו?'))return;
  try{
    const ref=db.collection('users').doc(uid).collection('data').doc('main');
    const snap=await ref.get();
    if(!snap.exists)return;
    const data=snap.data();
    (data.advisorNotes||[]).splice(idx,1);
    await ref.set(data);
    adminLoadUserNotes(uid);
  }catch(e){alert('שגיאה: '+e.message);}
}
async function adminSendPasswordReset(email){
  if(!email)return;
  if(!confirm('שלח מייל איפוס סיסמה אל '+email+'?'))return;
  try{
    await auth.sendPasswordResetEmail(email,{url:'https://tomcoani.github.io/financial-tracker/',handleCodeInApp:false});
    showToast('מייל איפוס נשלח ל-'+email+' ✓ — בדוק גם ספאם');
  }catch(e){
    alert('שגיאה: '+e.message);
  }
}

// Open WhatsApp / email with a ready-made update reminder for the client.
// If the client saved a phone number in settings, WhatsApp opens their chat directly.
function adminSendReminder(email,name,via,phone){
  const firstName=(name||'').split(' ')[0]||'';
  const msg=`היי ${firstName}, מקווה שהכל טוב! 🙂\nעבר קצת זמן מאז העדכון האחרון במערכת המעקב הפיננסי, ושווה להיכנס לעדכן את הנתונים כדי שנשמור על תמונה מדויקת.\nזה לוקח כמה דקות: https://tomcoani.github.io/financial-tracker/\nאם משהו לא ברור או שצריך עזרה — אני כאן.`;
  if(via==='wa'){
    // Normalize Israeli numbers: 050-1234567 → 972501234567
    let digits=(phone||'').replace(/\D/g,'');
    if(digits.startsWith('0'))digits='972'+digits.slice(1);
    const target=digits?'https://wa.me/'+digits+'?text=':'https://wa.me/?text=';
    window.open(target+encodeURIComponent(msg),'_blank');
  } else {
    window.open('mailto:'+email+'?subject='+encodeURIComponent('תזכורת קטנה — עדכון נתונים במערכת')+'&body='+encodeURIComponent(msg),'_blank');
  }
}

// Render the admin feedback inbox (newest first), each entry naming its sender.
function renderAdminFeedback(list){
  const el=document.getElementById('admin-feedback');
  const countEl=document.getElementById('admin-feedback-count');
  if(!el)return;
  if(!list.length){
    el.innerHTML='<p style="color:var(--t3);font-size:13px;text-align:right">אין הודעות משוב עדיין</p>';
    if(countEl)countEl.textContent='';
    return;
  }
  list.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  if(countEl)countEl.innerHTML=`<span style="background:var(--teal);color:#080c14;border-radius:10px;padding:1px 9px;font-size:12px;font-weight:800;margin-right:4px">${list.length}</span>`;
  el.innerHTML=list.map(f=>`
    <div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:var(--s1);text-align:right">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        <span style="font-size:13px;font-weight:700;color:var(--teal)">${esc(f.name)}</span>
        <span style="font-size:11px;color:var(--t3)">${esc(f.email)}${f.date?' · '+fmtDate(f.date):''}</span>
      </div>
      <div style="font-size:13px;color:var(--white);line-height:1.6;white-space:pre-wrap">${esc(f.message)}</div>
      <button onclick="adminDeleteFeedback('${f.uid}','${esc(f.date)}')"
        style="margin-top:8px;background:transparent;border:1px solid rgba(239,68,68,.3);color:#fca5a5;border-radius:7px;padding:3px 10px;font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer">
        <i data-lucide="check" style="width:11px;height:11px;vertical-align:middle;margin-left:2px"></i> טופל — הסר
      </button>
    </div>`).join('');
  if(window.lucide)lucide.createIcons();
}
// Remove one feedback entry from a client's data doc (admin marks it handled).
async function adminDeleteFeedback(uid,dateIso){
  try{
    const ref=db.collection('users').doc(uid).collection('data').doc('main');
    const snap=await ref.get();
    if(!snap.exists)return;
    const fb=(snap.data().feedback||[]).filter(f=>String(f.date)!==String(dateIso));
    await ref.update({feedback:fb});
    renderAdmin();
  }catch(e){alert('שגיאה במחיקת המשוב: '+e.message);}
}

async function adminCreateUser(){
  const name=document.getElementById('new-user-name').value.trim();
  // Strip invisible Unicode bidi/zero-width chars that sneak in via copy-paste in RTL forms
  const email=document.getElementById('new-user-email').value
    .trim().replace(/[​-‏‪-‮⁦-⁩﻿]/g,'').toLowerCase();
  const status=document.getElementById('create-user-status');
  if(!name||!email){status.textContent='נא למלא שם ואימייל';status.style.color='var(--red)';return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status.textContent='אימייל לא תקין: '+email;status.style.color='var(--red)';return;}
  status.textContent='יוצר חשבון...';status.style.color='var(--t2)';
  // Use a secondary Firebase app instance so the admin session stays active
  // (createUserWithEmailAndPassword normally replaces the current auth user)
  const secondaryApp=firebase.apps.find(a=>a.name==='secondary')||
    firebase.initializeApp(firebase.app().options,'secondary');
  const secondaryAuth=secondaryApp.auth();
  try{
    const tempPass='TomAni'+Math.floor(Math.random()*9000+1000)+'!';
    const cred=await secondaryAuth.createUserWithEmailAndPassword(email,tempPass);
    await cred.user.updateProfile({displayName:name});
    // Save initial data — admin's Firestore rules allow writing to any user doc
    const newData=defData();
    newData.settings.displayName=name;
    newData.settings.email=email;
    await saveDataFS(cred.user.uid,newData);
    // Send password-set email with redirect back to the app
    await secondaryAuth.sendPasswordResetEmail(email,{url:'https://tomcoani.github.io/financial-tracker/',handleCodeInApp:false});
    await secondaryAuth.signOut();
    status.textContent='✓ חשבון נוצר! מייל הגדרת סיסמה נשלח ל-'+email+' — בדוק גם ספאם';
    status.style.color='var(--teal)';
    document.getElementById('new-user-name').value='';
    document.getElementById('new-user-email').value='';
    setTimeout(()=>renderAdmin(),1500);
  }catch(e){
    await secondaryAuth.signOut().catch(()=>{});
    if(e.code==='auth/email-already-in-use'){
      // Account was created in a previous attempt — just send the reset email
      try{
        await auth.sendPasswordResetEmail(email,{url:'https://tomcoani.github.io/financial-tracker/',handleCodeInApp:false});
        status.textContent='✓ חשבון כבר קיים — מייל הגדרת סיסמה נשלח ל-'+email+' — בדוק גם ספאם';
        status.style.color='var(--teal)';
        document.getElementById('new-user-name').value='';
        document.getElementById('new-user-email').value='';
        setTimeout(()=>renderAdmin(),1500);
      }catch(e2){
        status.textContent='שגיאה: '+fbErr(e2.code);
        status.style.color='var(--red)';
      }
    } else {
      status.textContent='שגיאה: '+fbErr(e.code);
      status.style.color='var(--red)';
    }
  }
}


// Each user can ONLY read/write their own data at:
//   /users/{their-uid}/data/main
// Admin (info@tomani.co) can read ALL users data
// This is enforced server-side by Firebase — client code cannot bypass it
// Rules (must be set in Firebase Console → Firestore → Rules):
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null &&
        (request.auth.uid == userId ||
         request.auth.token.email == 'info@tomani.co');
    }
  }
}
*/

