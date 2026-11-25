/**
 * แมวกวัก — หลังบ้าน (Google Apps Script, บัญชี nitithon.see)
 * - API ของหน้าเว็บ https://nitithon-web.github.io/maewkwak/ (คำสั่ง money_* owe_* vault_* hk_* ai_*)
 * - LINE OA แมวกวัก (webhook): จดเงินทางแชท + หารกันในกลุ่ม
 * - สรุปเงินตอนเช้า + เตือนหารในกลุ่ม + สำรองชีตทุกสัปดาห์
 */

const BACKEND_VER = 10;   // เพิ่มทุกครั้งที่ deploy (โชว์ในหน้าสถานะระบบ)
             // ดึงประชุมล่วงหน้ากี่วัน
// ปฏิทินที่ดึงผ่านสะพาน (Bridge.gs ในบัญชีอื่น) ตั้งค่าใน Script properties: BRIDGE_URL, BRIDGE_KEY
const BRIDGE_LABEL = 'พี่วุฒิ';
const TZ = 'Asia/Bangkok';
          // ส่งสรุปงานวันนี้ตอน 7 โมงเช้า
     // ตรวจงานที่ต้องเตือนทุก 15 นาที
const props = PropertiesService.getScriptProperties();
const APP_URL = 'https://nitithon-web.github.io/maewkwak/';   // 🐱 หน้าเว็บแมวกวัก (รีโป nitithon-web/maewkwak)
const MONEY_ACTIONS = /^(status|ai_debug|ai_status|ai_health|ai_flag|ai_regress|ai_compare|ai_bench|ai_read|ai_reread|ai_voice|backup_now|money_\w+|owe_\w+|hk_setup|vault_\w+)$/;   // คำสั่งจากหน้าเว็บที่รับ

/** ลิงก์ส่วนตัว: ฝัง API key ไว้หลัง # (ไม่ถูกส่งไปที่เซิร์ฟเวอร์) เปิดแล้วใช้ได้ทันที */
function magicMsg_() {
  return '🐱 ลิงก์เข้าแอป แมวกวัก ของคุณ\n' + APP_URL + '#k=' + props.getProperty('API_KEY') +
    '\n\nเปิดแล้วกด "เพิ่มไปยังหน้าจอโฮม" จะได้ไอคอนแอป' +
    '\n• ถ้าเปิดจากไอคอนหน้าจอโฮมแล้วข้อมูลไม่ขึ้น ให้กดค้างที่ลิงก์นี้ คัดลอก แล้ววางในหน้าต่างเชื่อมเครื่องของแอป' +
    '\n⚠️ อย่าส่งต่อลิงก์นี้ให้คนอื่น';
}

/** กด Run ถ้าลิงก์หลุดไปถึงคนอื่น: เปลี่ยนรหัสใหม่ ทุกเครื่องต้องเปิดลิงก์ใหม่จาก LINE */
function resetApiKey() {
  props.setProperty('API_KEY', Utilities.getUuid().replace(/-/g, ''));
  Logger.log('เปลี่ยน API key แล้ว พิมพ์ "ลิงก์" ในแชท LINE เพื่อรับลิงก์ใหม่');
}

/* ===================== โควตาข้อความ LINE ===================== */

/** { limit, used } ของเดือนนี้ (limit 0 = ไม่จำกัด) เก็บแคช 10 นาที */
function quota_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('quota');
  if (hit) return JSON.parse(hit);
  const token = props.getProperty('LINE_TOKEN');
  if (!token || token.indexOf('ใส่') === 0) return null;
  const opt = { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true };
  try {
    const q = JSON.parse(UrlFetchApp.fetch('https://api.line.me/v2/bot/message/quota', opt).getContentText());
    const u = JSON.parse(UrlFetchApp.fetch('https://api.line.me/v2/bot/message/quota/consumption', opt).getContentText());
    const out = { limit: q.type === 'limited' ? Number(q.value) || 0 : 0, used: Number(u.totalUsage) || 0 };
    cache.put('quota', JSON.stringify(out), 600);
    return out;
  } catch (e) {
    return null;
  }
}

