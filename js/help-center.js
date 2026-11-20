// ══ HELP CENTER ("? עזרה") — beta (isBeta in core.js) ══
// A help button in the corner that opens a side panel, like the help widget in Wix:
//  • a search box over short help articles (no AI, works offline; the text lives here, in HC_ARTICLES)
//  • "for this page": the articles of the tab the client is on (follows the tab while open)
//  • topics, article view with "open the tab", related articles and "did this help? 👍 👎"
//  • "didn't find it?" → a message to Tom (lands in the admin feedback inbox, D.feedback),
//    and the help bot when it's on (help-bot.js)
// Keep in step with docs/help-bot-knowledge.md when something in the system changes.
const HC_FOR_ALL=false; // true = every signed-in client (Tom decides)
let _hc={open:false,view:'home',id:'',cat:'',q:'',back:[],voted:{}};

const HC_TABS={general:'כללי',dash:'בית',budget:'התנהלות חודשית',goals:'מטרות',pension:'פנסיה',portfolio:'תיק השקעות',
  nw:'שווי נטו',history:'היסטוריה',notes:'הערות',links:'כלים',settings:'הגדרות'};
const HC_CATS=[
  ['start','🚀','צעדים ראשונים'],['budget','💵','התנהלות חודשית'],['import','📄','העלאת קבצים'],
  ['goals','🎯','מטרות'],['pension','🏦','פנסיה והשקעות'],['nw','📊','שווי נטו'],['concepts','📚','מושגים בכסף'],
  ['account','⚙️','חשבון והגדרות']];
const HC_POPULAR=['import-file','import-where','import-image','budget-basics','budget-currency','nw-low','forgot-password'];
// Clips from Tom's system webinar (6.10.2026), in videos/<id>.mp4 — article id → length.
// Only parts that are still true of the system; the design in them is a bit older.
const HC_VIDEOS={'dash-tiles':'1:47','budget-basics':'2:20','budget-copy':'0:35','budget-charts':'0:44',
  'goals-saved':'4:17','goals-basics':'3:43','c-emergency':'2:01','portfolio-basics':'3:22','portfolio-invest':'3:03',
  'pension-update':'3:13','pension-fees':'0:54','c-hishtalmut':'1:25','nw-basics':'3:00','nw-periods':'1:01'};
const HC_VIDEO_V=1;

