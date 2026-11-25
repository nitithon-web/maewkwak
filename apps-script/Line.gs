/**
 * แมวกวัก — คำสั่งพิมพ์ใน LINE OA แมวกวัก + สรุปเงินตอนเช้า
 */

const MONEY_HELP = [
  '🐱 วิธีใช้ แมวกวัก (จดเงิน)',
  '• จ่าย 120 ข้าวมันไก่ / ข้าว 60 → รายจ่าย',
  '• รับ 5000 เงินเดือน → รายรับ',
  '• ส่งรูปสลิป/ใบเสร็จ → AI อ่านให้ แล้วเลือก จ่าย/รับ/คืนเงิน',
  '• เงิน → สรุปเดือนนี้ · สรุปเดือน → ภาพรวม',
  '• ใครค้าง · ต้นยืม 500 · ต้นคืน 200 · หาร 1200 ชาบู เอ็ม เจ',
  '• ลิงก์ → ลิงก์เข้าแอปเงิน',
  '👥 ในกลุ่ม: เชิญแมวกวักเข้ากลุ่ม แล้วพิมพ์ แมวกวัก',
].join('\n');

/** ข้อความในแชทส่วนตัวของ OA แมวกวัก (ระบบเงิน) */
function moneyLineText_(ev, text) {
  const tk = ev.replyToken, lock = LockService.getScriptLock();
  if (/^(id|ไอดี)$/i.test(text)) return reply_(tk, ev.source.userId);
  if (/^(ช่วย|help|วิธีใช้|\?)$/i.test(text)) return reply_(tk, MONEY_HELP);
  if (/^(ลิงก์|ลิ้งค์|ลิงค์|link|แอป|app)$/i.test(text)) return reply_(tk, magicMsg_());
  if (/^(โควตา|โควต้า|quota)$/i.test(text)) return reply_(tk, quotaText_(quota_()));
  if (/^(สรุปเดือน|ภาพรวม|สรุปเดือนนี้|📊)$/.test(text)) return reply_(tk, moneyMonthText_());
  if (/^(เงิน|สรุปเงิน|รายรับรายจ่าย|รายรับ-รายจ่าย)$/.test(text)) return reply_(tk, moneySummaryText_());
  if (/^(รอจัด|รูป|รูปรอจัด)$/.test(text)) return billNextPending_(tk, '');
  if (/^(จ่าย|รับ|รายจ่าย|รายรับ)\s*[\d,]+(\.\d+)?(\s|บ|$)/.test(text) || /^(จ่าย|รายจ่าย|รายรับ)\s+\S.*\s[\d,]+(\.\d+)?\s*(บาท|บ\.?)?$/.test(text) || /^รับ\s+\S.*\s[\d,]+(\.\d+)?\s*(บาท|บ\.?)$/.test(text) || /^[+-]\s*\d/.test(text))
    return withLock_(lock, tk, () => saveAs_(tk, /^(รับ|รายรับ|\+)/.test(text) ? 'mi' : 'mo', text));
  if (/^(ใครค้าง|ค้าง|ค้างกัน|ใครติด|หนี้|🤝)$/.test(text) || /^หาร\s/.test(text) || /(ยืม|คืน)\s*[\d,]+/.test(text)) {
    if (!lock.tryLock(25000)) return reply_(tk, 'ระบบกำลังยุ่ง ส่งข้อความเดิมอีกครั้งได้เลย');
    let out = '';
    try { out = oweLineText_(text); } catch (err) { out = 'จดค้างกันไม่สำเร็จ: ' + (err.message || err); } finally { lock.releaseLock(); }
    if (out) return reply_(tk, out);
  }
  if (hasAmount_(text)) return withLock_(lock, tk, () => saveAs_(tk, 'mo', text));
  return reply_(tk, MONEY_HELP);
}

/** สรุปเดือน (เฉพาะเงิน) สำหรับ OA แมวกวัก */
function moneyMonthText_() {
  const o = monthMoney_(''), M = o.money, W = o.owe, m = todayStr_().slice(0, 7);
  const th = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][Number(m.slice(5, 7))];
  const out = ['📊 เงิน ' + th + ' ' + (Number(m.slice(0, 4)) + 543), '', '💰 รับ ' + fmtBaht_(M.inc) + ' · จ่าย ' + fmtBaht_(M.out) + ' · เหลือ ' + fmtBaht_(M.inc - M.out)];
  if (M.prevOut) out.push('   จ่าย' + (M.out >= M.prevOut ? 'มากกว่า' : 'น้อยกว่า') + 'เดือนก่อน ' + fmtBaht_(Math.abs(M.out - M.prevOut)));
  if (M.cats.length) out.push('   จ่ายมากสุด: ' + M.cats.slice(0, 3).map(([k, v]) => k + ' ' + fmtBaht_(v)).join(' · '));
  const over = M.budgets.filter(b => b.used > b.limit);
  if (over.length) out.push('   🔴 เกินงบ: ' + over.map(b => b.cat).join(', '));
  if (W.they || W.me) out.push('', '🤝 ค้างกัน: ใครค้างเรา ' + fmtBaht_(W.they) + ' · เราค้าง ' + fmtBaht_(W.me));
  return out.join('\n');
}

/** สรุปเช้าของ OA แมวกวัก (ส่งเฉพาะเมื่อมีเรื่อง) */
function moneyMorning_() {
  let money = '', owe = '';
  try { money = moneyDaily_(); } catch (e) { console.warn('moneyDaily: ' + e); }
  try { owe = oweDueLine_(); } catch (e) {}
  const q = quota_();
  const warn = q && q.limit && q.used >= q.limit * 0.8 ? quotaText_(q) : '';
  const msg = [money, owe, warn].filter(Boolean).join('\n\n');
  if (msg) push_(msg);
}