function quotaText_(q) {
  if (!q) return 'ดูโควตาไม่ได้ (เช็ค LINE_TOKEN)';
  if (!q.limit) return '📊 โควตา LINE เดือนนี้: ใช้ไป ' + q.used + ' (ไม่จำกัด)';
  const pct = Math.round(q.used * 100 / q.limit);
  return (pct >= 80 ? '⚠️' : '📊') + ' โควตา LINE เดือนนี้: ' + q.used + '/' + q.limit + ' (' + pct + '%)' +
    (pct >= 80 ? '\nใกล้เต็มแล้ว ข้อความตอบกลับในแชทยังใช้ได้ไม่จำกัด' : '');
}

/* ===================== ติดตั้งครั้งแรก (กด Run) ===================== */

/* ===================== Web app ===================== */

function doGet() {
  return ContentService.createTextOutput('Task API ทำงานอยู่');
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad json' });
  }

  // ข้อความจาก LINE webhook (มี destination เสมอ)
  if (body.destination !== undefined && Array.isArray(body.events)) {
    handleLine_(body.events);
    return json_({ ok: true });
  }

  // 👥 แอปหารกันในไลน์ (LIFF): ยืนยันตัวตนด้วย ID token ของ LINE ไม่ใช้ key · hk_cfg บอกแค่ไอดีแอปเล็ก
  if (body.action === 'hk_cfg') return json_({ ok: true, liffId: props.getProperty('LIFF_ID') || '' });
  if (/^hk_/.test(String(body.action || '')) && body.action !== 'hk_setup') {   // hk_setup = ของเจ้าของ ต้องมี key
    try { return json_(Object.assign({ ok: true }, hkApi_(body))); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }

  // คำขอจากหน้าเว็บ
  if (!body.key || body.key !== props.getProperty('API_KEY')) {
    return json_({ ok: false, error: 'API key ไม่ถูกต้อง' });
  }

  if (!MONEY_ACTIONS.test(String(body.action || ''))) return json_({ ok: false, error: 'ไม่มีคำสั่งนี้' });

  // งานช้าที่ไม่แก้ชีต (AI/OCR) ทำนอกล็อก ไม่ให้คำขออื่น (และ LINE) ต้องรอจนหมดเวลา
  try {
    switch (body.action) {
      case 'ai_debug':   return json_({ ok: true, ...aiDebug_() });
      case 'ai_bench':   return json_({ ok: true, ...aiBench_(body.id, body.model, body.think) });
      case 'ai_status':  return json_({ ok: true, ai: !!props.getProperty('GEMINI_API_KEY'), model: props.getProperty('GEMINI_MODEL') || AI_MODELS[0] });
      case 'ai_compare': return json_({ ok: true, ai: !!props.getProperty('GEMINI_API_KEY'), results: aiCompare_(body.ids, body.data, body.mime) });
      case 'ai_reread':  return json_({ ok: true, ...aiReread_(body) });
      case 'ai_read':    return json_({ ok: true, ...aiReadUpload_(body) });
      case 'ai_flag':    return json_({ ok: true, ...aiFlag_(body) });       // 🧪 ปุ่ม AI อ่านผิด → เก็บเข้าชุดตัวอย่าง
      case 'ai_regress': return json_({ ok: true, ...aiRegress_(body) });    // 🧪 อ่านชุดตัวอย่างซ้ำทั้งหมด
      case 'ai_health':  return json_({ ok: true, ...aiHealthInfo_() });
      case 'ai_voice':   return json_({ ok: true, ...aiVoice_(body) });   // 🎙 ปุ่มไมค์ในแอป
      case 'money_snap': body.__pre = preRead_(body, () => moneyFolder_(), moneyCatList_(body.type === 'in' ? 'in' : 'out')); break;
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (body.action) {
      case 'vault_list':   return json_({ ok: true, ...vaultList_(body.space) });
      case 'vault_init':   vaultInit_(body.salt, body.check, body.space); return json_({ ok: true });
      case 'vault_save':   vaultSave_(body.item, body.space); return json_({ ok: true });
      case 'vault_save_many': return json_({ ok: true, saved: vaultSaveMany_(body.items, body.space) });
      case 'vault_delete': vaultDelete_(body.id, body.space); return json_({ ok: true });
      case 'vault_reset':  return json_({ ok: true, removed: vaultReset_(body.space) });
      case 'money_list':   return json_({ ok: true, items: moneyAll_() });
      case 'backup_now':   return json_({ ok: true, id: weeklyBackup_(true) });
      case 'money_cfg':    { const c = moneyCfg_(); return json_({ ok: true, budgets: c.budgets, recur: c.recur, pp: c.pp || '', goals: c.goals || [] }); }
      case 'status':       return json_({ ok: true, ...statusInfo_() });
      case 'hk_setup': {   // 👥 ตั้งค่าแอปหารกันในไลน์: ไอดีแอปเล็ก + Channel ID ของ LINE Login (ไม่ใช่ความลับ)
        if (body.liffId != null) { if (body.liffId && !/^\d{6,14}-[A-Za-z0-9]{4,16}$/.test(String(body.liffId))) throw new Error('LIFF ID ไม่ถูกต้อง'); props.setProperty('LIFF_ID', String(body.liffId)); }
        if (body.channel != null) { if (body.channel && !/^\d{6,14}$/.test(String(body.channel))) throw new Error('Channel ID ไม่ถูกต้อง'); props.setProperty('LIFF_CHANNEL', String(body.channel)); }
        return json_({ ok: true, liffId: props.getProperty('LIFF_ID') || '', channel: !!props.getProperty('LIFF_CHANNEL'), groups: Object.keys(grpCfg_()).length });
      }
      case 'money_cfg_set': return json_({ ok: true, ...moneyCfgSet_(body) });
      case 'money_save':   return json_({ ok: true, item: moneySave_(body.item) });
      case 'money_delete': moneyDelete_(body.id); return json_({ ok: true });
      case 'owe_list':     return json_({ ok: true, docs: oweAll_() });
      case 'owe_save':     return json_({ ok: true, docs: oweSave_(body.docs) });
      case 'owe_delete':   oweDelete_(body.ids); return json_({ ok: true });
      case 'owe_slip':     return json_({ ok: true, file: oweSlip_(body) });
      case 'money_snap':   return json_({ ok: true, ...moneySnap_(body) });
      default:       return json_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

/* ===================== LINE webhook ===================== */

function handleLine_(events) {
  events.forEach(ev => {
    // 👥 กลุ่ม/ห้องแชท → หารกันในกลุ่ม (Group.gs) แยกจากแชทส่วนตัวของเจ้าของทั้งหมด
    const st = ev.source && ev.source.type;
    if (st === 'group' || st === 'room') {
      try { grpHandle_(ev); } catch (err) { console.error('group: ' + (err.stack || err)); }
      LINE_SENDER = null;   // แชทส่วนตัวในชุดเดียวกันใช้ชื่อบัญชีตามเดิม
      return;
    }
    if (ev.type !== 'postback' && (ev.type !== 'message' || !ev.message)) return;
    const uid = ev.source && ev.source.userId;
    if (!uid) return;

    // คนแรกที่ทักมา = เจ้าของระบบ
    let owner = props.getProperty('LINE_USER_ID');
    if (!owner) {
      props.setProperty('LINE_USER_ID', uid);
      owner = uid;
      reply_(ev.replyToken, ['🔗 เชื่อมบัญชีเรียบร้อย\n\n' + MONEY_HELP, magicMsg_()]);
      return;
    }
    if (uid !== owner) {
      reply_(ev.replyToken, 'บัญชีนี้ไม่มีสิทธิ์ใช้งาน');
      return;
    }

    // รูป/ไฟล์ใบเสร็จ และการแตะปุ่มเลือกบิล
    if (ev.type !== 'postback' && (ev.message.type === 'image' || ev.message.type === 'file')) {
      // รับรูปหลายรูปพร้อมกันได้: ไม่ล็อกตอนอ่านรูป (อ่าน ~10 วิ/รูป) เพราะไม่ได้เขียนชีต
      try { billFromLineMedia_(ev); }
      catch (err) { reply_(ev.replyToken, 'รับรูปไม่สำเร็จ: ' + (err.message || err) + '\nลองส่งรูปนี้ใหม่อีกครั้ง'); }
      return;
    }
    // 🎙 ข้อความเสียง → AI ฟัง (นอกล็อก) แล้วทำเหมือนพิมพ์
    if (ev.type !== 'postback' && ev.message.type === 'audio') {
      try { lineVoice_(ev); }
      catch (err) { reply_(ev.replyToken, '🎙 ฟังเสียงไม่สำเร็จ: ' + (err.message || err) + '\nลองพิมพ์แทน หรือส่งเสียงใหม่อีกครั้ง'); }
      return;
    }
    if (ev.type === 'postback') {
      const lk = LockService.getScriptLock();
      if (!lk.tryLock(25000)) { reply_(ev.replyToken, 'ระบบกำลังยุ่ง แตะปุ่มเดิมอีกครั้งได้เลย'); return; }
      try {
        if (!routePostback_(ev)) billPostback_(ev);
      } catch (err) {
        reply_(ev.replyToken, 'ทำรายการไม่สำเร็จ: ' + (err.message || err));
      } finally {
        lk.releaseLock();
      }
      return;
    }
    if (ev.message.type !== 'text') return;

    const text = ev.message.text.trim();
    moneyLineText_(ev, text);
  });
}

/* ===================== แจ้งเตือน ===================== */

/** สรุปงานวันนี้ + งานค้าง + ใกล้กำหนด ส่ง 1 ข้อความตอนเช้า (ไม่มีอะไร = ไม่ส่ง) */
function morningSummary() {
  moneyMorning_();
}

function daysBetween_(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

/** เตือนงานที่ถึงเวลาใน 15 นาทีข้างหน้า รวมเป็น 1 ข้อความ */
function checkReminders() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    props.setProperty('LAST_TICK', stamp_());   // หน้าสถานะระบบ: รอบเตือนล่าสุด
    try { grpDaily_(); } catch (e) { console.warn('grpDaily: ' + e); }        // 👥 เตือนคนที่ยังไม่จ่ายในกลุ่ม 10:00
    try { weeklyBackup_(); } catch (e) { console.warn('backup: ' + e); }     // 💾 สำรองชีตทุกวันอาทิตย์
    try { splitMonthly_(); } catch (e) { console.warn('splitMonthly: ' + e); }  // 🗓 ชุดที่หารทุกเดือน
  } finally {
    lock.releaseLock();
  }
}

/* ===================== Google Calendar ===================== */

let BRIDGE_ERROR = '';
/** ขอรายการนัดจากสคริปต์สะพาน */
function bridgeEvents_(days) {
  const url = props.getProperty('BRIDGE_URL'), key = props.getProperty('BRIDGE_KEY');
  if (!url || !key) return [];
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'text/plain',
      payload: JSON.stringify({ key: key, days: days }),
      muteHttpExceptions: true, followRedirects: true,
    });
    const data = JSON.parse(res.getContentText());
    if (!data.ok) { BRIDGE_ERROR = data.error || 'ดึงไม่สำเร็จ'; return []; }
    return data.events || [];
  } catch (e) {
    BRIDGE_ERROR = 'เชื่อมต่อไม่ได้';
    return [];
  }
}

