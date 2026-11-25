/* ===================== 📌 กล่องฝาก (ลิงก์ / โน้ต / รูป ที่ไม่ใช่งาน) + แยกประเภทข้อความจาก LINE ===================== */

   // remind = วันให้กลับมาดู · ocr = ข้อความในรูป (ไว้ค้นหา)   // data = JSON ของ 📇 การ์ดข้อมูล / 📋 บันทึกประชุม

/* ===================== LINE: เดาประเภทข้อความ แล้วเปลี่ยนได้ในแตะเดียว ===================== */

const KIND_LABEL = { mo: '💸 รายจ่าย', mi: '💰 รายรับ' };

function srcPut_(id, text) { try { CacheService.getScriptCache().put('src:' + id, String(text).slice(0, 2000), 21600); } catch (e) {} }

function hasAmount_(text) { return /\d/.test(String(text).replace(/\d{1,2}[:.]\d{2}|\d{1,2}\/\d{1,2}/g, '')); }

/** ปุ่ม "เปลี่ยนเป็น…" ต่อท้ายทุกครั้งที่บันทึก */
function changeItems_(from, id, src) {
  const items = [];
  ['mo', 'mi'].filter(k => k !== from).forEach(k => {
    if ((k === 'mo' || k === 'mi') && !hasAmount_(src)) return;
    items.push(qr_('↔ ' + KIND_LABEL[k], 'chg|' + from + '|' + id + '|' + k, 'เปลี่ยนเป็น' + KIND_LABEL[k].replace(/^\S+\s/, '')));
  });
  items.push(qr_('🗑 ยกเลิก', 'chg|' + from + '|' + id + '|x', 'ยกเลิกรายการนี้'));
  return items;
}

/** บันทึกตามประเภทที่เลือก แล้วตอบพร้อมปุ่มเปลี่ยน · คืน false ถ้าทำไม่ได้ (เช่น ไม่มียอดเงิน) */
function saveAs_(token, kind, src, prefix) {
  const it = moneyFromChat_((kind === 'mi' ? 'รับ ' : 'จ่าย ') + String(src).replace(/^(จ่าย|รับ|รายจ่าย|รายรับ|[+-])\s*/, ''));
  if (!it) { reply_(token, 'ไม่มียอดเงินในข้อความ ลองพิมพ์ เช่น จ่าย 120 ข้าว'); return false; }
  srcPut_(it.id, src);
  replyQR_(token, (prefix ? prefix + '\n' : '') + moneyLineAfter_(it), changeItems_(kind === 'mi' ? 'mi' : 'mo', it.id, src));
  return true;
}

/** ข้อความเดิมของรายการ (จากแคช หรือสร้างจากข้อมูลที่บันทึกไว้) */
function srcOf_(kind, id) {
  if (kind !== 'mo' && kind !== 'mi') return { ok: false };
  const c = CacheService.getScriptCache().get('src:' + id);
  const m = moneyAll_().find(x => x.id === id);
  return m ? { ok: true, src: c || (m.note + ' ' + m.amount) } : { ok: false };
}

function removeAs_(kind, id) {
  if (kind === 'mo' || kind === 'mi') moneyDelete_(id);
}

function withLock_(lock, token, fn) {
  if (!lock.tryLock(15000)) return reply_(token, 'ระบบกำลังยุ่ง ลองส่งอีกครั้ง');
  try { return fn(); } finally { lock.releaseLock(); }
}

/** ปุ่มของระบบแยกประเภท (เรียกขณะถือล็อกอยู่แล้ว) · คืน true = จัดการแล้ว */
function routePostback_(ev) {
  const p = String(ev.postback && ev.postback.data || '').split('|');
  const cache = CacheService.getScriptCache();
  if (p[0] === 'as') {
    const src = cache.get('ask:' + p[2]);
    if (!src) { reply_(ev.replyToken, 'เลือกไปแล้ว หรือข้อความนี้เก่าเกินไป ลองพิมพ์ใหม่'); return true; }
    if (saveAs_(ev.replyToken, p[1], src)) cache.remove('ask:' + p[2]);
    return true;
  }
  if (p[0] === 'chg') {
    const from = p[1], id = p[2], to = p[3];
    const s = srcOf_(from, id);
    if (!s.ok) { reply_(ev.replyToken, 'รายการนี้ถูกเปลี่ยนหรือลบไปแล้ว'); return true; }
    if (to === 'x') { removeAs_(from, id); reply_(ev.replyToken, '🗑 ยกเลิกแล้ว (ไม่ได้บันทึก)'); return true; }
    if (saveAs_(ev.replyToken, to, s.src, '↔ เปลี่ยนจาก' + KIND_LABEL[from].replace(/^\S+\s/, '') + 'แล้ว')) removeAs_(from, id);
    return true;
  }
  return false;
}

