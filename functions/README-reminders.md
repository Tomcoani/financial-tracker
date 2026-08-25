# תזכורות מייל ללקוחות לא פעילים — מדריך הפעלה

הקוד ב-`functions/index.js` שולח מייל עדין ללקוח שלא עדכן את הנתונים כבר 30 יום
(פעם ב-14 יום לכל היותר). זה **לא פעיל** עד שמריצים את הצעדים הבאים פעם אחת.
עד אז — האתר החי לא מושפע בכלל.

## מה זה דורש
1. שדרוג פרויקט Firebase לתוכנית **Blaze** (תשלום לפי שימוש — בהיקף שלך זה בפועל ₪0,
   אבל Google מחייבת כרטיס אשראי כדי לאפשר פונקציות מתוזמנות ושליחת מייל החוצה).
2. חשבון מייל לשליחה (SMTP). הכי פשוט: **Gmail עם "סיסמת אפליקציה"**.

---

## צעד 1 — כלים חד-פעמיים
```bash
npm install -g firebase-tools
firebase login
```

## צעד 2 — שדרוג ל-Blaze
Firebase Console → הפרויקט `clientworth-91908` → למטה משמאל "Upgrade" → בחר **Blaze**.
אפשר להגדיר תקציב התראה (Budget alert) של כמה דולרים כדי לישון בשקט.

## צעד 3 — פרטי שולח המייל (Gmail כדוגמה)
1. בחשבון Gmail: אבטחה → הפעל **אימות דו-שלבי**.
2. אח"כ → "סיסמאות אפליקציה" → צור סיסמה חדשה (16 תווים). זו לא סיסמת הג'ימייל הרגילה.
3. מהתיקייה הראשית של הפרויקט הרץ (מכניס את הערכים כשמבקשים):
```bash
firebase functions:secrets:set SMTP_HOST     # ערך: smtp.gmail.com
firebase functions:secrets:set SMTP_PORT     # ערך: 465
firebase functions:secrets:set SMTP_USER     # ערך: כתובת הג'ימייל שלך
firebase functions:secrets:set SMTP_PASS     # ערך: סיסמת האפליקציה בת 16 התווים
```
> אפשר כל ספק SMTP אחר (למשל SendGrid) — פשוט הכנס את ה-HOST/PORT/USER/PASS שלו.

## צעד 4 — התקנה ופריסה
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

זהו. הפונקציה תרוץ אוטומטית כל יום ב-09:00 (שעון ישראל).

---

## בדיקה ושליטה
- **הרצה ידנית לבדיקה** (Google Cloud Console → Cloud Scheduler → הפונקציה → "Run now"),
  או צפייה ביומן: `firebase functions:log`.
- **לשנות מתי מזכירים** — ערוך בראש `functions/index.js`:
  `REMIND_AFTER_DAYS` (אחרי כמה ימים) ו-`COOLDOWN_DAYS` (מרווח בין תזכורות), ואז שוב `firebase deploy --only functions`.
- **לשנות שעה** — הערך `schedule: 'every day 09:00'` בקובץ.
- **לכבות זמנית** — Cloud Scheduler → השהה (Pause) את המשימה.

## איך זה יודע מי לא פעיל
כל שמירה באתר מעדכנת `lastSaved` במסמך של הלקוח ב-Firestore (כבר עובד).
הפונקציה עוברת על כל הלקוחות, בודקת את התאריך, ושומרת `lastReminded` אחרי ששלחה —
כדי לא להטריד את אותו אדם שוב ושוב.
