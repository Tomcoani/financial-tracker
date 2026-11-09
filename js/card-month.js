// ══ CARD EXPENSES: BILLING MONTH OR PURCHASE MONTH ══
// By default a card expense goes to its billing month (the budget is cash-based: the month the money
// left the account). The client may choose the purchase month instead (D.settings.cardMonth='buy'):
// October's card bill, charged in November, then counts in October.
//  • the importer (statement-import.js) files each card transaction by cardBuyMonth() and keeps its
//    billing month on it (tx.bm) — the bank check and the card-bill matching keep working on that
//  • switching moves what's already in the budget, in every account, both ways (tx.bm is the way back)
function cardMonthMode(){return (D.settings||{}).cardMonth==='buy'?'buy':'bill';}
const _cmKey=n=>Math.floor(n/12)+'-'+String(n%12+1).padStart(2,'0');
// The purchase month of a charge billed in month `bill`. A charge one or two cycles after the purchase
// is a regular one → the purchase's own month. Further away it's an installment (or a late charge):
// payment n of a purchase → the month before its bill, so the payments keep spreading month by month.
function cardBuyMonth(d,bill){
  if(!bill)return bill;
  let y,m;
  if(d instanceof Date){y=d.getFullYear();m=d.getMonth();}
  else{const p=String(d||'').split('-').map(Number);y=p[0];m=p[1]-1;}
  if(!y||isNaN(m))return bill;
  const [by,bm]=bill.split('-').map(Number),b=by*12+bm-1,gap=b-(y*12+m);
  if(gap===0||gap===1)return _cmKey(y*12+m);
  if(gap>1)return _cmKey(b-1);
  return bill;
}
const _cmIsCard=x=>!!x&&!!x.s&&!/^עו"ש/.test(x.s);

// Every move switching to `mode` needs, over all accounts: {months, from, to, x, gone}
function _cmPlan(mode){
  const plan=[];
  const maps=typeof budgetMonthsMaps==='function'?budgetMonthsMaps():[D.budgetMonths||{}];
  maps.forEach(months=>Object.entries(months).forEach(([k,m])=>{
    [['tx',false],['txGone',true]].forEach(([list,gone])=>(m[list]||[]).forEach(x=>{
      if(!_cmIsCard(x))return;
      if(mode==='buy'){if(x.bm)return;const to=cardBuyMonth(x.d,k);if(to!==k)plan.push({months,from:k,to,x,gone});}
      else if(x.bm&&x.bm!==k)plan.push({months,from:k,to:x.bm,x,gone});
    }));
  }));
  return plan;
}
// A month that didn't exist yet in that account: the category names of its closest earlier month
function _cmNewMonth(months,key){
  const prev=Object.keys(months).filter(k=>k<key).sort().pop()||Object.keys(months).sort()[0];
  const src=prev&&months[prev];
  if(!src)return typeof defBudgetMonth==='function'?defBudgetMonth():{income:[],needs:[],wants:[]};
  const t={};
  ['income','needs','wants','invest','business','bizIncome','bizInvest'].forEach(s=>{if(Array.isArray(src[s]))t[s]=src[s].map(r=>({name:r.name,amount:''}));});
  return t;
}
function _cmApply(plan,mode){
  const delta=new Map(); // month object → {key → sum}, applied once per row (no rounding drift)
  const add=(m,k,v)=>{if(!delta.has(m))delta.set(m,{});const d=delta.get(m);d[k]=(d[k]||0)+v;};
  plan.forEach(p=>{
    const src=p.months[p.from];
    if(!p.months[p.to])p.months[p.to]=_cmNewMonth(p.months,p.to);
    const dst=p.months[p.to],list=p.gone?'txGone':'tx';
    src[list]=(src[list]||[]).filter(x=>x!==p.x);
    (dst[list]=dst[list]||[]).push(p.x);
    if(mode==='buy')p.x.bm=p.from;else delete p.x.bm;
    if(!p.gone&&!p.x.off&&!String(p.x.k||'').startsWith('skip|')){add(src,p.x.k,-p.x.a);add(dst,p.x.k,p.x.a);}
  });
  delta.forEach((d,m)=>Object.entries(d).forEach(([key,v])=>{
    // rounded away from 0 both ways, so switching back restores the exact amounts
    const r=Math.sign(v)*Math.round(Math.abs(v));if(!r)return;
    const [sec,name]=key.split('|');
    if(!Array.isArray(m[sec]))m[sec]=[];
    let row=m[sec].find(r=>(r.name||'').trim()===name);
    if(!row){row={name,amount:''};m[sec].push(row);}
    const n=(parseFloat(String(row.amount||'').replace(/,/g,''))||0)+r;
    row.amount=n?String(n):'';
  }));
}
function cardMonthSet(mode){
  if(mode===cardMonthMode())return;
  const plan=_cmPlan(mode),n=plan.filter(p=>!p.gone).length;
  if(n&&!confirm(mode==='buy'
    ?`${n} עסקאות אשראי שכבר רשומות בתקציב יעברו מחודש החיוב לחודש שבו קניתם (בכל החשבונות).\n\nלהעביר?`
    :`${n} עסקאות אשראי יחזרו לחודש שבו הן חויבו (בכל החשבונות).\n\nלהחזיר?`)){renderCardMonthPick();return;}
  _cmApply(plan,mode);
  D.settings=D.settings||{};
  if(mode==='buy')D.settings.cardMonth='buy';else delete D.settings.cardMonth;
  touchSection('budget');markDirty();
  if(typeof renderBudget==='function')renderBudget();
  showToast(mode==='buy'?`💳 מעכשיו הוצאות אשראי נרשמות לפי חודש העסקה${n?` · ${n} עסקאות הועברו`:''}`
    :`💳 מעכשיו הוצאות אשראי נרשמות לפי חודש החיוב${n?` · ${n} עסקאות הוחזרו`:''}`);
}
// The choice, under the budget's upload buttons
function renderCardMonthPick(){
  const el=document.getElementById('budget-card-month');if(!el)return;
  if(typeof isBeta!=='function'||!isBeta()||D.budgetView==='all'){el.innerHTML='';return;}
  const buy=cardMonthMode()==='buy';
  el.innerHTML=`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--t2)">
      💳 הוצאות באשראי נרשמות לפי
      <select onchange="cardMonthSet(this.value)" aria-label="לפי איזה חודש לרשום הוצאות אשראי" style="background:var(--s1);border:1px solid var(--teal-border);border-radius:7px;color:var(--teal);font-family:var(--font);font-size:12px;font-weight:700;padding:3px 6px">
        <option value="bill"${buy?'':' selected'}>חודש החיוב (מתי שהכסף ירד מהחשבון)</option>
        <option value="buy"${buy?' selected':''}>חודש העסקה (מתי שקניתם)</option>
      </select></div>
    <div style="font-size:10.5px;color:var(--t3);margin-top:3px">${buy
      ?'למשל: קנייה באוקטובר שחויבה בנובמבר נרשמת באוקטובר. תשלומים מתפרסים חודש אחרי חודש. הבדיקה מול העו"ש ממשיכה לעבוד לפי מועד החיוב.'
      :'למשל: קנייה באוקטובר שחויבה בנובמבר נרשמת בנובמבר, החודש שבו הכסף ירד מהחשבון.'}</div>`;
}
