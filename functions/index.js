/**
 * Scheduled email reminders for inactive users.
 *
 * Runs once a day. For every account in /users whose data hasn't been saved
 * for REMIND_AFTER_DAYS, it sends the client a gentle "come back and update"
 * email — but not more often than once every COOLDOWN_DAYS.
 *
 * This is the server-side half of the reminder feature. The in-app banner
 * (js/misc.js → maybeShowStaleReminder) covers people who DO log in; this
 * covers people who don't. Nothing here runs until you deploy it to Firebase
 * — see functions/README-reminders.md for the one-time setup.
 */
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// ── Tunables ─────────────────────────────────────────────
const REMIND_AFTER_DAYS = 30;   // remind once data is this stale
const COOLDOWN_DAYS      = 14;   // never email the same person more often than this
const APP_URL   = 'https://tomcoani.github.io/financial-tracker/';
const FROM_NAME = 'מעקב פיננסי';

// ── SMTP secrets (set once via the Firebase CLI — see README) ─
const SMTP_HOST = defineSecret('SMTP_HOST');
const SMTP_PORT = defineSecret('SMTP_PORT');
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');

const DAY = 86400000;
function daysSince(iso) {
  const t = Date.parse(iso);
  return isNaN(t) ? Infinity : Math.floor((Date.now() - t) / DAY);
}
function validEmail(e) {
  return typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

function emailHtml(name, days) {
  const hi = name ? ('היי ' + name + ',') : 'היי,';
  return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#1a2233;font-size:15px;line-height:1.7;max-width:520px;margin:auto">
    <p>${hi}</p>
    <p>שמנו לב שעברו כ־<b>${days} ימים</b> מאז שעדכנת את הנתונים במערכת המעקב הפיננסי שלך.</p>
    <p>עדכון קצר של המספרים (הכנסות, הוצאות, שווי התיק) שומר על התמונה מדויקת ועוזר לראות אם אתה בכיוון הנכון ליעדים שלך.</p>
    <p style="text-align:center;margin:26px 0">
      <a href="${APP_URL}" style="background:#42ebd6;color:#04211d;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;display:inline-block">כניסה לעדכון »</a>
    </p>
    <p style="color:#7a869a;font-size:12.5px">אם עדכנת לאחרונה ממכשיר אחר — אפשר להתעלם מהמייל הזה. 🙂</p>
  </div>`;
}

exports.remindInactiveUsers = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'Asia/Jerusalem',
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS],
  },
  async () => {
    const port = parseInt(SMTP_PORT.value() || '465', 10);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port,
      secure: port === 465,      // 465 = SSL, 587 = STARTTLS
      auth: {user: SMTP_USER.value(), pass: SMTP_PASS.value()},
    });

    const snap = await db.collection('users').get();
    let sent = 0, skipped = 0;

    for (const doc of snap.docs) {
      const u = doc.data() || {};
      if (!validEmail(u.email))                                  { skipped++; continue; }
      if (!u.lastSaved)                                          { skipped++; continue; }
      const stale = daysSince(u.lastSaved);
      if (stale < REMIND_AFTER_DAYS)                             { skipped++; continue; }
      if (u.lastReminded && daysSince(u.lastReminded) < COOLDOWN_DAYS) { skipped++; continue; }

      try {
        await transporter.sendMail({
          from: `"${FROM_NAME}" <${SMTP_USER.value()}>`,
          to: u.email,
          subject: 'תזכורת קטנה לעדכון המעקב הפיננסי שלך 🙂',
          html: emailHtml(u.displayName, stale),
        });
        await doc.ref.set({lastReminded: new Date().toISOString()}, {merge: true});
        sent++;
      } catch (e) {
        console.error('reminder email failed for', doc.id, e);
        skipped++;
      }
    }
    console.log(`reminders: sent=${sent} skipped=${skipped} total=${snap.size}`);
  }
);