/** กด Run เพื่อทดสอบการเชื่อมสะพาน */
function testBridge() {
  const list = bridgeEvents_(14);
  Logger.log(BRIDGE_ERROR ? '❌ ' + BRIDGE_ERROR : '✅ ได้นัดจาก' + BRIDGE_LABEL + ' ' + list.length + ' นัด');
  list.slice(0, 5).forEach(b => Logger.log('• ' + b.start + ' ' + b.title));
}

/* ===================== รหัสผ่าน (เก็บเฉพาะข้อมูลที่เข้ารหัสแล้ว) ===================== */
// ถอดรหัสได้เฉพาะในเครื่องที่รู้รหัสหลักเท่านั้น หลังบ้านอ่านไม่ได้ และไม่มีคำสั่ง LINE ที่แตะส่วนนี้

const VAULT_HEADERS = ['id', 'iv', 'ct', 'updated'];

/** ตู้รหัสส่วนตัว (ตู้เดียว · ชื่อแท็บ/ค่าตั้งเดิมจากตอนย้ายมา) */
function vs_() {
  return { sheet: 'Vault2', salt: 'VAULT2_SALT', check: 'VAULT2_CHECK' };
}

function vaultSheet_(space) {
  const V = vs_(space);
  const id = props.getProperty('SHEET_ID');
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(V.sheet);
  if (!sh) {
    sh = ss.insertSheet(V.sheet);
    sh.getRange(1, 1, sh.getMaxRows(), VAULT_HEADERS.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, VAULT_HEADERS.length).setValues([VAULT_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.hideSheet();
  }
  return sh;
}

function vaultList_(space) {
  const V = vs_(space), sh = vaultSheet_(space);
  const last = sh.getLastRow();
  const items = last < 2 ? [] : sh.getRange(2, 1, last - 1, VAULT_HEADERS.length).getDisplayValues()
    .filter(r => r[0]).map(r => ({ id: r[0], iv: r[1], ct: r[2], updated: r[3] }));
  return { salt: props.getProperty(V.salt) || '', check: props.getProperty(V.check) || '', items: items };
}

function vaultInit_(salt, check, space) {
  const V = vs_(space);
  if (props.getProperty(V.salt)) throw new Error('ตั้งรหัสหลักไว้แล้ว');
  if (!/^[A-Za-z0-9+/=]{16,64}$/.test(String(salt || '')) || !check) throw new Error('ข้อมูลไม่ถูกต้อง');
  props.setProperty(V.salt, salt);
  props.setProperty(V.check, String(check));
  vaultSheet_(space);
}

function vaultSave_(it, space) {
  if (!props.getProperty(vs_(space).salt)) throw new Error('ยังไม่ได้ตั้งรหัสหลัก');
  if (!it || !/^[A-Za-z0-9]{8,64}$/.test(String(it.id || '')) || !it.iv || !it.ct) throw new Error('ข้อมูลไม่ถูกต้อง');
  if (String(it.ct).length > 40000) throw new Error('ข้อมูลยาวเกินไป');
  const sh = vaultSheet_(space);
  const row = [String(it.id), String(it.iv), String(it.ct), stamp_()];
  const last = sh.getLastRow();
  const ids = last < 2 ? [] : sh.getRange(2, 1, last - 1, 1).getDisplayValues().map(r => r[0]);
  const i = ids.indexOf(String(it.id));
  const r = i < 0 ? last + 1 : i + 2;
  sh.getRange(r, 1, 1, VAULT_HEADERS.length).setNumberFormat('@').setValues([row]);
}

/** นำเข้าหลายรายการ (รายการใหม่ทั้งหมด เข้ารหัสมาจากเครื่องแล้ว) */
function vaultSaveMany_(list, space) {
  if (!props.getProperty(vs_(space).salt)) throw new Error('ยังไม่ได้ตั้งรหัสหลัก');
  if (!Array.isArray(list) || !list.length) return 0;
  if (list.length > 500) throw new Error('นำเข้าได้ครั้งละไม่เกิน 500 รายการ');
  const now = stamp_();
  const rows = list.map(it => {
    if (!it || !/^[A-Za-z0-9]{8,64}$/.test(String(it.id || '')) || !it.iv || !it.ct || String(it.ct).length > 40000) throw new Error('ข้อมูลไม่ถูกต้อง');
    return [String(it.id), String(it.iv), String(it.ct), now];
  });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = vaultSheet_(space);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, VAULT_HEADERS.length).setNumberFormat('@').setValues(rows);
  } finally { lock.releaseLock(); }
  return rows.length;
}

