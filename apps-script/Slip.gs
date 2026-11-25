/**
 * แมวกวัก — รูปสลิป/ใบเสร็จที่ส่งเข้า LINE: เก็บไว้ในโฟลเดอร์ รอจัด แล้วถามว่าเป็นรายจ่าย / รายรับ / คืนเงิน
 * อ่านรูปด้วย AI (Ai.gs) ไม่มี AI = OCR ของ Google Drive
 */

   // ขาดหลักฐาน / พร้อมเบิก / ยื่นแล้ว / ได้เงินแล้ว
   // แนบไฟล์อะไรก็ได้ = มีหลักฐานแล้ว (รวมสลิป/รูปแคป)

const KIND_NAME = { taxinv: 'ใบกำกับภาษี', receipt: 'ใบเสร็จ', cert: 'ใบรับรองแทนใบเสร็จ', slip: 'สลิป', other: 'หลักฐานอื่น' };

/* ===================== ส่งรูป/PDF ใบเสร็จผ่าน LINE ===================== */

const fmtBaht_ = n => '฿' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const cut_ = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/** ปุ่ม quick reply (ป้ายยาวได้ไม่เกิน 20 ตัว) */
function qr_(label, data, display) {
  return { type: 'action', action: { type: 'postback', label: cut_(label, 20), data: data, displayText: cut_(display || label, 300) } };
}
function replyQR_(token, text, items) {
  const msg = { type: 'text', text: String(text).slice(0, 4900) };
  if (items && items.length) msg.quickReply = { items: items.slice(0, 13) };
  line_('reply', { replyToken: token, messages: [msg] });
}

function billInbox_() {
  const root = moneyFolder_();
  const it = root.getFoldersByName('รอจัด');
  return it.hasNext() ? it.next() : root.createFolder('รอจัด');
}

/** เดาชนิดหลักฐานจากข้อความในเอกสาร */
function guessKind_(t) {
  if (/ใบกำกับภาษี|tax\s*invoice/i.test(t)) return 'taxinv';
  if (/โอนเงิน|โอนสำเร็จ|รายการสำเร็จ|transfer|พร้อมเพย์|promptpay|เลขที่รายการ/i.test(t)) return 'slip';
  if (/ใบรับรองแทนใบเสร็จ/.test(t)) return 'cert';
  return 'receipt';
}

/** ชื่อร้าน = บรรทัดแรกที่เป็นชื่อ (ไม่ใช่วันที่/ตัวเลข/หัวเอกสาร) */
function guessVendor_(t) {
  const lines = String(t || '').replace(/\ufeff/g, '').split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 15);
  // 1) บรรทัดที่ดูเป็นชื่อกิจการ
  const biz = /บริษัท|บจก|ห้างหุ้นส่วน|หจก|ร้าน|จำกัด|มหาชน|co\.?,?\s*ltd|limited|company|shop|store|cafe|café|coffee|hotel|โรงแรม|คลินิก|สถานี/i;
  const notName = /เลขประจำตัว|tax\s*id|ใบเสร็จ|ใบกำกับ|receipt|invoice|วันที่|ขอบคุณ|thank/i;
  let line = lines.find(s => s.length >= 3 && biz.test(s) && !notName.test(s));
  // 2) ไม่เจอ = บรรทัดแรกที่ไม่ใช่หัวเอกสาร/สาขา/ที่อยู่/ตัวเลข
  const skip = /ใบเสร็จ|ใบกำกับ|receipt|invoice|tax|เลขประจำตัว|วันที่|date|โทร|tel|สาขา|branch|pos|เลขที่|ที่อยู่|ถนน|แขวง|เขต|total|รวม|ยอด|เงินสด|cash|^[^0-9A-Za-z฀-๿]*$|^[\d\s\/:.,-]+$/i;
  // "7-ELEVEN สาขาสีลม" → "7-ELEVEN"
  if (!line) line = lines.map(s => s.replace(/\s*(สาขา|branch).*$/i, '').trim()).find(s => s.length >= 3 && !skip.test(s));
  return line ? cut_(line, 40) : '';
}