// tab = where it belongs ("for this page"), go = the tab the "open" button leads to
const HC_ARTICLES=[
  // ── צעדים ראשונים ──
  {id:'what-is',cat:'start',tab:'general',go:'dash',t:'מה יש במערכת ואיך מתחילים',k:'התחלה טאבים תפריט מבנה',b:`
    <p>המערכת מרכזת את כל התמונה הכלכלית שלכם במקום אחד. בתפריט:</p>
    <ul><li><b>בית</b>: סיכום של הכל, ו"מה באת לעשות היום?".</li>
    <li><b>התנהלות חודשית</b>: הכנסות והוצאות של כל חודש.</li>
    <li><b>מטרות</b>: על מה חוסכים ולאן הולך הכסף.</li>
    <li><b>פנסיה</b>, <b>תיק השקעות</b> ו<b>שווי נטו</b>: התמונה לטווח הארוך.</li>
    <li><b>כלים</b>: מחשבונים וסיכומי המפגשים.</li></ul>
    <p>הכי קל להתחיל מ<b>התנהלות חודשית</b>: מעלים קובץ אשראי, והמערכת ממלאת את ההוצאות לבד.</p>`},
  {id:'autosave',cat:'start',tab:'general',t:'צריך לשמור? איפה הנתונים נשמרים',k:'שמירה שמור ענן נשמר אבד נמחק',b:`
    <p>לא צריך ללחוץ "שמור". כל שינוי נשמר <b>אוטומטית בענן</b> כמה שניות אחרי שמפסיקים להקליד, ומופיעה הודעה קטנה "נשמר בענן ☁️".</p>
    <p>הנתונים שמורים בחשבון שלכם, אז אפשר להיכנס מכל מחשב או טלפון ולראות אותם.</p>`},
  {id:'today-board',cat:'start',tab:'dash',go:'dash',t:'"מה באת לעשות היום?"',k:'לוח היום מסלול עדכון חודשי חצי שנתי',b:`
    <p>בראש עמוד הבית יש לוח עם שני מסלולים:</p>
    <ul><li><b>עדכון חודשי</b>: מעלים את קבצי החודש, בודקים שהכל במקום, ורואים כמה נחסך.</li>
    <li><b>עדכון חצי־שנתי</b>: פנסיה, תיק השקעות, מטרות ושווי נטו, צעד אחר צעד.</li></ul>
    <p>בוחרים מסלול, והמערכת מובילה אתכם שלב אחרי שלב. אפשר לעצור באמצע ולחזור אחר כך.</p>`},
  {id:'dash-tiles',cat:'start',tab:'dash',go:'dash',t:'מה רואים בעמוד הבית',k:'אריחים בית סיכום מטבע תצוגה תמונת מצב',b:`
    <ul><li><b>האריחים למעלה</b>: שווי נטו, נכסים, פנסיה והשקעות נזילות, כל אחד עם תאריך העדכון האחרון שלו.</li>
    <li><b>מטבע תצוגה</b>: מציג את הכל במטבע אחר (דולר, יורו...). הנתונים עצמם לא משתנים.</li>
    <li><b>תמונת מצב</b>: שומרת את המצב של היום, כדי להשוות אליו בעתיד (בטאב היסטוריה).</li>
    <li><b>משוב</b> בתחתית: מקום לכתוב לתום על תקלה או רעיון.</li></ul>`},
  {id:'feedback',cat:'start',tab:'dash',t:'איך כותבים לתום',k:'משוב הודעה תקלה רעיון יצירת קשר פנייה',b:`
    <p>יש שתי דרכים:</p>
    <ul><li>כאן בחלון העזרה: <b>"✉️ כתבו לתום"</b> למטה.</li>
    <li>בתחתית עמוד הבית: תיבת המשוב.</li></ul>
    <p>ההודעה מגיעה ישירות לתום, ורק הוא רואה אותה.</p>`},

  // ── התנהלות חודשית ──
  {id:'budget-basics',cat:'budget',tab:'budget',go:'budget',t:'איך ממלאים את ההתנהלות החודשית',k:'תקציב הכנסות הוצאות צרכים כיף חודש מילוי חסכתי',b:`
    <p>פעם בחודש רושמים כמה נכנס וכמה יצא, כדי לראות כמה באמת נשאר.</p>
    <ul><li>💰 <b>הכנסות</b>: משכורות, עסק, קצבאות.</li>
    <li>🏠 <b>צרכים</b>: דיור, חשבונות, אוכל, תחבורה.</li>
    <li>🎉 <b>כיף</b>: בילויים, קניות, חופשות.</li>
    <li>📈 <b>העברה להשקעות</b>: נספרת כחיסכון, לא כהוצאה.</li></ul>
    <p>בוחרים חודש למעלה. כל טבלה נפתחת בלחיצה על הכותרת שלה. הכי מהיר: להעלות קובץ אשראי ולתת למערכת למלא.</p>`},
  {id:'budget-copy',cat:'budget',tab:'budget',go:'budget',t:'העתקת סכומים מהחודש הקודם',k:'העתק העתקה חודש קודם קבועות שכירות',b:`
    <p>בחודש חדש מופיע כפתור <b>"📋 העתק סכומים מהחודש הקודם"</b>. הוא ממלא <b>רק שדות ריקים</b>, לפי שם הקטגוריה, ולא דורס סכום שכבר הקלדתם.</p>
    <p>אחר כך מתקנים רק את מה שהשתנה.</p>`},
  {id:'budget-repeat',cat:'budget',tab:'budget',go:'budget',t:'הוצאה קבועה לכמה חודשים (🔁)',k:'קבועה חוזרת כל חודש שכירות מנוי חזרה',b:`
    <p>ליד שורה עם סכום יש <b>🔁</b>. לוחצים, ובוחרים על אילו חודשים להחיל את אותו סכום (למשל שכירות לכל השנה).</p>
    <p>חודשים עתידיים לא נספרים בסיכומים עד שהם מגיעים.</p>`},
  {id:'budget-currency',cat:'budget',tab:'budget',go:'budget',t:'הוצאה בדולר, ביורו או במטבע אחר',k:'מטבע דולר יורו פאונד חול שער המרה',b:`
    <p>ליד כל סכום יש <b>בחירת מטבע</b> (₪, $, €, £ או "+ אחר").</p>
    <ul><li>בוחרים מטבע ומקלידים את הסכום כמו שהוא, למשל 20$.</li>
    <li>מתחת לשורה מופיע כמה זה בשקלים, לפי שער היום.</li>
    <li><b>"שינוי שער"</b>: מקלידים את השער שחברת האשראי באמת חייבה.</li></ul>
    <p>השער נשמר עם ההוצאה, כך שחודשים קודמים לא משתנים כשהשער זז. כל הסיכומים נשארים בשקלים.</p>`},
  {id:'budget-tx',cat:'budget',tab:'budget',go:'budget',t:'לראות ולתקן את העסקאות שבקטגוריה',k:'עסקאות רשימה העברה קטגוריה לא לספור הסרה תיקון 📋',b:`
    <p>אחרי העלאת קובץ, ליד כל קטגוריה מופיע <b>📋</b> עם מספר העסקאות. לחיצה פותחת את הרשימה, ואפשר:</p>
    <ul><li>להעביר עסקה לקטגוריה אחרת (המערכת זוכרת את זה לפעם הבאה).</li>
    <li>לתקן סכום.</li><li>לסמן <b>"לא לספור"</b> (למשל העברה בין החשבונות שלכם).</li><li>להסיר.</li></ul>`},
  {id:'budget-dups',cat:'budget',tab:'budget',go:'budget',t:'קטגוריות כפולות',k:'כפול איחוד מיזוג דומה סופר',b:`
    <p>כשיש שתי קטגוריות דומות (למשל "סופר" ו"קניות בסופר"), המערכת מציעה <b>לאחד</b> אותן. אפשר לאשר, או להתעלם והיא לא תציע שוב.</p>`},
  {id:'budget-charts',cat:'budget',tab:'budget',go:'budget',t:'השוואה בין חודשים וסיכום לתקופה',k:'גרף השוואה תקופה ממוצע חצי שנה שנה סיכום',b:`
    <ul><li>📈 <b>"כמה חסכתם, חודש אחרי חודש"</b>: גרף של מה שנשאר בכל חודש.</li>
    <li>📅 <b>"סיכום לתקופה"</b>: בוחרים 3 חודשים, חצי שנה, שנה או כל טווח, ורואים כמה נכנס, כמה יצא, וממוצע חודשי לכל קטגוריה.</li></ul>
    <p>שניהם מתמלאים ברגע שיש לפחות <b>חודשיים</b> עם נתונים.</p>`},
  {id:'budget-bank',cat:'budget',tab:'budget',go:'budget',t:'הבדיקה מול העו"ש',k:'עוש בנק יתרה מתיישב בדיקה חסר',b:`
    <p>אחרי שמעלים קובץ עו"ש, הכרטיס מראה יתרת פתיחה וסגירה ובודק אם התקציב <b>מתיישב עם העו"ש</b>.</p>
    <p>אם לא: כנראה חסרות הוצאות (למשל חיוב אשראי בלי פירוט, מסומן ⚠️), או שמשהו נרשם פעמיים.</p>`},
  {id:'budget-accounts',cat:'budget',tab:'budget',go:'budget',t:'כמה חשבונות (בן/בת זוג, משותף)',k:'חשבונות זוג משותף נפרד סהכ חשבון',b:`
    <p>אפשר לנהל כמה חשבונות, למשל אישי, בן/בת זוג ומשותף, ולעבור ביניהם בשורה למעלה.</p>
    <ul><li><b>"סה"כ חשבונות"</b> מראה את כולם יחד, עם גרף הכנסות מול הוצאות.</li>
    <li>העברה בין החשבונות שלכם כדאי לסמן "לא לספור", כדי שלא תיספר פעמיים.</li></ul>`},
  {id:'budget-self',cat:'budget',tab:'budget',go:'budget',t:'עצמאים: עסק ובית',k:'עצמאי עסק עוסק מעמ ביטוח לאומי מס הכנסה',b:`
    <p>מסמנים <b>"עצמאי"</b> למעלה ובוחרים סוג עוסק. מופיע חלק <b>"עסק"</b> לתשלומי מע"מ, ביטוח לאומי ומס הכנסה.</p>
    <p>אפשר לנהל את העסק יחד עם הבית או בתזרים נפרד, ולראות רק את העסק, רק את האישי, או את שניהם.</p>`},
  {id:'card-no-detail',cat:'budget',tab:'budget',go:'budget',t:'חיוב אשראי בעו"ש בלי פירוט (⚠️)',k:'חיוב אשראי בלי פירוט אזהרה חסר כרטיס סכום אחד',b:`
    <p>בקובץ העו"ש חיוב של כרטיס אשראי מופיע כשורה אחת, למשל "כאל 3,200". המערכת לא סופרת את הסכום הזה כהוצאה אחת גדולה. היא מחכה ל<b>פירוט של הכרטיס</b>, כדי לדעת על מה הכסף יצא.</p>
    <p>כשהפירוט חסר, מופיע ⚠️ "חיובי אשראי בעו"ש בלי פירוט", והחודש ייראה כאילו הוצאתם פחות.</p>
    <p><b>מה עושים:</b> מורידים מאתר חברת האשראי את הפירוט של אותו כרטיס ואותו חודש, ומעלים. ההוצאות נכנסות לקטגוריות, והאזהרה נעלמת.</p>`},
  {id:'cash',cat:'budget',tab:'budget',go:'budget',t:'הוצאות במזומן או מחשבון אחר',k:'מזומן כסף מזומן חשבון אחר ביט פייבוקס ידני הקלדה',b:`
    <p>הוצאה ששילמתם במזומן, או מחשבון שלא העליתם ממנו קובץ, לא תופיע בקבצים. מוסיפים אותה <b>ידנית</b>: מקלידים את הסכום בקטגוריה המתאימה (או מוסיפים שורה חדשה).</p>
    <p>בבדיקה מול העו"ש הוצאות כאלה מופיעות בנפרד, כ"הוצאות שהוקלדו ידנית", כי הן לא עברו בחשבון. זה תקין.</p>
    <p>טיפ: משכתם מזומן מהכספומט? כדאי לרשום לאן הוא הלך, ולא להשאיר את כל המשיכה ב"שונות".</p>`},
  {id:'joint-transfer',cat:'budget',tab:'budget',go:'budget',t:'העברה לחשבון המשותף',k:'משותף העברה בין חשבונות זוג הכנסה כפול',b:`
    <p>כשאחד מבני הזוג מעביר כסף לחשבון המשותף, בחשבון המשותף ההעברה נרשמת <b>כהכנסה</b>: זה הכסף שממנו החשבון המשותף משלם הוצאות.</p>
    <p>בתצוגת <b>"סה"כ חשבונות"</b> אותו כסף עלול להיראות פעמיים, גם כהוצאה וגם כהכנסה. לכן העברות בין החשבונות שלכם כדאי לסמן <b>"לא לספור"</b> (ב־📋 של הקטגוריה).</p>`},
  {id:'reset-account',cat:'budget',tab:'budget',go:'budget',t:'איפוס חשבון והעלאה מחדש',k:'איפוס מחיקה להתחיל מחדש טעות בלאגן',b:`
    <p>אם הנתונים התבלגנו ורוצים להתחיל מחדש: <b>"🧹 איפוס"</b> בשורת החשבונות למעלה.</p>
    <ul><li>נמחקים כל החודשים של החשבון הזה: סכומים, עסקאות, נתוני עו"ש וקבצים שהועלו. חשבונות אחרים לא נפגעים.</li>
    <li>כדי לאשר כותבים את המילה <b>איפוס</b>.</li>
    <li><b>אי אפשר לשחזר</b>, אז כדאי לוודא שיש לכם את הקבצים כדי להעלות אותם שוב.</li></ul>
    <p>לפני איפוס, שווה לנסות לתקן: העלאה חוזרת של קובץ לא משכפלת, ואפשר להסיר עסקאות ב־📋.</p>`},
  {id:'month-close',cat:'budget',tab:'budget',go:'budget',t:'סגירת חודש',k:'סגירה סגרתי רצף עדכון חודשי',b:`
    <p>פעם בחודש מופיע כרטיס <b>"סגירת חודש"</b>: מעלים קבצים, בודקים שהכל במקום (מה נכנס ל"שונות", חיובי אשראי בלי פירוט, מזומן), ורואים כמה נחסך ולאן להעביר אותו.</p>
    <p>חודשים שנסגרים ברצף בונים <b>רצף 🔥</b>.</p>`},

  // ── העלאת קבצים ──
  {id:'import-file',cat:'import',tab:'budget',go:'budget',t:'איך מעלים קובץ אשראי או עו"ש',k:'העלאה קובץ אשראי עוש בנק אקסל pdf כאל מקס ישראכרט',b:`
    <ol><li>מורידים מאתר חברת האשראי (כאל, מקס, ישראכרט...) או מאתר הבנק את פירוט החודש, באקסל או PDF.</li>
    <li>בהתנהלות חודשית לוחצים <b>"📄 מילוי הוצאות מקובץ אשראי"</b> ובוחרים את הקובץ (אפשר כמה יחד).</li>
    <li>כל עסקה נכנסת לבד לקטגוריה ולחודש הנכון. מה שלא זוהה מקבלים ברשימה לשייך.</li></ol>
    <p>הקובץ נקרא <b>במכשיר שלכם</b>. העלאה חוזרת של אותו קובץ לא משכפלת.</p>`},
  {id:'import-where',cat:'import',tab:'budget',go:'budget',t:'איפה מוצאים את הקובץ באתר הבנק או חברת האשראי',k:'איפה מוריד הורדה ייצוא אזור אישי פירוט עסקאות תנועות בחשבון כאל מקס ישראכרט לאומי הפועלים דיסקונט מזרחי',b:`
    <ol><li>נכנסים לאזור האישי. <b>באתר במחשב</b> זה בדרך כלל הכי קל; באפליקציה לא תמיד יש הורדה.</li>
    <li><b>חברת אשראי</b> (כאל, מקס, ישראכרט...): נכנסים ל<b>פירוט העסקאות</b> או <b>פירוט החיובים</b>, ובוחרים את החודש.</li>
    <li><b>בנק</b>: נכנסים ל<b>תנועות בחשבון</b> (עו"ש) ובוחרים טווח תאריכים.</li>
    <li>מחפשים כפתור <b>הורדה / ייצוא / הדפסה</b>, ובוחרים <b>אקסל</b> (הכי מדויק) או <b>PDF</b>.</li></ol>
    <p>בחלק מהבנקים הייצוא הוא ל־PDF בלבד (למשל באפליקציה של הפועלים). גם זה עובד.</p>
    <p><b>לא מוצאים הורדה?</b> צילום מסך של רשימת העסקאות מהאפליקציה עובד גם הוא.</p>`},
  {id:'import-image',cat:'import',tab:'budget',go:'budget',t:'אין קובץ? מעלים צילום מסך',k:'צילום מסך תמונה אפליקציה טלפון png jpg',b:`
    <p>אפשר להעלות <b>צילומי מסך</b> מהאפליקציה של חברת האשראי או הבנק (PNG או JPG), באותו כפתור של הקבצים.</p>
    <ul><li>אפשר כמה צילומים יחד. עסקה שמופיעה בשניים נספרת פעם אחת.</li>
    <li>כדאי לצלם כשהטקסט חד וגדול. קובץ אקסל או PDF עדיין מדויק יותר.</li>
    <li>אחרי ההעלאה עוברים על הסכומים לפני שמאשרים.</li></ul>`},
  {id:'import-password',cat:'import',tab:'budget',t:'הקובץ נעול בסיסמה',k:'סיסמה נעול מוגן תעודת זהות pdf',b:`
    <p>קבצים מחברות האשראי נעולים לפעמים בסיסמה. בדרך כלל זו <b>תעודת הזהות</b>. מקלידים אותה בחלון שנפתח ולוחצים "פתח".</p>
    <p>הסיסמה משמשת רק לפתיחת הקובץ במכשיר שלכם ולא נשמרת.</p>`},
  {id:'import-month',cat:'import',tab:'budget',go:'budget',t:'לפי איזה חודש נרשמות הוצאות אשראי',k:'חודש חיוב עסקה קנייה תשלומים אשראי',b:`
    <p>מתחת לכפתורי ההעלאה בוחרים:</p>
    <ul><li><b>חודש החיוב</b> (ברירת המחדל): החודש שבו הכסף ירד מהחשבון.</li>
    <li><b>חודש העסקה</b>: קנייה באוקטובר שחויבה בנובמבר נרשמת באוקטובר. תשלומים מתפרסים חודש אחרי חודש.</li></ul>
    <p>אפשר להחליף בכל רגע, והעסקאות הקיימות עוברות בהתאם. הבדיקה מול העו"ש ממשיכה לעבוד לפי מועד החיוב.</p>`},
  {id:'import-unknown',cat:'import',tab:'budget',t:'עסקאות שלא זוהו ו"שונות"',k:'לא זוהה שונות שיוך קטגוריה בית עסק',b:`
    <p>עסקה שהמערכת לא מזהה מופיעה ברשימה, ובוחרים לה קטגוריה. המערכת <b>זוכרת</b> את הבחירה לפעם הבאה.</p>
    <p>מה שלא משייכים נכנס ל<b>"שונות"</b>. כדאי לעבור על זה פעם בחודש.</p>`},
  {id:'import-special',cat:'import',tab:'budget',t:'זיכויים, "בקליטה", חיוב מיידי והעברות להשקעות',k:'זיכוי החזר בקליטה מיידי השקעות פסגות מיטב כפול פעמיים',b:`
    <ul><li><b>זיכויים והחזרים</b> מקטינים את ההוצאה.</li>
    <li>עסקאות <b>"בקליטה"</b> שעוד לא חויבו לא נספרות. הן ייכנסו עם הקובץ הבא.</li>
    <li>חיוב אשראי שמופיע בעו"ש <b>לא נספר פעמיים</b>: ההוצאות נספרות מפירוט הכרטיס.</li>
    <li>העברות לבתי השקעות נכנסות לבד ל<b>"העברה להשקעות"</b>.</li></ul>`},
  {id:'import-wrong',cat:'import',tab:'budget',t:'הקובץ לא נקרא נכון',k:'שגיאה לא עובד לא נקרא טעות תקלה קובץ',b:`
    <ul><li>נסו להוריד את אותו פירוט <b>באקסל</b> במקום PDF.</li>
    <li>בתחתית חלון ההעלאה: <b>"משהו לא נראה נכון?"</b> מעתיק את מבנה הקובץ (בלי הנתונים שלכם) כדי לשלוח לתום.</li></ul>`},

  // ── מטרות ──
  {id:'goals-basics',cat:'goals',tab:'goals',go:'goals',t:'איך ממלאים מטרות',k:'מטרה יעד חיסכון טווח זמן דחיפות',b:`
    <p>לכל מטרה ממלאים: <b>שם</b>, <b>סכום יעד</b>, <b>כמה כבר נחסך</b>, <b>איפה הכסף נמצא</b>, ו<b>טווח זמן</b> (12 חודשים, 1–5 שנים, 5–10, 10+).</p>
    <p>המטרות מסתדרות לבד לפי דחיפות. מטרה שהגיעה לסכום יורדת מרשימת ההעברות.</p>`},
  {id:'goals-saved',cat:'goals',tab:'goals',go:'goals',t:'"כמה חסכתי החודש"',k:'חסכתי חיסכון חודש פנוי',b:`
    <p>המספר מחושב מההתנהלות החודשית: הכנסות פחות הוצאות. זה הכסף הפנוי שאפשר להעביר למטרות ולהשקעות.</p>
    <p>אם הוא נראה לא נכון, בדקו שההוצאות של החודש מלאות בהתנהלות החודשית.</p>`},

  // ── פנסיה והשקעות ──
  {id:'pension-update',cat:'pension',tab:'pension',go:'pension',t:'איך מעדכנים פנסיה וקרן השתלמות',k:'פנסיה השתלמות יתרה עדכון מסלקה דמי ניהול',b:`
    <ul><li>לכל מוצר: יתרה, בית השקעות, דמי ניהול (מהפקדה ומצבירה), תאריך בדיקה ומסלולי השקעה.</li>
    <li>את היתרות מוצאים באזור האישי של בית ההשקעות או ב<b>מסלקה הפנסיונית</b>.</li>
    <li>עדכנו גם את <b>התאריך</b>: לפיו היתרה עוברת לעמודה הנכונה בשווי נטו.</li></ul>`},
  {id:'pension-fees',cat:'pension',tab:'pension',go:'pension',t:'למה דמי הניהול מסומנים בצבע',k:'דמי ניהול גבוה צבע אדום',b:`
    <p>המערכת <b>צובעת</b> דמי ניהול שגבוהים מהיעד. זה סימן שכדאי לבדוק אותם, ואפשר להעלות את זה בפגישה עם תום.</p>`},
  {id:'pension-where',cat:'pension',tab:'pension',go:'pension',t:'איפה מוצאים את נתוני הפנסיה',k:'איפה יתרה דוח שנתי רבעוני אזור אישי מסלקה פנסיה קרן',b:`
    <ul><li><b>באזור האישי</b> באתר של כל קרן או בית השקעות: יתרה, מסלול ההשקעה ודמי הניהול.</li>
    <li><b>בדוח השנתי או הרבעוני</b> שנשלח אליכם בדואר או במייל. בדוח מופיעים גם דמי הניהול.</li>
    <li><b>במסלקה הפנסיונית</b> רואים את כל המוצרים יחד, כולל כאלה ששכחתם.</li></ul>
    <p>אחרי שמעדכנים את היתרה, עדכנו גם את <b>תאריך הבדיקה</b>. לפיו היתרה עוברת לעמודה הנכונה בשווי נטו.</p>`},
  {id:'portfolio-basics',cat:'pension',tab:'portfolio',go:'portfolio',t:'תיק השקעות: ניירות ואחוזי יעד',k:'תיק נייר מניות אגח יעד אחוז פיזור',b:`
    <p>לכל נייר: שם, קטגוריה, שווי נוכחי (₪ או $) ו<b>"% יעד"</b>. סך אחוזי היעד צריך להיות 100%.</p>
    <p>"חלק מהתיק" מחושב לבד. אפשר לנהל כמה תיקים.</p>`},
  {id:'portfolio-invest',cat:'pension',tab:'portfolio',go:'portfolio',t:'"כמה להשקיע ואיפה"',k:'איזון הפקדה כמה להשקיע חלוקה',b:`
    <p>בתוך כל תיק כותבים סכום פנוי להשקעה, והוא מתחלק בין הניירות כך שהתיק יתקרב לאחוזי היעד, <b>רק בהפקדות ובלי למכור</b>.</p>
    <p>בלי סכום רואים כמה צריך בסך הכל לאיזון מלא.</p>`},

  {id:'portfolio-nw',cat:'pension',tab:'portfolio',go:'nw',t:'למה שווי התיק לא עובר לבד לשווי נטו',k:'תיק שווי נטו שוק ההון לא עובר העברה',b:`
    <p>שווי התיק משתנה כל יום, ושווי נטו הוא צילום של נקודת זמן. לכן התיק <b>לא</b> עובר לבד.</p>
    <p>מעדכנים בשווי נטו את שורת <b>"שוק ההון"</b>, בעמודה של התקופה. בעדכון החצי־שנתי יש כפתור שמעביר את שווי התיק בלחיצה.</p>`},

  // ── שווי נטו ──
  {id:'nw-basics',cat:'nw',tab:'nw',go:'nw',t:'איך עובדת טבלת שווי נטו',k:'שווי נטו טבלה עמודה תקופה נכסים חובות',b:`
    <ul><li>כל <b>עמודה</b> היא תקופה. מזינים את התאריך הראשון, והשאר ממשיכות כל חצי שנה.</li>
    <li>שורות: נכסים, השקעות, חסכונות וחובות. שווי נטו = נכסים + השקעות + חסכונות − חובות.</li>
    <li><b>"?"</b> ליד ערך = נלקח אוטומטית (מפנסיה או מהנכסים). אפשר לתקן ידנית.</li></ul>`},
  {id:'nw-low',cat:'nw',tab:'nw',go:'nw',t:'למה שווי הנטו נראה נמוך מדי',k:'נמוך ירד חסר ריק שווי נטו',b:`
    <p>כל עמודה נספרת <b>רק לפי מה שמולא בה</b>. שורה שנשארה ריקה בעמודה החדשה לא נספרת, והשווי ייראה נמוך מהאמת.</p>
    <p>מלאו את כל השורות בעמודה, גם אם הסכום לא השתנה.</p>`},
  {id:'nw-periods',cat:'nw',tab:'nw',go:'nw',t:'הוספה והסרה של תקופות',k:'תקופה עמודה הוספה הסרה מוקדמת מאוחרת הסתר השינוי צילום',b:`
    <ul><li>מתחת לטבלה: <b>"+ הוסף תקופה מאוחרת יותר"</b> (אחרי האחרונה) או <b>"מוקדמת יותר"</b> (לפני הראשונה), ו"− הסר תקופה".</li>
    <li>אפשר להסתיר עמודה שלא צריך לראות כרגע, ולהציג אותה שוב.</li>
    <li><b>"📸 הצג את השינוי בשווי נטו"</b> למעלה מראה כמה השווי השתנה, בתצוגה נוחה לצילום מסך.</li></ul>`},
  {id:'nw-currency',cat:'nw',tab:'nw',go:'nw',t:'נכס בדולר או במטבע אחר',k:'מטבע דולר יורו חול נכס שווי נטו המרה',b:`
    <p>לכל תא בטבלה אפשר לבחור <b>מטבע</b>, למשל חשבון בדולרים או דירה בחו"ל. מקלידים את הסכום במטבע שלו, ולידו מופיע כמה זה בשקלים.</p>
    <p>השווי הכולל מחושב בשקלים לפי שער ההמרה. השערים מתעדכנים לבד.</p>`},
  {id:'half-year',cat:'nw',tab:'nw',go:'dash',t:'העדכון החצי־שנתי',k:'חצי שנתי מסלול עדכון 🧭',b:`
    <p>פעם בחצי שנה, מסלול צעד אחר צעד: <b>פנסיה → תיק השקעות → מטרות → שווי נטו → סיום</b>.</p>
    <p>בשווי נטו מופיעים ליד כל שורה הסכום הקודם, "ללא שינוי" ו"אין לי". בסוף רואים מה חסר והשוואה לעדכון הקודם.</p>
    <p>פותחים אותו מ"מה באת לעשות היום?" בעמוד הבית.</p>`},

  // ── מושגים בכסף (general explanations; no advice) ──
  {id:'c-networth',cat:'concepts',tab:'nw',go:'nw',t:'מה זה שווי נטו',k:'שווי נטו הון עצמי נכסים פחות חובות מושג',b:`
    <p><b>שווי נטו</b> = כל מה שיש לכם, פחות כל מה שאתם חייבים.</p>
    <p>למשל: דירה ב־2,000,000, חיסכון ופנסיה ב־400,000, ומשכנתא של 1,200,000. השווי נטו הוא 1,200,000.</p>
    <p>זה המספר שהכי טוב מראה התקדמות לאורך שנים. משכורת גבוהה לא מבטיחה שווי נטו גבוה; מה שקובע הוא כמה נשאר ואיך הוא גדל.</p>`},
  {id:'c-saverate',cat:'concepts',tab:'budget',go:'budget',t:'מה זה שיעור חיסכון',k:'שיעור חיסכון אחוז חסכתי מושג',b:`
    <p><b>שיעור חיסכון</b> = כמה נשאר בחודש, חלקי ההכנסות.</p>
    <p>למשל: הכנסות של 20,000 והוצאות של 16,000. נשארו 4,000, כלומר שיעור חיסכון של 20%.</p>
    <p>במערכת, כסף שהועבר להשקעות נספר כחיסכון. האחוז הזה עוזר להשוות חודשים גם כשההכנסה משתנה.</p>`},
  {id:'c-invest-saving',cat:'concepts',tab:'budget',go:'budget',t:'חיסכון או הוצאה? העברה להשקעות',k:'העברה להשקעות חיסכון הוצאה הפקדה קרן פנסיה',b:`
    <p>כסף שעובר לתיק השקעות, לקופת גמל להשקעה או לקרן השתלמות <b>לא נעלם</b>: הוא עדיין שלכם, רק במקום אחר.</p>
    <p>לכן ב<b>"📈 העברה להשקעות"</b> הוא נספר כחיסכון, ולא כהוצאה. ככה רואים את התמונה האמיתית: כמה הוצאתם, וכמה שמתם בצד.</p>`},
  {id:'c-fees',cat:'concepts',tab:'pension',go:'pension',t:'דמי ניהול מהפקדה ומצבירה',k:'דמי ניהול הפקדה צבירה אחוז עמלה פנסיה מושג',b:`
    <p>בפנסיה ובקרנות יש שני סוגים של דמי ניהול:</p>
    <ul><li><b>מהפקדה</b>: אחוז מכל הפקדה חודשית שנכנסת.</li>
    <li><b>מצבירה</b>: אחוז בשנה מכל הכסף שכבר נצבר בקרן.</li></ul>
    <p>לאורך שנים, כשהסכום שנצבר גדל, דמי הניהול מהצבירה יכולים להגיע לסכום גדול. בגלל זה המערכת מסמנת בצבע כשהם גבוהים. על מה כדאי לעשות במקרה שלכם, מדברים עם תום.</p>`},
  {id:'c-hishtalmut',cat:'concepts',tab:'pension',go:'pension',t:'מה זו קרן השתלמות',k:'קרן השתלמות נזילה 6 שנים מס מושג',b:`
    <p><b>קרן השתלמות</b> היא חיסכון לטווח בינוני. בדרך כלל גם אתם וגם המעסיק (או אתם, כעצמאים) מפקידים אליה כל חודש.</p>
    <ul><li>בדרך כלל היא <b>נזילה אחרי 6 שנים</b> מהפתיחה.</li>
    <li>עד תקרת ההפקדה, הרווחים בה פטורים ממס רווחי הון.</li></ul>
    <p>במערכת מעדכנים אותה בטאב הפנסיה, והיתרה עוברת לשווי נטו.</p>`},
  {id:'c-emergency',cat:'concepts',tab:'goals',go:'goals',t:'מה זו קרן חירום',k:'קרן חירום ביטחון בלתי צפוי מושג מטרה',b:`
    <p><b>קרן חירום</b> היא כסף שזמין מיד להוצאה לא צפויה: תיקון ברכב, תקופה בלי עבודה, הוצאה רפואית.</p>
    <p>היא נשמרת במקום נזיל ובטוח, לא בהשקעה שיכולה לרדת בדיוק כשצריך אותה. בגלל זה היא המטרה הראשונה ברשימת המטרות. את הגודל שמתאים לכם קובעים בתוכנית עם תום.</p>`},

  // ── חשבון והגדרות ──
  {id:'notes',cat:'account',tab:'notes',go:'notes',t:'טאב ההערות',k:'הערות פתקים רשימה כתיבה',b:`
    <p>מקום חופשי לכתוב כל מה שחשוב לכם: דברים מהפגישה עם תום, תזכורות, משימות.</p>
    <p>אפשר לעצב רשימות (• או 1.). בתוך רשימה, <b>Tab</b> יוצר תת־נקודה, ו־<b>Shift+Tab</b> חוזר רמה אחת. הכל נשמר לבד.</p>`},
  {id:'forgot-password',cat:'account',tab:'settings',t:'שכחתי סיסמה / רוצה לשנות סיסמה',k:'סיסמה שכחתי שינוי כניסה מייל',b:`
    <ul><li><b>שכחתם?</b> במסך הכניסה לוחצים "שכחתי סיסמה", ומגיע מייל לאיפוס.</li>
    <li><b>רוצים לשנות?</b> בהגדרות, תחת "אבטחת חשבון".</li></ul>`},
  {id:'logged-out',cat:'account',tab:'general',t:'למה המערכת ניתקה אותי',k:'התנתקתי ניתוק יצא כניסה משתמש אחר',b:`
    <ul><li>המערכת מנתקת אחרי <b>24 שעות</b> בלי שימוש.</li>
    <li>בדפדפן אחד אפשר להיות מחוברים רק <b>למשתמש אחד</b>. כניסה למשתמש אחר בלשונית אחרת מנתקת את זו.</li></ul>`},
  {id:'reminders',cat:'account',tab:'settings',go:'settings',t:'תזכורות בוואטסאפ ובמייל',k:'תזכורת וואטסאפ מייל התראה כיבוי',b:`
    <p>כשהתזכורות פעילות, נשלחת תזכורת אחת בוואטסאפ ובמייל כשמטרות, פנסיה או שווי נטו לא עודכנו מזמן.</p>
    <p>אפשר לכבות אותן בהגדרות, תחת "תזכורות אוטומטיות". בהגדרות מעדכנים גם טלפון ואימייל.</p>`},
  {id:'settings-misc',cat:'account',tab:'settings',go:'settings',t:'לשון פנייה וסיור במערכת',k:'זכר נקבה פנייה סיור הדרכה',b:`
    <ul><li><b>לשון פנייה</b>: זכר או נקבה, וכל הטקסטים במערכת מתאימים את עצמם.</li>
    <li><b>"🗺️ הצג סיור מחדש"</b>: סיור קצר שמראה איפה כל דבר.</li></ul>`},
  {id:'tools',cat:'start',tab:'links',go:'links',t:'כלים, מחשבונים וסיכומי המפגשים',k:'כלים מחשבון ריבית דריבית סיכומים מפגש שיעור',b:`
    <p>בטאב <b>כלים</b>: מחשבון ריבית דריבית, השוואת בתי השקעות, פרישה מוקדמת ועוד.</p>
    <p>מי שבתוכנית "הדרך לעושר" רואה שם גם את <b>סיכומי המפגשים</b>. כל סיכום נפתח אחרי המפגש שלו.</p>`}
];