/** ลืมรหัสหลัก: ลบรหัสหลักและรายการที่เข้ารหัสไว้ทั้งหมด (ถอดรหัสไม่ได้อยู่แล้ว) แล้วตั้งใหม่ได้ */
function vaultReset_(space) {
  const V = vs_(space), sh = vaultSheet_(space);
  const last = sh.getLastRow();
  const n = last < 2 ? 0 : last - 1;
  if (n) sh.deleteRows(2, n);
  props.deleteProperty(V.salt);
  props.deleteProperty(V.check);
  return n;
}

function vaultDelete_(id, space) {
  const sh = vaultSheet_(space);
  const last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues().map(r => r[0]);
  const i = ids.indexOf(String(id));
  if (i > -1) sh.deleteRow(i + 2);
}

/* ===================== Sheet ===================== */

/* ===================== LINE API ===================== */

let REPLY_PREFIX = '';   // 🎙 เสียง: ต่อหน้าข้อความตอบแรก
let LINE_SENDER = null;  // 🐱 ในกลุ่ม: ตอบในชื่อ/รูป "แมวกวัก" แทนชื่อบัญชี (Group.gs ตั้งค่า)
function line_(path, payload) {
  if (LINE_SENDER && payload && Array.isArray(payload.messages)) payload.messages.forEach(m => { if (!m.sender) m.sender = LINE_SENDER; });
  if (path === 'reply' && REPLY_PREFIX && payload && payload.messages && payload.messages[0] && payload.messages[0].type === 'text') {
    payload.messages[0].text = (REPLY_PREFIX + payload.messages[0].text).slice(0, 4900);
    REPLY_PREFIX = '';
  }
  const token = props.getProperty('LINE_TOKEN');
  if (!token || token.indexOf('ใส่') === 0) {
    console.warn('ยังไม่ได้ตั้ง LINE_TOKEN');
    return;
  }
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/' + path, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) console.error('LINE ' + path + ': ' + res.getContentText());
}

