# הפעלת מחשבון החזר מס + עמוד ניהול

הקבצים:
- **`tax-refund.html`** — הטופס שהלקוחות ממלאים.
- **`tax-refund-admin.html`** — עמוד ניהול לצפייה בלידים (כניסת מנהל עם `info@tomani.co`, אותה כניסה כמו במערכת הפיננסית).

הכל בנוי על פרויקט Firebase הקיים שלך — `clientworth-91908`. כדי שהקליטה תעבוד צריך פעם אחת להגדיר 4 דברים.

> **חשוב לדעת:** את הצעדים האלה אי אפשר לבצע מהמחשב הזה — אין פה firebase CLI / Node, והם דורשים כניסה ל-Firebase Console עם חשבון Google שלך. אלה הגדרות אבטחה/חשבון שצריך שתעשה בעצמך. הכנתי לך קישורים ישירים והדבקות מוכנות — זה לוקח כ-5 דקות.

---

## 1. התחברות אנונימית (Anonymous Auth)
הטופס מתחבר אנונימית ברקע כדי שאפשר יהיה לכתוב בבטחה.

🔗 https://console.firebase.google.com/project/clientworth-91908/authentication/providers
→ Anonymous → **Enable** → Save.

בנוסף — **Authentication → Settings → Authorized domains** — לוודא שהדומיין שבו הדף מתארח מופיע (למשל `tomcoani.github.io` ו/או דומיין ה-Hosting של Firebase).

## 2. הפעלת Storage (לקבצים)
🔗 https://console.firebase.google.com/project/clientworth-91908/storage
→ Get started → לבחור מיקום (מומלץ `europe-west1`).

## 3. כללי אבטחה
⚠️ **אל תדרוס כללים קיימים** — רק הוסף את הבלוקים בתוך ה-`match /databases/{database}/documents { … }` הקיים.

**Firestore** — 🔗 https://console.firebase.google.com/project/clientworth-91908/firestore/rules
```
match /taxLeads/{id} {
  // הלקוח יוצר ליד ומעדכן רק את שלו; המנהל קורא ומעדכן הכל.
  allow create: if request.auth != null;
  allow update: if request.auth != null &&
                   (request.auth.uid == resource.data.ownerUid
                    || request.auth.token.email == 'info@tomani.co');
  allow read:   if request.auth != null && request.auth.token.email == 'info@tomani.co';
  allow delete: if request.auth != null && request.auth.token.email == 'info@tomani.co';
}
```

**Storage** — 🔗 https://console.firebase.google.com/project/clientworth-91908/storage/rules
```
match /taxLeads/{leadId}/{allPaths=**} {
  allow write: if request.auth != null && request.resource.size < 20 * 1024 * 1024;
  allow read:  if request.auth != null && request.auth.token.email == 'info@tomani.co';
}
```
(העלאת קובץ מחזירה קישור הורדה עם טוקן — עמוד הניהול פותח את הקבצים דרך הקישור הזה.)

## 4. (בונוס) מייל התראה על כל ליד חדש
הפונקציה `notifyTaxLead` ב-`functions/index.js` שולחת אליך מייל מסכם. פריסה מהמחשב שבו מותקן firebase CLI:
```bash
firebase deploy --only functions
```
היא משתמשת באותם סודות SMTP של תזכורות המשתמשים. אם עוד לא הגדרת אותם:
```bash
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
```
זה שלב אופציונלי — גם בלעדיו הלידים נשמרים ונראים בעמוד הניהול; רק לא יישלח מייל.

---

## בדיקה מקצה לקצה
1. לפתוח את `tax-refund.html` בדומיין המאושר (לא כקובץ מקומי — התחברות אנונימית דורשת דומיין).
2. למלא עד הסוף + להעלות קובץ דמה.
3. לפתוח את `tax-refund-admin.html`, להתחבר עם `info@tomani.co`, ולוודא שהליד + הקובץ מופיעים.

## איפה הכל נשמר
- תשובות → Firestore, אוסף `taxLeads`.
- קבצים → Storage, `taxLeads/{leadId}/`.
- צפייה נוחה → `tax-refund-admin.html`.
