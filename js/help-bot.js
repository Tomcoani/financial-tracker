// ══ HELP BOT (בוט עזרה) — beta ══
// A chat window that answers questions about using the system. The question goes to a Make scenario
// ("Financial tracker - help bot"): webhook → Claude, with docs/help-bot-knowledge.md as its
// instructions → the answer comes back. No personal data is sent: the question, the page the client
// is on, the last few turns of this chat, and the uid (for the per-day question limit in Make).
// Sent as a form (a "simple" request: no CORS preflight); the scenario's response allows this site.
const HELP_BOT_URL='';           // the Make webhook — empty = the bot is off
const HELP_BOT_TURNS=4;          // earlier turns sent along, so follow-up questions make sense
let _hb={open:false,busy:false,log:[]};

function renderHelpBotButton(){
  let b=document.getElementById('hb-btn');
  const on=!!HELP_BOT_URL&&typeof isBeta==='function'&&isBeta()&&typeof CU!=='undefined'&&!!CU;
  if(!on){if(b)b.style.display='none';return;}
  if(!b){b=document.createElement('button');b.id='hb-btn';b.type='button';b.onclick=helpBotToggle;
    b.setAttribute('aria-label','שאלה על המערכת');
    b.style.cssText='position:fixed;right:16px;bottom:84px;z-index:8998;background:var(--s1);color:var(--teal);border:1.5px solid var(--teal-border);border-radius:24px;padding:10px 16px;font-family:var(--font);font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.45)';
    b.textContent='💬 שאלה על המערכת';document.body.appendChild(b);}
  b.style.display=_hb.open?'none':'block';
}
function _hbPanel(){
  let p=document.getElementById('hb-panel');
  if(!p){p=document.createElement('div');p.id='hb-panel';p.setAttribute('role','dialog');p.setAttribute('aria-label','בוט עזרה');
    p.style.cssText='position:fixed;right:12px;bottom:84px;z-index:8999;width:min(380px,calc(100vw - 24px));height:min(520px,calc(100vh - 120px));display:none;flex-direction:column;background:var(--s1);border:1px solid var(--teal-border);border-radius:16px;box-shadow:0 10px 32px rgba(0,0,0,.55);direction:rtl;overflow:hidden';
    p.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--border)">
        <div><div style="font-size:15px;font-weight:800;color:var(--white)">💬 שאלה על המערכת</div><div style="font-size:11px;color:var(--t3)">הבוט מכיר את המערכת, לא את הנתונים שלכם</div></div>
        <button onclick="helpBotToggle()" aria-label="סגירה" style="background:none;border:none;color:var(--t3);font-size:22px;cursor:pointer">×</button></div>
      <div id="hb-log" aria-live="polite" style="flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px"></div>
      <form onsubmit="helpBotSend(event)" style="display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border)">
        <input id="hb-input" maxlength="500" autocomplete="off" placeholder="למשל: איך מעלים קובץ ממקס?" aria-label="השאלה שלך"
          style="flex:1;min-width:0;background:var(--s2);border:1px solid var(--border);border-radius:10px;color:var(--white);font-family:var(--font);font-size:14px;padding:9px 11px"/>
        <button id="hb-send" type="submit" style="background:var(--teal);color:#06121a;border:none;border-radius:10px;padding:0 16px;font-family:var(--font);font-size:13px;font-weight:800;cursor:pointer">שלח</button>
      </form>`;
    document.body.appendChild(p);}
  return p;
}
function helpBotToggle(){
  _hb.open=!_hb.open;
  _hbPanel().style.display=_hb.open?'flex':'none';
  renderHelpBotButton();
  if(_hb.open){_hbRender();setTimeout(()=>{const i=document.getElementById('hb-input');if(i)i.focus();},50);}
}
function _hbRender(){
  const el=document.getElementById('hb-log');if(!el)return;
  const bubble=(txt,me)=>`<div style="align-self:${me?'flex-start':'flex-end'};max-width:88%;background:${me?'rgba(66,235,214,.12)':'var(--s2)'};border:1px solid ${me?'var(--teal-border)':'var(--border)'};border-radius:12px;padding:8px 11px;font-size:13.5px;line-height:1.7;color:var(--white);white-space:pre-wrap">${esc(txt)}</div>`;
  el.innerHTML=(_hb.log.length?'':`<div style="font-size:12.5px;color:var(--t2);line-height:1.8">היי 🙂 אפשר לשאול כאן כל שאלה על השימוש במערכת: איך מעלים קבצים, מה אומר מספר מסוים, איך מעדכנים פנסיה ועוד.</div>`)
    +_hb.log.map(m=>bubble(m.q,true)+(m.a!=null?bubble(m.a,false):'')).join('')
    +(_hb.busy?'<div style="align-self:flex-end;font-size:12.5px;color:var(--t3)">כותב תשובה...</div>':'');
  el.scrollTop=el.scrollHeight;
}
async function helpBotSend(e){
  if(e)e.preventDefault();
  const inp=document.getElementById('hb-input');const q=(inp&&inp.value||'').trim();
  if(!q||_hb.busy||!HELP_BOT_URL)return;
  inp.value='';
  const prev=_hb.log.filter(m=>m.a).slice(-HELP_BOT_TURNS).map(m=>`שאלה: ${m.q}\nתשובה: ${m.a}`).join('\n\n');
  const turn={q,a:null};_hb.log.push(turn);_hb.busy=true;_hbRender();
  try{
    const body=new URLSearchParams({q,history:prev,page:(typeof _lastTab!=='undefined'&&_lastTab)||'',uid:(typeof CU!=='undefined'&&CU)||''});
    const r=await fetch(HELP_BOT_URL,{method:'POST',body});
    const txt=(await r.text()).trim();
    let a=txt;try{const j=JSON.parse(txt);a=j.answer||j.text||txt;}catch(_){}
    turn.a=r.ok&&a&&!/^accepted$/i.test(a)?a:'לא הצלחתי לענות כרגע. נסו שוב עוד רגע, או כתבו לתום.';
  }catch(err){turn.a='אין חיבור כרגע. בדקו את האינטרנט ונסו שוב.';}
  _hb.busy=false;_hbRender();
}