/** push = นับโควตา */
function push_(text) {
  const to = props.getProperty('LINE_USER_ID');
  if (!to) { console.warn('ยังไม่มี LINE_USER_ID (ให้ทักแชท OA ก่อน)'); return; }
  line_('push', { to: to, messages: [{ type: 'text', text: String(text).slice(0, 4900) }] });
  CacheService.getScriptCache().remove('quota');   // ให้ตัวนับโควตาอัปเดต
}

/** reply = ไม่นับโควตา (ส่งได้หลายข้อความในครั้งเดียว สูงสุด 5) */
function reply_(token, text) {
  const list = [].concat(text).slice(0, 5);
  line_('reply', { replyToken: token, messages: list.map(t => ({ type: 'text', text: String(t).slice(0, 4900) })) });
}

/* ===================== Helpers ===================== */

/** วันที่แบบย่อ ไม่มีปี เช่น 28/10 10:00 */
function fmt_(date, time) {
  let out = '';
  if (date) {
    const p = date.split('-');
    out = (+p[2]) + '/' + (+p[1]);
  }
  if (time) out += (out ? ' ' : '') + time;
  return out;
}

function todayStr_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function stamp_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"); }
function pad_(n) { return String(n).padStart(2, '0'); }
function addDays_(ymd, n) {
  const p = ymd.split('-').map(Number);
  return Utilities.formatDate(new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)), 'UTC', 'yyyy-MM-dd');
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ===================== 💾 สำรองชีตทุกสัปดาห์ ===================== */
/* วันอาทิตย์ตั้งแต่ 02:00 ทำสำเนาทั้งไฟล์ไว้ที่ "แมวกวัก - สำรองข้อมูล" (ข้างไฟล์ชีต) เก็บ 8 สัปดาห์ล่าสุด ตู้รหัสในชีตเป็นข้อมูลเข้ารหัสอยู่แล้ว */
function weeklyBackup_(force) {
  const now = new Date();
  const dow = Number(Utilities.formatDate(now, TZ, 'u')), hr = Number(Utilities.formatDate(now, TZ, 'H'));
  const ymd = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  if (!force && (dow !== 7 || hr < 2 || props.getProperty('BACKUP_SENT') === ymd)) return '';
  const id = props.getProperty('SHEET_ID') || SpreadsheetApp.getActiveSpreadsheet().getId();
  const src = DriveApp.getFileById(id);
  const NAME = 'แมวกวัก - สำรองข้อมูล';
  let folder;
  const fid = props.getProperty('BACKUP_FOLDER_ID');
  try { if (fid) folder = DriveApp.getFolderById(fid); } catch (e) { folder = null; }
  if (!folder || folder.isTrashed()) {
    const parent = src.getParents().hasNext() ? src.getParents().next() : DriveApp.getRootFolder();
    const it = parent.getFoldersByName(NAME);
    folder = it.hasNext() ? it.next() : parent.createFolder(NAME);
    props.setProperty('BACKUP_FOLDER_ID', folder.getId());
  }
  const copy = src.makeCopy(src.getName() + ' (สำรอง ' + ymd + ')', folder);
  // เก็บ 8 ฉบับล่าสุด (เฉพาะสำเนาที่ระบบสร้าง ชื่อขึ้นต้นตามไฟล์ต้นฉบับ + "(สำรอง ")
  const old = [], files = folder.getFiles(), pre = src.getName() + ' (สำรอง ';
  while (files.hasNext()) { const f = files.next(); if (f.getName().indexOf(pre) === 0) old.push(f); }
  old.sort((a, b) => b.getDateCreated() - a.getDateCreated()).slice(8).forEach(f => f.setTrashed(true));
  props.setProperty('BACKUP_SENT', ymd);
  return copy.getId();
}