// ── who sees it ──
function hcOn(){
  if(typeof CU==='undefined'||!CU)return false;
  return HC_FOR_ALL||(typeof isBeta==='function'&&isBeta());
}
// a client still in the course sees only articles of the tabs open to them
function hcArticleOk(a){
  if(typeof _lsnOnly==='undefined'||!_lsnOnly)return true;
  if(a.tab==='general'||a.tab==='links')return true;
  return typeof lsnAllowedTab==='function'&&lsnAllowedTab(a.tab);
}
const _hcList=()=>HC_ARTICLES.filter(hcArticleOk);
const _hcGet=id=>HC_ARTICLES.find(a=>a.id===id);

// ── search: Hebrew-aware, no AI ──
const _hcFinal={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
function _hcNorm(s){
  return String(s||'').toLowerCase().replace(/<[^>]+>/g,' ').replace(/[֑-ׇ]/g,'')
    .replace(/[״"׳'`]/g,'').replace(/[ךםןףץ]/g,c=>_hcFinal[c]).replace(/[^א-תa-z0-9₪$€£]+/g,' ').trim();
}
let _hcIdx=null;
function _hcIndex(){
  if(!_hcIdx)_hcIdx=HC_ARTICLES.map(a=>({a,t:' '+_hcNorm(a.t)+' ',k:' '+_hcNorm(a.k)+' ',b:' '+_hcNorm(a.b)+' '}));
  return _hcIdx;
}
function hcSearch(q){
  let toks=_hcNorm(q).split(' ').filter(t=>t.length>=2);
  if(!toks.length)return [];
  // filler words ("איך", "אפשר", "משהו"...) don't decide anything, unless that's all there is
  const STOP=new Set(['איכ','מה','את','של','על','יש','זה','אני','לי','עמ','גמ','או','כל','אמ','משהו','אפשר','רוצה','צריכ','אצלי','שלי','לעשות','עושימ']);
  const real=toks.filter(t=>!STOP.has(t));if(real.length)toks=real;
  const score=(x,tok)=>{
    // matched at the start of a word: "דולר" finds "דולר", but "בלה" doesn't find "טבלה"
    const one=w=>{w=' '+w;return (x.t.includes(w)?6:0)+(x.k.includes(w)?4:0)+(x.b.includes(w)?1:0);};
    let s=one(tok);
    // a prefix letter (ו ה ב ל מ ש כ): "בדולר" → "דולר"
    if(!s&&tok.length>3&&/^[והבלמשכ]/.test(tok))s=one(tok.slice(1))*.8;
    return s;
  };
  const rows=_hcIndex().filter(x=>hcArticleOk(x.a)).map(x=>{const per=toks.map(t=>score(x,t));
    return {a:x.a,all:per.every(s=>s>0),s:per.reduce((p,c)=>p+c,0)};}).filter(r=>r.s>0);
  const strict=rows.filter(r=>r.all);
  return (strict.length?strict:rows).sort((a,b)=>b.s-a.s).slice(0,12).map(r=>r.a);
}

// ── the button ──
function hcRenderButton(){
  _hcStyle();hcDecorateStatic();
  let b=document.getElementById('hc-btn');
  if(!hcOn()){if(b)b.style.display='none';if(_hc.open)hcClose();return;}
  if(!b){b=document.createElement('button');b.id='hc-btn';b.type='button';b.onclick=()=>hcOpen();
    b.setAttribute('aria-label','עזרה');b.innerHTML='<span class="hc-q">?</span> עזרה';document.body.appendChild(b);}
  b.style.display=_hc.open?'none':'flex';
}
function _hcStyle(){
  if(document.getElementById('hc-style'))return;
  const s=document.createElement('style');s.id='hc-style';
  s.textContent=`
#hc-btn{position:fixed;left:18px;bottom:22px;z-index:8997;display:flex;align-items:center;gap:7px;background:var(--teal);color:#06121a;border:none;border-radius:26px;padding:9px 16px 9px 12px;font-family:var(--font);font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.5);direction:rtl}
#hc-btn .hc-q{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#06121a;color:var(--teal);font-size:14px}
#hc-btn:hover{filter:brightness(1.08)}
#hc-back{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.35);display:none}
#hc-panel{position:fixed;top:0;bottom:0;left:0;z-index:9001;width:min(420px,100vw);background:var(--s1);border-right:1px solid var(--teal-border);box-shadow:8px 0 32px rgba(0,0,0,.5);direction:rtl;display:flex;flex-direction:column;transform:translateX(-105%);transition:transform .22s ease;font-family:var(--font)}
#hc-panel.on{transform:none}
#hc-panel .hc-head{padding:16px 16px 14px;background:linear-gradient(135deg,rgba(66,235,214,.18),rgba(66,235,214,.04));border-bottom:1px solid var(--border)}
#hc-panel .hc-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
#hc-panel .hc-ttl{font-size:18px;font-weight:800;color:var(--white)}
#hc-panel .hc-x{background:none;border:none;color:var(--t2);font-size:24px;line-height:1;cursor:pointer;padding:2px 6px}
#hc-panel .hc-search{position:relative}
#hc-panel .hc-search input{width:100%;box-sizing:border-box;background:var(--s2);border:1.5px solid var(--border);border-radius:12px;color:var(--white);font-family:var(--font);font-size:14.5px;padding:11px 38px 11px 12px;outline:none}
#hc-panel .hc-search input:focus{border-color:var(--teal)}
#hc-panel .hc-search span{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:15px;opacity:.7;pointer-events:none}
#hc-panel .hc-body{flex:1;overflow-y:auto;padding:14px 16px 18px}
#hc-panel .hc-sec{font-size:12px;font-weight:800;color:var(--t3);margin:14px 0 6px;letter-spacing:.2px}
#hc-panel .hc-sec:first-child{margin-top:0}
#hc-panel .hc-item{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;text-align:right;background:var(--s2);border:1px solid var(--border);border-radius:10px;color:var(--white);font-family:var(--font);font-size:13.5px;font-weight:600;padding:10px 12px;margin-bottom:6px;cursor:pointer}
#hc-panel .hc-item:hover{border-color:var(--teal-border);background:rgba(66,235,214,.07)}
#hc-panel .hc-item i{font-style:normal;color:var(--teal);flex-shrink:0}
#hc-panel .hc-cats{display:grid;grid-template-columns:1fr 1fr;gap:7px}
#hc-panel .hc-cat{text-align:right;background:var(--s2);border:1px solid var(--border);border-radius:10px;color:var(--white);font-family:var(--font);font-size:13px;font-weight:700;padding:10px;cursor:pointer;line-height:1.4}
#hc-panel .hc-cat:hover{border-color:var(--teal-border)}
#hc-panel .hc-cat small{display:block;color:var(--t3);font-weight:400;font-size:11px}
#hc-panel .hc-backlink{background:none;border:none;color:var(--teal);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;padding:0;margin-bottom:10px}
#hc-panel .hc-art h3{font-size:17px;color:var(--white);margin:2px 0 10px;line-height:1.4}
#hc-panel .hc-art .hc-tag{font-size:11.5px;color:var(--teal);font-weight:700}
#hc-panel .hc-art .hc-txt{font-size:14px;color:var(--t2);line-height:1.85}
#hc-panel .hc-art .hc-txt b{color:var(--white)}
#hc-panel .hc-art .hc-txt ul,#hc-panel .hc-art .hc-txt ol{margin:6px 0;padding-right:20px}
#hc-panel .hc-art .hc-txt li{margin-bottom:5px}
#hc-panel .hc-art .hc-txt p{margin:0 0 8px}
#hc-panel .hc-go{margin:6px 0 4px;background:rgba(66,235,214,.12);border:1px solid var(--teal-border);color:var(--teal);border-radius:9px;padding:8px 14px;font-family:var(--font);font-size:13px;font-weight:800;cursor:pointer}
#hc-panel .hc-vid{margin:10px 0 8px}
#hc-panel .hc-vid video{width:100%;display:block;border-radius:10px;border:1px solid var(--border);background:#000;aspect-ratio:1280/634}
#hc-panel .hc-vid-cap{font-size:11.5px;color:var(--t3);margin-top:5px}
#hc-panel .hc-vote{margin-top:16px;padding:12px;background:var(--s2);border-radius:10px;font-size:13px;color:var(--t2);text-align:center}
#hc-panel .hc-vote button{background:var(--s1);border:1px solid var(--border);border-radius:8px;font-size:16px;padding:4px 14px;margin:6px 4px 0;cursor:pointer}
#hc-panel textarea{width:100%;box-sizing:border-box;min-height:90px;background:var(--s2);border:1px solid var(--border);border-radius:10px;color:var(--white);font-family:var(--font);font-size:13.5px;line-height:1.6;padding:10px;resize:vertical;outline:none;direction:rtl}
#hc-panel textarea:focus{border-color:var(--teal)}
#hc-panel .hc-send{margin-top:8px;background:var(--teal);color:#06121a;border:none;border-radius:9px;padding:9px 18px;font-family:var(--font);font-size:13.5px;font-weight:800;cursor:pointer}
#hc-panel .hc-foot{border-top:1px solid var(--border);padding:12px 16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:var(--t3)}
#hc-panel .hc-foot button{background:var(--s2);border:1px solid var(--border);color:var(--white);border-radius:9px;padding:7px 12px;font-family:var(--font);font-size:12.5px;font-weight:700;cursor:pointer}
#hc-panel .hc-foot button:hover{border-color:var(--teal-border)}
#hc-panel .hc-steps{background:linear-gradient(135deg,rgba(66,235,214,.10),rgba(66,235,214,.02));border:1px solid var(--teal-border);border-radius:12px;padding:12px;margin-bottom:6px}
#hc-panel .hc-steps-h{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:800;color:var(--white)}
#hc-panel .hc-steps-h span{font-size:12px;color:var(--teal)}
#hc-panel .hc-bar{height:6px;border-radius:4px;background:var(--s2);margin:8px 0 10px;overflow:hidden}
#hc-panel .hc-bar div{height:100%;background:var(--teal);border-radius:4px}
#hc-panel .hc-step{display:flex;align-items:center;gap:9px;width:100%;text-align:right;background:none;border:none;border-top:1px solid var(--border);color:var(--white);font-family:var(--font);font-size:13.5px;padding:8px 2px;cursor:pointer}
#hc-panel .hc-step:first-of-type{border-top:none}
#hc-panel .hc-step .hc-ck{flex-shrink:0;width:20px;height:20px;border-radius:50%;border:1.5px solid var(--t3);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}
#hc-panel .hc-step.done{color:var(--t3);text-decoration:line-through}
#hc-panel .hc-step.done .hc-ck{background:var(--teal);border-color:var(--teal);color:#06121a}
#hc-panel .hc-step i{font-style:normal;margin-right:auto;color:var(--teal)}
#hc-panel .hc-page{background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:13.5px;color:var(--t2);line-height:1.85}
#hc-panel .hc-page ul{margin:6px 0!important;padding:0!important}
#hc-panel .hc-page li{margin-bottom:5px}
#hc-panel .hc-page strong{color:var(--white)}
.hc-tip{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin:0 5px;border-radius:50%;border:1px solid var(--teal-border);background:rgba(66,235,214,.08);color:var(--teal);font-family:var(--font);font-size:11px;font-weight:900;line-height:1;cursor:pointer;vertical-align:middle;padding:0}
.hc-tip:hover{background:rgba(66,235,214,.2)}
#hc-panel .hc-empty{font-size:13.5px;color:var(--t2);line-height:1.8;text-align:center;padding:16px 4px}
@media(max-width:640px){#hc-btn{bottom:84px;left:12px;padding:8px 13px 8px 10px;font-size:13px}#hc-panel{border-right:none;right:0;width:auto}}
body.lsn-only #hc-btn{bottom:22px}`;
  document.head.appendChild(s);
}

// ── the panel ──
function _hcPanel(){
  let p=document.getElementById('hc-panel');
  if(p)return p;
  const bk=document.createElement('div');bk.id='hc-back';bk.onclick=hcClose;document.body.appendChild(bk);
  p=document.createElement('div');p.id='hc-panel';p.setAttribute('role','dialog');p.setAttribute('aria-label','מרכז העזרה');
  p.innerHTML=`<div class="hc-head">
      <div class="hc-top"><div class="hc-ttl">👋 איך אפשר לעזור?</div>
        <button class="hc-x" onclick="hcClose()" aria-label="סגירה">×</button></div>
      <div class="hc-search"><span>🔍</span>
        <input id="hc-q" type="search" autocomplete="off" placeholder="חפשו, למשל: איך מעלים קובץ אשראי" aria-label="חיפוש בעזרה"
          oninput="hcQuery(this.value)"/></div>
    </div>
    <div class="hc-body" id="hc-body" aria-live="polite"></div>
    <div class="hc-foot" id="hc-foot"></div>`;
  document.body.appendChild(p);
  p.addEventListener('keydown',e=>{if(e.key==='Escape')hcClose();});
  return p;
}
function hcOpen(view,id){
  if(!hcOn())return;
  const p=_hcPanel();
  _hc.open=true;_hc.back=[];
  if(view){_hc.view=view;_hc.id=id||'';}else if(!_hc.q)_hc.view='home';
  document.getElementById('hc-back').style.display='block';
  void p.offsetWidth; // a reflow first, so the slide-in animates (no rAF: it can be throttled)
  p.classList.add('on');
  hcRenderButton();hcRender();
  if(typeof trackPageView==='function')try{trackPageView('help');}catch(e){}
  setTimeout(()=>{const i=document.getElementById('hc-q');if(i&&_hc.view!=='art'&&window.innerWidth>640)i.focus();},60);
}
function hcClose(){
  _hcMissFlush();
  document.querySelectorAll('#hc-panel video').forEach(v=>v.pause());
  _hc.open=false;_hc.q='';_hc.view='home'; // reopening starts fresh
  const qi=document.getElementById('hc-q');if(qi)qi.value='';
  const p=document.getElementById('hc-panel');if(p)p.classList.remove('on');
  const bk=document.getElementById('hc-back');if(bk)bk.style.display='none';
  hcRenderButton();
}
function hcOnTab(id){if(_hc.open&&_hc.view==='home')hcRender();}
function hcQuery(v){
  _hc.q=v;_hc.view=v.trim()?'search':'home';_hc.back=[];hcRender();
  // a search with no answer is kept for Tom (after the client stops typing), so he knows what to write next
  clearTimeout(_hcMissT);_hcMissQ=v.trim()&&!hcSearch(v).length?v.trim():'';
  if(_hcMissQ)_hcMissT=setTimeout(_hcMissFlush,2500);
}
let _hcMissT=null,_hcMissQ='',_hcMissLast='';
function _hcMissFlush(){
  clearTimeout(_hcMissT);const q=_hcMissQ;_hcMissQ='';
  if(!q||q.length<2||q===_hcMissLast||typeof D!=='object'||!D||typeof CU==='undefined'||!CU)return;
  _hcMissLast=q;
  D.helpMisses=(Array.isArray(D.helpMisses)?D.helpMisses:[]).concat({q:q.slice(0,80),d:new Date().toISOString()}).slice(-30);
  if(typeof markDirty==='function')markDirty();
}

// ── "הצעדים הראשונים שלכם": a setup checklist, ticked from the client's own data ──
const _hcNum=v=>parseFloat(String(v==null?'':v).replace(/,/g,''))||0;
function hcSteps(){
  if(typeof D!=='object'||!D)return [];
  const maps=typeof budgetMonthsMaps==='function'?budgetMonthsMaps():[D.budgetMonths||{}];
  const months=[].concat(...maps.map(m=>Object.values(m||{}))).filter(Boolean);
  const sum=rows=>(rows||[]).reduce((s,r)=>s+(typeof budgetRowAmt==='function'?budgetRowAmt(r):_hcNum(r.amount)),0);
  const nwAny=Object.values(D.nwData||{}).some(s=>(s.rows||[]).some(r=>(r.vals||[]).some(v=>_hcNum(v))));
  return [
    {id:'goals',ic:'🎯',t:'למלא מטרה ראשונה',tab:'goals',art:'goals-basics',
      done:(D.goals||[]).some(g=>(g.name||'').trim()&&_hcNum(g.needed)>0)},
    {id:'file',ic:'📄',t:'להעלות קובץ אשראי או עו"ש',tab:'budget',art:'import-file',
      done:months.some(m=>(m.tx||[]).length)},
    {id:'month',ic:'💵',t:'למלא חודש שלם: הכנסות והוצאות',tab:'budget',art:'budget-basics',
      done:months.some(m=>sum(m.income)>0&&sum(m.needs)+sum(m.wants)>0)},
    {id:'close',ic:'✅',t:'לסגור חודש ראשון',tab:'budget',art:'month-close',
      done:Object.keys(D.monthClose||{}).length>0},
    {id:'pension',ic:'🏦',t:'לעדכן פנסיה וקרן השתלמות',tab:'pension',art:'pension-update',
      done:(D.pension||[]).some(p=>_hcNum(p.amount)>0)},
    {id:'nw',ic:'📊',t:'למלא שווי נטו',tab:'nw',art:'nw-basics',done:nwAny}
  ].filter(s=>{const a=_hcGet(s.art);return a&&hcArticleOk(a);});
}
function _hcStepsHtml(){
  const st=hcSteps();if(!st.length)return '';
  const n=st.filter(s=>s.done).length;
  if(n===st.length)return `<div class="hc-steps" style="padding:10px 12px;font-size:13px;color:var(--t2)">🎉 <b style="color:var(--white)">השלמתם את כל הצעדים הראשונים.</b> מעכשיו: עדכון פעם בחודש.</div>`;
  return `<div class="hc-steps"><div class="hc-steps-h">🚀 הצעדים הראשונים שלכם <span>${n} מתוך ${st.length}</span></div>
    <div class="hc-bar"><div style="width:${Math.round(n/st.length*100)}%"></div></div>
    ${st.map(s=>`<button class="hc-step${s.done?' done':''}" onclick="_hcNav('art','${s.art}')"><span class="hc-ck">${s.done?'✓':''}</span>${s.ic} ${s.t}${s.done?'':'<i>‹</i>'}</button>`).join('')}</div>`;
}

// A small "?" next to a field, opening its article — hcTip('budget-bank'). Empty when the help center is off.
function hcTip(id,label){
  if(!hcOn()||!_hcGet(id))return '';
  const l=esc(label||'הסבר');
  return `<button type="button" class="hc-tip" onclick="event.stopPropagation();event.preventDefault();hcOpen('art','${id}')" title="${l}" aria-label="${l}">?</button>`;
}
// "?" on titles that are written in index.html (not re-rendered), added once after sign-in
const HC_STATIC_TIPS=[['#budget-trend-card .ch-hint','budget-charts','על הגרף'],['.g-section--cf .g-section-title','goals-saved','איך זה מחושב']];
function hcDecorateStatic(){
  HC_STATIC_TIPS.forEach(([sel,id,l])=>{const el=document.querySelector(sel);if(!el)return;
    const old=el.querySelector(':scope > .hc-tip');
    if(!hcOn()){if(old)old.remove();return;}
    if(!old)el.insertAdjacentHTML('beforeend',hcTip(id,l));});
}
function _hcNav(view,arg){
  _hc.back.push({view:_hc.view,id:_hc.id,cat:_hc.cat});
  _hc.view=view;if(view==='art')_hc.id=arg;if(view==='cat')_hc.cat=arg;
  hcRender();const b=document.getElementById('hc-body');if(b)b.scrollTop=0;
}
function hcBack(){
  const s=_hc.back.pop();
  if(s){_hc.view=s.view;_hc.id=s.id;_hc.cat=s.cat;}else _hc.view=_hc.q.trim()?'search':'home';
  hcRender();
}
function hcGoTab(tab){
  const btn=document.getElementById('nav-'+tab);if(!btn||typeof goTo!=='function')return;
  goTo(tab,btn);
  if(window.innerWidth<=640)hcClose();
}
const _hcItem=a=>`<button class="hc-item" onclick="_hcNav('art','${a.id}')"><span>${a.t}${HC_VIDEOS[a.id]?' <small title="יש סרטון" style="opacity:.75">🎥</small>':''}</span><i>‹</i></button>`;
const _hcVideo=id=>HC_VIDEOS[id]?`<div class="hc-vid"><video controls playsinline preload="metadata" src="videos/${id}.mp4?v=${HC_VIDEO_V}"></video>
  <div class="hc-vid-cap">🎥 תום מסביר · ${HC_VIDEOS[id]} דק' · מתוך הדרכת המערכת (העיצוב בסרטון קצת ישן יותר)</div></div>`:'';
function hcRender(){
  const body=document.getElementById('hc-body'),foot=document.getElementById('hc-foot');if(!body)return;
  const list=_hcList(),tab=(typeof _lastTab!=='undefined'&&_lastTab)||'dash';
  const tabKey=tab==='lessons'?'links':tab;
  const backBtn=`<button class="hc-backlink" onclick="hcBack()">→ חזרה</button>`;
  let h='';
  if(_hc.view==='art'){
    const a=_hcGet(_hc.id);
    if(!a){_hc.view='home';return hcRender();}
    const cat=HC_CATS.find(c=>c[0]===a.cat);
    const rel=list.filter(x=>x.cat===a.cat&&x.id!==a.id).slice(0,3);
    const v=_hc.voted[a.id];
    const goOk=a.go&&document.getElementById('nav-'+a.go)&&(typeof _lsnOnly==='undefined'||!_lsnOnly||typeof lsnAllowedTab!=='function'||lsnAllowedTab(a.go));
    h=`${backBtn}<div class="hc-art"><div class="hc-tag">${cat?cat[1]+' '+cat[2]:''}</div><h3>${a.t}</h3>
      <div class="hc-txt">${a.b}</div>${_hcVideo(a.id)}
      ${goOk&&a.go!==tab?`<button class="hc-go" onclick="hcGoTab('${a.go}')">לפתיחת ${HC_TABS[a.go]||''} ←</button>`:''}
      <div class="hc-vote" id="hc-vote">${v==='up'?'תודה! 🙂':v==='sent'?'תודה! ההערה נשלחה לתום ✓':v==='down'?_hcDownForm(a):`האם זה עזר לכם?<br>
        <button onclick="hcVote('${a.id}','up')" aria-label="כן, עזר">👍</button><button onclick="hcVote('${a.id}','down')" aria-label="לא עזר">👎</button>`}</div>
      ${rel.length?`<div class="hc-sec">עוד בנושא</div>${rel.map(_hcItem).join('')}`:''}</div>`;
  }else if(_hc.view==='cat'){
    const cat=HC_CATS.find(c=>c[0]===_hc.cat)||HC_CATS[0];
    h=`${backBtn}<div class="hc-sec" style="font-size:15px;color:var(--white)">${cat[1]} ${cat[2]}</div>${list.filter(a=>a.cat===cat[0]).map(_hcItem).join('')}`;
  }else if(_hc.view==='search'){
    const res=hcSearch(_hc.q);
    h=res.length?`<div class="hc-sec">${res.length===1?'תוצאה אחת':res.length+' תוצאות'}</div>${res.map(_hcItem).join('')}`
      :`<div class="hc-empty">לא מצאנו תשובה ל"<b>${esc(_hc.q.trim())}</b>".<br>נסו מילה אחרת, או כתבו לתום ונחזור אליכם.</div>
        <div style="text-align:center"><button class="hc-send" onclick="_hcNav('contact')">✉️ כתבו לתום</button></div>`;
  }else if(_hc.view==='contact'){
    h=`${backBtn}<div class="hc-sec" style="font-size:15px;color:var(--white)">✉️ כתבו לתום</div>
      <div style="font-size:13px;color:var(--t2);line-height:1.7;margin-bottom:8px">שאלה, תקלה או רעיון? ההודעה מגיעה ישירות לתום, ורק הוא רואה אותה.</div>
      <textarea id="hc-msg" maxlength="2000" placeholder="כתבו כאן...">${_hc.q.trim()?esc(_hc.q.trim()):''}</textarea>
      <button class="hc-send" onclick="hcSend()">שליחה ←</button><span id="hc-sent" style="font-size:13px;color:var(--teal);font-weight:700;margin-right:10px"></span>`;
  }else if(_hc.view==='page'){
    // "💡 הסבר עמוד" lands here: the page's own short guide + its articles
    const ph=typeof PAGE_HELP!=='undefined'&&PAGE_HELP[tabKey];
    const here=list.filter(a=>a.tab===tabKey);
    h=`${backBtn}${ph?`<div class="hc-sec" style="font-size:15px;color:var(--white)">${ph.title}</div><div class="hc-page">${ph.html}</div>`:''}
      ${here.length?`<div class="hc-sec">מאמרים על העמוד הזה</div>${here.map(_hcItem).join('')}`:''}`;
  }else{
    const here=list.filter(a=>a.tab===tabKey).slice(0,5);
    const pop=HC_POPULAR.map(_hcGet).filter(a=>a&&hcArticleOk(a)&&!here.includes(a)).slice(0,4);
    const cats=HC_CATS.map(c=>[c,list.filter(a=>a.cat===c[0]).length]).filter(x=>x[1]);
    h=`${_hcStepsHtml()}${here.length?`<div class="hc-sec">מומלץ לעמוד הזה · ${HC_TABS[tabKey]||''}</div>${here.map(_hcItem).join('')}`:''}
      ${pop.length?`<div class="hc-sec">הכי נשאלים</div>${pop.map(_hcItem).join('')}`:''}
      <div class="hc-sec">כל הנושאים</div>
      <div class="hc-cats">${cats.map(([c,n])=>`<button class="hc-cat" onclick="_hcNav('cat','${c[0]}')">${c[1]} ${c[2]}<small>${n} מאמרים</small></button>`).join('')}</div>`;
  }
  body.innerHTML=h;
  const bot=typeof HELP_BOT_URL!=='undefined'&&!!HELP_BOT_URL&&typeof helpBotToggle==='function';
  foot.innerHTML=_hc.view==='contact'?'':`<span>לא מצאתם תשובה?</span>
    <button onclick="_hcNav('contact')">✉️ כתבו לתום</button>
    ${bot?`<button onclick="hcClose();if(!_hb.open)helpBotToggle()">💬 שאלה לבוט</button>`:''}`;
}
function _hcDownForm(a){
  return `מה היה חסר? נשמח לשפר.<textarea id="hc-down" maxlength="1000" style="margin-top:8px;min-height:64px" placeholder="לא חובה"></textarea>
    <button class="hc-send" onclick="hcSendDown('${a.id}')">שליחה לתום</button>`;
}
function hcVote(id,v){
  _hc.voted[id]=v;
  if(v==='up')_hcFeedback(id,true);
  hcRender();
}
async function _hcFeedback(msg,quiet){
  if(typeof D==='undefined'||!D||!CU)return false;
  if(quiet){ // 👍 = just a counter per article id (D.helpVotes), not an inbox message
    D.helpVotes=D.helpVotes||{};D.helpVotes[msg]=(D.helpVotes[msg]||0)+1;
  }else{
    if(!Array.isArray(D.feedback))D.feedback=[];
    D.feedback.push({message:msg,date:new Date().toISOString(),status:'new'});
  }
  if(typeof markDirty==='function')markDirty();
  if(!quiet&&typeof manualSave==='function')try{await manualSave(true);}catch(e){}
  return true;
}
async function hcSendDown(id){
  const a=_hcGet(id),el=document.getElementById('hc-down'),txt=(el&&el.value||'').trim();
  _hc.voted[id]='sent';
  await _hcFeedback(`[מרכז העזרה · 👎 "${a?a.t:id}"] ${txt||'(בלי פירוט)'}`);
  const box=document.getElementById('hc-vote');if(box)box.innerHTML='תודה! ההערה נשלחה לתום ✓';
}
async function hcSend(){
  const el=document.getElementById('hc-msg'),txt=(el&&el.value||'').trim();
  if(!txt){if(el)el.focus();return;}
  const page=(typeof _lastTab!=='undefined'&&HC_TABS[_lastTab])||'';
  await _hcFeedback(`[מרכז העזרה${page?' · מעמוד '+page:''}] ${txt}`);
  el.value='';
  const s=document.getElementById('hc-sent');if(s)s.textContent='תודה! ההודעה נשלחה לתום ✓';
}

// ── Admin: searches with no answer (all clients) + articles marked 👍 ──
function renderAdminHelp(users){
  const el=document.getElementById('admin-help');if(!el)return;
  const miss={},votes={};
  (users||[]).forEach(u=>{
    (u.helpMisses||[]).forEach(m=>{const k=_hcNorm(m.q);if(!k)return;
      const x=miss[k]=miss[k]||{q:m.q,n:0,who:new Set(),last:''};x.n++;x.who.add(u.name||u.email||u.uid);if((m.d||'')>x.last)x.last=m.d||'';});
    Object.entries(u.helpVotes||{}).forEach(([id,n])=>{votes[id]=(votes[id]||0)+(+n||0);});
  });
  const rows=Object.values(miss).sort((a,b)=>b.n-a.n||(b.last>a.last?1:-1)).slice(0,40);
  const vRows=Object.entries(votes).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const td='padding:6px 8px;text-align:right';
  el.innerHTML=(rows.length?`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="color:var(--t3);border-bottom:1px solid var(--border)"><th style="${td}">חיפשו</th><th style="${td}">פעמים</th><th style="${td}">מי</th><th style="${td}">אחרון</th></tr></thead>
      <tbody>${rows.map(r=>`<tr style="border-bottom:1px solid var(--border)"><td style="${td};font-weight:700">${esc(r.q)}</td><td style="${td}">${r.n}</td>
        <td style="${td};color:var(--t2)">${esc([...r.who].slice(0,3).join(', '))}${r.who.size>3?' +'+(r.who.size-3):''}</td>
        <td style="${td};color:var(--t3);white-space:nowrap">${r.last?new Date(r.last).toLocaleDateString('he-IL'):''}</td></tr>`).join('')}</tbody></table></div>`
    :'<p style="color:var(--t3);font-size:13px;text-align:right">עדיין אין חיפושים בלי תשובה.</p>')
    +(vRows.length?`<div style="font-size:12.5px;color:var(--t2);margin-top:12px">👍 ${vRows.map(([id,n])=>{const a=_hcGet(id);return esc(a?a.t:id)+' ('+n+')';}).join(' · ')}</div>`:'');
}
