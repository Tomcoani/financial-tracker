// ══ STATEMENT IMPORT (התנהלות חודשית) ══
// The client uploads a credit-card / bank statement (Excel, CSV or PDF) and the
// month's expense rows are filled automatically. Everything runs in the browser:
// the file is read locally (SheetJS / pdf.js, loaded only when needed) and only the
// per-category totals are written into the budget. The only thing remembered is
// "merchant → category" for merchants the client assigned by hand (D.importMerchants),
// so next month they are recognised automatically.
(function(){
const LIBS={
  xlsx:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  pdf:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
};
const _lib={};
function loadLib(k){
  if(!_lib[k])_lib[k]=new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=LIBS[k];
    s.onload=()=>{if(k==='pdf')pdfjsLib.GlobalWorkerOptions.workerSrc=LIBS.pdf.replace('pdf.min.js','pdf.worker.min.js');res();};
    s.onerror=()=>{delete _lib[k];rej(new Error('לא הצלחנו לטעון את רכיב הקריאה — בדקו חיבור לאינטרנט'));};
    document.head.appendChild(s);
  });
  return _lib[k];
}

const XFER_NAME='ביט / פייבוקס / העברות כספיות';
// ── Categories: internal ids → how to find the client's matching budget row ──
const CATS={
  rent:     {name:'שכר דירה / משכנתא',              sec:'needs',row:/דירה|משכנתא|דיור/},
  bills:    {name:'חשבונות (חשמל, מים, גז, ארנונה)', sec:'needs',row:/חשבונות|חשמל|ארנונה|תקשורת|סלולר|טלפון/},
  super:    {name:'קניות בסופר',                     sec:'needs',row:/סופר|מזון|מכולת/},
  transport:{name:'תחבורה / דלק',                    sec:'needs',row:/תחבורה|דלק|רכב/},
  insurance:{name:'ביטוחים והחזרי הלוואות',          sec:'needs',row:/ביטוח|הלווא/},
  health:   {name:'בריאות ופארם',                    sec:'needs',row:/בריאות|פארם|רפוא|תרופ/},
  pets:     {name:'בעלי חיים',                       sec:'needs',row:/בעלי חיים|חיות|כלב|חתול|וטרינר/},
  kids:     {name:'חינוך וילדים',                    sec:'needs',row:/ילד|חינוך|גן|חוג|לימוד/},
  food:     {name:'מסעדות ובילויים',                 sec:'wants',row:/מסעד|בילוי|בחוץ|קפה/},
  shopping: {name:'קניות (ביגוד, אלקטרוניקה)',        sec:'wants',row:/ביגוד|אלקטרוני|אופנה|קניות/,not:/סופר/},
  travel:   {name:'חופשות ונופש',                    sec:'wants',row:/חופש|נופש|טיס|טיול/},
  subs:     {name:'מנויים (סטרימינג, חדר כושר)',      sec:'wants',row:/מנוי|סטרימינג|כושר/},
  // Tax payments: self-employed → the business section's rows (see budget.js BIZ_DEFAULT_ROWS);
  // anyone else → one "מסים" row under needs
  biz_tax:  {name:'תשלום מס הכנסה',      sec:'business',row:/מס הכנסה/, alt:{name:'מסים ותשלומי חובה',sec:'needs',row:/מס/}},
  biz_ni:   {name:'תשלום לביטוח לאומי',  sec:'business',row:/לאומי/,    alt:{name:'מסים ותשלומי חובה',sec:'needs',row:/מס/}},
  biz_vat:  {name:'תשלום למע"מ',         sec:'business',row:/מע"?מ/,    alt:{name:'מסים ותשלומי חובה',sec:'needs',row:/מס/}},
  // Advertising is a business expense for the self-employed even on a personal card
  ads:      {name:'פרסום ושיווק',        sec:'business',row:/פרסום|שיווק/, alt:{name:'מנויים (סטרימינג, חדר כושר)',sec:'wants',row:/מנוי|סטרימינג/}},
  pro:      {name:'שירותים מקצועיים',    sec:'needs',row:/שירותים מקצועיים|יעוץ|ייעוץ/},
  // Money sent to people (Bit / PayBox / bank transfers) — its own row, personal or business
  xfer:     {name:XFER_NAME,              sec:'wants',row:/פייבוקס|העברות|ביט(?!וח)/}
};
// Business section rows for expenses on a business card (or marked "עסקי"): personal category →
// business row. An existing business row matching `re` is used; otherwise the row is added.
const BIZ_ROWS={
  ads:   {name:'פרסום ושיווק',          re:/פרסום|שיווק/},
  soft:  {name:'תוכנות ומנויים',         re:/תוכנ|מנוי/},
  car:   {name:'רכב ונסיעות',            re:/רכב|נסיעות(?! לחו)|דלק/},
  food:  {name:'כיבוד ואירוח',           re:/כיבוד|אירוח/},
  equip: {name:'ציוד ומשרד',             re:/ציוד|משרד/},
  comm:  {name:'תקשורת',                 re:/תקשורת|טלפון|אינטרנט/},
  fees:  {name:'עמלות, ריבית וביטוחים',  re:/עמל|ריבית|ביטוח(?! לאומי)/},
  travel:{name:'נסיעות לחו"ל',           re:/חו"?ל|טיסות/},
  pro:   {name:'שירותים מקצועיים',       re:/שירותים מקצועיים|יעוץ|ייעוץ|רו"?ח/},
  xfer:  {name:XFER_NAME,                re:/פייבוקס|העברות|ביט(?!וח)/},
  other: {name:'הוצאות עסק שונות',       re:/שונות/}
};
const CAT2BIZ={ads:'ads',subs:'soft',transport:'car',food:'food',super:'food',shopping:'equip',bills:'comm',
  insurance:'fees',travel:'travel',pro:'pro',xfer:'xfer',health:'other',kids:'other',pets:'other',rent:'other'};
// Merchant keywords → category. The LONGEST matching keyword wins ("רמי לוי תקשורת"
// → bills, not super). Keywords of ≤3 letters must match a whole word.
const DICT={
  super:['מרקט','market','תבלינים','חלב ודבש','קצב','בשר','מיט','דגים','ירקות','חממה','מעדני','מכולת','שוק','סופר','שופרסל','רמי לוי','יוחננוף','ויקטורי','אושר עד','מגה בעיר','טיב טעם','יינות ביתן','חצי חינם','קרפור','carrefour','am pm','ampm','מכולת','מינימרקט','פרש מרקט','freshmarket','קשת טעמים','זול ובגדול','סופר יודה','שוק העיר','מחסני השוק','היפר כהן','סופרמרקט','סופר','קינג סטור','נתיב החסד','סופר דוש','פירות וירקות','ירקן','מאפיה','קצביה','שוק'],
  transport:['מוטורס','motors','תחבורה','רב פס','רבפס','קנסות','תח"צ','תחצ','פז','דלק','סונול','דור אלון','אלון','ten','טן','yellow','ילו','רב קו','רבקו','moovit','מוביט','gett','גט','yango','יאנגו','כביש 6','כביש חוצה','נתיבי איילון','פנגו','pango','סלופארק','cellopark','חניון','חניה','אחוזות החוף','רכבת ישראל','אגד','דן','מטרופולין','אפיקים','קווים','מוסך','צמיגים','טסט','רישוי','ליסינג','lime','bird'],
  bills:['מים בע"מ','תמי 4','תמי4','מי עדן','חשבון לשרותי','חברת החשמל','חשמל לישראל','מי אביבים','מי שבע','הגיחון','מי רעננה','מי כרמל','מי עדן','מיתב','תאגיד','עיריית','עירית','מועצה','ארנונה','סופרגז','אמישראגז','פזגז','גז','בזק','הוט','hot','yes','פרטנר','partner','סלקום','cellcom','פלאפון','pelephone','גולן טלקום','הוט מובייל','רמי לוי תקשורת','we4g','019','012','013','אקספון','בזק בינלאומי'],
  insurance:['ריבית','עמלת','עמלה','פרעון מוקדם','פירעון מוקדם','דמי כרטיס','ביטוח','הראל','מגדל','כלל ביטוח','הפניקס','מנורה','איילון','ביטוח ישיר','9 מיליון','aig','ליברה','שירביט','הכשרה','הלוואה','משכנתא'],
  rent:['שכר דירה','שכ"ד'],
  pets:['וטרינר','וטרינרי','וטרינ','חיות','בעלי חיים','pet','פט שופ','פטשופ','zoo','זו סנטר','מספוא','כלבים','חתולים','animal','אנימל'],
  health:['מיילדות','רפואי','רפואה','קליניקה','דנטלי','סופר פארם','super pharm','superpharm','ניו פארם','new pharm','בי פארם','be pharm','מכבי','כללית','מאוחדת','לאומית','רופא','מרפאה','אופטיקה','משקפיים','שיניים','דנטל','בית מרקחת','פארם','רוקח','קופת חולים','מעבדה','פיזיותרפיה'],
  kids:['קידי','kids','צהרון','גן ילדים','בית ספר','מתנ"ס','חוג','קייטנה','toys','טויס','שילב','אוניברסיטה','מכללה','שכר לימוד','ועד הורים','גן'],
  food:['קפיטריה','חומוס','ממתקים','מאפים','פלאפל','גריל','בורקס','קייטרינג','מתוק','sweet','מסעדה','מסעדת','קפה','cafe','coffee','ארומה','aroma','קופיקס','cofix','גרג','לנדוור','מקדונלד','mcdonald','ברגר','burger','פיצה','pizza','דומינו','wolt','וולט','תן ביס','10bis','סיבוס','cibus','שווארמה','פלאפל','סושי','בר','פאב','יס פלאנט','yes planet','סינמה סיטי','cinema','רב חן','סינמה','eventim','לאן','תיאטרון','הופעה','בירה','אגדיר','גירף','ג׳ירף','בורגר','קונדיטוריה','גלידה','שיפודי','מאפה','בייגל','bakery'],
  shopping:['paypal','פייפאל','אופנה','סטייל','style','קניון','מול','סלון','פרחים','flower','צעצועים','טויס','זארה','zara','h&m','קסטרו','castro','פוקס','fox','אמריקן איגל','american eagle','רנואר','גולף','טרמינל איקס','terminal x','עליאקספרס','aliexpress','amazon','אמזון','shein','שיין','asos','ebay','איביי','ksp','באג','bug','איבורי','ivory','מחסני חשמל','שקם אלקטריק','ace','אייס','הום סנטר','איקאה','ikea','נעמן','ורדינון','מגה ספורט','דקטלון','decathlon','adidas','nike','נייקי','אדידס','next','temu','טמו','סטימצקי','צומת ספרים','מקס סטוק','max stock','המשביר','נעליים','אופיס דיפו','ביגוד','הלבשה','תכשיטים','פנדורה'],
  travel:['אל על','el al','elal','ישראייר','ארקיע','booking','בוקינג','airbnb','expedia','hotels.com','מלון','hotel','ryanair','wizz','easyjet','agoda','אגודה','issta','איסתא','דיזנהאוס','נופשונית','השכרת רכב','duty free','דיוטי פרי'],
  subs:['בריכת','בריכה','netflix','נטפליקס','spotify','ספוטיפיי','apple.com','icloud','google','youtube','disney','דיסני','prime video','hbo','chatgpt','openai','claude','anthropic','microsoft','adobe','canva','holmes place','הולמס פלייס','גו אקטיב','go active','חדר כושר','כושר','dropbox','zoom','audible','storytel','סטורי טל','sting','סטינג','patreon','מנוי'],
  ads:['facebk','facebook','meta','fb.me','google ads','googleads','manychat','tiktok','linkedin','mailchimp','פרסום','קידום'],
  pro:['יעוץ','ייעוץ','יועץ','רואה חשבון','רו"ח','עורך דין','עו"ד','הנהלת חשבונות','משרד עורכי'],
  biz_tax:['מס הכנסה','נציבות מס','רשות המסים','מקדמות מס','פקיד שומה'],
  biz_ni:['ביטוח לאומי','המוסד לביטוח לאומי'],
  biz_vat:['מע"מ','מס ערך מוסף'],
  xfer:['העברה','bit','ביט','paybox','פייבוקס','העברה בbit','העברה ב-bit'],
  skip:['כרטיסי אשראי','משיכת מזומן','כספומט','מזומן','תשלום כרטיס','ישראכרט','מקס איט','לאומי קארד','כאל','ויזה','אמריקן אקספרס','דיינרס']
};
// The issuer's own "ענף / קטגוריה" column → our category
const SRC_CAT=[
  [/אלקטרוניקה|מחשבים|ביגוד|הלבשה|אופנה|הנעלה|ריהוט|כלי בית|ספרים|צעצוע|קניות|מוצרי בית|ספורט/,'shopping'],
  [/סופרמרקט|מזון וצריכה|מזון ומשקאות|מכולת|מזון(?! מהיר)/,'super'],
  [/מסעד|מזון מהיר|בתי קפה|בילוי|פנאי|תרבות|קולנוע/,'food'],
  [/דלק|תחבור|רכב|חני|מוסך/,'transport'],
  [/ביטוח/,'insurance'],
  [/תקשורת|סלולר|חשמל|מים|גז|עירי|ממשל|מוסדות/,'bills'],
  [/תייר|טיס|תעופה|מלונ|נופש/,'travel'],
  [/וטרינ|חיות|בעלי חיים/,'pets'],
  [/רפוא|פארם|בריאות|אופטיק/,'health'],
  [/חינוך|לימוד/,'kids'],
  [/תוכן|מנוי|אינטרנט/,'subs']
];

// ── State ──
const SI={files:[],txns:[],month:'',mode:'add',session:{},bizSession:{},bizCards:{},open:{},showSkip:false,showTech:false,busy:false,seq:0};

// ── Helpers ──
const enc=s=>encodeURIComponent(s).replace(/'/g,'%27'); // safe inside onclick='...'
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(n<0?'-':'')+'₪'+Math.round(Math.abs(n)).toLocaleString('he-IL');
const dShort=d=>d?d.getDate()+'/'+(d.getMonth()+1):'';
const dStr=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
function normTxt(s){return String(s??'').toLowerCase().replace(/[״"׳'`]/g,'').replace(/[-_.,/\\*|()]+/g,' ').replace(/\s+/g,' ').trim();}
// Same merchant = same key, so it's grouped and learned once: drop reference codes
// ("X6GYTGHD92* FACEBK" → "facebk"), branch numbers and digits.
function merchantKey(s){
  let t=String(s??'').replace(/^[^*\s]*\d[^*\s]*\*\s*/,'');   // "REFCODE* NAME"
  t=t.split(/\s+/).filter(w=>!/^[A-Za-z0-9]*\d[A-Za-z0-9]*$/.test(w)||!/[A-Za-z]/.test(w)).join(' '); // mixed codes
  const k=normTxt(t).replace(/\d+/g,' ').replace(/\s+/g,' ').trim();
  return k||normTxt(s);
}
const HEB=/[֐-׿]/;
const revHeb=s=>HEB.test(s)?[...s].reverse().join(''):s;
const num=v=>parseFloat(String(v||0).replace(/,/g,''))||0;
function parseDate(v){
  if(v instanceof Date&&!isNaN(v)){const d=new Date(v.getTime()+12*3600e3);return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
  if(typeof v==='number'&&v>30000&&v<70000)return new Date(Math.round((v-25569)*864e5)+12*3600e3);
  const s=String(v??'').trim();
  // the date may share its cell with a stray marker (Max PDFs put a small "7" icon before it)
  let m=s.match(/(?:^|[^\d\/.\-])(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?![\d\/.\-])/);
  if(m){let y=+m[3];if(y<100)y+=2000;const d=new Date(y,+m[2]-1,+m[1]);return d.getMonth()===+m[2]-1?d:null;}
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?new Date(+m[1],+m[2]-1,+m[3]):null;
}
function parseAmt(v){
  if(typeof v==='number')return isFinite(v)?v:null;
  let s=String(v??'').trim();
  if(!s||!/\d/.test(s))return null;
  if(/[֐-׿a-z]{2,}/i.test(s.replace(/ש"?ח|nis|ils|usd|eur/ig,'')))return null;
  // the minus may sit after the currency sign ("₪ -76.81") or trail the number ("76.81-")
  const bare=s.replace(/[₪$€\s]|ש"?ח/g,'');
  const neg=/^\(.*\)$/.test(bare)||/^[-−–]/.test(bare)||/[-−–]$/.test(bare);
  s=s.replace(/[^\d.,]/g,'');
  if(/,\d{2}$/.test(s)&&!/\./.test(s))s=s.replace(/,(\d{2})$/,'.$1');
  const n=parseFloat(s.replace(/,/g,''));
  return isNaN(n)?null:(neg?-n:n);
}
const isDateStr=s=>/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/.test(String(s).trim());
const isAmtStr=s=>{s=String(s).trim();return /^[-−–]?\s*[₪$€]?\s*[-−–]?\d{1,3}(,\d{3})*(\.\d{1,2})\s*[-−–]?\s*[₪$€]?$/.test(s)||/^[-−–]?\s*[₪$€]?\s*\d+\.\d{2}\s*[-−–]?$/.test(s);};
// Total lines: "סה"כ לחיוב", "סך חיוב בש"ח:" (Isracard), "TOTAL FOR DATE" (Isracard foreign)
const TOTAL_RE=/סה"?כ|סך הכל|סך חיוב|total/i;

// ── Column detection ──
const ROLES=[['date','תאריך עסקה'],['merchant','בית עסק'],['charge','סכום חיוב'],['amount','סכום עסקה'],['credit','זכות (בנק)'],['currency','מטבע'],['srcCat','ענף'],['notes','הערות'],['billDate','תאריך חיוב'],
  ['dir','חיוב/זיכוי (בנק)'],['balance','יתרה (בנק)'],['opType','סוג פעולה (בנק)']];
function autoMap(headers){
  const H=headers.map(normTxt),used=new Set(),map={};
  const pick=(role,re)=>{const i=H.findIndex((x,i)=>x&&!used.has(i)&&re.test(x));if(i>=0){map[role]=i;used.add(i);}};
  // bank exports (One Zero): "חיוב/זיכוי" says which way the money went; "יתרה" = balance after it
  pick('dir',/^(חיוב ?זיכוי|זיכוי ?חיוב)$/);
  pick('balance',/^י ?תרה/);
  pick('opType',/^סוג פעולה/);
  pick('billDate',/(תאריך|מועד).*חיוב/);
  pick('date',/תאריך|^date/);
  pick('charge',/סכום.*(חיוב|ש ?ח|בשקל)|חיוב.*ש ?ח|^חובה/);
  pick('amount',/סכום|amount/);
  pick('credit',/^זכות/);
  pick('merchant',/בית ?ה?עסק|שם.*עסק|תיאור|שם.*ספק|פרטי.*עסק|^פעולה$|merchant|description/);
  pick('srcCat',/ענף|קטגורי|category/);
  pick('currency',/מטבע.*חיוב/);pick('currency',/מטבע|currency/);
  pick('notes',/הערות|notes/);pick('notes',/פירוט ?נוסף|פרטים/);pick('notes',/סוג.*עסק/);
  return map;
}
// Fill roles the headers didn't reveal by looking at the data itself
// (e.g. the merchant header is worded unusually): the column that is mostly dates,
// mostly text, mostly amounts.
function inferMap(t){
  const m=t.map,rows=t.rows.slice(0,80),n=t.headers.length;
  const used=()=>new Set(Object.values(m));
  const score=test=>{const s=new Array(n).fill(0);rows.forEach(r=>{for(let i=0;i<n;i++)if(test(r[i]))s[i]++;});return s;};
  const best=(s,min)=>{const u=used();let bi=-1,bv=min;s.forEach((v,i)=>{if(!u.has(i)&&v>bv){bv=v;bi=i;}});return bi;};
  const minRows=Math.max(1,Math.floor(rows.length*0.3));
  if(m.date===undefined){const i=best(score(v=>!!parseDate(v)),minRows-1);if(i>=0)m.date=i;}
  if(m.charge===undefined&&m.amount===undefined&&m.credit===undefined){
    const i=best(score(v=>!(v instanceof Date)&&!isDateStr(v)&&parseAmt(v)!==null&&/[.,]|^\d+$/.test(String(v))),minRows-1);
    if(i>=0)m.charge=i;
  }
  if(m.merchant===undefined){const i=best(score(v=>typeof v==='string'&&/[a-z֐-׿]{2,}/i.test(v)&&!isDateStr(v)),minRows-1);if(i>=0)m.merchant=i;}
}
function headerScore(row){
  const H=row.map(normTxt);let s=0;
  if(H.some(x=>/תאריך|^date/.test(x)))s++;
  if(H.some(x=>/סכום|חובה|amount/.test(x)))s++;
  if(H.some(x=>/בית ?ה?עסק|שם.*עסק|תיאור|פעולה|merchant|description/.test(x)))s++;
  return (row.filter(c=>String(c??'').trim()).length>=3&&s>=2)?s:0;
}
function detectSource(text){
  const t=normTxt(text);
  if(/ישראכרט|isracard/.test(t))return 'ישראכרט';
  if(/אמריקן אקספרס|american express|amex/.test(t))return 'אמריקן אקספרס';
  if(/כאל|visa cal|\bcal\b/.test(t))return 'כאל';
  if(/מקס איט|max it|\bmax\b|לאומי קארד/.test(t))return 'מקס';
  if(/דיינרס|diners/.test(t))return 'דיינרס';
  return '';
}

// ── Reading files ──
async function readFile(f){
  const file={id:++SI.seq,name:f.name,kind:/\.pdf$/i.test(f.name)?'pdf':'sheet',tables:[],totals:[],source:'',error:''};
  try{
    file.raw=await f.arrayBuffer();
    if(file.kind==='pdf'){await loadLib('pdf');await readPdf(file);}
    else{await loadLib('xlsx');readSheet(file);}
  }catch(e){file.error=e.message||String(e);console.error(e);}
  return file;
}
function readSheet(file){
  const buf=file.raw;
  const head=new TextDecoder().decode(new Uint8Array(buf.slice(0,400))).trim().toLowerCase();
  // CSV / HTML-as-xls: keep text as-is, otherwise "01/09/2026" is read US-style (Jan 9)
  const textual=/\.csv$/i.test(file.name)||head.startsWith('<');
  const wb=XLSX.read(buf,textual?{type:'array',raw:true}:{type:'array',cellDates:true});
  file.sheets=[];let headText='';
  wb.SheetNames.forEach(sn=>{
    // strip invisible direction marks (One Zero wraps every description in them)
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:''})
      .map(r=>r.map(c=>typeof c==='string'?c.replace(/[‎‏‪-‮]/g,'').trim():c));
    file.sheets.push({name:sn,rows});
    const hi=rows.findIndex(r=>headerScore(r)>0);
    headText+=' '+rows.slice(0,hi>=0?hi:15).map(r=>r.map(c=>c instanceof Date?dStr(c):c).join(' ')).join(' ');
    splitTables(file,rows,sn);
  });
  file.tables.forEach(fixReversedColumns);
  const isBank=file.tables.some(t=>t.map.credit!==undefined||t.map.balance!==undefined);
  file.source=isBank?'דף בנק':detectSource(headText);
  if(isBank)file.bankName=bankNameOf(file.name+' '+headText);
  file.titleText=headText;
}
// Some exports store a column's Hebrew backwards ("טנוקסיד" = דיסקונט, "םילעופה" = הפועלים).
// Tell-tale: words that START with a final letter (ם ן ץ ף ך), which real Hebrew never does.
// Such a column is flipped back; numbers inside it keep their order.
function fixReversedColumns(t){
  const n=t.headers.length;
  for(let c=0;c<n;c++){
    let start=0,end=0;
    t.rows.forEach(r=>{String(r[c]??'').split(/[^א-ת]+/).forEach(w=>{if(w.length<2)return;if(/^[ךםןףץ]/.test(w))start++;if(/[ךםןףץ]$/.test(w))end++;});});
    if(start>=2&&start>end)t.rows.forEach(r=>{if(typeof r[c]==='string')r[c]=[...r[c]].reverse().join('').replace(LTR_RUN,m=>[...m].reverse().join(''));});
  }
}
function bankNameOf(text){
  const t=normTxt(text);
  return /one ?zero|וואן זירו/.test(t)?'One Zero':/פועלים/.test(t)?'בנק הפועלים':/לאומי/.test(t)?'בנק לאומי':/דיסקונט/.test(t)?'דיסקונט':
    /מזרחי/.test(t)?'מזרחי טפחות':/בינלאומי/.test(t)?'הבינלאומי':/פפר|pepper/.test(t)?'פפר':'';
}
// One sheet can hold several tables (e.g. ILS + foreign), each with its own header row
function splitTables(file,rows,where){
  let cur=null;
  file._future=FUTURE_RE.test(where); // e.g. a sheet named "עסקאות בחיוב עתידי"
  rows.forEach(r=>{
    if(sectionFlag(file,r.filter(c=>!(c instanceof Date)).join(' ')))return;
    if(!headerScore(r))noteCard(file,r);
    if(TOTAL_RE.test(r.join(' '))){
      const nums=r.filter(c=>!(c instanceof Date)&&!isDateStr(c)).map(parseAmt).filter(n=>n!==null&&Math.abs(n)>=1);
      if(nums.length)totalLine(file,nums,r);
      return; // a total row is never a transaction itself
    }
    if(headerScore(r)){cur=newTable(file,where,r.map(c=>String(c??'').trim()));return;}
    if(cur&&!file._future)addRow(file,cur,r);
  });
  file.tables.forEach(inferMap);
}
// Some PDFs (e.g. Cal's digital statement) store every single LETTER as its own piece, laid out
// visually. Walking right-to-left gives Hebrew in the right order but numbers / Latin backwards
// ("31/03/2026" comes out "6202/30/13"). Rebuild such runs into words: a space where the gap
// between letters is word-sized, then flip every left-to-right run (digits, Latin) back.
// starts & ends on a letter/digit, so a "/" or "-" sitting next to Hebrew keeps its place
const LTR_RUN=/[0-9A-Za-z](?:[0-9A-Za-z.,\/:%$+\-]*[0-9A-Za-z])?/g;
function charRuns(items){
  const out=[];let run=null;
  const flush=()=>{if(!run)return;
    const s=run.parts.join('').replace(LTR_RUN,m=>[...m].reverse().join('')).trim();
    const W=run.right-run.x;
    // A date glued to the merchant ("20/04/2026 WWW.MAKE.COM") — the date is the right-hand part
    const m=s.match(/^(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})\s+(.+)$/);
    if(m){const f=m[1].length/s.length;
      out.push({s:m[1],x:run.right-W*f,y:run.y,w:W*f,fs:run.fs});
      out.push({s:m[2],x:run.x,y:run.y,w:W*(1-f)-1,fs:run.fs});}
    else out.push({s,x:run.x,y:run.y,w:W,fs:run.fs});
    run=null;};
  for(const it of items){ // right-to-left
    if(it.s.length!==1){flush();out.push(it);continue;}
    const gap=run?run.x-(it.x+it.w):1e9;
    if(run&&gap<it.fs*0.6){
      run.parts.push((gap>it.fs*0.18?' ':'')+it.s);
      run.x=Math.min(run.x,it.x);
    }else{flush();run={parts:[it.s],x:it.x,y:it.y,right:it.x+it.w,fs:it.fs};}
  }
  flush();
  return out;
}
async function readPdf(file,password){
  file.needPassword=false;file.error='';
  let doc;
  try{doc=await pdfjsLib.getDocument({data:new Uint8Array(file.raw.slice(0)),password:password||undefined}).promise;}
  catch(e){if(e&&e.name==='PasswordException'){file.needPassword=true;file.pwWrong=!!password;return;}throw e;}
  const lines=[];
  for(let p=1;p<=doc.numPages;p++){
    const tc=await (await doc.getPage(p)).getTextContent();
    const items=tc.items.filter(it=>it.str&&it.str.trim()).map(it=>({s:it.str.trim(),x:it.transform[4],y:it.transform[5],w:it.width||0,fs:Math.abs(it.transform[3])||Math.abs(it.transform[0])||8}));
    items.sort((a,b)=>b.y-a.y||b.x-a.x);
    let cur=null;
    for(const it of items){if(!cur||Math.abs(cur.y-it.y)>3){cur={page:p,y:it.y,items:[]};lines.push(cur);}cur.items.push(it);}
  }
  lines.forEach(l=>{l.items.sort((a,b)=>(b.x+b.w)-(a.x+a.w));l.items=charRuns(l.items);});
  file.pdfPages=doc.numPages;file.pdfLines=lines;
  // Some PDFs keep Hebrew in visual (reversed) order — detect by counting reversed keywords
  const all=lines.map(l=>l.items.map(i=>i.s).join(' ')).join(' ');
  const KW=['תאריך','סכום','חיוב','עסקה','בית'];
  const fwd=KW.reduce((n,k)=>n+(all.split(k).length-1),0),bwd=KW.reduce((n,k)=>n+(all.split(revHeb(k)).length-1),0);
  if(file.pdfReverse===undefined)file.pdfReverse=bwd>fwd;
  pdfToTables(file);
}
// Many PDFs store every WORD as a separate fragment ("שם" "בית" "העסק"). Glue fragments
// that sit close together on the line into one cell, so a header like "שם בית העסק" is one
// column (not three) and a merchant name isn't split across columns. Dates / amounts stay separate.
function mergeCells(items,fix){
  const out=[];
  for(const it0 of items){ // items are sorted right-to-left
    const it={...it0,s:fix(it0.s)};
    const last=out[out.length-1];
    const gap=last?last.x-(it.x+it.w):1e9;
    const solo=s=>isDateStr(s)||isAmtStr(s);
    if(last&&gap<Math.max(3,it.fs*0.7)&&gap>-it.fs&&!solo(it.s)&&!solo(last.s)){
      const right=last.x+last.w;
      // we walk right-to-left: Hebrew reads in that order, Latin ("PLAYSTATION LONDON") the other way
      last.s=(!HEB.test(last.s)&&!HEB.test(it.s))?it.s+' '+last.s:last.s+' '+it.s;
      last.x=Math.min(last.x,it.x);last.w=right-last.x;
    }else out.push(it);
  }
  return out;
}
// Loan / interest tables ("פירוט חצי שנתי בגין מוצרי אשראי") are information, not this month's charges
// Sections that are NOT this statement's charges: "פירוט עסקות לחיוב עתידי" (Cal), "עסקאות שטרם
// נקלטו" / "עסקאות עתידיות". Rows there are skipped until a regular section title appears.
// Returns true when the line is such a title (so it isn't read as a row).
const FUTURE_RE=/חיוב עתידי|עס[קא]+ות עתידיות|טרם נקלטו|טרם חויבו|עס[קא]+ות בהמתנה/;
const SECTION_RE=/פירוט עס[קא]+ות|עס[קא]+ות בארץ|עס[קא]+ות בחו"?ל|עס[קא]+ות למועד חיוב|עס[קא]+ות בחיוב/;
function sectionFlag(file,text){
  if(FUTURE_RE.test(text)){file._future=true;return true;}
  if(SECTION_RE.test(text)&&!headerScore(text.split(' | '))){file._future=false;}
  return false;
}
// The card's last 4 digits, from a title line: "לכרטיס שמסתיים ב- 1234" (Max), "פלטינה מסטרקארד - 5678"
// (Isracard), "המסתיים ב9012-" (Cal). Lines with a date are transactions, not titles.
function cardIn(text){
  const t=String(text||'');
  const m=t.match(/(?:שמסתיים|המסתיים|מסתיים)\s*(?:ב-?|בספרות)?\s*-?\s*(\d{4})(?!\d)/)||
          t.match(/(?:מסטרקארד|מאסטרקארד|ויזה|visa|mastercard|אמריקן אקספרס|דיינרס|לאומי קארד)\s*[-–|‖:]*\s*(\d{4})(?!\d)/i);
  return m?m[1]:'';
}
function noteCard(file,cells){
  if(cells.some(c=>c instanceof Date||isDateStr(String(c).trim())))return;
  const c=cardIn(cells.join(' '));if(c)file._card=c;
}
function newTable(file,where,heads){
  const t={where,headers:heads,map:autoMap(heads),rows:[],rowSeg:[],card:file._card||'',info:/הלוואה|יתרת קרן|תשלום קרן|ריבית/.test(heads.join(' '))};
  file.tables.push(t);return t;
}
// Segments, for checking against the file's own totals: every total line ("סה"כ לחיוב",
// Cal's per-date "סה"כ לתאריך", Isracard's "סך חיוב") closes the running segment — the rows
// since the previous total line, across tables and pages. Each segment's sum must match it.
function addRow(file,t,r){t.rows.push(r);t.rowSeg.push(file._seg||0);}
function totalLine(file,nums,cells){
  file.totals.push(nums);
  const seg=file._seg||0;
  (file.segTotals=file.segTotals||{})[seg]=nums;
  // "סה"כ חיובים בתאריך 02/08/26" / "סה"כ לתאריך 23/04/26" / "10/03/23 סך חיוב" — the
  // segment's billing date
  for(const c of cells||[]){const d=c instanceof Date||isDateStr(String(c).trim())||/\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}/.test(String(c))?parseDate(c):null;
    if(d){(file.segDates=file.segDates||{})[seg]=d;break;}}
  file._seg=seg+1;
}
// ── Billing month (the month the money leaves the account — the budget is cash-based) ──
const HEB_MONTH_RE=/(ינואר|פברואר|מרץ|מרס|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)\s*(20\d{2})/;
const HEB_MONTH_IDX={ינואר:1,פברואר:2,מרץ:3,מרס:3,אפריל:4,מאי:5,יוני:6,יולי:7,אוגוסט:8,ספטמבר:9,אוקטובר:10,נובמבר:11,דצמבר:12};
// From the statement's title area: "מועד חיוב 10/03/23", "לחיוב ב- 10.07", "דף חיוב חודשי ל-10/05/26",
// "פירוט החיובים בחשבון לתאריך 02/08/26", "פירוט עסקאות יולי 2026"
function billMonthFromText(text,yearHint){
  const t=String(text||'').replace(/\s+/g,' ');
  const m=t.match(/(מועד (?:ה)?חיוב|לחיוב ב|חיוב חודשי ל|חיובים בחשבון לתאריך|למועד החיוב)\D{0,8}(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?/);
  const hm=t.match(HEB_MONTH_RE);
  if(m){
    let y=m[4]?+m[4]:(hm?+hm[2]:yearHint);
    if(y&&y<100)y+=2000;
    if(y)return y+'-'+String(+m[3]).padStart(2,'0');
  }
  if(hm)return hm[2]+'-'+String(HEB_MONTH_IDX[hm[1]]).padStart(2,'0');
  return '';
}
// File names like "1234_07_2026.pdf", "Export_3_2023.xls", "כאל 05-26.pdf"
function billMonthFromName(name){
  const n=String(name||'').replace(/\.\w+$/,'');
  let m=n.match(/(?:^|\D)(0?[1-9]|1[0-2])[_\-. ](20\d{2})(?:\D|$)/);
  if(m)return m[2]+'-'+String(+m[1]).padStart(2,'0');
  m=n.match(/(?:^|\D)(0?[1-9]|1[0-2])[_\-.](2\d)(?:\D|$)/);
  if(m)return '20'+m[2]+'-'+String(+m[1]).padStart(2,'0');
  return '';
}
// Each header line defines column centres; following lines' cells go to the nearest column
function pdfToTables(file){
  file.tables=[];file.totals=[];file.segTotals={};file._seg=0;file._future=false;file._card='';
  const fix=s=>file.pdfReverse?revHeb(s):s;
  let cur=null,cols=null;
  const merged=file.pdfLines.map(l=>({page:l.page,y:l.y,fs:(l.items[0]||{}).fs||8,cells:mergeCells(l.items,fix)}));
  const plain=c=>!c.some(x=>isDateStr(x.s)||isAmtStr(x.s));
  for(let li=0;li<merged.length;li++){
    const l=merged[li];
    const cells=l.cells.map(c=>c.s);
    // Immediate / out-of-cycle charges announce their own date ("חיוב בחשבון הבנק 19.06.26" —
    // Isracard's "עסקאות בחיוב מחוץ למועד"): that section belongs to that month, not the statement's
    const im=cells.join(' ').match(/חיוב בחשבון(?: ה?בנק)?\D{0,12}(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/);
    if(im&&!TOTAL_RE.test(cells.join(' '))){const d=parseDate(im[1]);if(d)(file.segDates=file.segDates||{})[file._seg||0]=d;}
    if(sectionFlag(file,cells.join(' ')))continue;
    if(!headerScore(cells))noteCard(file,cells);
    if(TOTAL_RE.test(cells.join(' '))){
      const nums=cells.filter(isAmtStr).map(parseAmt).filter(n=>n!==null&&Math.abs(n)>=1);
      if(nums.length)totalLine(file,nums,cells);
      continue; // total line: closes a segment (see totalLine), never a transaction
    }
    if(headerScore(cells)){
      cols=l.cells.map(c=>c.x+c.w/2);
      const heads=cells.slice();
      // Two-line headers ("סכום" / "החיוב"): glue the next line's words onto the column above them
      const nx=merged[li+1];
      if(nx&&nx.page===l.page&&Math.abs(l.y-nx.y)<l.fs*1.8&&plain(nx.cells)&&!headerScore(nx.cells.map(c=>c.s))){
        nx.cells.forEach(c=>{const cx=c.x+c.w/2;let best=0,bd=1e9;cols.forEach((x,k)=>{const d=Math.abs(x-cx);if(d<bd){bd=d;best=k;}});if(bd<l.fs*6)heads[best]+=' '+c.s;});
        li++;
      }
      cur=newTable(file,'עמוד '+l.page,heads);continue;
    }
    if(cur&&!file._future){
      const row=new Array(cols.length).fill('');
      // fragments far from every column are page-margin text (ads, side notes) — not table data
      const lim=Math.max(40,(l.fs||8)*4);
      l.cells.forEach(it=>{const c=it.x+it.w/2;let best=0,bd=1e9;cols.forEach((x,k)=>{const d=Math.abs(x-c);if(d<bd){bd=d;best=k;}});if(bd>lim)return;row[best]=row[best]?row[best]+' '+it.s:it.s;});
      addRow(file,cur,row);
    }
  }
  file.tables.forEach(inferMap);
  // Header-based reading found nothing usable → guess per line (date + amount + text)
  const usable=file.tables.some(t=>extract({id:0,tables:[t]}).length);
  if(!usable){
    const t={where:'ללא כותרות',headers:['תאריך','בית עסק','סכום חיוב','סכום עסקה','הערות'],map:{date:0,merchant:1,charge:2,amount:3,notes:4},rows:[],rowSeg:[],guess:true};
    for(const l of merged){
      const dates=[],amts=[],texts=[],notes=[];
      l.cells.forEach(it=>{const s=it.s;
        if(isDateStr(s))dates.push(s);else if(isAmtStr(s))amts.push({s,x:it.x});
        else if(/\d+\s*(מתוך|מ-)\s*\d+/.test(s))notes.push(s);else if(/[a-z֐-׿]/i.test(s))texts.push(s);});
      if(!dates.length||!amts.length||!texts.length)continue;
      amts.sort((a,b)=>a.x-b.x);
      t.rows.push([dates[0],texts.slice().sort((a,b)=>b.length-a.length)[0],amts[0].s,amts.length>1?amts[amts.length-1].s:'',notes.join(' ')]);
    }
    if(t.rows.length)file.tables=[t]; // replace, so nothing is counted twice
  }
  if(!file.source){
    const isBank=file.tables.some(t=>t.map.credit!==undefined||t.headers.some(x=>/יתרה|י תרה/.test(x)));
    const txt=n=>file.pdfLines.slice(0,n).map(l=>l.items.map(i=>fix(i.s)).join(' ')).join(' ');
    // the issuer's name may only appear in the footer (Isracard) — fall back to the whole text
    file.source=isBank?'דף בנק':(detectSource(txt(25))||detectSource(txt(1e9)));
  }
  file.titleText=file.pdfLines.slice(0,40).map(l=>l.items.map(i=>fix(i.s)).join(' ')).join(' ');
}

// ── Transactions ──
function extract(file){
  const out=[];
  file.tables.forEach((t,ti)=>{
    if(t.info)return;
    const g=k=>t.map[k]!==undefined?t.map[k]:-1;
    t.rows.forEach((r,ri)=>{
      const cell=k=>g(k)>=0?r[g(k)]:'';
      const date=parseDate(cell('date'));if(!date)return;
      const merchant=String(cell('merchant')??'').trim();
      if(!merchant||TOTAL_RE.test(merchant))return;
      const charge=parseAmt(cell('charge')),amount=parseAmt(cell('amount')),credit=parseAmt(cell('credit'));
      const bank=t.map.balance!==undefined||t.map.credit!==undefined||t.map.dir!==undefined;
      // val > 0 = money out (expense); val < 0 = money in. income = money coming INTO a bank account.
      let val=charge!==null?charge:amount,income=false;
      if(t.map.dir!==undefined&&amount!==null){                 // "חיוב/זיכוי" column says the direction
        const v=Math.abs(amount);if(/זיכוי/.test(String(cell('dir')))){val=-v;income=true;}else val=v;
      }else if(bank&&t.map.credit===undefined&&charge===null&&amount!==null){ // one signed amount: + = in
        val=-amount;income=amount>0;
      }else if(val===null&&credit){val=-credit;income=true;}
      if(val===null||val===0)return; // 0 = a fee that was fully discounted
      const rowTxt=r.filter(c=>!(c instanceof Date)&&!isDateStr(c)).join(' ');
      const inst=rowTxt.match(/(\d+)\s*(?:מתוך|מ-)\s*(\d+)/);
      const cur=String(cell('currency')??'').trim();
      const card=t.card||((file.name||'').match(/^(\d{4})[_\- ]/)||[])[1]||'';
      // Bank descriptions are "bank/name/memo/account" — show the person/company + memo
      const p=bank?bankParty(merchant):{name:merchant,display:merchant,ref:''};
      const tx={key:file.id+':'+ti+':'+ri,fileId:file.id,ti,ri,seg:t.rowSeg?t.rowSeg[ri]:undefined,
        card,cardKey:bank?'bank|'+(file.bankName||file.name):card?(file.source||'כרטיס')+'|'+card:'file|'+file.name,
        date,billDate:parseDate(cell('billDate')),merchant:p.display,mk:merchantKey(p.name),val,income,bank,
        balance:bank?parseAmt(cell('balance')):null,opType:String(cell('opType')??'').trim(),ref:p.ref,
        inst:inst&&+inst[2]>1&&+inst[1]<=+inst[2]?inst[1]+'/'+inst[2]:'',fx:cur&&!/₪|ש"?ח|ils|nis|שקל/i.test(cur)?cur:'',
        srcCat:String(cell('srcCat')??'').trim()};
      tx.kind=bank?bankKind(tx):'expense';
      out.push(tx);
    });
  });
  return out;
}
// ── Bank rows ──
const BANK_PREFIX=/^(לאומי|הפועלים|ב הפועלים ב|דיסקונט|מזרחי|בינלאומי|אוצר.?ה?חי[יו]?ל|חיל.?אוצר|מרכנתיל|יהב|ירושלים|איגוד|מסד|פפר|one ?zero|העברה ל|העברה מ|העברה מיידית)/i;
function bankParty(desc){
  const parts=String(desc||'').split('/').map(s=>s.trim());
  const ref=(parts.find(s=>/^\d{4}$/.test(s))||''); // card digits on a card payment ("ישראכרט/1234/")
  const segs=parts.filter(s=>s&&!/^[\d\-#\s.*]+$/.test(s)&&!/^(withdrawal|one|zero)$/i.test(s));
  if(!segs.length)return {name:desc,display:desc,ref};
  let name=segs[0],memo=segs[1]||'';
  if(BANK_PREFIX.test(segs[0])&&segs[1]){name=segs[1];memo=segs[2]||'';}
  memo=memo.replace(/תשלום מבנק.*$/,'').trim();
  return {name,display:name+(memo?' · '+memo:''),ref};
}
const BROKER_RE=/ני"?ע|קרן כספית|כספית|^קניה|^מכירה|אקסלנס|מיטב|פסגות|אלטשולר|\bibi\b|אינטראקטיב|interactive|בלינק|blink|פועלים טרייד|ספארק|אנליסט|ilan/i;
const CARD_PAY_RE=/כרטיסי אשראי|ישראכרט|מקס איט|לאומי קארד|אמריקן אקספרס|דיינרס|^כאל|\bcal\b|\bmax\b/i;
function issuerOf(text){
  const t=String(text||'');
  return /כרטיסי אשראי|כאל|\bcal\b|דיינרס/i.test(t)?'כאל':/ישראכרט|אמריקן/i.test(t)?'ישראכרט':/מקס|\bmax\b|לאומי קארד/i.test(t)?'מקס':'';
}
// The client's own name (from settings) — transfers between their own accounts aren't spending
function ownNameTokens(){
  const n=String(((D&&D.settings)||{}).displayName||'').trim();
  return n.split(/\s+/).filter(w=>w.length>=2);
}
function bankKind(t){
  const txt=t.merchant+' '+t.opType;
  if(/ניירות ערך/.test(t.opType)||BROKER_RE.test(t.merchant))return 'invest';
  if(!t.income&&CARD_PAY_RE.test(t.merchant))return 'card';
  const own=ownNameTokens();
  if(own.length>=2&&own.every(w=>txt.includes(w)))return 'own';
  return t.income?'income':'expense';
}
function guessCat(t){
  if(t.kind==='card'||t.kind==='invest'||t.kind==='own')return 'skip';
  if(t.income)return 'income';
  const nm=normTxt(t.merchant),words=nm.split(' ');
  let best=null,bl=0;
  for(const [cat,kws] of Object.entries(DICT))for(const kw of kws){
    const k=normTxt(kw);
    if((k.length<=3?words.includes(k):nm.includes(k))&&k.length>bl){best=cat;bl=k.length;}
  }
  if(best)return best;
  if(t.srcCat)for(const [re,cat] of SRC_CAT)if(re.test(t.srcCat))return cat;
  if(t.bank&&/העבר/.test(t.opType))return 'xfer'; // money sent to a person from the bank
  return '';
}

// ── Targets: "sec|row name", "skip" or "" (not assigned yet) ──
const selfEmployed=()=>!!((D.budgetProfile||{}).selfEmployed);
function monthRows(){
  const m=D.budgetMonths[SI.month]||newBudgetMonthTemplate();
  const names=sec=>(m[sec]||[]).map(r=>(r.name||'').trim()).filter(Boolean);
  // the business section exists only for the self-employed (budget.js ensureBizRows)
  const biz=selfEmployed()?(names('business').length?names('business'):BIZ_DEFAULT_ROWS().map(r=>r.name)):[];
  const sep=selfEmployed()&&(D.budgetProfile||{}).bizMode==='separate';
  return {needs:names('needs'),wants:names('wants'),business:biz,income:names('income'),
    bizIncome:sep?(names('bizIncome').length?names('bizIncome'):['הכנסות העסק']):[]};
}
// ── Income (money coming into a bank account) ──
// Salary-like → "משכורת"; business (payment processors, or marked 💼) → the business income row;
// Bit / PayBox / transfers → "ביט / פייבוקס / העברות כספיות"; anything else → "הכנסות אחרות".
const PROCESSOR_RE=/גרואו|grow|משולם|meshulam|paypal|פייפאל|stripe|קארדקום|cardcom|טרנזילה|tranzila|icount|חשבונית ירוקה|morning|payplus|פיי ?פלוס|ישראכרט סליקה|סליקה/i;
// A transfer whose note says what it paid for — consulting, a course, a workshop — is a client
// paying the self-employed person
const BIZ_INCOME_RE=/יי?עוץ|יעו"ץ|קורס|סדנ|פגישת|הרצא|ליווי|חשבונית|שירותי|הרשמה ל/;
function incomeRow(rows,re,name){const hit=rows.income.find(n=>re.test(n));return 'income|'+(hit||name);}
function bizIncomeTarget(rows){
  if(rows.bizIncome.length)return 'bizIncome|'+(rows.bizIncome.find(n=>/עסק|הכנס/.test(n))||rows.bizIncome[0]);
  return incomeRow(rows,/עסק/,'הכנסה נוספת / עסק');
}
function incomeTarget(t,rows){
  const nm=t.merchant+' '+t.opType;
  if(/משכורת|שכר|מ\.ש\.?\b|מופ"?ת|מילוא|salary|payroll/i.test(nm))return incomeRow(rows,/משכורת|שכר/,'משכורת');
  if(t.biz)return bizIncomeTarget(rows);
  if(/ביטוח לאומי|קצב/.test(nm))return incomeRow(rows,/קצב/,'קצבאות');
  if(/ביט(?!וח)|\bbit\b|פייבוקס|paybox|העבר/i.test(nm))return incomeRow(rows,/פייבוקס|העברות|ביט(?!וח)/,XFER_NAME);
  return incomeRow(rows,/אחרות|שונות/,'הכנסות אחרות');
}
function catTarget(cat,rows){
  if(!cat)return '';
  if(cat==='skip')return 'skip';
  let c=CATS[cat];
  if(c.sec==='business'&&!selfEmployed())c=c.alt;
  if(c.sec==='business'){const hit=rows.business.find(n=>c.row.test(n));return 'business|'+(hit||c.name);}
  for(const sec of [c.sec,c.sec==='needs'?'wants':'needs']){
    const hit=rows[sec].find(n=>c.row.test(n)&&!(c.not&&c.not.test(n)));
    if(hit)return sec+'|'+hit;
  }
  return c.sec+'|'+c.name; // the client has no such row yet → it will be added
}
function learnedTarget(mk){
  const v=SI.session[mk]!==undefined?SI.session[mk]:(D.importMerchants||{})[mk];
  if(!v)return null;
  return v==='skip'?'skip':(v.sec+'|'+v.name);
}
function rebuild(){
  const rows=monthRows();
  SI.txns=[];
  const seen=new Set(); // fingerprints already counted in this upload
  SI.files.forEach(f=>{
    f.txns=f.error||f.needPassword?[]:extract(f);
    f.sum=f.txns.reduce((a,t)=>a+t.val,0);
    f.spent=f.txns.filter(t=>!t.income).reduce((a,t)=>a+t.val,0); // bank: deposits aren't "spent"
    // Every segment (rows between two total lines) must add up to the total line that closed it.
    // Segments without transactions (loan tables, "expected next charge" lines) are ignored.
    const segs=Object.entries(f.segTotals||{}).map(([s,nums])=>{
      const tx=f.txns.filter(t=>t.seg===+s);
      return tx.length?{nums,sum:tx.reduce((a,t)=>a+t.val,0)}:null;}).filter(Boolean);
    f.check=!segs.length?'':segs.every(g=>g.nums.some(v=>Math.abs(Math.abs(v)-Math.abs(g.sum))<1.01))?'ok':'diff';
    // Billing month of every transaction (the budget is cash-based: the month the money left).
    // Bank: the row's own date. Card: its "תאריך חיוב" column → the date on the total line that
    // closed its section → the statement's billing date in the title → the file name.
    const latest=f.txns.reduce((a,t)=>t.date>a?t.date:a,new Date(0));
    f.autoMonth=f.source==='דף בנק'?'':(billMonthFromText(f.titleText,latest.getFullYear()||undefined)||billMonthFromName(f.name));
    f.txns.forEach(t=>{
      const sd=f.segDates&&t.seg!==undefined?f.segDates[t.seg]:null;
      t.month=f.monthOverride||(f.source==='דף בנק'?mkKey(t.date):t.billDate?mkKey(t.billDate):sd?mkKey(sd):f.autoMonth)||'';
    });
    f.months=[...new Set(f.txns.map(t=>t.month).filter(Boolean))].sort();
    // Fingerprint: count + total + first/last date — order-independent, so the same statement
    // downloaded once as PDF and once as Excel is recognised as the same
    const ds=f.txns.map(t=>+t.date);
    f.fp=f.txns.length+'|'+Math.round(f.sum*100)+'|'+(ds.length?Math.min(...ds)+'|'+Math.max(...ds):'0');
    // Already imported (into any month — the fingerprint is stored on every month it filled),
    // or the same statement picked twice in this upload
    f.dupNow=f.txns.length>0&&seen.has(f.fp);
    f.dup=f.dupNow||Object.values(D.budgetMonths||{}).some(m=>(m.imports||[]).some(x=>x.fp===f.fp));
    if(f.dup&&f.useDup&&!f.dupNow)f.dup=false;
    if(f.txns.length&&!f.dup)seen.add(f.fp);
    if(!f.dup)SI.txns.push(...f.txns);
  });
  SI.txns.forEach(t=>{
    t.cat=guessCat(t);
    t.biz=isBiz(t);
    const lt=learnedTarget(t.mk);
    if(t.income){
      // a remembered income row is used unless the client just flipped personal/business
      if(lt!==null&&(SI.session[t.mk]!==undefined||SI.bizSession[t.mk]===undefined)){
        t.target=lt;t.how=SI.session[t.mk]!==undefined?'session':'learned';return;}
      t.target=t.cat==='skip'?'skip':incomeTarget(t,rows);t.how='auto';return;
    }
    // 'learned' = remembered from an earlier import; 'session' = assigned just now.
    // A remembered row on the other side (personal vs business) gives way to this side's mapping.
    if(lt!==null&&(lt==='skip'||!selfEmployed()||lt.startsWith('business|')===t.biz)){
      t.target=lt;t.how=SI.session[t.mk]!==undefined?'session':'learned';return;}
    t.target=t.biz?bizTarget(t.cat,rows):catTarget(t.cat,rows);t.how=t.target?'auto':'';
  });
}
// ── Personal vs business (self-employed only) ──
// Order: what the client set for this merchant (now / remembered) → tax & ads are always
// business → the card is marked as a business card → otherwise personal.
function isBiz(t){
  if(!selfEmployed()||t.cat==='skip')return false;
  if(SI.bizSession[t.mk]!==undefined)return SI.bizSession[t.mk];
  const mb=(D.importMerchantBiz||{})[t.mk];if(mb!==undefined)return mb;
  if(t.income&&(PROCESSOR_RE.test(t.merchant)||BIZ_INCOME_RE.test(t.merchant)))return true; // client payments
  if(!t.income&&t.cat&&CATS[t.cat]&&CATS[t.cat].sec==='business')return true;
  return !!SI.bizCards[t.cardKey];
}
function bizTarget(cat,rows){
  if(cat==='skip')return 'skip';
  if(cat&&CATS[cat]&&CATS[cat].sec==='business'&&cat!=='ads')return catTarget(cat,rows); // tax rows
  if(!cat)return ''; // unknown — the client picks (business rows are offered first)
  const def=BIZ_ROWS[CAT2BIZ[cat]||'other'];
  const hit=rows.business.find(n=>def.re.test(n));
  return 'business|'+(hit||def.name);
}
// Cards in this upload, for the "which card is the business card?" question
function cardList(){
  const c={};
  SI.txns.forEach(t=>{if(t.income||t.cat==='skip')return;const f=SI.files.find(x=>x.id===t.fileId)||{};
    const k=t.cardKey;c[k]=c[k]||{key:k,label:t.bank?'חשבון עו"ש'+(f.bankName?' · '+f.bankName:''):(f.source||'כרטיס')+(t.card?' · '+t.card:''),file:f.name,n:0,sum:0};
    c[k].n++;c[k].sum+=t.val;});
  return Object.values(c);
}

// ── Modal ──
function modal(){
  let o=document.getElementById('si-modal');
  if(!o){
    o=document.createElement('div');o.className='overlay';o.id='si-modal';o.style.display='none';
    o.innerHTML='<div class="modal" id="si-body" style="text-align:right;width:min(620px,96vw);max-width:none;max-height:90vh"></div>';
    o.addEventListener('click',e=>{if(e.target===o)SIX.close();});
    document.body.appendChild(o);
  }
  return o;
}
const BTN='font-family:var(--font);cursor:pointer;border-radius:9px;';
const LINK='background:none;border:none;color:var(--teal);font-family:var(--font);font-size:12.5px;cursor:pointer;padding:0;text-decoration:underline';
function render(){
  const body=document.getElementById('si-body');if(!body)return;
  if(SI.busy){body.innerHTML=`<h2>📄 קורא את הקובץ...</h2><p style="margin:0">רגע אחד — הקובץ נקרא כאן במכשיר שלך.</p>`;return;}
  if(!SI.files.length){body.innerHTML=uploadView();wireDrop();return;}
  body.innerHTML=reviewView();wireDrop();
}
function uploadView(){
  return `<h2>📄 מילוי הוצאות מקובץ</h2>
  <p style="margin-bottom:14px">במקום להקליד — מורידים מאתר חברת האשראי (או הבנק) את <b>פירוט החיובים של החודש</b> ומעלים כאן. אנחנו נמיין את ההוצאות לקטגוריות שלך ונמלא אותן.</p>
  ${dropZone(false)}
  <div style="font-size:12px;color:var(--t2);line-height:1.8;margin-top:12px">
    <div>📗 <b>אקסל עדיף</b> — באתר חברת האשראי: פירוט חיובים ← ייצוא לאקסל. גם PDF עובד.</div>
    <div>💳 יש כמה כרטיסים? אפשר לבחור כמה קבצים ביחד.</div>
    <div>🧠 <b>בפעם הראשונה</b> נבקש לשייך כמה בתי עסק שלא הכרנו — <b>אנחנו זוכרים</b>, ומהחודש הבא הם יזוהו לבד. כל חודש זה הולך ומתקצר.</div>
    <div>🔒 הקובץ נקרא רק במכשיר שלך ולא נשלח לשום מקום. נשמרים רק הסכומים לכל קטגוריה.</div>
  </div>
  <div class="modal-btns" style="margin-top:16px"><button class="btnsnap" style="flex:0 0 auto;padding:10px 18px;background:var(--s2);color:var(--t2);border:1px solid var(--border)" onclick="SIX.close()">ביטול</button></div>`;
}
function dropZone(small){
  return `<label id="si-drop" style="display:block;border:2px dashed var(--teal-border);border-radius:14px;padding:${small?'10px':'26px 14px'};text-align:center;cursor:pointer;background:rgba(66,235,214,.04)">
    <input type="file" multiple accept=".xlsx,.xls,.csv,.pdf,.html,.htm" style="display:none" onchange="SIX.add(this.files);this.value=''">
    ${small?'<span style="font-size:12.5px;color:var(--teal);font-weight:700">+ הוספת קובץ נוסף (כרטיס אחר)</span>'
      :'<div style="font-size:28px">📤</div><div style="font-size:14.5px;font-weight:800;color:var(--teal)">בחירת קובץ</div><div style="font-size:11.5px;color:var(--t3);margin-top:2px">או גרירה לכאן</div>'}
  </label>`;
}
function wireDrop(){
  const z=document.getElementById('si-drop');if(!z)return;
  z.ondragover=e=>{e.preventDefault();z.style.borderColor='var(--teal)';};
  z.ondragleave=()=>{z.style.borderColor='var(--teal-border)';};
  z.ondrop=e=>{e.preventDefault();SIX.add(e.dataTransfer.files);};
}
function targetLabel(t){return t==='skip'?'לא לספור':t.split('|')[1];}
function targetOptions(sel,rows,income){
  const opt=(v,l)=>`<option value="${h(v)}"${v===sel?' selected':''}>${h(l)}</option>`;
  const newOnes=[...new Set(SI.txns.map(t=>t.target).filter(t=>t&&t!=='skip'&&!(rows[t.split('|')[0]]||[]).includes(t.split('|')[1])))];
  let o=sel?'':'<option value="" selected>בחרו קטגוריה...</option>';
  if(income){ // money that came in → income rows only
    const grp=(sec,lbl)=>`<optgroup label="${lbl}">`+(rows[sec]||[]).map(n=>opt(sec+'|'+n,n)).join('')+newOnes.filter(t=>t.startsWith(sec+'|')).map(t=>opt(t,t.split('|')[1]+' (חדש)')).join('')+'</optgroup>';
    o+=grp('income','הכנסות')+(rows.bizIncome.length?grp('bizIncome','הכנסות העסק'):'');
    o+='<optgroup label="אחר">'+opt('skip','🚫 לא לספור (העברה בין חשבונות / משיכה מהשקעות)')+opt('__new_income','➕ שורת הכנסה חדשה...')+'</optgroup>';
    return o;
  }
  o+='<optgroup label="צרכים">'+rows.needs.map(n=>opt('needs|'+n,n)).join('')+newOnes.filter(t=>t.startsWith('needs|')).map(t=>opt(t,t.split('|')[1]+' (חדש)')).join('')+'</optgroup>';
  o+='<optgroup label="כיף">'+rows.wants.map(n=>opt('wants|'+n,n)).join('')+newOnes.filter(t=>t.startsWith('wants|')).map(t=>opt(t,t.split('|')[1]+' (חדש)')).join('')+'</optgroup>';
  if(selfEmployed())o+='<optgroup label="עסק">'+rows.business.map(n=>opt('business|'+n,n)).join('')+newOnes.filter(t=>t.startsWith('business|')).map(t=>opt(t,t.split('|')[1]+' (חדש)')).join('')+'</optgroup>';
  o+='<optgroup label="אחר">'+opt('skip','🚫 לא לספור (העברה / החזר)')+opt('__new_needs','➕ קטגוריה חדשה בצרכים...')+opt('__new_wants','➕ קטגוריה חדשה בכיף...')+'</optgroup>';
  return o;
}
// Group transactions by merchant inside a target, for compact lists
function byMerchant(list){
  const g={};
  list.forEach(t=>{const k=t.mk||t.merchant;(g[k]=g[k]||{mk:t.mk,name:t.merchant,n:0,sum:0,inst:false,fx:false,biz:t.biz,income:t.income,kind:t.kind}).n++;g[k].sum+=t.val;if(t.inst)g[k].inst=true;if(t.fx)g[k].fx=true;});
  return Object.values(g).sort((a,b)=>b.sum-a.sum);
}
function merchantLine(m,target,rows){
  const tags=(m.inst?' <span style="font-size:10.5px;color:var(--amber)">· תשלומים</span>':'')+(m.fx?' <span style="font-size:10.5px;color:var(--t3)">· חו"ל</span>':'');
  // Self-employed: one tap moves this merchant between personal and business (remembered)
  const bizBtn=selfEmployed()&&target!=='skip'?`<button onclick="SIX.flipBiz('${enc(m.mk)}')" title="העבר בין אישי לעסקי"
      style="${BTN}flex-shrink:0;font-size:11px;padding:3px 7px;border:1px solid ${m.biz?'rgba(167,139,250,.5)':'var(--border)'};background:${m.biz?'rgba(167,139,250,.14)':'transparent'};color:${m.biz?'#c4b5fd':'var(--t2)'}">${m.biz?'💼 עסקי':'👤 אישי'}</button>`:'';
  return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
    <div style="flex:1;min-width:0;font-size:12.5px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(m.name)}${m.n>1?` <span style="color:var(--t3)">×${m.n}</span>`:''}${tags}</div></div>
    <b style="font-size:12.5px;white-space:nowrap${m.income?';color:var(--teal)':''}">${m.income?'+'+money(-m.sum):money(m.sum)}</b>${bizBtn}
    <select onchange="SIX.assign('${enc(m.mk)}',this.value)" style="max-width:150px;background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--white);font-family:var(--font);font-size:11.5px;padding:4px">${targetOptions(target,rows,m.income)}</select>
  </div>`;
}
// Self-employed: which of the uploaded cards is a business card? Highlighted when there are
// 2+ cards and none is marked yet; remembered per card for next month.
function cardsBox(){
  if(!selfEmployed())return '';
  const cards=cardList();if(!cards.length)return '';
  const marked=cards.some(c=>SI.bizCards[c.key]);
  const ask=cards.length>1&&!marked;
  return `<div style="background:${ask?'rgba(167,139,250,.10)':'var(--s2)'};border:1px solid ${ask?'rgba(167,139,250,.45)':'var(--border)'};border-radius:12px;padding:10px 12px;margin:10px 0">
    <div style="font-size:13px;font-weight:800;color:#c4b5fd;margin-bottom:2px">💳 ${ask?'יש כאן כרטיס עסקי?':'כרטיס עסקי'}</div>
    <div style="font-size:11.5px;color:var(--t3);margin-bottom:6px">ההוצאות בכרטיס עסקי ייכנסו לחלק <b>"עסק"</b> (פרסום, תוכנות, רכב, ציוד...) ולא להוצאות הבית. נזכור את הבחירה לחודשים הבאים.</div>
    ${cards.map(c=>`<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12.5px;cursor:pointer">
      <input type="checkbox" ${SI.bizCards[c.key]?'checked':''} onchange="SIX.toggleCard('${enc(c.key)}',this.checked)">
      <span style="flex:1;min-width:0"><b>${h(c.label)}</b> <span style="color:var(--t3);font-size:11px">${h(c.file||'')}</span></span>
      <span style="white-space:nowrap;font-size:12px">${c.n} עסקאות · ${money(c.sum)}</span>
      <span style="font-size:11px;color:${SI.bizCards[c.key]?'#c4b5fd':'var(--t3)'};white-space:nowrap">${SI.bizCards[c.key]?'💼 עסקי':'👤 אישי'}</span>
    </label>`).join('')}
    <div style="font-size:11px;color:var(--t3);margin-top:4px">משהו סווג לא נכון? ליד כל בית עסק יש כפתור <b>👤 אישי / 💼 עסקי</b> להעברה.</div>
  </div>`;
}
// Months offered in the pickers: existing budget months + detected ones + a year around today
function monthKeys(extra){
  const keys=new Set(Object.keys(D.budgetMonths||{}));
  SI.files.forEach(f=>(f.months||[]).forEach(k=>keys.add(k)));
  const now=new Date();for(let i=-12;i<=1;i++)keys.add(mkKey(new Date(now.getFullYear(),now.getMonth()+i,1)));
  (extra||[]).forEach(k=>k&&keys.add(k));
  return [...keys].sort().reverse();
}
function monthOptions(sel,extra){
  return monthKeys([sel,...(extra||[])]).map(k=>`<option value="${k}"${k===sel?' selected':''}>${fmtBudgetMonth(k)}${D.budgetMonths[k]?'':' (חדש)'}</option>`).join('');
}
const txMonth=t=>t.month||SI.month; // undetected → the fallback month the client picks
function mkKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function reviewView(){
  const rows=monthRows();
  const files=SI.files.map(f=>{
    let st='',col='var(--t2)';
    const noText=f.pdfLines&&!f.pdfLines.some(l=>l.items.length);
    if(f.error){st='לא הצלחנו לפתוח את הקובץ';col='#fca5a5';}
    else if(f.needPassword)st='';
    else if(noText){st='ה־PDF הזה הוא תמונה (סרוק) — אין בו טקסט שאפשר לקרוא';col='#fca5a5';}
    else if(!f.txns.length&&f.tables.length){st='הקובץ נפתח, אבל לא הצלחנו לזהות בו את טבלת העסקאות';col='#fca5a5';}
    else if(!f.txns.length){st=f.kind==='pdf'?'הקובץ נפתח, אבל לא מצאנו בו שורות עסקה (תאריך + בית עסק + סכום)':'לא מצאנו בקובץ טבלת עסקאות';col='#fca5a5';}
    else if(f.dupNow){st='אותו פירוט כבר נבחר כאן (אולי באקסל ובפורמט PDF) — לא ייספר פעמיים';col='var(--amber)';}
    else if(f.dup){st='הפירוט הזה כבר נטען בעבר — לא ייספר שוב';col='var(--amber)';}
    else{
      st=`${f.txns.length} עסקאות · ${f.source==='דף בנק'?'יצא מהחשבון ':''}${money(f.spent)}${f.check==='ok'?' · <span style="color:var(--green)">✓ תואם לסה"כ בקובץ</span>':f.check==='diff'?' · <span style="color:var(--amber)">⚠ לא תואם לסה"כ בקובץ — כדאי להציץ</span>':''}`;
      // Which month(s) this file goes to — detected automatically, the client can override
      const ms=f.months||[];
      const lbl=f.monthOverride?'':ms.length>1?`${ms.length} חודשים (${fmtBudgetMonth(ms[0])} – ${fmtBudgetMonth(ms[ms.length-1])}) — כל עסקה לחודש החיוב שלה`:ms.length?fmtBudgetMonth(ms[0]):'';
      st+=`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:3px">📅 <span>${ms.length&&!f.monthOverride?'חודש חיוב: ':'לחודש: '}</span>
        <select onchange="SIX.fileMonth(${f.id},this.value)" style="background:var(--s1);border:1px solid var(--border);border-radius:6px;color:var(--teal);font-family:var(--font);font-size:11.5px;font-weight:700;padding:2px 4px">
          ${ms.length||f.monthOverride?`<option value="">${lbl?'אוטומטי: '+h(lbl):'אוטומטי'}</option>`:'<option value="">לא זוהה — לפי החודש למטה</option>'}
          ${monthKeys().map(k=>`<option value="${k}"${k===f.monthOverride?' selected':''}>${fmtBudgetMonth(k)}</option>`).join('')}
        </select></div>`;
    }
    const pw=f.needPassword?`<div style="display:flex;gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap"><span style="font-size:12px">🔐 הקובץ נעול בסיסמה${f.pwWrong?' <span style="color:#fca5a5">(שגויה)</span>':''} — בד"כ תעודת הזהות:</span><input type="password" id="si-pw-${f.id}" style="background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--white);padding:5px 8px;width:130px"><button onclick="SIX.unlock(${f.id})" style="${BTN}background:var(--teal);color:#080c14;border:none;padding:5px 12px;font-weight:700">פתח</button></div>`:'';
    const help=(f.error||(!f.needPassword&&!f.txns.length))?`<div style="font-size:11.5px;color:var(--t3);margin-top:3px">נסו להוריד את הפירוט בפורמט <b>אקסל</b>, או לחצו למטה על "משהו לא נראה נכון?" ושלחו ליועץ את שלד המבנה.${f.error?`<div style="direction:ltr;text-align:left;font-size:10.5px;opacity:.8">${h(f.error)}</div>`:''}</div>`:'';
    const again=f.dup&&!f.dupNow?` <button style="${LINK}" onclick="SIX.useDup(${f.id})">טען בכל זאת</button>`:'';
    return `<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:var(--s2);border:1px solid var(--border);border-radius:10px;margin-bottom:6px">
      <div style="font-size:18px">${f.kind==='pdf'?'📕':'📗'}</div>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(f.source?f.source+' · ':'')}${h(f.name)}</div>
        <div style="font-size:11.5px;color:${col}">${st}${again}</div>${pw}${help}</div>
      <button onclick="SIX.remove(${f.id})" title="הסר" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:16px">×</button>
    </div>`;
  }).join('');
  if(!SI.txns.length){
    return `<h2>📄 מילוי הוצאות מקובץ</h2>${files}${dropZone(true)}${techView()}
      <div class="modal-btns"><button class="btnsnap" style="background:var(--s2);color:var(--t2);border:1px solid var(--border)" onclick="SIX.close()">סגירה</button></div>`;
  }
  const counted=SI.txns.filter(t=>t.target&&t.target!=='skip');
  const unassigned=SI.txns.filter(t=>!t.target);
  const skipped=SI.txns.filter(t=>t.target==='skip');
  const live=counted.concat(unassigned);
  const total=live.filter(t=>!t.income).reduce((a,t)=>a+t.val,0);      // money out
  const incTotal=-live.filter(t=>t.income).reduce((a,t)=>a+t.val,0);   // money in
  // Months breakdown — every transaction goes to its billing month
  const byMonth={};live.forEach(t=>{const k=txMonth(t);const b=byMonth[k]=byMonth[k]||{n:0,sum:0,inc:0};b.n++;if(t.income)b.inc-=t.val;else b.sum+=t.val;});
  const mKeys=Object.keys(byMonth).sort();
  const oneMonth=mKeys.length===1?mKeys[0]:'';
  const m=oneMonth?D.budgetMonths[oneMonth]:null; // "existing amount" hints only make sense for one month
  const undetected=SI.txns.filter(t=>!t.month&&t.target!=='skip').length;
  const monthsBox=`<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:8px 10px;margin:6px 0 10px">
      <div style="font-size:12.5px;font-weight:800;margin-bottom:4px">📅 ${mKeys.length>1?`ההוצאות יתחלקו ל־${mKeys.length} חודשים`:'החודש שיתמלא'} <span style="font-weight:400;color:var(--t3);font-size:11px">· לפי מועד החיוב (מתי שהכסף ירד מהחשבון)</span></div>
      ${mKeys.map(k=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:2px 0"><span>${fmtBudgetMonth(k)}${D.budgetMonths[k]?'':' <span style="font-size:10.5px;color:var(--teal)">(חודש חדש)</span>'}</span><span>${byMonth[k].n} עסקאות · <b>${money(byMonth[k].sum)}</b>${byMonth[k].inc?` · <span style="color:var(--teal)">+${money(byMonth[k].inc)}</span>`:''}</span></div>`).join('')}
      ${undetected?`<div style="font-size:11.5px;color:var(--amber);margin-top:4px">לא זיהינו את חודש החיוב של ${undetected} עסקאות — הן ייכנסו ל:
        <select onchange="SIX.setMonth(this.value)" style="background:var(--s1);border:1px solid var(--border);border-radius:6px;color:var(--teal);font-family:var(--font);font-size:11.5px;font-weight:700;padding:2px 4px">${monthOptions(SI.month)}</select></div>`:''}
    </div>`;
  // Memory: merchants recognised from the client's own earlier choices — show it, so they see
  // the assigning really is a one-time job and gets shorter every month
  const remembered=new Set(SI.txns.filter(t=>t.how==='learned').map(t=>t.mk)).size;
  const memNote=remembered?`<div style="font-size:12px;color:var(--green);margin:8px 0 0">🧠 ${remembered} בתי עסק זוהו לפי מה ששייכת בפעמים הקודמות</div>`:'';
  // Unassigned block
  const firstTime=!Object.keys(D.importMerchants||{}).length;
  const unk=unassigned.length?`<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.35);border-radius:12px;padding:10px 12px;margin:12px 0">
      <div style="font-size:13.5px;font-weight:800;color:var(--amber);margin-bottom:2px">🟠 ${firstTime?'':'בתי עסק חדשים: '}לא זיהינו ${byMerchant(unassigned).length} בתי עסק — לאן לשייך?</div>
      <div style="font-size:12px;color:var(--t2);margin-bottom:6px;line-height:1.6">🧠 <b>משייכים רק פעם אחת.</b> אנחנו זוכרים את הבחירה — ובחודשים הבאים בית העסק הזה יזוהה לבד${firstTime?'. בהתחלה יש יותר כאלה, וכל חודש זה מתקצר.':'.'}</div>
      ${byMerchant(unassigned).map(x=>merchantLine(x,'',rows)).join('')}
    </div>`:(SI.txns.length?`<div style="font-size:12.5px;color:var(--green);margin:12px 0">✓ כל בתי העסק משויכים — אין מה לשייך</div>`:'');
  // Totals per target, grouped
  const tg={};counted.forEach(t=>{(tg[t.target]=tg[t.target]||[]).push(t);});
  const anyExisting=counted.some(t=>{const mm=D.budgetMonths[txMonth(t)];const [sec,name]=t.target.split('|');return mm&&(mm[sec]||[]).some(r=>(r.name||'').trim()===name&&num(r.amount));});
  const secBlock=(sec,lbl,color)=>{
    const inc=sec==='income'||sec==='bizIncome',sg=inc?-1:1; // income is stored negative (money in)
    const ks=Object.keys(tg).filter(k=>k.startsWith(sec+'|')).sort((a,b)=>sg*(tg[b].reduce((s,t)=>s+t.val,0)-tg[a].reduce((s,t)=>s+t.val,0)));
    if(!ks.length)return '';
    const secSum=sg*ks.reduce((s,k)=>s+tg[k].reduce((a,t)=>a+t.val,0),0);
    return `<div style="font-size:12.5px;font-weight:800;color:${color};margin:12px 0 4px">${lbl} · ${money(secSum)}</div>`+ks.map(k=>{
      const name=k.split('|')[1],sum=sg*tg[k].reduce((a,t)=>a+t.val,0);
      const isNew=!(rows[sec]||[]).includes(name);
      const ex=m&&(m[sec]||[]).find(r=>(r.name||'').trim()===name);
      const exAmt=ex?num(ex.amount):0;
      const after=SI.mode==='add'&&exAmt?`<span style="font-size:11px;color:var(--t3)">${money(exAmt)} + </span>`:'';
      const open=SI.open[k];
      return `<div style="border-bottom:1px solid var(--border)">
        <div onclick="SIX.toggle('${enc(k)}')" style="display:flex;align-items:center;gap:8px;padding:8px 2px;cursor:pointer">
          <span style="font-size:10px;color:var(--t3);width:10px">${open?'▼':'◀'}</span>
          <span style="flex:1;font-size:13px">${h(name)}${isNew?' <span style="font-size:10.5px;background:rgba(66,235,214,.12);color:var(--teal);border-radius:10px;padding:1px 7px">שורה חדשה</span>':''} <span style="font-size:11px;color:var(--t3)">(${tg[k].length})</span></span>
          <span style="white-space:nowrap">${after}<b style="font-size:13.5px;color:${color}">${money(sum)}</b></span>
        </div>
        ${open?`<div style="padding:0 18px 6px 0">${byMerchant(tg[k]).map(x=>merchantLine(x,k,rows)).join('')}</div>`:''}
      </div>`;
    }).join('');
  };
  // Not counted in the budget, grouped by why: card bills (their detail comes from the card
  // statement), investments, transfers between the client's own accounts, anything else
  const KIND_LBL={card:'💳 תשלומי כרטיס אשראי מהבנק (הפירוט מגיע מקובץ הכרטיס)',invest:'📈 השקעות בשוק ההון (קנייה / מכירה של ני"ע)',own:'🔁 העברות בין החשבונות שלך',other:'🚫 לא נספר'};
  const kindOf=t=>t.kind==='card'||t.kind==='invest'||t.kind==='own'?t.kind:'other';
  const skipGroups=['invest','card','own','other'].map(kd=>{
    const list=skipped.filter(t=>kindOf(t)===kd);if(!list.length)return '';
    const out=list.filter(t=>!t.income).reduce((a,t)=>a+t.val,0),inn=-list.filter(t=>t.income).reduce((a,t)=>a+t.val,0);
    return `<div style="margin-top:6px"><div style="font-size:12px;color:var(--t2);font-weight:700">${KIND_LBL[kd]} · ${out?money(out)+' יצא':''}${out&&inn?' · ':''}${inn?'<span style="color:var(--teal)">'+money(inn)+' נכנס</span>':''}</div>
      ${SI.showSkip?byMerchant(list).map(x=>merchantLine(x,'skip',rows)).join(''):''}</div>`;
  }).join('');
  const skipBlock=skipped.length?`<div style="margin-top:12px;font-size:12px;color:var(--t3);background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:8px 10px">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="color:var(--t2)">לא נספר בתקציב (${skipped.length})</b><button style="${LINK}" onclick="SIX.toggleSkip()">${SI.showSkip?'הסתר פירוט':'הצג פירוט'}</button></div>
      ${skipGroups}
    </div>`:'';
  const modeBox=anyExisting?`<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:8px 10px;margin-top:12px;font-size:12.5px">
      ${oneMonth?'בחודש הזה':'בחלק מהחודשים'} כבר יש סכומים בחלק מהקטגוריות:
      <label style="margin-inline-start:8px;cursor:pointer"><input type="radio" name="si-mode" ${SI.mode==='add'?'checked':''} onchange="SIX.setMode('add')"> להוסיף להם</label>
      <label style="margin-inline-start:8px;cursor:pointer"><input type="radio" name="si-mode" ${SI.mode==='replace'?'checked':''} onchange="SIX.setMode('replace')"> להחליף אותם</label>
      <div style="font-size:11px;color:var(--t3);margin-top:2px">"להוסיף" — כשמעלים כרטיס נוסף. "להחליף" — כשהקלדתם קודם הערכה ועכשיו יש את הנתון האמיתי.</div>
    </div>`:'';
  return `<h2>✓ מצאנו ${SI.txns.length} תנועות</h2>
    <div style="font-size:13px;margin:-2px 0 6px">הוצאות <b>${money(total)}</b>${incTotal?` · הכנסות <b style="color:var(--teal)">${money(incTotal)}</b>`:''}</div>
    ${monthsBox}
    ${files}${dropZone(true)}
    ${cardsBox()}${memNote}${unk}
    <div style="font-size:13.5px;font-weight:800;margin-top:14px">כך זה ייכנס לתקציב${oneMonth?'':' <span style="font-weight:400;font-size:11.5px;color:var(--t3)">(סה"כ לכל החודשים — כל חודש יקבל את החלק שלו)</span>'}</div>
    <div style="font-size:11.5px;color:var(--t3)">לחיצה על קטגוריה מציגה את בתי העסק — ואפשר להעביר כל אחד לקטגוריה אחרת.</div>
    ${secBlock('income','💰 הכנסות','var(--teal)')}${secBlock('bizIncome','💼 הכנסות העסק','var(--teal)')}
    ${secBlock('needs','🏠 צרכים','var(--green)')}${secBlock('wants','🎉 כיף','var(--amber)')}${secBlock('business','💼 עסק','#c4b5fd')}
    ${skipBlock}${modeBox}${techView()}
    <div class="modal-btns" style="margin-top:16px">
      <button class="btnsnap primary" style="flex:1" onclick="SIX.apply()">מלא את ההוצאות ✓</button>
      <button class="btnsnap" style="flex:0 0 auto;padding:12px 18px;background:var(--s2);color:var(--t2);border:1px solid var(--border)" onclick="SIX.close()">ביטול</button>
    </div>`;
}
// Hidden "something looks wrong?" area: manual column mapping + masked structure for the advisor
function techView(){
  const sheets=SI.files.filter(f=>f.tables&&f.tables.length);
  return `<div style="margin-top:12px;font-size:11.5px;color:var(--t3)"><button style="${LINK};color:var(--t3)" onclick="SIX.toggleTech()">משהו לא נראה נכון?</button></div>
  ${SI.showTech?`<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:10px;margin-top:6px;font-size:12px">
    ${sheets.map(f=>f.tables.map((t,ti)=>`<div style="margin-bottom:8px"><b>${h(f.name)}</b> · ${h(t.where)} · ${t.rows.length} שורות
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;margin-top:4px">${ROLES.map(([role,lbl])=>`<label style="font-size:10.5px;color:var(--t3)">${lbl}<select onchange="SIX.map(${f.id},${ti},'${role}',this.value)" style="width:100%;background:var(--s1);border:1px solid var(--border);border-radius:6px;color:var(--white);font-size:11px;padding:3px"><option value="-1">—</option>${t.headers.map((x,i)=>`<option value="${i}"${t.map[role]===i?' selected':''}>${h(x||'עמודה '+(i+1))}</option>`).join('')}</select></label>`).join('')}</div>
      ${f.kind==='pdf'?`<label style="display:block;margin-top:4px"><input type="checkbox" ${f.pdfReverse?'checked':''} onchange="SIX.rev(${f.id},this.checked)"> הפוך עברית</label>`:''}</div>`).join('')).join('')}
    <div>לא מסתדר? <button style="${LINK}" onclick="SIX.skeleton()">העתק "שלד מבנה" ושלחו ליועץ</button> — בלי שמות ובלי סכומים, רק מבנה הקובץ.</div>
  </div>`:''}`;
}

// Masked structure (names → "אאא", numbers → "999") so the advisor can see the layout, not the data
const KEEP=new Set(['תאריך','עסקה','העסקה','רכישה','חיוב','החיוב','סכום','שם','בית','העסק','עסק','מטבע','ענף','קטגוריה','הערות','פירוט','נוסף','סוג','סה"כ','ש"ח','₪','$','€','תשלום','תשלומים','מתוך','רגילה','הוראת','קבע','זיכוי','כרטיס','מקס','כאל','ישראכרט','אמריקן','אקספרס','דיינרס','לאומי','קארד','ויזה','חו"ל','מט"ח','עסקאות','במועד','מקורי','מקור','לחיוב','שובר','מספר','ספרות','אחרונות','חובה','זכות','יתרה','תיאור','אסמכתא','פרטים','ILS','USD','EUR','NIS','בש"ח','ספק','מועד','לתשלום']);
function mask(v){
  if(v instanceof Date)return 'DATE';
  if(typeof v==='number')return 'NUM('+String(v).replace(/\d/g,'9')+')';
  return String(v??'').split(/(\s+)/).map(w=>(!w.trim()||KEEP.has(w)||KEEP.has(w.replace(/[:.,]$/,'')))?w:w.replace(/[א-ת]/g,'א').replace(/[a-z]/gi,'a').replace(/\d/g,'9')).join('');
}
function skeleton(){
  const out=['STATEMENT SKELETON v1 — values masked',''];
  SI.files.forEach((f,fi)=>{
    out.push(`### FILE ${fi+1}: ${f.kind} ${(f.name.match(/\.\w+$/)||[''])[0]} source=${f.source||'?'} tables=${f.tables.length} txns=${(f.txns||[]).length}${f.error?' ERROR='+f.error:''}${f.needPassword?' LOCKED':''}`);
    (f.sheets||[]).forEach(sh=>{
      out.push(`-- sheet "${mask(sh.name)}" rows=${sh.rows.length}`);
      let shown=0,after=0;
      sh.rows.forEach((r,i)=>{
        if(headerScore(r)){out.push(`[${i}] HEADER | `+r.join(' | '));after=4;return;}
        if(after>0){out.push(`[${i}] `+r.map(c=>typeof c+':'+mask(c)).join(' | '));after--;return;}
        if(shown<12&&r.some(c=>String(c).trim())){out.push(`[${i}] `+r.map(mask).join(' | '));shown++;}
        else if(TOTAL_RE.test(r.join(' ')))out.push(`[${i}] TOTAL | `+r.map(mask).join(' | '));
      });
    });
    if(f.pdfLines){
      out.push(`-- pdf pages=${f.pdfPages} lines=${f.pdfLines.length} reverse=${!!f.pdfReverse}`);
      let after=0,shown=0;
      f.pdfLines.forEach((l,i)=>{
        const cells=l.items.map(it=>f.pdfReverse?revHeb(it.s):it.s),isH=headerScore(cells)>0;
        const pos=l.items.map((it,k)=>Math.round(it.x)+':'+(isH?cells[k]:mask(cells[k]))).join(' | ');
        if(isH){out.push(`[p${l.page} L${i}] HEADER | ${pos}`);after=6;return;}
        if(after>0){out.push(`[p${l.page} L${i}] ${pos}`);after--;return;}
        if(shown<15){out.push(`[p${l.page} L${i}] ${pos}`);shown++;}
        else if(TOTAL_RE.test(cells.join(' ')))out.push(`[p${l.page} L${i}] TOTAL | ${pos}`);
      });
    }
    out.push('');
  });
  return out.join('\n');
}

// ── Saved per month (for the budget page) ──
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const r2=n=>Math.round(n*100)/100;
function srcLabel(t){const f=SI.files.find(x=>x.id===t.fileId)||{};
  return t.bank?('עו"ש'+(f.bankName?' '+f.bankName:'')):((f.source||'כרטיס')+(t.card?' '+t.card:''));}
// Bank file → per month: opening / closing balance, money in / out, and what left the account
// outside the budget (card bills, investments, own transfers). Rows are put in time order using
// the file's own order for same-day rows (bank exports are newest-first or oldest-first).
function bankStats(){
  const out={};
  SI.files.filter(f=>f.source==='דף בנק'&&!f.dup&&f.txns&&f.txns.length).forEach(f=>{
    const tx=f.txns.slice();
    const desc=tx.length>1&&tx[0].date>tx[tx.length-1].date;
    tx.sort((a,b)=>(a.date-b.date)||(desc?b.ri-a.ri:a.ri-b.ri));
    const by={};tx.forEach(t=>{(by[mkKey(t.date)]=by[mkKey(t.date)]||[]).push(t);});
    Object.entries(by).forEach(([k,list])=>{
      const first=list[0],last=list[list.length-1];
      const sum=fn=>r2(list.filter(fn).reduce((a,t)=>a+t.val,0));
      out[k]={src:f.bankName||'עו"ש',
        opening:first.balance!=null?r2(first.balance+first.val):null, // balance before the first row
        closing:last.balance!=null?r2(last.balance):null,
        inn:-sum(t=>t.income),out:sum(t=>!t.income),
        invest:sum(t=>t.kind==='invest'),own:sum(t=>t.kind==='own'),
        cards:list.filter(t=>t.kind==='card').map(t=>({d:ymd(t.date),a:r2(t.val),iss:issuerOf(t.merchant),ref:t.ref||''})),
        from:ymd(first.date),to:ymd(last.date),at:new Date().toISOString()};
    });
  });
  return out;
}
// Card statements → per month: each charge (a section closed by a total line, or the whole
// statement) with its date — to match against the card bills seen in the bank account
function cardSegs(){
  const out={};
  SI.files.filter(f=>f.source!=='דף בנק'&&!f.dup&&f.txns&&f.txns.length).forEach(f=>{
    const g={};
    f.txns.forEach(t=>{const k=t.month+'|'+(t.seg!==undefined&&f.segDates&&f.segDates[t.seg]?t.seg:'all');
      (g[k]=g[k]||{month:t.month,seg:t.seg,sum:0,card:t.card}).sum+=t.val;});
    Object.values(g).forEach(s=>{if(!s.month)return;
      const d=s.seg!==undefined&&f.segDates&&f.segDates[s.seg]?ymd(f.segDates[s.seg]):'';
      (out[s.month]=out[s.month]||[]).push({d,a:r2(s.sum),iss:f.source||'',card:s.card||'',fp:f.fp});});
  });
  return out;
}
// ── Public handlers ──
window.SIX={
  open(){
    if(typeof D!=='object'||!D)return;
    // Admin-only while it's being tested (the button is hidden for everyone else too)
    if(typeof auth==='undefined'||!auth.currentUser||auth.currentUser.email!==ADMIN_EMAIL)return;
    migrateBudget();
    SI.files=[];SI.txns=[];SI.session={};SI.open={};SI.showSkip=false;SI.showTech=false;SI.mode='add';
    SI.bizSession={};SI.bizCards=Object.assign({},D.importBizCards||{}); // remembered business cards
    SI.month=D.budgetCurMonth;
    modal().style.display='flex';render();
  },
  close(){const o=document.getElementById('si-modal');if(o)o.style.display='none';SI.files=[];SI.txns=[];},
  async add(list){
    list=[...(list||[])];if(!list.length)return;
    const first=!SI.files.length;
    SI.busy=true;render();
    for(const f of list)SI.files.push(await readFile(f));
    SI.busy=false;
    // First upload: if the file is clearly about a month that doesn't match the open one, still keep
    // the open month (that's what the client is working on) — the selector shows the alternatives.
    if(first)SI.month=D.budgetCurMonth;
    rebuild();render();
  },
  remove(id){SI.files=SI.files.filter(f=>f.id!==id);rebuild();render();},
  async unlock(id){
    const f=SI.files.find(x=>x.id===id);const el=document.getElementById('si-pw-'+id);
    if(!f||!el)return;
    try{await readPdf(f,el.value);}catch(e){f.error=e.message;}
    rebuild();render();
  },
  useDup(id){const f=SI.files.find(x=>x.id===id);if(f)f.useDup=true;rebuild();render();},
  assign(mkEnc,val){
    const mk=decodeURIComponent(mkEnc);
    if(val==='__new_needs'||val==='__new_wants'||val==='__new_income'){
      const name=(prompt(val==='__new_income'?'שם שורת ההכנסה החדשה:':'שם הקטגוריה החדשה:')||'').trim();
      if(!name){render();return;}
      val=({__new_needs:'needs',__new_wants:'wants',__new_income:'income'})[val]+'|'+name;
    }
    SI.session[mk]=val==='skip'?'skip':(val?{sec:val.split('|')[0],name:val.split('|')[1]}:undefined);
    if(!val)delete SI.session[mk];
    // picking a business row = this merchant is business; a home row = personal
    if(selfEmployed()&&val&&val!=='skip')SI.bizSession[mk]=val.startsWith('business|');
    rebuild();render();
  },
  toggleCard(keyEnc,on){SI.bizCards[decodeURIComponent(keyEnc)]=!!on;rebuild();render();},
  flipBiz(mkEnc){
    const mk=decodeURIComponent(mkEnc);
    const t=SI.txns.find(x=>x.mk===mk);if(!t)return;
    SI.bizSession[mk]=!t.biz;
    delete SI.session[mk]; // the category is re-mapped on the new side
    rebuild();render();
  },
  toggle(kEnc){const k=decodeURIComponent(kEnc);SI.open[k]=!SI.open[k];render();},
  toggleSkip(){SI.showSkip=!SI.showSkip;render();},
  toggleTech(){SI.showTech=!SI.showTech;render();},
  setMonth(k){SI.month=k;rebuild();render();},
  fileMonth(id,k){const f=SI.files.find(x=>x.id===id);if(f)f.monthOverride=k||'';rebuild();render();},
  setMode(m){SI.mode=m;render();},
  map(id,ti,role,v){
    const t=SI.files.find(f=>f.id===id).tables[ti];v=+v;
    for(const r in t.map)if(t.map[r]===v&&r!==role)delete t.map[r];
    if(v<0)delete t.map[role];else t.map[role]=v;
    rebuild();render();
  },
  rev(id,v){const f=SI.files.find(x=>x.id===id);f.pdfReverse=v;pdfToTables(f);rebuild();render();},
  async skeleton(){
    const txt=skeleton();
    try{await navigator.clipboard.writeText(txt);showToast('שלד המבנה הועתק ✓ — הדביקו בהודעה ליועץ');}
    catch(e){prompt('העתיקו את הטקסט:',txt);}
  },
  apply(){
    const unassigned=SI.txns.filter(t=>!t.target);
    if(unassigned.length){
      const s=unassigned.reduce((a,t)=>a+t.val,0);
      if(!confirm(`${byMerchant(unassigned).length} בתי עסק (${money(Math.abs(s))}) עדיין לא שויכו.\n\nלהכניס אותם לשורה "שונות" (הוצאות עסקיות — ל"הוצאות עסק שונות", הכנסות — ל"הכנסות אחרות")?\n(ביטול = לחזור ולשייך)`))return;
      unassigned.forEach(t=>t.target=t.income?'income|הכנסות אחרות':t.biz?'business|'+BIZ_ROWS.other.name:'needs|שונות');
    }
    const bankMonths=bankStats(),segMonths=cardSegs();
    // Sum per month → per budget row; every transaction goes to its billing month
    const byMonth={};
    SI.txns.forEach(t=>{if(!t.target||t.target==='skip')return;const k=txMonth(t);
      const s=byMonth[k]=byMonth[k]||{};s[t.target]=(s[t.target]||0)+t.val;});
    const keys=[...new Set([...Object.keys(byMonth),...Object.keys(bankMonths)])].sort();
    let rowsFilled=0;
    // New months are created in order, so each inherits the category names of the one before
    keys.forEach(key=>{
      if(!D.budgetMonths[key])D.budgetMonths[key]=newBudgetMonthTemplate();
      const m=D.budgetMonths[key];
      if(!Array.isArray(m.tx))m.tx=[];
      Object.entries(byMonth[key]||{}).forEach(([k,sum])=>{
        const [sec,name]=k.split('|');
        if(!Array.isArray(m[sec]))m[sec]=[];
        let row=m[sec].find(r=>(r.name||'').trim()===name);
        if(!row){row={name,amount:''};m[sec].push(row);}
        const inc=sec==='income'||sec==='bizIncome';
        if(SI.mode!=='add')m.tx=m.tx.filter(x=>x.k!==k); // replacing the row → replace its detail too
        const base=SI.mode==='add'?num(row.amount):0;
        row.amount=String(Math.max(0,Math.round(base+(inc?-sum:sum))));
        rowsFilled++;
      });
      // The transactions behind every row — so the client can open a category and see / fix them
      SI.txns.forEach(t=>{if(!t.target||t.target==='skip'||txMonth(t)!==key)return;
        m.tx.push({id:t.key+':'+Date.now().toString(36),d:ymd(t.date),n:String(t.merchant).slice(0,60),
          a:Math.round((t.income?-t.val:t.val)*100)/100,k:t.target,s:srcLabel(t)});});
      // Bank account: balances + what left it outside the budget (card bills, investments, own transfers)
      if(bankMonths[key])m.bank=Object.assign({},m.bank||{},bankMonths[key]);
      if(segMonths[key]){m.cardSegs=(m.cardSegs||[]).concat(segMonths[key]);}
      // Remember the file on every month it filled (fingerprint only — no merchant data),
      // so it's never counted twice
      if(!Array.isArray(m.imports))m.imports=[];
      SI.files.filter(f=>!f.dup&&f.txns&&f.txns.some(t=>txMonth(t)===key)).forEach(f=>m.imports.push({fp:f.fp,n:f.txns.length,source:f.source||'',at:new Date().toISOString()}));
    });
    const key=keys[keys.length-1]||SI.month;
    // Remember the client's own assignments (merchant → category) for next month
    const learnedNow=new Set([...Object.keys(SI.session),...Object.keys(SI.bizSession)]).size;
    if(Object.keys(SI.session).length)D.importMerchants=Object.assign(D.importMerchants||{},SI.session);
    // personal/business per merchant, and which cards are business cards (only cards seen now)
    if(Object.keys(SI.bizSession).length)D.importMerchantBiz=Object.assign(D.importMerchantBiz||{},SI.bizSession);
    if(selfEmployed()){
      const bc=Object.assign({},D.importBizCards||{});
      cardList().forEach(c=>{if(c.key.startsWith('file|'))return;if(SI.bizCards[c.key])bc[c.key]=true;else delete bc[c.key];});
      D.importBizCards=bc;
    }
    const n=SI.txns.filter(t=>t.target!=='skip').length;
    D.budgetCurMonth=key;
    touchSection('budget');markDirty();
    SIX.close();
    renderBudget();
    showToast((keys.length>1?`מולאו ${keys.length} חודשים (${fmtBudgetMonth(keys[0])} – ${fmtBudgetMonth(keys[keys.length-1])}) מ־${n} עסקאות ✓`:`מולאו ${rowsFilled} קטגוריות מ־${n} עסקאות ב${fmtBudgetMonth(key)} ✓`)+(learnedNow?` · 🧠 זכרנו ${learnedNow} בתי עסק — בפעם הבאה הם יזוהו לבד`:' אפשר לתקן כל סכום ידנית'));
  }
};
window.openStatementImport=()=>SIX.open();
// test hook (local only): expose internals for automated checks
window.__SI=SI;
})();
