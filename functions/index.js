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
const {onDocumentCreated} = require('firebase-functions/v2/firestore');
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

// Where new tax-refund leads get emailed to.
const LEADS_TO  = 'info@tomani.co';

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

/* ──────────────────────────────────────────────────────────
 * Tax-refund leads → email notification
 *
 * Fires whenever tax-refund.html writes a new document to /taxLeads.
 * Emails LEADS_TO a readable summary so nothing gets missed. Reuses the
 * same SMTP secrets as the reminder job. Files (if any) are uploaded to
 * Storage under taxLeads/{id}/ and the doc is updated afterwards — this
 * first email captures the lead the moment it lands.
 * ────────────────────────────────────────────────────────── */
const YN = v => v === true ? 'כן' : (v === false ? 'לא' : '—');
const Q_LABELS = {
  kids: 'ילדים', jobChange: 'החלפת עבודה / אבטלה / חל"ד', selfEmployed: 'היה עצמאי',
  degree: 'סיום תואר (4 שנים)', mortgage: 'משכנתא', propertySale: 'מכירת נכס + מס שבח',
  withdrawal: 'משיכה מגמל/השתלמות/פנסיה', periphery: 'יישוב ספר', capitalMkt: 'שוק ההון',
  donations: 'תרומות', discharge: 'שחרור משירות סדיר', disability: 'נטול יכולת / לקות למידה',
  immigrant: 'עולה / תושב חוזר', alreadyFiled: 'כבר הגיש בקשת החזר (שנתיים)', bankAccount: 'חשבון בנק פעיל',
};
const TIER_HE = {high: 'סיכוי גבוה', mid: 'יש בסיס לבדיקה', low: 'סיכוי נמוך'};

function leadEmailHtml(d) {
  const a = d.answers || {};
  const rows = Object.keys(Q_LABELS)
    .map(k => `<tr><td style="padding:4px 10px;border-bottom:1px solid #eee">${Q_LABELS[k]}</td>
      <td style="padding:4px 10px;border-bottom:1px solid #eee;font-weight:bold;color:${a[k] === true ? '#0a8f79' : '#8a94a6'}">${YN(a[k])}</td></tr>`)
    .join('');
  const triggers = (d.triggers && d.triggers.length)
    ? '<ul style="margin:6px 0 0;padding-inline-start:18px">' + d.triggers.map(t => `<li>${t}</li>`).join('') + '</ul>'
    : '—';
  return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#1a2233;font-size:14px;line-height:1.6;max-width:600px;margin:auto">
    <h2 style="margin:0 0 4px">ליד חדש — בדיקת החזר מס 🎯</h2>
    <p style="color:#7a869a;margin:0 0 16px">${d.wantsContact ? 'הלקוח ביקש שייצרו איתו קשר עם שאלה.' : 'הלקוח בחר להתקדם עם הבדיקה.'}</p>
    <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
      <tr><td style="padding:4px 10px;color:#7a869a">שם</td><td style="padding:4px 10px;font-weight:bold">${d.name || '—'}</td></tr>
      <tr><td style="padding:4px 10px;color:#7a869a">טלפון</td><td style="padding:4px 10px;font-weight:bold"><a href="tel:${d.phone || ''}">${d.phone || '—'}</a></td></tr>
      <tr><td style="padding:4px 10px;color:#7a869a">אימייל</td><td style="padding:4px 10px;font-weight:bold">${d.email || '—'}</td></tr>
      <tr><td style="padding:4px 10px;color:#7a869a">מין / לידה</td><td style="padding:4px 10px">${d.gender || '—'} · ${d.birth || '—'}</td></tr>
      <tr><td style="padding:4px 10px;color:#7a869a">מצב משפחתי</td><td style="padding:4px 10px">${d.marital || '—'}${d.marriageYear ? ' · נישואים ' + d.marriageYear : ''}</td></tr>
      <tr><td style="padding:4px 10px;color:#7a869a">שכר</td><td style="padding:4px 10px">${d.salary || '—'}${d.spouseSalary ? ' · בן/בת זוג: ' + d.spouseSalary : ''}</td></tr>
      <tr><td style="padding:4px 10px;color:#7a869a">אישור יצירת קשר</td><td style="padding:4px 10px">${d.consent || '—'}</td></tr>
    </table>
    <p style="margin:0 0 4px"><b>תוצאת זכאות:</b> ${TIER_HE[d.eligibilityTier] || d.eligibilityTier || '—'} (score ${d.eligibilityScore ?? '—'})</p>
    <p style="margin:0 0 4px"><b>עילות שזוהו:</b></p>${triggers}
    <h3 style="margin:16px 0 6px">תשובות מלאות</h3>
    <table style="border-collapse:collapse;width:100%">${rows}</table>
  </div>`;
}

exports.notifyTaxLead = onDocumentCreated(
  {
    document: 'taxLeads/{leadId}',
    region: 'us-central1',
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS],
  },
  async (event) => {
    const d = event.data && event.data.data();
    if (!d) return;

    const port = parseInt(SMTP_PORT.value() || '465', 10);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port,
      secure: port === 465,
      auth: {user: SMTP_USER.value(), pass: SMTP_PASS.value()},
    });

    try {
      await transporter.sendMail({
        from: `"בדיקת החזר מס" <${SMTP_USER.value()}>`,
        to: LEADS_TO,
        replyTo: d.email || undefined,
        subject: `ליד חדש — החזר מס: ${d.name || 'ללא שם'} (${TIER_HE[d.eligibilityTier] || ''})`,
        html: leadEmailHtml(d),
      });
      console.log('tax lead email sent for', event.params.leadId);
    } catch (e) {
      console.error('tax lead email failed for', event.params.leadId, e);
    }
  }
);