/** เดาหมวดจากข้อความในใบเสร็จ */
function guessCat_(t) {
  const rules = [
    ['ค่าห้องประชุม', /ห้องประชุม|meeting\s*room|conference|co-?working|เช่าห้อง|เช่าสถานที่/i],
    ['ที่พัก', /โรงแรม|hotel|resort|รีสอร์ท|ห้องพัก|agoda|booking\.com/i],
    ['เดินทาง', /grab|bolt|taxi|แท็กซี่|ทางด่วน|easy\s*pass|m-?pass|ค่าผ่านทาง|น้ำมัน|เชื้อเพลิง|แก๊สโซฮอล์|ดีเซล|ปตท|ptt|บางจาก|shell|caltex|ที่จอดรถ|parking|bts|mrt|สายการบิน|airasia|airways|ตั๋วเครื่องบิน/i],
    ['อาหาร/รับรอง', /อาหาร|กาแฟ|coffee|cafe|café|คาเฟ่|restaurant|ภัตตาคาร|เครื่องดื่ม|food|อเมริกาโน่|ลาเต้/i],
    ['อุปกรณ์/วัสดุ', /เครื่องเขียน|กระดาษ|หมึก|อุปกรณ์|วัสดุ|stationery|officemate|b2s/i],
  ];
  const r = rules.find(x => x[1].test(String(t || '')));
  return r ? r[0] : '';
}