/* ===================== 🩺 สถานะระบบ (บอกแค่ว่าตั้งค่าแล้วหรือยัง ไม่ส่งค่าลับออกไป) ===================== */
function statusInfo_() {
  const P = props.getProperties(), has = k => !!(P[k] && String(P[k]).trim() && String(P[k]).indexOf('ใส่') !== 0);
  let triggers = [];
  try { triggers = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()); } catch (e) {}
  let quota = null;
  try { quota = quota_(); } catch (e) {}
  const counts = {};
  try {
    const id = P.SHEET_ID, ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
    ss.getSheets().forEach(sh => { counts[sh.getName()] = Math.max(0, sh.getLastRow() - 1); });
  } catch (e) {}
  let mail = '';
  try { mail = Session.getEffectiveUser().getEmail(); } catch (e) {}
  return {
    ver: BACKEND_VER, now: stamp_(), account: mail,
    line: { token: has('LINE_TOKEN'), owner: has('LINE_USER_ID'), quota: quota },
    ai: (() => { const o = { key: has('GEMINI_API_KEY'), model: P.GEMINI_MODEL || AI_MODELS[0] }; try { o.health = aiHealthInfo_(); } catch (e) {} try { o.samples = aiSamples_().length; } catch (e) {} return o; })(),
    lastTick: P.LAST_TICK || '', weeklySent: P.WEEKLY_SENT || '', backup: P.BACKUP_SENT || '',
    vault: { personal: has('VAULT2_SALT') },
    triggers: triggers, rows: counts,
  };
}