/** รับรูป/ไฟล์จากแชท → เก็บใน Drive → อ่านใบเสร็จ → ให้แตะเลือกบิล */
function billFromLineMedia_(ev) {
  const msg = ev.message;
  let mime = 'image/jpeg', name = 'line-' + msg.id + '.jpg';
  if (msg.type === 'file') {
    if (!/\.pdf$/i.test(msg.fileName || '')) { reply_(ev.replyToken, 'รองรับเฉพาะรูปและไฟล์ PDF'); return; }
    mime = 'application/pdf';
    name = msg.fileName;
  }
  const res = UrlFetchApp.fetch('https://api-data.line.me/v2/bot/message/' + msg.id + '/content', {
    headers: { Authorization: 'Bearer ' + props.getProperty('LINE_TOKEN') }, muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('ดาวน์โหลดไฟล์จาก LINE ไม่ได้');
  const blob = res.getBlob().setName(name);
  if (msg.type === 'image' && /^image\//.test(blob.getContentType() || '')) mime = blob.getContentType();
  const file = billInbox_().createFile(blob);
  const fid = file.getId();

  let ocr = {};
  try { ocr = readDoc_(file, { cats: moneyCatList_('out').map(c => 'ส่วนตัว:' + c) }); } catch (e) { ocr = {}; }
  // หมวดส่วนตัวที่ AI เลือก (ส่วนตัว:อาหาร) ใช้ตอนกด "💸 จ่ายส่วนตัว"
  if (/^ส่วนตัว:/.test(ocr.cat || '')) { ocr.mcat = ocr.cat.slice(7); ocr.cat = ''; }
  const kind = ocr.kind || 'receipt';
  const vendor = ocr.vendor || '';
  delete ocr.text;
  CacheService.getScriptCache().put('pend:' + fid, JSON.stringify({ mime: mime, ocr: ocr, kind: kind, vendor: vendor }), 21600);

  const n = billPendingIds_().length;
  line_('reply', { replyToken: ev.replyToken, messages: [billPendPrompt_(fid, n > 1 ? n : 0)] });
}

/** รูปที่ยังรอจัด = ไฟล์ในโฟลเดอร์ "รอจัด" (เก่าสุดก่อน) */
function billPendingIds_() {
  const out = [], it = billInbox_().getFiles();
  while (it.hasNext()) { const f = it.next(); if (!f.isTrashed()) out.push([f.getDateCreated().getTime(), f.getId()]); }
  return out.sort((a, b) => a[0] - b[0]).map(x => x[1]);
}

/** ข้อความ + ปุ่มเลือกบิลของรูปหนึ่งรูป (LINE แสดงปุ่มได้เฉพาะข้อความล่าสุด) */
function billPendPrompt_(fid, waiting) {
  let pend = {};
  try { pend = JSON.parse(CacheService.getScriptCache().get('pend:' + fid) || '{}'); } catch (e) {}
  const ocr = pend.ocr || {}, kind = pend.kind || 'receipt', vendor = pend.vendor || '';
  const amt = Number(ocr.amount || 0);
  const items = [];
  items.push(qr_('💸 จ่าย' + (amt ? ' ' + fmtBaht_(amt) : ''), 'mout|' + fid, 'จดเป็นรายจ่าย'));
  items.push(qr_('💰 รายรับ' + (amt ? ' ' + fmtBaht_(amt) : ''), 'min|' + fid, 'จดเป็นรายรับ'));
  if (kind === 'slip' || ocr.docType === 'slip') { try { oweSlipButtons_(fid, amt, [vendor, ocr.memo, ocr.desc].join(' ')).forEach(b => items.push(b)); } catch (e) {} }
  items.push(qr_('🗑 ไม่ใช้', 'drop|' + fid, 'ไม่ใช้รูปนี้'));

  const got = [ocr.date ? fmt_(ocr.date, '') : '', amt ? fmtBaht_(amt) : '', vendor, ocr.memo ? '📝 ' + ocr.memo : (ocr.desc && ocr.desc !== vendor ? ocr.desc : '')].filter(Boolean).join(' · ');
  const text = (got ? '🧾 ดูเหมือน' + (KIND_NAME[kind] || 'ใบเสร็จ') + (ocr.via === 'ai' ? ' (AI อ่าน)' : '') + '\nอ่านได้: ' + got : '📷 ได้รับรูปแล้ว (ไม่เจอวันที่/ยอดเงิน)') +
    '\n\nรูปนี้คืออะไร? แตะเลือก 💸 จ่าย / 💰 รับ' + (kind === 'slip' ? ' / 💵 คืนจาก…' : '') +
    (waiting > 1 ? '\n\n📥 มีรูปรอจัด ' + waiting + ' รูป จัดทีละรูป รูปถัดไปจะขึ้นเอง' : '');
  const msg = { type: 'text', text: text.slice(0, 4900) };
  msg.quickReply = { items: items.slice(0, 13) };
  return msg;
}

/** ตอบกลับ (ข้อความที่ทำเสร็จ) + ถ้ายังมีรูปรอจัด ให้เลือกบิลของรูปถัดไปต่อเลย */
function billNextPending_(token, doneText, doneItems) {
  const ids = billPendingIds_();
  const msgs = [];
  if (doneText) msgs.push({ type: 'text', text: String(doneText).slice(0, 4900) });
  if (ids.length) {
    msgs.push(billPendPrompt_(ids[0], ids.length));
  } else if (doneText) {
    if (doneItems && doneItems.length) msgs[0].quickReply = { items: doneItems.slice(0, 13) };
  } else {
    msgs.push({ type: 'text', text: '👍 ไม่มีรูปรอจัดแล้ว' });
  }
  line_('reply', { replyToken: token, messages: msgs });
}

/** ปุ่มที่แตะในแชท */
function billPostback_(ev) {
  const p = String(ev.postback && ev.postback.data || '').split('|');
  const cache = CacheService.getScriptCache();
  if (p[0] === 'orep') { owePostback_(ev, p); return; }
  if (p[0] === 'mout' || p[0] === 'min') {
    const fid = p[1];
    let pend = {};
    try { pend = JSON.parse(cache.get('pend:' + fid) || '{}'); } catch (e) {}
    let file;
    try { file = DriveApp.getFileById(fid); } catch (e) { reply_(ev.replyToken, 'ไม่พบรูปนี้แล้ว ลองส่งใหม่'); return; }
    if (file.isTrashed() || (file.getParents().hasNext() && file.getParents().next().getName() !== 'รอจัด')) { reply_(ev.replyToken, 'รูปนี้จัดไปแล้ว'); return; }
    const it = moneyFromPending_(fid, p[0] === 'min' ? 'in' : 'out', pend);
    cache.remove('pend:' + fid);
    billNextPending_(ev.replyToken, moneyLineAfter_(it) + (Number(it.amount) ? '' : '\n⚠️ อ่านยอดไม่ได้ ใส่ยอดได้ในแอป หน้า 💰'));
    return;
  }
  if (p[0] === 'drop') {
    try { DriveApp.getFileById(p[1]).setTrashed(true); } catch (e) {}
    billNextPending_(ev.replyToken, '🗑 ไม่ใช้รูปนี้แล้ว');
  }
}

/* ===================== อ่านหลักฐาน (OCR ของ Google Drive) ===================== */

/** แปลงรูป/PDF เป็นข้อความชั่วคราวผ่าน Google Docs แล้วทิ้งเอกสารชั่วคราว */
function ocrText_(file) {
  const tmp = Drive.Files.create(
    { name: 'ocr-tmp-' + file.getId(), mimeType: 'application/vnd.google-apps.document' },
    file.getBlob(), { ocrLanguage: 'th', fields: 'id' });
  try {
    // ดึงเป็นข้อความตรงๆ (เร็วกว่าเปิดเป็น Google Doc)
    const r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + tmp.id + '/export?mimeType=text/plain', {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true,
    });
    if (r.getResponseCode() === 200) return r.getContentText('UTF-8');
    return DocumentApp.openById(tmp.id).getBody().getText();
  } finally {
    try { DriveApp.getFileById(tmp.id).setTrashed(true); } catch (e) {}
  }
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const EN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** หา วันที่ และ ยอดรวม จากข้อความในใบเสร็จ { date:'yyyy-mm-dd', amount:'123.45' } */
function readReceipt_(text) {
  const t = String(text || '').replace(/\u00a0/g, ' ');
  const amount = findAmount_(t), v = findVat_(t, amount);
  return { date: findDate_(t), amount: amount, vendor: guessVendor_(t), kind: t ? guessKind_(t) : '', cat: guessCat_(t), vat: v.vat, vatAmt: v.vatAmt };
}

function fixYear_(y) {
  y = Number(y);
  if (y > 2400) return y - 543;                 // พ.ศ. 4 หลัก
  if (y < 100) return y >= 50 ? 2500 + y - 543 : 2000 + y;   // 69 = 2569 = 2026, 26 = 2026
  return y;
}

function findDate_(t) {
  const today = todayStr_(), cands = [];
  const push = (y, m, d) => {
    y = fixYear_(y); m = Number(m); d = Number(d);
    if (m < 1 || m > 12 || d < 1 || d > 31) return;
    const s = y + '-' + pad_(m) + '-' + pad_(d);
    const age = daysBetween_(s, today);
    if (age >= -1 && age <= 400) cands.push(s);   // ไม่อยู่อนาคต ไม่เก่าเกิน ~1 ปี
  };
  let m;
  const re1 = /(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/g;                          // 2026-10-28
  while ((m = re1.exec(t))) push(m[1], m[2], m[3]);
  const re2 = /(?:^|[^\d])(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?!\d)/g;      // 28/10/2569, 28-10-26
  while ((m = re2.exec(t))) push(m[3], m[2], m[1]);
  const thAll = TH_MONTHS.map(x => x.replace(/\./g, '\\.?')).concat(TH_MONTHS_FULL).join('|');
  const re3 = new RegExp('(\\d{1,2})\\s*(' + thAll + ')\\s*(\\d{2,4})', 'g');    // 28 ต.ค. 69 / 28 ตุลาคม 2569
  while ((m = re3.exec(t))) {
    const key = m[2].replace(/\./g, '');
    let mi = TH_MONTHS.findIndex(x => x.replace(/\./g, '') === key);
    if (mi < 0) mi = TH_MONTHS_FULL.indexOf(m[2]);
    if (mi > -1) push(m[3], mi + 1, m[1]);
  }
  const re4 = /(\d{1,2})[\s-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,-]*(\d{2,4})/gi;   // 28 Oct 2026
  while ((m = re4.exec(t))) push(m[3], EN_MONTHS.indexOf(m[2].toLowerCase()) + 1, m[1]);
  const re5 = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/gi;          // Oct 28, 2026
  while ((m = re5.exec(t))) push(m[3], EN_MONTHS.indexOf(m[1].toLowerCase()) + 1, m[2]);
  return cands.length ? cands[0] : '';
}

function findAmount_(t) {
  const num = s => Number(String(s).replace(/[,\s]/g, ''));
  const lines = t.split(/\n+/);
  const KEY = /(รวมทั้งสิ้น|ยอดสุทธิ|ยอดรวม|จำนวนเงินรวม|รวมเงิน|ยอดชำระ|ยอดที่ชำระ|ชำระเงิน|จำนวนเงิน|grand\s*total|net\s*total|total|amount\s*paid|amount)/i;
  const MONEY = /(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2}|\d+)/g;
  let best = 0;
  lines.forEach((ln, i) => {
    if (!KEY.test(ln) || /vat|ภาษีมูลค่าเพิ่ม|ส่วนลด|discount|เงินทอน|change|รับเงิน|cash/i.test(ln)) return;
    const pick = (s) => (s.match(MONEY) || []).map(num).filter(v => v > 0 && v < 10000000);
    let vals = pick(ln);
    if (!vals.length && lines[i + 1]) vals = pick(lines[i + 1]);   // ตัวเลขอยู่บรรทัดถัดไป
    vals.forEach(v => { if (v > best) best = v; });
  });
  return best ? String(Math.round(best * 100) / 100) : '';
}

/** มี VAT ไหม และยอด VAT เท่าไหร่ (จากข้อความในเอกสาร) */
function findVat_(t, total) {
  t = String(t || '');
  if (!t.trim()) return { vat: '', vatAmt: '' };
  const has = /ภาษีมูลค่าเพิ่ม|\bvat\b|tax\s*invoice|ใบกำกับภาษี/i.test(t);
  if (!has) return { vat: total ? 'no' : '', vatAmt: '' };
  const num = s => Number(String(s).replace(/[,\s]/g, ''));
  const lines = t.split(/\n+/);
  let amt = 0;
  lines.forEach((ln, i) => {
    if (amt || !/ภาษีมูลค่าเพิ่ม|\bvat\b/i.test(ln) || /ไม่รวม|ก่อน|excl|before|รวมภาษี|incl/i.test(ln)) return;
    const pick = s => (s.replace(/\d+(\.\d+)?\s*%/g, ' ').match(/\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/g) || []).map(num).filter(v => v > 0);
    let vals = pick(ln);
    if (!vals.length && lines[i + 1]) vals = pick(lines[i + 1]);
    const ok = vals.filter(v => !total || v < Number(total) * 0.2);   // VAT 7% ≈ 6.5% ของยอดรวม
    if (ok.length) amt = ok[ok.length - 1];
  });
  if (!amt && total) amt = Math.round(Number(total) * 7 / 107 * 100) / 100;   // คำนวณจากยอดรวม
  return { vat: 'yes', vatAmt: amt ? String(amt) : '' };
}

