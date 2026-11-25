/* แมวกวัก — หารกันในกลุ่ม LINE (แอปเล็กในไลน์ / LIFF)
 * โหมดคนจ่ายก่อน: สร้างบิล ตั้งยอดทุกคน ติดตาม ยืนยันได้เงิน ทวง
 * โหมดคนที่ต้องจ่าย: เห็นเฉพาะยอดของตัวเอง เลือกจ่าย โอน/สแกน QR (แนบสลิปให้ตรวจ) หรือ เงินสด แล้วกด ฉันจ่ายแล้ว
 * ยืนยันตัวตนด้วย ID token ของ LINE (ไม่มี key ในหน้านี้) · ?dev=Uxxxx = ทดสอบนอกไลน์ (หลังบ้านต้องเปิด HK_DEV)
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbwzD8Bffxcrd4Md_RgM-XcxiBWssGCvqV3zasNlXL-UR1Ulet2XySmBAz5MV6iERtJA/exec';   // 💰 ระบบเงิน (nitithon.see)
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toS = v => Math.round(Number(String(v == null ? '' : v).replace(/[,\s฿]/g, '')) * 100) || 0;
const baht = s => '฿' + (s / 100).toLocaleString('th-TH', { minimumFractionDigits: s % 100 ? 2 : 0, maximumFractionDigits: 2 });
const plain = s => (s / 100).toFixed(2).replace(/\.00$/, '');
const thDate = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }); } catch (e) { return d; } };
const CHECK = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.3l2.6 2.6L11 4.2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';

/** ธนาคาร: ป้ายวงกลมสีประจำธนาคาร + ตัวย่อ (ไม่ใช่โลโก้จริง) · รหัสตรงกับ HK_BANKS ใน Group.gs */
const BANKS = [['kbank', 'กสิกรไทย', 'KB', '#1b8a3a'], ['scb', 'ไทยพาณิชย์', 'SCB', '#4e2a84'], ['bbl', 'กรุงเทพ', 'BBL', '#1e4598'], ['ktb', 'กรุงไทย', 'KTB', '#0e9bd8'],
  ['bay', 'กรุงศรีอยุธยา', 'BAY', '#f2b705', '#3b2a00'], ['ttb', 'ทหารไทยธนชาต', 'ttb', '#1450e0'], ['gsb', 'ออมสิน', 'GSB', '#e0157f'], ['baac', 'ธ.ก.ส.', 'ธกส', '#3f8f3a'],
  ['ghb', 'อาคารสงเคราะห์', 'GHB', '#f07c00'], ['uob', 'ยูโอบี', 'UOB', '#0b3979'], ['cimb', 'ซีไอเอ็มบี', 'CIMB', '#7b1f2b'], ['kkp', 'เกียรตินาคินภัทร', 'KKP', '#5b4f96'],
  ['lhb', 'แลนด์ แอนด์ เฮ้าส์', 'LH', '#5f6368'], ['tisco', 'ทิสโก้', 'TISCO', '#12549f'], ['icbc', 'ไอซีบีซี', 'ICBC', '#c40d1e'], ['other', 'อื่นๆ', '฿', '#5f645e']];
const bankOf = c => BANKS.find(b => b[0] === c) || BANKS[BANKS.length - 1];
/** ป้ายธนาคาร: ถ้ามีไฟล์ banks/<รหัส>.png (เจ้าของใส่เอง) จะโชว์รูปนั้นทับ ไม่มี = วงกลมสี+ตัวย่อ */
const bankBadge = (c, size) => { const b = bankOf(c), z = size || 36; return `<span aria-hidden="true" style="position:relative;width:${z}px;height:${z}px;border-radius:50%;background:${b[3]};color:${b[4] || '#fff'};display:inline-grid;place-items:center;flex:none;overflow:hidden;font:700 ${Math.round(z * (b[2].length > 3 ? 0.26 : 0.32))}px Anuphan,sans-serif;letter-spacing:-.2px">${b[2]}<img src="banks/${b[0]}.png" alt="" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#fff"></span>`; };
const fmtAcct = a => String(a).length === 10 ? a.replace(/^(\d{3})(\d)(\d{5})(\d)$/, '$1-$2-$3-$4') : a;
async function copyText(t, msg) { try { await navigator.clipboard.writeText(t); toast(msg || 'คัดลอกแล้ว'); } catch (e) { prompt('คัดลอกจากช่องนี้', t); } }

let Q = new URLSearchParams(location.search);
let IDT = '', LIFF = false, G = '';
let home = null, view = null, stack = [];

/* ---------- ต่อระบบ ---------- */
async function call(action, payload) {
  const res = await fetch(window.HK_API || API_URL, { method: 'POST', body: JSON.stringify(Object.assign({ action, idt: IDT, g: G }, payload || {})), redirect: 'follow' });
  const d = await res.json();
  if (!d.ok) throw new Error(d.error || 'ทำรายการไม่สำเร็จ');
  return d;
}
function toast(t) {
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = t;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
}
function busy(btn, on) { if (!btn) return; btn.disabled = on; if (on) { btn.dataset.t = btn.textContent; btn.textContent = 'กำลังส่ง…'; } else if (btn.dataset.t) btn.textContent = btn.dataset.t; }
async function postToChat(msgs) {
  if (!LIFF || !liff.isInClient()) return false;
  const ctx = liff.getContext && liff.getContext();
  if (!ctx || !/^(group|room|utou)$/.test(ctx.type)) return false;
  try { await liff.sendMessages([].concat(msgs)); return true; } catch (e) { console.warn(e); return false; }
}

async function boot() {
  try {
    if (Q.get('dev')) IDT = 'dev:' + Q.get('dev');
    else {
      if (!window.liff) throw new Error('เปิดหน้านี้จากในไลน์ครับ');
      const cfg = await call('hk_cfg');
      if (!cfg.liffId) throw new Error('ยังไม่ได้ตั้งค่าแอปหารกัน');
      await liff.init({ liffId: cfg.liffId });
      LIFF = true;
      if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
      IDT = liff.getIDToken();
      Q = new URLSearchParams(location.search);
    }
    G = Q.get('g') || '';
    try { if (location.search && !Q.get('dev')) history.replaceState(history.state, '', location.pathname); } catch (e) {}   // ซ่อนลิงก์ยาว ?liff.state=… (จำค่าไว้ใน Q แล้ว)
    await loadHome();
    if (Q.get('b')) await openBill(Q.get('b'), true);
    else if (Q.get('p')) await openPool(Q.get('p'), true);
    else if (Q.get('v') === 'new' && home.group) openCreate(null, true);
    else show('home', true);
  } catch (e) { $('#app').innerHTML = `<div class="sec msg">${esc(e.message)}</div>`; }
}
async function loadHome() { home = await call('hk_home'); }

/* ---------- เปลี่ยนหน้า ---------- */
function show(v, root) {
  if (root) stack = []; else if (view) stack.push(view);
  view = v; draw();
}
function back() { view = stack.pop() || { name: 'home' }; if (typeof view === 'string') view = { name: view }; draw(); }
$('#back').onclick = back;
$('#meBtn').onclick = () => openMe();
function draw() {
  if (typeof view === 'string') view = { name: view };
  $('#back').classList.toggle('hide', !stack.length);
  $('#foot').classList.add('hide');
  scrollTo(0, 0);
  ({ home: drawHome, create: drawCreate, track: drawTrack, pay: drawPay, poolNew: drawPoolNew, pool: drawPool }[view.name] || drawHome)();
}
function foot(html) { $('#footIn').innerHTML = html; $('#foot').classList.remove('hide'); }

/* ===================== ยอดของฉัน ===================== */
function drawHome() {
  $('#ttl').textContent = home.group && home.group.name ? 'หารกัน · ' + home.group.name : 'หารกัน';
  const due = home.owe.reduce((s, x) => s + x.dueS, 0), get = home.get.reduce((s, x) => s + x.leftS, 0);
  const oweRows = home.owe.map(x => `<button class="row-btn item" type="button" data-bill="${esc(x.id)}">
      <div class="mid"><div class="nm">${esc(x.title)} → ${esc(x.payer)}</div><div class="lbl">${esc([x.group, thDate(x.date)].filter(Boolean).join(' · '))}</div></div>
      ${x.st === 'wait' ? `<div class="amt">${baht(x.dueS)}</div>` : `<span class="pill ${x.st === 'ok' ? 'ok' : 'soft'}">${x.st === 'ok' ? 'ได้รับแล้ว' : 'แจ้งจ่ายแล้ว'}</span>`}</button>`).join('');
  const getRows = home.get.map(x => `<button class="row-btn item" type="button" data-bill="${esc(x.id)}">
      <div class="mid"><div class="nm">${esc(x.title)}</div><div class="lbl">${esc([x.group, thDate(x.date)].filter(Boolean).join(' · '))} · ได้แล้ว ${x.okN}/${x.n}${x.toldN ? ' · แจ้งโอน ' + x.toldN + ' คน' : ''}</div></div>
      ${x.leftS ? `<div class="amt">${baht(x.leftS)}</div>` : '<span class="pill ok">ครบแล้ว</span>'}</button>`).join('');
  $('#app').innerHTML = `
    <h1>ยอดของฉัน</h1>
    <div class="hero">
      <div class="sec"><div class="lbl">ต้องจ่าย</div><div class="big">${baht(due)}</div><div class="lbl">${home.owe.filter(x => x.st === 'wait').length} บิล</div></div>
      <div class="dark"><div class="lbl">รอรับคืน</div><div class="big">${baht(get)}</div><div class="lbl">${home.get.filter(x => x.leftS).length} บิล · ฉันจ่ายก่อน</div></div>
    </div>
    <div class="sec list"><div class="sec-h">ต้องจ่าย</div>${oweRows || '<div class="empty">ไม่มียอดที่ต้องจ่าย</div>'}</div>
    <div class="sec list"><div class="sec-h">รอรับคืน (ฉันจ่ายก่อน)</div>${getRows || '<div class="empty">ยังไม่มีบิลที่คุณจ่ายก่อน</div>'}</div>
    ${home.group ? `<div class="sec list"><div class="sec-h">🏦 กองกลางในกลุ่มนี้</div>${(home.pools || []).map(x => `<button class="row-btn item" type="button" data-pool="${esc(x.id)}"><div class="mid"><div class="nm">${esc(x.name)}${x.status === 'closed' ? ' <span class="pill soft">ปิดแล้ว</span>' : ''}</div><div class="lbl">${esc(x.holder)}ถือกอง${x.myBalS ? ' · ของฉัน' + (x.myBalS > 0 ? 'เหลือ ' : 'ใช้เกิน ') + baht(Math.abs(x.myBalS)) : ''}</div></div><div class="amt">${baht(x.leftS)}</div></button>`).join('') || '<div class="empty">ยังไม่มีกองกลาง</div>'}<button class="row-btn item" type="button" id="newPool"><span class="lnk" style="padding:0">+ สร้างกองกลาง (ทุกคนลงเงินก่อน แล้วจ่ายจากกอง)</span></button></div>` : ''}
    ${home.me.ppSet || home.me.qr || home.me.qrImg || home.me.bank ? '' : `<button class="row-btn sec item" type="button" id="setPay"><div class="mid"><div class="nm">ตั้งช่องทางรับเงิน</div><div class="lbl">อัปรูป QR ใส่พร้อมเพย์ หรือเลขบัญชีธนาคาร เพื่อนจะได้จ่ายง่าย</div></div><span class="lnk">ตั้งเลย</span></button>`}`;
  $('#app').querySelectorAll('[data-bill]').forEach(b => b.onclick = () => openBill(b.dataset.bill));
  $('#app').querySelectorAll('[data-pool]').forEach(b => b.onclick = () => openPool(b.dataset.pool));
  const np = $('#newPool'); if (np) np.onclick = () => { ps = { name: '', each: '', my: '', equal: true, people: ((home.group && home.group.members) || []).map(m => ({ uid: m.uid, name: m.name, on: false, inS: '' })) }; show({ name: 'poolNew' }); };
  const sp = $('#setPay'); if (sp) sp.onclick = () => openMe();
  foot(home.group ? '<button class="btn ink" type="button" id="newBill">สร้างบิลใหม่ (ฉันจ่ายก่อน)</button>' : '<div class="lbl" style="text-align:center">สร้างบิลได้จากในกลุ่ม: พิมพ์ หาร แล้วกดสร้างบิลใหม่</div>');
  const nb = $('#newBill'); if (nb) nb.onclick = () => openCreate();
}

async function openBill(id, root) {
  $('#app').innerHTML = '<div class="msg"><div class="spin" role="status" aria-label="กำลังโหลด"></div></div>';
  try {
    const d = await call('hk_bill', { b: id });
    show({ name: d.bill.isPayer ? 'track' : 'pay', bill: d.bill }, root);
  } catch (e) { $('#app').innerHTML = `<div class="sec msg">${esc(e.message)}</div>`; if (!root) setTimeout(() => draw(), 1800); }
}

/* ===================== โหมดคนจ่ายก่อน: สร้าง / แก้บิล ===================== */
let cs = null;
/* 🏷 หมวด → หมวดย่อย (แตะแล้วตั้งชื่อบิล + วิธีหารให้) · ตรงกับหมวดในแอป (scat.js) */
const HK_CATS = [
  ['food', '🍜', 'อาหาร', [['ชาบู/หมูกระทะ', 'items'], ['ร้านอาหาร', 'items'], ['เดลิเวอรี่', 'items'], ['กาแฟ/ขนม', 'items']]],
  ['mart', '🏪', 'เซเว่น', [['เซเว่น', 'items'], ['ซูเปอร์มาร์เก็ต', 'items']]],
  ['sport', '🏸', 'กีฬา', [['ค่าคอร์ท', 'hours', 'ชม.', 1], ['ลูกแบด', 'equal', 'ลูก', 1], ['ค่าสนาม', 'hours', 'ชม.', 1], ['ฟุตซอล', 'hours', 'ชม.', 1], ['ค่าน้ำ/น้ำแข็ง', 'equal']]],
  ['karaoke', '🎤', 'คาราโอเกะ', [['ค่าห้อง', 'hours', 'ชม.', 1], ['เครื่องดื่ม', 'equal'], ['อาหาร', 'items']]],
  ['drink', '🍻', 'ปาร์ตี้', [['เบียร์/เหล้า', 'equal'], ['มิกเซอร์/น้ำแข็ง', 'equal'], ['ค่าเข้าร้าน', 'equal']]],
  ['ride', '🚕', 'เดินทาง', [['แท็กซี่/Grab', 'equal'], ['ค่าน้ำมัน', 'equal'], ['ทางด่วน', 'equal'], ['ค่าจอดรถ', 'equal']]],
  ['trip', '🧳', 'ทริป', [['ค่าที่พัก', 'hours', 'คืน', 1], ['เช่ารถ', 'hours', 'วัน', 1], ['ค่าตั๋ว', 'equal'], ['ค่ากิจกรรม', 'equal']]],
  ['movie', '🎬', 'หนัง', [['ตั๋วหนัง', 'equal'], ['ป๊อปคอร์น', 'equal']]],
  ['home', '🏠', 'บ้าน', [['ค่าเน็ต', 'equal'], ['ค่าไฟ', 'equal'], ['ค่าน้ำ', 'equal'], ['Netflix/YouTube', 'equal'], ['ค่าส่วนกลาง', 'equal']]],
  ['gift', '🎁', 'ของขวัญ', [['ของขวัญวันเกิด', 'equal'], ['เค้ก', 'equal'], ['ซองงาน', 'equal']]],
];
const catOf = k => HK_CATS.find(c => c[0] === k);
const MODES = [['equal', 'เท่ากัน'], ['hours', 'ตามชั่วโมง'], ['items', 'ตามเมนู'], ['custom', 'ระบุรายคน']];
function openCreate(bill, root) {
  const mem = (home.group && home.group.members) || [];
  const me = { key: 'me', uid: '', name: (home.me.disp || 'ฉัน'), me: true, on: true, units: 2, custom: '' };
  if (!bill) {
    cs = { edit: null, title: '', total: '', touched: false, mode: 'equal', unit: 'ชม.', selfUnits: true, cat: '', calc: false, rate: '', qty: '', parts: null, cur: 0, billTitle: '', rcpt: '', rcptImg: '', hadRcpt: false, items: [], people: [me].concat(mem.map(m => ({ key: m.uid, uid: m.uid, name: m.name, on: false, units: 2, custom: '' }))) };
  } else {
    const rows = bill.rows || [];
    cs = { edit: bill.id, title: bill.title, total: plain(bill.totalS), touched: true, mode: bill.mode, unit: bill.unit || 'ชม.', selfUnits: !!bill.selfUnits, cat: bill.cat || '', rcpt: '', rcptImg: '', hadRcpt: !!bill.rcpt,
      items: (bill.items || []).map(it => ({ name: it.name, price: plain(it.priceS), who: it.who.map(k => k) })), people: [] };
    me.on = bill.payerIn; me.units = bill.payerUnits || 2; me.custom = plain(bill.payerShareS);
    cs.people.push(me);
    rows.forEach(r => cs.people.push({ key: r.k, uid: r.uid, name: r.name, on: true, units: r.units || 2, custom: plain(r.amtS), out: r.out, byUid: r.byMe ? 'me' : r.byUid || '' }));
    mem.forEach(m => { if (!cs.people.some(p => p.uid === m.uid)) cs.people.push({ key: m.uid, uid: m.uid, name: m.name, on: false, units: 2, custom: '' }); });
    Object.assign(cs, { calc: !!bill.calc, rate: bill.calc ? plain(bill.calc.rateS) : '', qty: bill.calc && bill.calc.qty ? String(bill.calc.qty) : '', parts: null, cur: 0, billTitle: '' });
    if (bill.calc && bill.calc.unit) cs.unit = bill.calc.unit;
    if (bill.parts && bill.parts.length > 1) {   // 🧩 บิลหลายรายการ: คืนแต่ละรายการให้แก้ต่อ
      cs.billTitle = bill.title;
      cs.parts = bill.parts.map(pt => {
        const pp = {};
        cs.people.forEach(p => { const v = (pt.sh || {})[p.key] || 0; pp[p.key] = { on: v > 0, units: (pt.u || {})[p.key] || 2, custom: v ? plain(v) : '' }; });
        return { title: pt.name, total: plain(pt.totalS), touched: true, mode: pt.mode, unit: pt.unit || 'ชม.', cat: pt.cat || '', calc: !!pt.rateS, rate: pt.rateS ? plain(pt.rateS) : '', qty: pt.qty ? String(pt.qty) : '',
          items: (pt.items || []).map(it => ({ name: it.name, price: plain(it.priceS), who: it.who.slice() })), pp: pp };
      });
      partLoad(cs.parts[0]);
    }
  }
  show({ name: 'create' }, root);
}

function spread(R, list, payerKey, w, out) {
  if (!list.length) return;
  const W = list.reduce((s, p) => s + w(p), 0) || 1;
  let sum = 0;
  const payer = list.find(p => p.key === payerKey);
  if (payer && list.length > 1) {
    list.forEach(p => { if (p !== payer) { out[p.key] = Math.floor(R * w(p) / W / 100) * 100; sum += out[p.key]; } });
    out[payer.key] = R - sum;
  } else {
    list.forEach(p => { out[p.key] = Math.floor(R * w(p) / W); sum += out[p.key]; });
    let extra = R - sum;
    for (let i = 0; extra > 0; i = (i + 1) % list.length) { out[list[i].key]++; extra--; }
  }
}
/** 🧮 ราคาต่อหน่วย × จำนวน (ตามชั่วโมง: ไม่ใส่จำนวน = ใช้ชั่วโมงของคนที่อยู่นานสุด) */
function calcQty() {
  const q = Number(String(cs.qty).replace(/[^\d.]/g, ''));
  if (q > 0) return q;
  return cs.mode === 'hours' ? Math.max(0, ...cs.people.filter(p => p.on).map(p => p.units)) : 0;
}
function compute() {
  const on = cs.people.filter(p => p.on), amt = {}, sub = {};
  if (cs.calc) { const t = Math.round(toS(cs.rate) * calcQty()); cs.total = t ? plain(t) : ''; cs.touched = true; }
  let T = toS(cs.total);
  if (cs.mode === 'items') {
    const keys = on.map(p => p.key);
    let itemsS = 0;
    cs.items.forEach(it => {
      const P = toS(it.price), who = it.who.filter(k => keys.indexOf(k) > -1);
      itemsS += P;
      if (!who.length) return;
      const o = {}; spread(P, who.map(k => ({ key: k })), null, () => 1, o);
      who.forEach(k => { sub[k] = (sub[k] || 0) + o[k]; });
    });
    if (!cs.touched) { T = itemsS; cs.total = itemsS ? plain(itemsS) : ''; }
    const got = Object.values(sub).reduce((s, x) => s + x, 0);
    if (got && T) spread(T, on.filter(p => sub[p.key]), null, p => sub[p.key], amt);
  } else if (cs.mode === 'custom') {
    on.forEach(p => { if (!p.me) amt[p.key] = toS(p.custom); });
    const others = Object.values(amt).reduce((s, x) => s + x, 0);
    const me = on.find(p => p.me);
    if (me) amt.me = Math.max(0, T - others);
  } else spread(T, on, 'me', p => cs.mode === 'hours' ? p.units : 1, amt);
  const sum = on.reduce((s, p) => s + (amt[p.key] || 0), 0);
  return { T, amt, sub, sum, diff: T - sum };
}
const DISC_RE = /^\s*(?:ส่วนลด|ลด\s|discount|disc\.?\s|โปรโมชั่น|โปร\s|คูปอง|coupon|[A-Za-z0-9]{1,6}\s?(?:ลด|คูปอง))/i;
function discTarget(discName, list) {   // เหมือน owe.js: ชื่อซ้อนกัน หรือคำร่วมยาว ≥4 ตัว
  const norm = t => String(t || '').toLowerCase().replace(DISC_RE, '').replace(/^\s*\d+\s*[×x]\s*/, '').replace(/\d+\s*(บ|บาท)?$/, '').replace(/[^\p{L}\p{N}]+/gu, '');
  const k = norm(discName);
  if (k.length < 2) return null;
  const common = (a, b) => { let best = 0; for (let i = 0; i < a.length; i++) for (let j = i + best + 1; j <= a.length; j++) { if (b.includes(a.slice(i, j))) best = j - i; else break; } return best; };
  let pick = null, score = 0;
  list.forEach(it => { const n = norm(it.name); if (!n) return; const sc = n.includes(k) || k.includes(n) ? 99 : common(k, n); if (sc >= 4 && sc > score) { pick = it; score = sc; } });
  return pick;
}
function itemsTotal() { return cs.items.reduce((s, it) => s + toS(it.price), 0); }
function byName(uid) { if (uid === 'me') return 'ฉัน'; const p = cs.people.find(x => x.uid === uid); return p ? p.name : ''; }

/* ---------- 🧩 หลายรายการในบิลเดียว: รายการที่เปิดอยู่ใช้ช่องเดิมของ cs ส่วนรายการอื่นเก็บเป็นภาพไว้ใน cs.parts ---------- */
const PART_F = ['title', 'total', 'touched', 'mode', 'unit', 'cat', 'calc', 'rate', 'qty'];
function partSnap() {
  const o = { items: cs.items.map(it => ({ name: it.name, price: it.price, who: it.who.slice() })), pp: {} };
  PART_F.forEach(f => { o[f] = cs[f]; });
  cs.people.forEach(p => { o.pp[p.key] = { on: p.on, units: p.units, custom: p.custom }; });
  return o;
}
function partLoad(o) {
  PART_F.forEach(f => { cs[f] = o[f]; });
  cs.items = o.items.map(it => ({ name: it.name, price: it.price, who: it.who.slice() }));
  cs.people.forEach(p => { const x = o.pp[p.key]; if (x) Object.assign(p, x); else Object.assign(p, { on: false, units: 2, custom: '' }); });
}
function partGo(i) { cs.parts[cs.cur] = partSnap(); cs.cur = i; partLoad(cs.parts[i]); drawCreate(); window.scrollTo(0, 0); }
function partAdd() {
  if (!cs.parts) { cs.parts = [partSnap()]; cs.cur = 0; }
  cs.parts[cs.cur] = partSnap();
  const n = { title: '', total: '', touched: false, mode: 'equal', unit: 'ชม.', cat: cs.cat, calc: false, rate: '', qty: '', items: [], pp: {} };
  cs.people.forEach(p => { n.pp[p.key] = { on: p.on, units: 2, custom: '' }; });   // คนเดิมทุกคน เอาออกได้
  cs.parts.push(n); cs.cur = cs.parts.length - 1; partLoad(n); cs.selfUnits = false;
  drawCreate(); window.scrollTo(0, 0); setTimeout(() => { const t = $('#cTitle'); if (t) t.focus(); }, 50);
}
function partDel() {
  if (!cs.parts || !confirm('ลบรายการ "' + (cs.title || 'รายการ ' + (cs.cur + 1)) + '" ออกจากบิล?')) return;
  cs.parts.splice(cs.cur, 1); cs.cur = Math.max(0, cs.cur - 1); partLoad(cs.parts[cs.cur]);
  if (cs.parts.length === 1) cs.parts = null;
  drawCreate();
}
/** คิดทุกรายการ → ยอดรวมของแต่ละคนทั้งบิล */
function computeAll() {
  if (!cs.parts) { const r = compute(); return { list: [r], T: r.T, amt: r.amt, bad: r.T && r.diff === 0 ? -1 : 0 }; }
  cs.parts[cs.cur] = partSnap();
  const list = cs.parts.map((pt, i) => { partLoad(pt); const r = compute(); cs.parts[i] = partSnap(); return r; });
  partLoad(cs.parts[cs.cur]);
  const amt = {};
  list.forEach(r => Object.keys(r.amt).forEach(k => { amt[k] = (amt[k] || 0) + (r.amt[k] || 0); }));
  return { list: list, T: list.reduce((a, r) => a + r.T, 0), amt: amt, bad: list.findIndex(r => !(r.T && r.diff === 0)) };
}
const autoTitle = () => cs.parts.map((pt, i) => pt.title.trim() || 'รายการ ' + (i + 1)).join(' + ').slice(0, 60);
function partsBar() {
  if (!cs.parts) return '';
  const A = computeAll();
  return `<div class="sec" style="padding:12px 14px 10px;display:flex;flex-direction:column;gap:10px">
    <div class="sec-h" style="padding:0">รายการในบิลนี้ ${cs.parts.length} รายการ · แตะเพื่อสลับ</div>
    <div class="chips" style="padding:0">${cs.parts.map((pt, i) => `<button type="button" class="chip" data-part="${i}" aria-pressed="${i === cs.cur}">${i + 1}. ${esc(pt.title || 'รายการ')} ${A.list[i].T ? baht(A.list[i].T) : ''}${A.list[i].T && A.list[i].diff === 0 ? '' : ' ⚠️'}</button>`).join('')}<button type="button" class="chip" id="partAdd2">+ เพิ่มรายการ</button></div>
    <label class="field"><span class="lbl">ชื่อบิล (ขึ้นในการ์ดในกลุ่ม)</span><input id="cBill" type="text" maxlength="60" placeholder="${esc(autoTitle())}" value="${esc(cs.billTitle)}"></label>
  </div>`;
}
function drawCreate() {
  const again = !!$('#cTitle'), keepX = ($('#catRow') || {}).scrollLeft || 0, keepY = window.scrollY;   // แตะหมวดแล้วไม่เด้งกลับหน้าสุด
  $('#ttl').textContent = cs.edit ? 'แก้บิล' : 'สร้างบิล';
  const mem = cs.people.filter(p => !p.me && !p.out);
  $('#app').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between"><h1>${cs.edit ? 'แก้บิล' : 'สร้างบิล'}</h1><span class="pill ink">${cs.pool ? '🏦 จ่ายจากกอง' : 'โหมดคนจ่ายก่อน'}</span></div>
    ${cs.pool ? `<div class="sec" style="padding:10px 14px"><div class="nm">🏦 จ่ายจากกองกลาง "${esc(cs.poolName)}"</div><div class="lbl">${cs.poolEq ? 'กองนี้หารเท่ากันทั้งกอง: บิลนี้หารเท่ากันทุกคนในกอง ' + cs.poolN + ' คน' : 'ไม่มีใครต้องโอน ระบบจดว่าแต่ละคนใช้เงินกองเท่าไหร่ ไว้คิดตอนปิดกอง'} · ส่งการ์ดแจ้งในกลุ่มให้เอง</div></div>` : ''}
    ${partsBar()}
    ${catBlock()}
    <div class="sec" style="padding:12px 14px;display:flex;flex-direction:column;gap:10px">
      ${cs.parts ? `<div style="display:flex;justify-content:space-between;align-items:center"><span class="sec-h" style="padding:0">รายการที่ ${cs.cur + 1}</span><button type="button" class="lnk" id="partDel" style="padding:0;color:var(--bad)">ลบรายการนี้</button></div>` : ''}
      <div style="display:flex;gap:12px">
        <label class="field" style="flex:1.4"><span class="lbl">ค่าอะไร</span><input id="cTitle" type="text" maxlength="60" placeholder="เช่น ชาบู ค่าคอร์ท" value="${esc(cs.title)}"></label>
        <label class="field" style="flex:1"><span class="lbl">${cs.calc ? 'ยอด (คิดให้)' : 'ยอดรวม (บาท)'}</span><input id="cTotal" class="num" type="text" inputmode="decimal" placeholder="0" value="${esc(cs.total)}" ${cs.calc ? 'readonly' : ''}></label>
      </div>
      ${cs.calc ? `<div class="calc" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <label class="field" style="flex:1.2;min-width:96px"><span class="lbl">ราคาต่อ<input id="cUnit" type="text" maxlength="8" value="${esc(cs.unit)}" aria-label="หน่วย" style="width:3.6em;border:0;border-bottom:1px dashed var(--line);background:transparent;font:inherit;color:inherit;padding:0 2px"></span><input id="cRate" class="num" type="text" inputmode="decimal" placeholder="0" value="${esc(cs.rate)}"></label>
        <span style="padding-bottom:8px" aria-hidden="true">×</span>
        <label class="field" style="flex:1;min-width:80px"><span class="lbl">ใช้ไปกี่${esc(cs.unit)}</span><input id="cQty" class="num" type="text" inputmode="decimal" placeholder="${cs.mode === 'hours' ? String(calcQty() || 0) : '0'}" value="${esc(cs.qty)}"></label>
        <button type="button" class="lnk" id="calcOff" style="padding:0 0 8px">ใส่ยอดเอง</button>
      </div>${cs.mode === 'hours' ? '<div class="lbl">ไม่ใส่จำนวน = ใช้เวลาของคนที่อยู่นานสุด แล้วหารตามชั่วโมงของแต่ละคน</div>' : ''}` : `<button type="button" class="lnk" id="calcOn" style="align-self:flex-start;padding:0">🧮 คิดจากราคาต่อหน่วย (เช่น ลูกละ 80 × 4 ลูก)</button>`}
    </div>
    ${rcptBlock()}
    ${cs.poolEq ? `<div class="sec list" id="people"><div class="item"><div class="mid"><div class="nm">หารเท่ากัน ${cs.poolN} คน</div><div class="lbl">${esc(cs.people.filter(p => p.on).map(p => p.me ? 'ฉัน' : p.name).join(', '))}</div></div><div class="amt" id="eqEach"></div></div></div>` : `<div class="tabs" role="group" aria-label="วิธีหาร">${MODES.map(([k, l]) => `<button type="button" class="tab" data-mode="${k}" aria-pressed="${cs.mode === k}">${l}</button>`).join('')}</div>
    ${cs.mode === 'items' && cs.touched && itemsTotal() && itemsTotal() !== toS(cs.total) ? `<div class="lbl" style="margin:-4px 4px 0">เมนูรวม ${baht(itemsTotal())} ไม่เท่ายอดบิล ส่วนต่าง (ค่าบริการ/ส่วนลด) แบ่งตามสัดส่วนที่แต่ละคนกิน</div>` : ''}
    <div class="lbl" style="margin:-4px 4px 0">${{ equal: 'ทุกคนที่ติ๊กจ่ายเท่ากัน เศษอยู่กับคนจ่ายก่อน', hours: 'กด − + ปรับจำนวนชั่วโมงของแต่ละคน มาน้อยจ่ายน้อย', items: 'ใส่เมนู แล้วแตะชื่อคนที่กินเมนูนั้น เมนูที่กินด้วยกันหารเท่ากัน', custom: 'รู้ยอดของแต่ละคนอยู่แล้ว (เช่น ต่างคนต่างซื้อ) ใส่ยอดของเพื่อนแต่ละคน ที่เหลือเป็นส่วนของคุณ' }[cs.mode]}</div>
    ${cs.mode === 'hours' && !cs.parts ? `<label class="lbl" style="display:flex;gap:8px;align-items:center;margin:0 4px"><input type="checkbox" id="selfU" ${cs.selfUnits ? 'checked' : ''} style="width:18px;height:18px"> ให้เพื่อนกดแก้ชั่วโมงของตัวเองได้ (จนกว่าจะมีคนจ่าย)</label>` : ''}
    ${cs.mode === 'items' ? itemsBlock() : ''}
    <div class="sec list" id="people">
      ${cs.people.map(personRow).join('')}
      <button type="button" class="row-btn item" id="addOut"><span class="lnk" style="padding:0">+ เพิ่มคนนอกกลุ่ม</span></button>
    </div>
    ${mem.length ? '<div class="lbl" style="padding:0 4px">ไม่เห็นชื่อใคร ให้คนนั้นแตะ "✋ ฉันอยู่ในกลุ่มนี้" ในการ์ดของแมวกวัก หรือเพิ่มเป็นคนนอกกลุ่มไปก่อน</div>' : '<div class="lbl" style="padding:0 4px">ยังไม่มีชื่อเพื่อนในกลุ่ม ให้เพื่อนแตะ "✋ ฉันอยู่ในกลุ่มนี้" ในการ์ดของแมวกวัก (พิมพ์ แมวกวัก ในกลุ่มเพื่อเรียกการ์ด) แล้วกลับมาที่หน้านี้ใหม่</div>'}`}
    ${cs.poolEq ? '' : cs.parts ? '<div class="sec list" id="allSum"></div>' : `<button type="button" class="row-btn item" id="partAdd" style="width:100%;background:var(--card);border:1px solid var(--line);border-radius:16px;text-align:left;font:inherit;color:inherit"><span class="mid" style="display:flex;flex-direction:column;gap:2px"><span class="nm">+ เพิ่มรายการในบิลนี้</span><span class="lbl">เช่น ค่าคอร์ท + ค่าลูก + ข้าว + ค่ารถ แต่ละรายการเลือกหมวดและวิธีหารเองได้</span></span></button>`}
    ${cs.pool ? '' : payBlock()}`;
  bindCreate();
  if (again) { const cr = $('#catRow'); if (cr) cr.scrollLeft = keepX; window.scrollTo(0, keepY); }
  const su = $('#selfU'); if (su) su.onchange = () => { cs.selfUnits = su.checked; };
  foot(`<div class="sum"><span class="lbl" id="fl"></span><span id="fr" style="font-weight:600"></span></div><button class="btn ink" type="button" id="send">${cs.pool ? 'บันทึกบิลจากกอง' : cs.edit ? 'บันทึกและส่งบิลเข้ากลุ่ม' : 'ส่งบิลเข้ากลุ่ม'}</button>`);
  const cr = $('#catRow'); if (cr && !again) { const on = cr.querySelector('[aria-pressed="true"]'); if (on) cr.scrollLeft = Math.max(0, on.offsetLeft - 14); }
  $('#send').onclick = submitCreate;
  refresh();
}
function histChip(x, i, row) { const c = catOf(x.cat); return `<button type="button" class="chip" data-hist="${row}:${i}" style="flex:none" aria-pressed="${cs.title === x.name}">${c ? c[1] + ' ' : ''}${esc(x.name)}${x.rateS ? ' · ' + baht(x.rateS) + '/' + esc(x.unit || 'หน่วย') : ''}</button>`; }
function catBlock() {
  const c = catOf(cs.cat), H = home.hist || { top: [], recent: [] };
  const mine = c ? (H.top.concat(H.recent)).filter(x => x.cat === cs.cat && !c[3].some(d => d[0] === x.name)) : [];
  const row = (label, list, key) => list.length ? `<div class="lbl" style="padding:0 14px">${label}</div><div class="chips" style="flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none">${list.map((x, i) => histChip(x, i, key)).join('')}</div>` : '';
  return `<div class="sec" style="padding:12px 0 2px;display:flex;flex-direction:column;gap:6px">
    ${row('ใช้บ่อยในกลุ่มนี้', H.top, 'top')}${row('ล่าสุด', H.recent, 'recent')}
    <div class="lbl" style="padding:0 14px">หมวด</div>
    <div class="chips" id="catRow" style="flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none">${HK_CATS.map(x => `<button type="button" class="chip" data-cat="${x[0]}" aria-pressed="${cs.cat === x[0]}" style="flex:none">${x[1]} ${esc(x[2])}</button>`).join('')}</div>
    ${c ? `<div class="chips">${c[3].map((x, i) => `<button type="button" class="chip" data-subcat="${i}" aria-pressed="${cs.title === x[0]}">${esc(x[0])}${x[3] ? ' · ราคาต่อ' + esc(x[2]) : x[1] === 'hours' ? ' · ต่อ' + esc(x[2]) : ''}</button>`).join('')}${mine.map(x => `<button type="button" class="chip" data-hist="cat:${esc(x.name)}" aria-pressed="${cs.title === x.name}">${esc(x.name)}</button>`).join('')}<button type="button" class="chip" id="ownName">+ ตั้งชื่อเอง</button></div>` : ''}</div>`;
}
function rcptBlock() {
  const has = cs.rcptImg || (cs.hadRcpt && !cs.rcpt);
  return `<div class="sec item" style="padding:10px 14px;gap:12px">
    ${cs.rcptImg ? `<img src="${cs.rcptImg}" alt="รูปใบเสร็จ" style="width:46px;height:46px;object-fit:cover;border-radius:8px;flex:none">` : '<span style="font-size:24px;flex:none" aria-hidden="true">🧾</span>'}
    <div class="mid"><div class="nm">${has ? 'แนบรูปใบเสร็จแล้ว' : 'รูปใบเสร็จ'}</div><div class="lbl">${has ? 'เพื่อนในบิลกดดูรูปได้' : 'AI อ่านยอดและเมนูให้ เพื่อนในบิลกดดูรูปได้'}</div></div>
    <button type="button" class="btn sm" id="rcBtn">${has ? 'เปลี่ยนรูป' : '📷 ถ่าย / เลือกรูป'}</button></div>`;
}
function personRow(p) {
  const i = cs.people.indexOf(p);
  let sub = '';
  if (p.me) sub = 'คุณจ่ายก่อน' + (p.on ? '' : ' · ไม่ได้หารด้วย');
  else if (p.out) sub = `ไม่อยู่ในกลุ่ม · <button type="button" class="lnk" data-by="${i}" style="padding:0;font-size:12px">${p.byUid ? esc(byName(p.byUid)) + ' จ่ายแทน' : 'ตามเก็บเอง'} (เปลี่ยน)</button>`;
  return `<div class="item ${p.on ? '' : ''}">
    <button type="button" class="chk" data-on="${i}" aria-pressed="${p.on}" aria-label="${p.on ? 'เอาออก' : 'ใส่'} ${esc(p.name)}">${CHECK}</button>
    <div class="mid ${p.on ? '' : 'dim'}"><div class="nm">${esc(p.name)}${p.me ? ' (ฉัน)' : ''}</div><div class="lbl" data-sub="${i}">${sub}</div></div>
    ${cs.mode === 'hours' && p.on ? `<div class="step"><button type="button" data-dec="${i}" aria-label="ลดของ ${esc(p.name)}">−</button><span class="num">${p.units} ${esc(cs.unit)}</span><button type="button" data-inc="${i}" aria-label="เพิ่มของ ${esc(p.name)}">+</button></div>` : ''}
    ${cs.mode === 'custom' && p.on && !p.me ? `<label><span class="sr">ยอดของ ${esc(p.name)}</span><input class="amt-in num" type="text" inputmode="decimal" data-cus="${i}" value="${esc(p.custom)}" placeholder="0"></label>` : ''}
    <div class="amt ${p.on ? '' : 'dim'}" style="min-width:64px" data-amt="${esc(p.key)}">—</div>
  </div>`;
}
function itemsBlock() {
  const on = cs.people.filter(p => p.on);
  return `<div class="sec list" id="items">
    <div class="sec-h" style="display:flex;justify-content:space-between;align-items:center"><span>เมนู</span><button type="button" class="lnk" id="readRc" style="padding:4px 0">อ่านจากรูปใบเสร็จ</button></div>
    ${cs.items.map((it, j) => `<div>
      <div class="item" style="padding-bottom:6px">
        <label style="flex:1"><span class="sr">ชื่อเมนู</span><input type="text" data-iname="${j}" value="${esc(it.name)}" placeholder="ชื่อเมนู" style="width:100%;border:0;border-bottom:1px solid var(--line);padding:4px 0;font-weight:600;background:transparent"></label>
        <label><span class="sr">ราคา</span><input class="amt-in num" type="text" inputmode="decimal" data-iprice="${j}" value="${esc(it.price)}" placeholder="ราคา"></label>
        <button type="button" class="ib" data-idel="${j}" aria-label="ลบเมนู ${esc(it.name)}" style="min-width:36px;height:36px"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="chips">${on.map(p => `<button type="button" class="chip" data-iwho="${j}" data-k="${esc(p.key)}" aria-pressed="${it.who.indexOf(p.key) > -1}">${esc(p.me ? 'ฉัน' : p.name)}</button>`).join('')}
        <button type="button" class="chip" data-iall="${j}">ทุกคน</button></div>
    </div>`).join('')}
    <button type="button" class="row-btn item" id="addItem"><span class="lnk" style="padding:0">+ เพิ่มเมนู</span></button>
  </div>`;
}
function payBlock() {
  const m = home.me, parts = [];
  if (m.qr) parts.push('QR รับเงิน (ใส่ยอดให้เอง)'); else if (m.qrImg) parts.push('รูป QR'); else if (m.ppSet) parts.push('พร้อมเพย์ ' + m.pp);
  if (m.bank) parts.push(m.bank.name + ' ' + fmtAcct(m.bank.acct));
  return `<div class="sec item">${m.bank ? bankBadge(m.bank.code, 34) : ''}<div class="mid"><div class="nm">รับเงินด้วย</div><div class="lbl">${esc(parts.join(' · ') || 'ยังไม่ได้ตั้ง เพื่อนจะไม่มี QR หรือเลขบัญชีให้โอน')}</div></div><button type="button" class="lnk" id="chgPay">${parts.length ? 'เปลี่ยน' : 'ตั้งเลย'}</button></div>`;
}
function bindCreate() {
  const A = $('#app');
  $('#cTitle').oninput = e => { cs.title = e.target.value; };
  $('#cTotal').oninput = e => { if (cs.calc) return; cs.total = e.target.value; cs.touched = true; refresh(); };
  const on = (id, f) => { const el = $(id); if (el) el.onclick = f; };
  on('#calcOn', () => { cs.calc = true; if (!cs.rate && toS(cs.total)) cs.rate = cs.total; drawCreate(); const r = $('#cRate'); if (r) r.focus(); });
  on('#calcOff', () => { cs.calc = false; drawCreate(); });
  const ci = (id, f) => { const el = $(id); if (el) el.oninput = e => { cs[f] = e.target.value; refresh(); }; };
  ci('#cRate', 'rate'); ci('#cQty', 'qty');
  const cu = $('#cUnit'); if (cu) cu.oninput = e => { cs.unit = e.target.value.trim() || 'หน่วย'; };
  on('#partAdd', partAdd); on('#partAdd2', partAdd); on('#partDel', partDel);
  A.querySelectorAll('[data-part]').forEach(b => b.onclick = () => partGo(+b.dataset.part));
  const cb = $('#cBill'); if (cb) cb.oninput = e => { cs.billTitle = e.target.value; };
  on('#ownName', () => { cs.title = ''; const t = $('#cTitle'); t.value = ''; t.focus(); t.placeholder = 'ตั้งชื่อเอง เช่น ค่าเช่าไม้'; });
  A.querySelectorAll('[data-hist]').forEach(b => b.onclick = () => {
    const H = home.hist || { top: [], recent: [] }, [row, i] = b.dataset.hist.split(/:(.*)/s);
    const x = row === 'cat' ? H.top.concat(H.recent).find(y => y.name === i) : H[row][+i];
    if (!x) return;
    cs.title = x.name; if (x.cat) cs.cat = x.cat;
    if (!cs.poolEq) { cs.mode = x.mode || 'equal'; if (x.unit) cs.unit = x.unit; }
    if (x.rateS) { cs.calc = true; cs.rate = plain(x.rateS); cs.qty = ''; }
    if (cs.mode === 'items' && !cs.items.length) { cs.items.push({ name: '', price: '', who: [] }); cs.touched = !!toS(cs.total); }
    drawCreate();
  });
  A.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { cs.mode = b.dataset.mode; if (cs.mode === 'items' && !cs.items.length) { cs.items.push({ name: '', price: '', who: [] }); cs.touched = !!toS(cs.total); } drawCreate(); });
  A.querySelectorAll('[data-on]').forEach(b => b.onclick = () => { const p = cs.people[+b.dataset.on]; p.on = !p.on; if (!p.on) cs.items.forEach(it => { it.who = it.who.filter(k => k !== p.key); }); drawCreate(); });
  A.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { const p = cs.people[+b.dataset.inc]; p.units = Math.min(24, p.units + 0.5); drawCreate(); });
  A.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { const p = cs.people[+b.dataset.dec]; p.units = Math.max(0.5, p.units - 0.5); drawCreate(); });
  A.querySelectorAll('[data-cus]').forEach(i => i.oninput = () => { cs.people[+i.dataset.cus].custom = i.value; refresh(); });
  A.querySelectorAll('[data-by]').forEach(b => b.onclick = () => pickBy(cs.people[+b.dataset.by]));
  A.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cs.cat = cs.cat === b.dataset.cat ? '' : b.dataset.cat; drawCreate(); });
  A.querySelectorAll('[data-subcat]').forEach(b => b.onclick = () => {
    const x = catOf(cs.cat)[3][+b.dataset.subcat];
    cs.title = x[0];
    if (x[2]) cs.unit = x[2];
    if (x[3]) { cs.calc = true; cs.qty = ''; }
    if (x[1] === 'hours') cs.mode = 'hours';
    else if (x[1] === 'items') { cs.mode = 'items'; if (!cs.items.length) { cs.items.push({ name: '', price: '', who: [] }); cs.touched = !!toS(cs.total); } }
    else cs.mode = 'equal';
    if (cs.poolEq) cs.mode = 'equal';   // กองหารเท่ากันทั้งกอง: เลือกหมวดย่อยได้แค่ชื่อ
    drawCreate();
  });
  $('#rcBtn').onclick = () => readReceipt($('#rcBtn'));
  const ao = $('#addOut'); if (ao) ao.onclick = addOutsider;
  const cp = $('#chgPay'); if (cp) cp.onclick = () => openMe();
  if (cs.mode === 'items') {
    A.querySelectorAll('[data-iname]').forEach(i => i.oninput = () => { cs.items[+i.dataset.iname].name = i.value; });
    A.querySelectorAll('[data-iprice]').forEach(i => i.oninput = () => { cs.items[+i.dataset.iprice].price = i.value; refresh(); });
    A.querySelectorAll('[data-idel]').forEach(b => b.onclick = () => { cs.items.splice(+b.dataset.idel, 1); drawCreate(); });
    A.querySelectorAll('[data-iwho]').forEach(b => b.onclick = () => { const it = cs.items[+b.dataset.iwho], k = b.dataset.k, x = it.who.indexOf(k); if (x > -1) it.who.splice(x, 1); else it.who.push(k); b.setAttribute('aria-pressed', x < 0); refresh(); });
    A.querySelectorAll('[data-iall]').forEach(b => b.onclick = () => { const it = cs.items[+b.dataset.iall]; it.who = cs.people.filter(p => p.on).map(p => p.key); drawCreate(); });
    $('#addItem').onclick = () => { cs.items.push({ name: '', price: '', who: [] }); drawCreate(); const ins = A.querySelectorAll('[data-iname]'); ins[ins.length - 1].focus(); };
    $('#readRc').onclick = () => readReceipt($('#readRc'));
  }
}
function refresh() {
  const all = computeAll(), r = cs.parts ? all.list[cs.cur] : all.list[0];
  if (cs.calc) { const t = $('#cTotal'); if (t) t.value = cs.total; }
  cs.people.forEach(p => { const el = $(`[data-amt="${CSS.escape(p.key)}"]`); if (el) el.textContent = p.on ? baht(r.amt[p.key] || 0) : '—'; });
  if (cs.mode === 'items' && !cs.touched) { const t = $('#cTotal'); if (t && document.activeElement !== t) t.value = cs.total; }
  // คนที่จ่ายแทนคนนอกกลุ่ม: บอกยอดที่ต้องโอนรวม
  cs.people.forEach((p, i) => {
    if (p.me || p.out || !p.on) return;
    const prox = cs.people.filter(o => o.out && o.on && o.byUid === p.uid);
    const el = $(`[data-sub="${i}"]`);
    if (el) el.textContent = prox.length ? 'โอนรวม ' + baht((r.amt[p.key] || 0) + prox.reduce((s, o) => s + (r.amt[o.key] || 0), 0)) + ' (รวมของ' + prox.map(o => o.name).join(', ') + ')' : '';
  });
  const others = cs.people.filter(p => !p.me && p.byUid !== 'me' && (cs.parts ? (all.amt[p.key] || 0) > 0 : p.on));
  const fl = $('#fl'), fr = $('#fr');
  const as = $('#allSum');
  if (as) as.innerHTML = `<div class="sec-h">รวมทั้งบิล ${baht(all.T)}</div>` + cs.people.filter(p => (all.amt[p.key] || 0) > 0).map(p => `<div class="item"><div class="mid"><div class="nm">${esc(p.me ? 'ฉัน' : p.name)}</div><div class="lbl">${esc(cs.parts.map((pt, i) => (all.list[i].amt[p.key] || 0) ? (pt.title || 'รายการ ' + (i + 1)) + ' ' + baht(all.list[i].amt[p.key]) : '').filter(Boolean).join(' · '))}</div></div><div class="amt">${baht(all.amt[p.key])}</div></div>`).join('');
  if (cs.parts) {
    if (fl) fl.textContent = others.length + ' คน' + (cs.pool ? 'ใช้ร่วมกัน' : 'ต้องจ่ายให้คุณ · รวม ' + baht(others.reduce((a, p) => a + (all.amt[p.key] || 0), 0)));
    if (fr) { const ok = all.bad < 0; fr.textContent = ok ? 'ครบ ' + cs.parts.length + ' รายการ ' + baht(all.T) : 'รายการที่ ' + (all.bad + 1) + ' ยังไม่ครบ'; fr.style.color = ok ? 'var(--ok)' : 'var(--bad)'; }
    const s2 = $('#send'); if (s2) s2.disabled = !(all.bad < 0 && (cs.pool || others.some(p => (all.amt[p.key] || 0) > 0)));
    return r;
  }
  const ee = $('#eqEach'); if (ee) ee.textContent = r.T ? 'คนละ ' + baht(Math.floor(r.T / Math.max(1, cs.poolN))) : '';
  if (fl) fl.textContent = cs.pool ? 'จ่ายจากกอง · ' + (others.length + 1) + ' คนใช้ร่วมกัน' : others.length + ' คนต้องจ่ายให้คุณ · รวม ' + baht(others.reduce((s, p) => s + (r.amt[p.key] || 0), 0));
  if (fr) { fr.textContent = !r.T ? 'ใส่ยอดรวม' : r.diff === 0 ? 'ยอดครบ ' + baht(r.T) : r.diff > 0 ? 'ยังขาด ' + baht(r.diff) : 'เกิน ' + baht(-r.diff); fr.style.color = r.T && r.diff === 0 ? 'var(--ok)' : 'var(--bad)'; }
  const s = $('#send'); if (s) s.disabled = !(r.T && r.diff === 0 && others.some(p => (r.amt[p.key] || 0) > 0));
  return r;
}
function dlg(html, bind) { $('#dlgIn').innerHTML = html; const d = $('#dlg'); if (!d.open) d.showModal(); bind && bind(d); }
function byOptions(sel) {
  const mem = cs.people.filter(p => !p.me && !p.out);
  return `<option value="">ไม่มี (ฉันตามเก็บเอง)</option><option value="me" ${sel === 'me' ? 'selected' : ''}>ฉันจ่ายแทน</option>` + mem.map(p => `<option value="${esc(p.uid)}" ${sel === p.uid ? 'selected' : ''}>${esc(p.name)} จ่ายแทน</option>`).join('');
}
function addOutsider() {
  dlg(`<h1 style="font-size:18px">เพิ่มคนนอกกลุ่ม</h1>
    <label class="field"><span class="lbl">ชื่อ</span><input id="oName" type="text" maxlength="30" placeholder="เช่น ต้น"></label>
    <label class="field"><span class="lbl">ใครจ่ายแทน</span><select id="oBy">${byOptions('')}</select></label>
    <div class="lbl">ยอดของคนนี้จะไปรวมกับคนที่จ่ายแทน และตอนทวงจะแท็กคนนั้น</div>
    <div class="row2"><button class="btn" type="button" id="oX">ยกเลิก</button><button class="btn ink" type="button" id="oOk">เพิ่ม</button></div>`, d => {
    $('#oName').focus();
    $('#oX').onclick = () => d.close();
    $('#oOk').onclick = () => {
      const n = $('#oName').value.trim().replace(/^\+/, '');
      if (!n) return $('#oName').focus();
      if (cs.people.some(p => p.out && p.name === n)) { toast('มีชื่อนี้แล้ว'); return; }
      cs.people.push({ key: 'o:' + n, uid: '', name: n, on: true, units: 2, custom: '', out: true, byUid: $('#oBy').value });
      d.close(); drawCreate();
    };
  });
}
function pickBy(p) {
  dlg(`<h1 style="font-size:18px">ใครจ่ายแทน ${esc(p.name)}</h1>
    <label class="field"><span class="lbl">เลือก</span><select id="oBy">${byOptions(p.byUid)}</select></label>
    <div class="row2"><button class="btn" type="button" id="oDel">เอาออกจากบิล</button><button class="btn ink" type="button" id="oOk">ตกลง</button></div>`, d => {
    $('#oOk').onclick = () => { p.byUid = $('#oBy').value; d.close(); drawCreate(); };
    $('#oDel').onclick = () => { cs.people.splice(cs.people.indexOf(p), 1); d.close(); drawCreate(); };
  });
}

async function shrink(file, max, q) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return c.toDataURL('image/jpeg', q || 0.82).split(',')[1];
}
function pickFile() {
  return new Promise(ok => { const f = $('#file'); f.value = ''; f.onchange = () => ok(f.files[0] || null); f.click(); });
}
async function readReceipt(b) {
  const file = await pickFile();
  if (!file) return;
  if (b) { b.textContent = 'กำลังอ่าน…'; b.disabled = true; }
  try {
    const data = await shrink(file, 1600, 0.85);
    cs.rcptImg = 'data:image/jpeg;base64,' + await shrink(file, 160, 0.7);
    const r = await call('hk_read', { data: data, keep: true });
    if (r.rcpt) cs.rcpt = r.rcpt;
    if (!r.ok2) { if (r.rcpt) toast('เก็บรูปใบเสร็จแล้ว แต่ AI อ่านไม่ได้ ใส่ยอดเองได้เลย'); drawCreate(); return; }
    let discTotal = 0, billDisc = 0;
    if (r.items && r.items.length) {
      const dishes = r.items.filter(it => !DISC_RE.test(it.name)), discs = r.items.filter(it => DISC_RE.test(it.name));
      // ส่วนลดที่บอกชื่อเมนู → หักจากเมนูนั้น · ไม่บอก (เช่น Meal Deal) → ส่วนลดท้ายบิล หารตามสัดส่วน
      dishes.forEach(it => { discTotal += it.cut || 0; });   // ส่วนลดที่หลังบ้านหักจากเมนูให้แล้ว
      discs.forEach(d => {
        const t = discTarget(d.name, dishes);
        discTotal += d.price;
        if (t) { t.price = Math.max(0, Math.round((t.price - d.price) * 100) / 100); t.cut = (t.cut || 0) + d.price; } else billDisc += d.price;
      });
      cs.items = [];
      dishes.forEach(it => {   // 3 จาน = แยก 3 แถว ให้แตะคนกินทีละจาน
        const q = Math.round(it.qty || 1), P = toS(it.price), tag = it.cut ? ' (ลด ' + plain(toS(it.cut)) + ')' : '';
        if (q > 1 && q <= 10 && Math.abs(q - (it.qty || 1)) < 0.01) {
          const o = {}; spread(P, Array.from({ length: q }, (x, i) => ({ key: i })), null, () => 1, o);
          for (let i = 0; i < q; i++) cs.items.push({ name: it.name + ' (' + (i + 1) + '/' + q + ')' + tag, price: plain(o[i]), who: [] });
        } else cs.items.push({ name: it.name + (it.qty > 1 ? ' x' + it.qty : '') + tag, price: String(it.price), who: [] });
      });
      if (r.service) cs.items.push({ name: 'ค่าบริการ', price: String(r.service), who: cs.people.filter(p => p.on).map(p => p.key) });
    }
    const itemsS = cs.items.reduce((x, it) => x + toS(it.price), 0);
    if (cs.items.length) {   // ยอดบิล = เมนู − ส่วนลดท้ายบิล (AI มักเอา "ยอดรวม" ก่อนลดมา)
      cs.total = plain(itemsS - toS(billDisc) - toS(r.discount || 0)); cs.touched = !!(billDisc || r.discount);
    } else if (r.amount) { cs.total = String(r.amount); cs.touched = true; }
    if (r.amount || itemsS) cs.calc = false;   // ยอดจากใบเสร็จชนะการคิดราคาต่อหน่วย
    if (!cs.title && r.vendor) cs.title = r.vendor;
    if (r.check && !r.check.ok && cs.items.length) toast('⚠️ เมนูที่อ่านได้รวมแล้วไม่ตรงยอดใบเสร็จ (ต่าง ' + baht(toS(Math.abs(r.check.diff))) + ') เช็กเมนูกับใบเสร็จอีกครั้ง');
    else toast(cs.items.length ? 'อ่านได้ ' + cs.items.length + ' รายการ' + (discTotal ? ' หักส่วนลด ' + baht(toS(discTotal)) + ' แล้ว' : '') + ' แตะชื่อคนที่กินแต่ละเมนู' : 'อ่านได้แค่ยอดรวม');
  } catch (e) { toast(e.message); }
  drawCreate();
}

async function submitCreate() {
  const r = refresh(), btn = $('#send');
  if (!cs.parts && !cs.title.trim()) { $('#cTitle').focus(); toast('ใส่ชื่อบิลก่อน เช่น ชาบู'); return; }
  const me = cs.people.find(p => p.me);
  const itemsFor = k => cs.mode === 'items' ? cs.items.filter(it => it.who.indexOf(k) > -1).map(it => it.name || 'เมนู') : [];
  if (cs.parts) {   // 🧩 หลายรายการ: ยอดของแต่ละคน = ผลรวมทุกรายการ
    const all = computeAll();
    if (all.bad > -1) { partGo(all.bad); toast('รายการที่ ' + (all.bad + 1) + ' ยอดยังไม่ครบ'); return; }
    const big = cs.parts.map((pt, i) => [pt, all.list[i].T]).sort((x, y) => y[1] - x[1])[0][0];
    const payload = { b: cs.edit || '', pool: cs.pool || '', title: (cs.billTitle.trim() || autoTitle()), totalS: all.T, mode: 'custom', unit: '', selfUnits: false, cat: big.cat || '', rcpt: cs.rcpt, keepRcpt: cs.hadRcpt && !cs.rcpt,
      payerIn: (all.amt.me || 0) > 0, payerShareS: all.amt.me || 0, payerUnits: 0, payerItems: [], items: [],
      members: cs.people.filter(p => !p.me && (all.amt[p.key] || 0) > 0).map(p => ({ uid: p.uid, name: p.name, byUid: p.out ? p.byUid : '', amtS: all.amt[p.key], units: 0, items: [] })),
      parts: cs.parts.map((pt, i) => {
        const sh = {}, u = {};
        Object.keys(all.list[i].amt).forEach(k => { if (all.list[i].amt[k]) sh[k] = all.list[i].amt[k]; });
        if (pt.mode === 'hours') Object.keys(pt.pp).forEach(k => { if (pt.pp[k].on) u[k] = pt.pp[k].units; });
        const q = Number(String(pt.qty).replace(/[^\d.]/g, '')) || (pt.mode === 'hours' ? Math.max(0, ...Object.values(pt.pp).filter(x => x.on).map(x => x.units)) : 0);
        return { name: pt.title.trim() || 'รายการ ' + (i + 1), cat: pt.cat, mode: pt.mode, unit: pt.unit, rateS: pt.calc ? toS(pt.rate) : 0, qty: pt.calc ? q : 0, totalS: all.list[i].T, sh: sh, u: u,
          items: pt.mode === 'items' ? pt.items.map(it => ({ name: it.name || 'เมนู', priceS: toS(it.price), who: it.who })) : [] };
      }) };
    return sendCreate(payload, $('#send'));
  }
  const payload = {
    rateS: cs.calc ? toS(cs.rate) : 0, qty: cs.calc ? calcQty() : 0, calcUnit: cs.unit,
    b: cs.edit || '', pool: cs.pool || '', title: cs.title.trim(), totalS: r.T, mode: cs.mode, unit: cs.unit, selfUnits: cs.mode === 'hours' && cs.selfUnits, cat: cs.cat, rcpt: cs.rcpt, keepRcpt: cs.hadRcpt && !cs.rcpt, payerIn: me.on, payerShareS: me.on ? r.amt.me || 0 : 0, payerUnits: me.units, payerItems: itemsFor('me'),
    members: cs.people.filter(p => p.on && !p.me).map(p => ({ uid: p.uid, name: p.name, byUid: p.out ? p.byUid : '', amtS: r.amt[p.key] || 0, units: cs.mode === 'hours' ? p.units : 0, items: itemsFor(p.key) })),
    items: cs.mode === 'items' ? cs.items.map(it => ({ name: it.name || 'เมนู', priceS: toS(it.price), who: it.who })) : [],
  };
  return sendCreate(payload, btn);
}
async function sendCreate(payload, btn) {
  busy(btn, true);
  try {
    const d = await call(cs.edit ? 'hk_edit' : 'hk_create', payload);
    if (d.pool) {   // 🏦 บิลจากกอง: แจ้งกลุ่ม แล้วกลับหน้ากอง (ส่งไม่ออก = มีปุ่มส่งอีกครั้ง)
      const sent = await postToChat(d.msg);
      toast(cs.edit ? 'แก้บิลจากกองแล้ว' : 'บันทึกบิลจากกองแล้ว');
      stack = [{ name: 'home' }];
      view = { name: 'pool', pool: d.pool, unsent: sent ? null : d.msg };
      draw();
      return;
    }
    const sent = await postToChat(d.msg);
    toast(sent ? 'ส่งบิลเข้ากลุ่มแล้ว' : 'บันทึกบิลแล้ว');
    await loadHome();
    stack = [];
    view = { name: 'track', bill: d.bill, unsent: !sent ? d.msg : null };
    draw();
  } catch (e) { toast(e.message); busy(btn, false); }
}

/* ===================== 🏦 กองกลาง ===================== */
let ps = null;
function drawPoolNew() {
  const add = ps.add;   // เพิ่มคน / เก็บเงินเพิ่ม ของกองที่เปิดอยู่
  $('#ttl').textContent = add ? 'เพิ่มคน / เก็บเงินเพิ่ม' : 'สร้างกองกลาง';
  const on = ps.people.filter(p => p.on);
  const sum = toS(ps.my) + on.reduce((x, p) => x + toS(p.inS), 0);
  $('#app').innerHTML = `
    <h1>${add ? 'เพิ่มคน / เก็บเงินเพิ่ม' : 'สร้างกองกลาง'}</h1>
    <div class="lbl" style="padding:0 4px">${add ? `กอง "${esc(add.name)}" · ติ๊กคนใหม่ที่จะเข้ากอง หรือคนเดิมที่จะเก็บเงินเพิ่ม ใส่ยอดที่ต้องโอนรอบนี้ (คนใหม่ใส่ 0 ได้ถ้ายังไม่เก็บ) ระบบส่งบิล "ลงกองเพิ่ม" เข้ากลุ่ม` : 'คุณเป็นคนถือเงินกอง เพื่อนจะได้บิล "ลงกอง" ให้โอนเข้าคุณ แล้วค่าใช้จ่ายระหว่างทริปให้คุณกด "จ่ายจากกอง" จบทริปกดปิดกอง ระบบคิดให้ว่าใครเติม ใครได้คืน · ในกลุ่มโชว์แค่ยอดรวม ยอดของแต่ละคนดูได้ในหน้ากอง (ทุกคนในกองเห็นเหมือนกัน)'}</div>
    <div class="sec" style="padding:12px 14px;display:flex;gap:12px">
      ${add ? '' : `<label class="field" style="flex:1.4"><span class="lbl">ชื่อกอง</span><input id="pName" type="text" maxlength="40" placeholder="เช่น ทริปเขาใหญ่" value="${esc(ps.name)}"></label>`}
      <label class="field" style="flex:1"><span class="lbl">${add ? 'เก็บเพิ่มคนละ (บาท)' : 'ลงคนละ (บาท)'}</span><input id="pEach" class="num" type="text" inputmode="decimal" placeholder="0" value="${esc(ps.each)}"></label>
    </div>
    ${add ? '' : `<button type="button" class="sec row-btn pl-sw" id="pEq" aria-pressed="${ps.equal}"><span class="sw" aria-hidden="true"></span><span class="mid"><span class="nm">หารเท่ากันทั้งกอง</span><span class="lbl">${ps.equal ? 'ไปด้วยกันทุกที่ ทุกบิลหารเท่ากันทุกคนในกอง เหลือคืนตามที่ลง ขาดเติมเท่ากัน' : 'ปิดอยู่: แต่ละบิลเลือกคนและวิธีหารเองได้ (เช่น มีคนไม่ได้กินบางมื้อ)'}</span></span></button>`}
    <div class="sec list">
      <div class="item"><div class="mid"><div class="nm">${esc(home.me.disp || 'ฉัน')} (ฉัน)</div><div class="lbl">ถือเงินกอง · ส่วนที่ฉันลงเอง</div></div><input class="amt-in num" data-pmy inputmode="decimal" placeholder="0" value="${esc(ps.my)}"></div>
      ${ps.people.map((p, i) => `<div class="item ${p.on ? '' : 'dim'}"><button type="button" class="chk" data-pon="${i}" aria-pressed="${p.on}" aria-label="${esc(p.name)} ลงกอง">${p.on ? '✓' : ''}</button><div class="mid"><div class="nm">${esc(p.name)}</div>${p.inPool ? '<div class="lbl">อยู่ในกองแล้ว</div>' : add && p.on ? '<div class="lbl">คนใหม่</div>' : ''}</div>${p.on ? `<input class="amt-in num" data-pin="${i}" inputmode="decimal" placeholder="0" value="${esc(p.inS)}">` : ''}</div>`).join('') || '<div class="empty">ยังไม่มีชื่อเพื่อนในกลุ่ม ให้เพื่อนแตะ "✋ ฉันอยู่ในกลุ่มนี้" ในการ์ดของแมวกวักก่อน</div>'}
    </div>`;
  const A = $('#app');
  if (!add) { $('#pName').oninput = e => { ps.name = e.target.value; }; $('#pEq').onclick = () => { ps.equal = !ps.equal; drawPoolNew(); }; }
  $('#pEach').oninput = e => { ps.each = e.target.value; if (!add) { ps.my = ps.each; A.querySelector('[data-pmy]').value = ps.each; } ps.people.forEach(p => { if (p.on) p.inS = ps.each; }); A.querySelectorAll('[data-pin]').forEach(i => { i.value = ps.each; }); sumFoot(); };
  A.querySelector('[data-pmy]').oninput = e => { ps.my = e.target.value; sumFoot(); };
  A.querySelectorAll('[data-pon]').forEach(b => b.onclick = () => { const p = ps.people[+b.dataset.pon]; p.on = !p.on; if (p.on && !p.inS) p.inS = ps.each; drawPoolNew(); });
  A.querySelectorAll('[data-pin]').forEach(i => i.oninput = () => { ps.people[+i.dataset.pin].inS = i.value; sumFoot(); });
  function sumFoot() { const t = toS(ps.my) + ps.people.filter(p => p.on).reduce((x, p) => x + toS(p.inS), 0); const el = $('#pSum'); if (el) el.textContent = 'รวมเงินกอง ' + baht(t); }
  foot(`<div class="sum"><span class="lbl">${on.length} คน${add ? 'ในรอบนี้' : 'ลงกอง + คุณ'}</span><span id="pSum" style="font-weight:600">รวมเงินกอง ${baht(sum)}</span></div><button class="btn ink" type="button" id="pGo">${add ? 'บันทึกและส่งบิลลงกองเพิ่มเข้ากลุ่ม' : 'สร้างกองและส่งบิลลงกองเข้ากลุ่ม'}</button>`);
  $('#pGo').onclick = async () => {
    if (add) {
      const members = ps.people.filter(p => p.on).map(p => ({ uid: p.uid, inS: toS(p.inS) }));
      if (!members.length && !toS(ps.my)) { toast('ติ๊กคนใหม่ หรือคนที่จะเก็บเงินเพิ่ม'); return; }
      const b = $('#pGo'); busy(b, true);
      try {
        const d = await call('hk_pool_add', { p: add.id, myInS: toS(ps.my), members: members });
        const sent = d.msg.length ? await postToChat(d.msg) : true;
        toast('บันทึกแล้ว');
        stack = [{ name: 'home' }]; view = { name: 'pool', pool: d.pool, unsent: sent ? null : d.msg }; draw();
      } catch (e) { toast(e.message); busy(b, false); }
      return;
    }
    if (!ps.name.trim()) { $('#pName').focus(); toast('ตั้งชื่อกองก่อน'); return; }
    const members = ps.people.filter(p => p.on).map(p => ({ uid: p.uid, inS: toS(p.inS) }));
    if (!members.length) { toast('แตะเลือกเพื่อนที่ลงกองอย่างน้อย 1 คน'); return; }
    const b = $('#pGo'); busy(b, true);
    try {
      const d = await call('hk_pool_new', { name: ps.name.trim(), myInS: toS(ps.my), members: members, equal: ps.equal });
      const sent = d.msg ? await postToChat(d.msg) : true;
      toast(sent ? 'สร้างกองแล้ว ส่งบิลลงกองเข้ากลุ่มแล้ว' : 'สร้างกองแล้ว');
      await loadHome();
      stack = [{ name: 'home' }]; view = { name: 'pool', pool: d.pool, unsent: sent ? null : d.msg }; draw();
    } catch (e) { toast(e.message); busy(b, false); }
  };
}
/** แดชบอร์ดกองกลาง: หลอดใช้ไป/ลงกอง + ใช้ตามหมวด + ใช้รายวัน (คิดจากบิลที่จ่ายจากกอง) */
function poolDash(P) {
  const pct = P.inS > 0 ? Math.min(100, Math.round(P.spentS * 100 / P.inS)) : (P.spentS ? 100 : 0), over = P.leftS < 0;
  const n = P.rows.length || 1;
  const bar = (label, v, max, ic) => `<div class="pl-bar"><div class="pl-bl"><span>${ic ? ic + ' ' : ''}${esc(label)}</span><span class="num">${baht(v)}</span></div><div class="pl-tr"><i style="width:${max ? Math.max(3, Math.round(v * 100 / max)) : 0}%"></i></div></div>`;
  const by = (key) => { const m = {}; P.bills.forEach(b => { const k = key(b); m[k] = (m[k] || 0) + b.totalS; }); return Object.entries(m); };
  const cats = by(b => b.cat || '').sort((a, b) => b[1] - a[1]);
  const days = by(b => b.date).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const cMax = Math.max(0, ...cats.map(x => x[1])), dMax = Math.max(0, ...days.map(x => x[1]));
  return `<div class="sec pl-dash">
      <div class="pl-bl"><span class="lbl">ใช้ไปแล้ว ${pct}%</span><span class="lbl">${over ? 'ใช้เกินกอง ' + baht(-P.leftS) : 'เฉลี่ยคนละ ' + baht(Math.round(P.spentS / n))}</span></div>
      <div class="pl-tr big ${over ? 'over' : ''}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="ใช้เงินกองไป ${pct}%"><i style="width:${Math.max(pct, P.spentS ? 2 : 0)}%"></i></div>
      ${P.status === 'open' && P.planS > P.inS ? `<div class="lbl">ยังไม่โอนลงกอง ${baht(P.planS - P.inS)}${P.toldS ? ' (แจ้งโอนแล้ว รอยืนยัน ' + baht(P.toldS) + ')' : ''}</div>` : ''}
    </div>
    ${cats.length ? `<div class="sec pl-dash"><div class="sec-h" style="padding:0 0 4px">ใช้ไปกับอะไร</div>${cats.map(([k, v]) => { const c = catOf(k); return bar(c ? c[2] : 'อื่นๆ', v, cMax, c ? c[1] : '🧾'); }).join('')}</div>` : ''}
    ${days.length > 1 ? `<div class="sec pl-dash"><div class="sec-h" style="padding:0 0 4px">ใช้รายวัน</div>${days.map(([d, v]) => bar(thDate(d), v, dMax)).join('')}</div>` : ''}`;
}
async function openPool(id, root) {
  $('#app').innerHTML = '<div class="msg"><div class="spin" role="status" aria-label="กำลังโหลด"></div></div>';
  try { const d = await call('hk_pool', { p: id }); show({ name: 'pool', pool: d.pool }, root); }
  catch (e) { toast(e.message); if (root) show('home', true); else draw(); }
}
function drawPool() {
  const P = view.pool, open = P.status === 'open', H = P.isHolder;
  $('#ttl').textContent = '🏦 ' + P.name;
  const TOP = { wait: ['รอเติม', 'soft'], told: ['แจ้งเติมแล้ว', 'soft'], ok: ['เติมแล้ว ✓', 'ok'] }, REF = { wait: ['รอคืน', 'soft'], sent: ['โอนคืนแล้ว', 'soft'], got: ['ได้คืนแล้ว ✓', 'ok'] };
  const row = r => {
    const st = !open && r.topup ? TOP[r.topup] : !open && r.refund ? REF[r.refund] : null;
    const owe = r.planS - r.inS - r.toldS;
    const btn = open && H && !r.holder && r.toldS ? `<button type="button" class="btn sm ink" data-pok="${esc(r.k)}">ได้รับแล้ว</button>`
      : open && H && !r.holder && owe > 0 ? `<button type="button" class="btn sm" data-pok="${esc(r.k)}" data-all="1">รับเงินสด</button>` : '';
    return `<div class="item"><div class="mid"><div class="nm">${esc(r.name)}${r.holder ? ' <span class="pill soft">ถือกอง</span>' : ''}${r.me ? ' (ฉัน)' : ''}</div>
      <div class="lbl">ลง ${baht(r.inS)}${r.toldS ? ' · แจ้งโอน ' + baht(r.toldS) + ' รอยืนยัน' : ''}${open && owe > 0 ? ' · ยังไม่โอน ' + baht(owe) : ''} · ใช้ ${baht(r.useS)}</div>
      ${st ? `<span class="pill ${st[1]}" style="margin-top:4px;display:inline-block">${st[0]}</span>` : ''}</div>
      ${btn || `<div class="amt" style="color:${r.balS < 0 ? 'var(--bad)' : r.balS > 0 ? 'var(--ok)' : 'inherit'}">${r.balS > 0 ? (open ? 'เหลือ ' : 'ได้คืน ') : r.balS < 0 ? (open ? 'ขาด ' : 'เติม ') : ''}${baht(Math.abs(r.balS))}</div>`}</div>`;
  };
  const mine = P.rows.find(r => r.me);
  $('#app').innerHTML = `
    ${view.unsent ? `<div class="err">ยังไม่ได้ส่งการ์ดเข้ากลุ่ม <button type="button" class="lnk" id="pResend" style="padding:0">ส่งเข้ากลุ่ม</button></div>` : ''}
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px"><div><h1>${esc(P.name)}</h1><div class="sub">${esc(P.holder)}ถือเงินกอง${P.equal ? ' · หารเท่ากันทั้งกอง' : ''}</div></div><span class="pill ${open ? 'ink' : 'soft'}">${open ? 'เปิดอยู่' : 'ปิดแล้ว'}</span></div>
    ${!open && mine && !mine.holder && mine.topup === 'wait' && P.topup ? `<button type="button" class="btn ink" id="pTop">เติมกอง ${baht(-mine.balS)} → ${esc(P.holder)}</button>` : ''}
    <div class="hero">
      <div class="sec"><div class="lbl">ลงกองแล้ว</div><div class="big">${baht(P.inS)}</div><div class="lbl">ใช้ไป ${baht(P.spentS)}</div></div>
      <div class="dark"><div class="lbl">${P.leftS >= 0 ? 'เงินกองเหลือ' : 'กองขาด'}</div><div class="big">${baht(Math.abs(P.leftS))}</div><div class="lbl">${P.bills.length} บิลจากกอง</div></div>
    </div>
    ${poolDash(P)}
    <div class="sec list"><div class="sec-h">แต่ละคน (ลง − ใช้)${P.rounds > 1 ? ' · เก็บเงิน ' + P.rounds + ' รอบ' : ''}</div>${P.rows.map(row).join('')}</div>
    <div class="sec list"><div class="sec-h">บิลที่จ่ายจากกอง${open && H ? ' · แตะเพื่อแก้หรือลบ' : ''}</div>${P.bills.map(b => { const c = catOf(b.cat); const inner = `<span class="pl-ic" aria-hidden="true">${c ? c[1] : '🧾'}</span><div class="mid"><div class="nm">${esc(b.title)}</div><div class="lbl">${esc(thDate(b.date))}${c ? ' · ' + esc(c[2]) : ''}</div></div><div class="amt">${baht(b.totalS)}</div>`; return open && H ? `<button type="button" class="row-btn item" data-pb="${esc(b.id)}">${inner}</button>` : `<div class="item">${inner}</div>`; }).join('') || '<div class="empty">ยังไม่มีบิลที่จ่ายจากกอง</div>'}</div>
    ${!open && P.refunds.length ? `<div class="sec list"><div class="sec-h">คืนเงินจากกอง</div>${P.refunds.map(r => `<div class="item"><div class="mid"><div class="nm">${esc(P.holder)} คืน ${esc(r.name)}${r.me ? ' (ฉัน)' : ''}</div><div class="lbl">${r.got ? 'ได้รับคืนแล้ว ✓' : r.done ? 'โอนคืนแล้ว รอ' + esc(r.name) + 'กดรับ' : 'ยังไม่ได้คืน'}</div></div><span class="num h">${baht(r.amtS)}</span>${r.me && !r.got ? `<button type="button" class="btn sm ink" data-rf="${esc(r.k)}">ได้รับคืนแล้ว</button>` : H && !r.got ? `<button type="button" class="btn sm ${r.done ? '' : 'ink'}" data-rf="${esc(r.k)}" data-done="${r.done ? 1 : ''}">${r.done ? 'โอนแล้ว ✓' : 'โอนคืนแล้ว'}</button>` : ''}</div>`).join('')}</div>` : ''}
    <div class="sec list">
      ${open && H ? '<button type="button" class="row-btn item" id="pAdd"><span class="lnk" style="padding:0">+ เพิ่มคน / เก็บเงินลงกองเพิ่ม</span></button>' : ''}
      <button type="button" class="row-btn item" id="pCard"><span class="lnk" style="padding:0">ส่งการ์ดสรุปกองเข้ากลุ่ม</span></button>
      ${open && H ? '<button type="button" class="row-btn item" id="pCancel"><span class="lnk" style="padding:0;color:var(--bad)">ยกเลิกกองนี้</span></button>' : ''}
    </div>
    <div class="lbl" style="padding:0 4px">${open ? (P.toldS ? 'มีคนแจ้งโอนลงกองที่ยังไม่ได้ยืนยัน กด "ได้รับแล้ว" ก่อนปิดกอง · ' : '') + 'ปิดกองเมื่อจบทริป: คนที่ใช้เกินจะได้บิล "เติมกอง" ส่วนคนที่เหลือ คนถือกองคืนให้ คนที่ยังไม่โอนลงกอง คิดรวมในยอดเติมให้เลย' : 'ปิดกองแล้ว ยอดของแต่ละคนเป็นยอดตอนปิด'}</div>`;
  const A = $('#app');
  const reload = d => { view.pool = d.pool; drawPool(); };
  A.querySelectorAll('[data-rf]').forEach(b => b.onclick = async () => {
    busy(b, true);
    try { reload(await call('hk_refund', { p: P.id, k: b.dataset.rf, undo: !!b.dataset.done })); } catch (e) { toast(e.message); busy(b, false); }
  });
  A.querySelectorAll('[data-pok]').forEach(b => b.onclick = async () => {
    if (b.dataset.all && !confirm('ได้รับเงินลงกองจากคนนี้ครบแล้ว (เงินสด/โอนแล้วไม่ได้กดแจ้ง)?')) return;
    busy(b, true);
    try { reload(await call('hk_pool_ok', { p: P.id, k: b.dataset.pok, all: !!b.dataset.all })); toast('ยืนยันแล้ว'); } catch (e) { toast(e.message); busy(b, false); }
  });
  A.querySelectorAll('[data-pb]').forEach(b => b.onclick = () => poolBillMenu(P, b.dataset.pb));
  const tp = $('#pTop'); if (tp) tp.onclick = () => openBill(P.topup);
  const rs = $('#pResend'); if (rs) rs.onclick = async () => { const ok = await postToChat(view.unsent); if (ok) { view.unsent = null; toast('ส่งแล้ว'); drawPool(); } else toast('ส่งได้เมื่อเปิดหน้านี้จากในกลุ่ม LINE'); };
  $('#pCard').onclick = async () => {
    try { const d = await call('hk_pool_card', { p: P.id }); const ok = await postToChat(d.msg); if (ok) toast('ส่งการ์ดเข้ากลุ่มแล้ว'); else { view.unsent = d.msg; toast('ส่งได้เมื่อเปิดหน้านี้จากในกลุ่ม LINE'); drawPool(); } } catch (e) { toast(e.message); }
  };
  const pa = $('#pAdd'); if (pa) pa.onclick = () => {
    const inPool = new Set(P.members.map(m => m.uid));
    const all = ((home.group && home.group.members) || []).map(m => ({ uid: m.uid, name: m.name, on: false, inS: '', inPool: inPool.has(m.uid) }));
    P.members.forEach(m => { if (!all.some(x => x.uid === m.uid)) all.push({ uid: m.uid, name: m.name, on: false, inS: '', inPool: true }); });
    all.sort((x, y) => (y.inPool ? 1 : 0) - (x.inPool ? 1 : 0));
    ps = { add: P, each: '', my: '', people: all };
    show({ name: 'poolNew' });
  };
  const pc = $('#pCancel'); if (pc) pc.onclick = async () => {
    if (!confirm('ยกเลิกกอง ' + P.name + '?\nบิลลงกองจะถูกยกเลิก ใครโอนมาแล้วต้องคืนกันเอง (ยกเลิกได้เฉพาะกองที่ยังไม่มีบิลจ่ายจากกอง)')) return;
    try { const d = await call('hk_pool_cancel', { p: P.id }); await postToChat(d.msg); await loadHome(); toast('ยกเลิกกองแล้ว'); show('home', true); } catch (e) { toast(e.message); }
  };
  if (H && open) {
    foot(`<button class="btn ink" type="button" id="pSpend">+ จ่ายบิลจากกองนี้</button><button class="btn" type="button" id="pClose">ปิดกองและคิดเงินคืน/เติม</button>`);
    $('#pSpend').onclick = () => { openCreate(); poolCs(P); drawCreate(); };
    $('#pClose').onclick = async () => {
      if (P.toldS) { toast('ยังมีคนแจ้งโอนลงกองที่ยังไม่ได้ยืนยัน กด "ได้รับแล้ว" ก่อน'); return; }
      if (!confirm('ปิดกอง ' + P.name + '?\nหลังปิดจะจ่าย แก้ หรือลบบิลจากกองไม่ได้ ระบบส่งการ์ดสรุปและบิลเติมกองเข้ากลุ่ม')) return;
      const b = $('#pClose'); busy(b, true);
      try { const d = await call('hk_pool_close', { p: P.id }); const sent = await postToChat(d.msg); await loadHome(); view.pool = d.pool; view.unsent = sent ? null : d.msg; toast('ปิดกองแล้ว'); drawPool(); }
      catch (e) { toast(e.message); busy(b, false); }
    };
  }
}
/** ตั้งหน้าสร้างบิลให้เป็นบิลจากกอง: คนในบิล = คนในกองเท่านั้น */
function poolCs(P) {
  cs.pool = P.id; cs.poolName = P.name; if (!cs.edit) cs.cat = 'trip';
  const inPool = new Set(P.members.map(m => m.uid));
  const had = new Set(cs.people.filter(p => p.on).map(p => p.uid));
  cs.people = cs.people.filter(p => p.me || inPool.has(p.uid));
  P.members.forEach(m => { if (!cs.people.some(p => p.uid === m.uid)) cs.people.push({ key: m.uid, uid: m.uid, name: m.name, on: true, units: 2, custom: '' }); });
  cs.people.forEach(p => { p.on = cs.edit ? (p.me || had.has(p.uid)) : true; });
  cs.poolEq = !!P.equal; cs.poolN = P.members.length + 1;
  if (cs.poolEq) { cs.mode = 'equal'; cs.people.forEach(p => { p.on = true; }); }
}
function poolBillMenu(P, id) {
  dlg(`<h1 style="font-size:18px">บิลจากกอง</h1><div class="lbl">${esc((P.bills.find(b => b.id === id) || {}).title || '')}</div>
    <button type="button" class="btn ink" id="pbEdit">แก้บิล</button><button type="button" class="btn" id="pbDel" style="color:var(--bad)">ลบบิลนี้ออกจากกอง</button><button type="button" class="btn" id="pbX">ปิด</button>`, d => {
    $('#pbX').onclick = () => d.close();
    $('#pbEdit').onclick = async () => {
      d.close();
      try { const r = await call('hk_bill', { b: id }); openCreate(r.bill); poolCs(P); drawCreate(); } catch (e) { toast(e.message); }
    };
    $('#pbDel').onclick = async () => {
      if (!confirm('ลบบิลนี้ออกจากกอง? ยอดของทุกคนจะคิดใหม่')) return;
      d.close();
      try { const r = await call('hk_void', { b: id }); view.pool = r.pool; toast('ลบบิลแล้ว'); drawPool(); } catch (e) { toast(e.message); }
    };
  });
}

/* ===================== โหมดคนจ่ายก่อน: ติดตาม ===================== */
function groupsOf(bill) {   // รวมแถวตามคนที่ต้องโอน (คนนอกกลุ่มที่มีคนจ่ายแทน ไปรวมกับคนนั้น)
  const g = {};
  bill.rows.forEach(r => {
    const k = r.byMe ? 'self' : r.byUid ? 'r:' + r.byUid : r.uid ? 'r:' + r.uid : r.k;
    const x = g[k] = g[k] || { k: k, name: r.byMe ? 'ฉันจ่ายแทน' : r.by || r.name, rows: [], sumS: 0 };
    x.rows.push(r); x.sumS += r.amtS;
  });
  return Object.values(g).map(x => Object.assign(x, { st: x.rows.every(r => r.st === 'ok') ? 'ok' : x.rows.some(r => r.st === 'wait') ? (x.rows.some(r => r.st === 'told') ? 'told' : 'wait') : 'told', slip: x.rows.some(r => r.slip), extra: x.rows.filter(r => r.by || r.byMe).map(r => r.name) }));
}
/** 🧩 รายการในบิล + 🧮 ราคาต่อหน่วย (คนจ่ายก่อนเห็นยอดรายการ · เพื่อนเห็นส่วนของตัวเองในแต่ละรายการ) */
function calcTxt(x) { return x && x.rateS ? esc(x.unit || 'หน่วย') + 'ละ ' + baht(x.rateS) + (x.qty ? ' × ' + x.qty + ' ' + esc(x.unit || '') : '') : ''; }
function partsView(b) {
  if (b.parts && b.parts.length) return `<div class="sec list"><div class="sec-h">รายการในบิลนี้${b.isPayer ? '' : ' (ส่วนของฉัน)'}</div>${b.parts.map(pt => { const c = catOf(pt.cat); const ct = calcTxt(pt);
    return `<div class="item"><span class="pl-ic" aria-hidden="true">${c ? c[1] : '🧾'}</span><div class="mid"><div class="nm">${esc(pt.name)}</div><div class="lbl">${[ct, !b.isPayer && pt.units ? pt.units + ' ' + esc(pt.unit) : ''].filter(Boolean).join(' · ') || (c ? esc(c[2]) : '')}</div></div><div class="amt">${baht(b.isPayer ? pt.totalS : pt.mineS)}</div></div>`; }).join('')}</div>`;
  return b.calc && b.calc.rateS ? `<div class="lbl">🧮 ${calcTxt(Object.assign({}, b.calc, { unit: b.calc.unit || b.unit }))}</div>` : '';
}
function drawTrack() {
  const b = view.bill;
  $('#ttl').textContent = b.title;
  const gs = groupsOf(b).filter(x => x.k !== 'self');
  const total = gs.reduce((s, x) => s + x.sumS, 0), got = gs.filter(x => x.st === 'ok').reduce((s, x) => s + x.sumS, 0);
  const row = x => `<div class="item">
    <div class="mid"><div class="nm">${esc(x.name)} <span class="num h">${baht(x.sumS)}</span></div>
      <div class="lbl">${x.extra.length ? 'รวมของ' + esc(x.extra.join(', ')) + ' · ' : ''}${x.st === 'ok' ? (x.rows.some(r => r.auto) ? 'แมวกวักตรวจสลิปแล้ว' : 'ยืนยันแล้ว') : x.st === 'told' ? (x.rows.some(r => r.via === 'cash') ? 'แจ้งว่าจ่ายเงินสดแล้ว · ได้รับแล้วกดยืนยัน' : 'แจ้งจ่ายแล้ว · เช็กยอดในแอปธนาคารก่อนกด') : 'ยังไม่จ่าย'}
      ${x.slip ? ` · <button type="button" class="lnk" data-slip="${esc(x.k)}" style="padding:0;font-size:12.5px">ดูสลิป</button>` : ''}</div></div>
    ${x.st === 'ok' ? `<button type="button" class="pill ok" data-undo="${esc(x.k)}" style="border:0;cursor:pointer" aria-label="ยกเลิกการยืนยันของ ${esc(x.name)}">ได้เงินแล้ว</button>` : `<button type="button" class="btn sm ${x.st === 'told' ? 'ink' : ''}" data-ok="${esc(x.k)}">ได้เงินแล้ว</button>`}
  </div>`;
  $('#app').innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px"><div><h1>${esc(b.title)} ${baht(b.totalS)}</h1><div class="sub">${esc([b.group, thDate(b.date)].filter(Boolean).join(' · '))} · คุณจ่ายก่อน</div></div><span class="pill ink">คนจ่ายก่อน</span></div>
    ${partsView(b)}
    ${b.rcpt ? '<button type="button" class="lnk" id="seeRc" style="align-self:flex-start;padding:0">🧾 ดูรูปใบเสร็จ</button>' : ''}
    ${view.unsent ? `<div class="err">ยังไม่ได้ส่งการ์ดบิลเข้ากลุ่ม <button type="button" class="lnk" id="resend" style="padding:0">ส่งเข้ากลุ่ม</button></div>` : ''}
    <div class="sec" style="padding:14px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>ได้คืนแล้ว <b class="num">${baht(got)}</b> จาก ${baht(total)}</span><span class="lbl">${gs.filter(x => x.st === 'ok').length}/${gs.length} คน</span></div>
      <div class="bar" style="margin-top:8px"><i style="width:${total ? Math.round(got / total * 100) : 100}%"></i></div></div>
    <div class="sec list"><div class="sec-h">แต่ละคน</div>${gs.map(row).join('') || '<div class="empty">ไม่มีใครต้องจ่าย</div>'}</div>
    <div class="row2"><button class="btn" type="button" id="nag">ทวงในกลุ่ม</button><button class="btn" type="button" id="edit">แก้ยอด</button></div>
    <div class="row2"><button class="btn" type="button" id="card">ส่งการ์ดบิลอีกครั้ง</button><button class="btn" type="button" id="del">ลบบิล</button></div>
    <div class="lbl" style="padding:0 4px">ทวงในกลุ่มจะแท็กเฉพาะคนที่ยังไม่จ่าย และไม่โชว์ยอดของใคร</div>`;
  const A = $('#app');
  A.querySelectorAll('[data-ok]').forEach(x => x.onclick = () => setOk(x.dataset.ok, false, x));
  A.querySelectorAll('[data-undo]').forEach(x => x.onclick = () => { if (confirm('ยกเลิกการยืนยันว่าได้เงินแล้ว?')) setOk(x.dataset.undo, true, x); });
  A.querySelectorAll('[data-slip]').forEach(x => x.onclick = () => showSlip(x.dataset.slip));
  $('#nag').onclick = async () => {
    if (!gs.some(x => x.st === 'wait')) { toast('ทุกคนแจ้งจ่ายแล้ว'); return; }
    const ok = await postToChat({ type: 'text', text: 'ทวงหน่อย ' + b.title });
    toast(ok ? 'ส่งแล้ว บอทจะแท็กคนที่ยังไม่จ่าย' : 'เปิดจากในกลุ่มก่อน หรือพิมพ์ ทวง ในกลุ่ม');
  };
  $('#edit').onclick = () => openCreate(b);
  const sr = $('#seeRc'); if (sr) sr.onclick = () => showRcpt(b);
  $('#card').onclick = async () => { try { const d = await call('hk_card', { b: b.id }); const ok = await postToChat(d.msg); toast(ok ? 'ส่งแล้ว' : 'เปิดจากในกลุ่มก่อนจึงส่งได้'); } catch (e) { toast(e.message); } };
  $('#del').onclick = async () => {
    if (!confirm('ลบบิล ' + b.title + '?\nถ้ามีคนโอนมาแล้ว ต้องคืนเงินกันเอง')) return;
    try { await call('hk_void', { b: b.id }); await loadHome(); toast('ลบบิลแล้ว'); show('home', true); } catch (e) { toast(e.message); }
  };
  const rs = $('#resend'); if (rs) rs.onclick = async () => { const ok = await postToChat(view.unsent); if (ok) { view.unsent = null; drawTrack(); } else toast('ส่งได้เมื่อเปิดจากในกลุ่ม'); };
}
async function setOk(k, undo, btn) {
  busy(btn, true);
  try { const d = await call('hk_ok', { b: view.bill.id, k: k, undo: !!undo }); view.bill = d.bill; loadHome().catch(() => {}); drawTrack(); }
  catch (e) { toast(e.message); busy(btn, false); }
}
async function showSlip(k) {
  dlg('<div class="spin" role="status" aria-label="กำลังโหลด"></div>');
  try {
    const d = await call('hk_slip', { b: view.bill.id, k: k });
    dlg(`<img alt="สลิปโอนเงิน" src="data:image/jpeg;base64,${d.data}" style="width:100%;border-radius:10px"><button class="btn" type="button" id="dX">ปิด</button>`, dd => { $('#dX').onclick = () => dd.close(); });
  } catch (e) { $('#dlg').close(); toast(e.message); }
}

/* ===================== โหมดคนที่ต้องจ่าย ===================== */
function crc16(s) { let c = 0xFFFF; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c.toString(16).toUpperCase().padStart(4, '0'); }
function ppPayload(id, amountS) {
  const f = (t, v) => t + String(v.length).padStart(2, '0') + v;
  const acc = id.length === 10 ? f('01', '0066' + id.slice(1)) : id.length === 13 ? f('02', id) : f('03', id);
  const s = f('00', '01') + f('01', amountS ? '12' : '11') + f('29', f('00', 'A000000677010111') + acc) + f('58', 'TH') + f('53', '764') + (amountS ? f('54', (amountS / 100).toFixed(2)) : '') + '6304';
  return s + crc16(s);
}
/** QR รับเงินที่อัปไว้ (EMVCo) → ใส่ยอดเข้าไป */
function emvAmount(s, amountS) {
  const t = []; let i = 0;
  while (i < s.length) { const id = s.substr(i, 2), n = parseInt(s.substr(i + 2, 2), 10); if (!/^\d\d$/.test(id) || isNaN(n)) return ''; t.push([id, s.substr(i + 4, n)]); i += 4 + n; }
  if (i !== s.length) return '';
  const f = t.filter(x => x[0] !== '54' && x[0] !== '63');
  const p = f.find(x => x[0] === '01'); if (p) p[1] = '12'; else f.splice(1, 0, ['01', '12']);
  let at = f.findIndex(x => +x[0] > 54); if (at < 0) at = f.length;
  f.splice(at, 0, ['54', (amountS / 100).toFixed(2)]);
  const str = f.map(x => x[0] + String(x[1].length).padStart(2, '0') + x[1]).join('') + '6304';
  return str + crc16(str);
}
function qrCanvas(text, label, sub) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), cell = 8, pad = 4 * cell, W = n * cell + pad * 2, H = W + 70;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#0b2c5f';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect(pad + k * cell, pad + r * cell, cell, cell);
  g.textAlign = 'center'; g.font = 'bold 26px sans-serif'; g.fillText(label, W / 2, W + 18);
  g.font = '18px sans-serif'; g.fillStyle = '#555'; g.fillText(String(sub || '').slice(0, 32), W / 2, W + 48);
  return c;
}
let payCanvas = null;
function drawPay() {
  const b = view.bill, due = b.dueS, pay = b.pay || {};
  $('#ttl').textContent = b.title;
  $('#foot').classList.add('hide');
  const st = due ? 'wait' : b.mine.every(m => m.st === 'ok') ? 'ok' : 'told';
  const own = b.canUnits && st === 'wait' ? b.mine.find(m => !m.byMe) : null;
  if (own && view.uDraft == null) view.uDraft = own.units || 1;
  const brk = b.mine.map(m => {
    const what = m.byMe ? `${esc(m.name)} <span class="lbl">ฉันจ่ายแทน</span>` : 'ของฉัน';
    if (m === own) return `<div style="align-items:center"><span>${what}</span><span class="step"><button type="button" id="uDec" aria-label="ลดชั่วโมง">−</button><span class="num">${view.uDraft} ${esc(b.unit)}</span><button type="button" id="uInc" aria-label="เพิ่มชั่วโมง">+</button></span><span class="num">${baht(m.amtS)}</span></div>`;
    const det = m.units ? ' · ' + m.units + ' ' + esc(b.unit) : m.items && m.items.length ? ' · ' + esc(m.items.join(', ')) : '';
    return `<div><span>${what}${det}</span><span class="num">${baht(m.amtS)}</span></div>`;
  }).join('');
  const uNote = own ? `<div class="lbl" style="text-align:center">${view.uDraft !== own.units ? `<button class="btn sm ink" type="button" id="uSave">อัปเดตเป็น ${view.uDraft} ${esc(b.unit)}</button>` : `มาน้อยกว่านี้/นานกว่านี้? กด − + แก้ชั่วโมงของคุณได้ จนกว่าจะมีคนจ่าย`}</div>` : '';
  let qr = '', qrNote = '';
  payCanvas = null;
  const cash = view.method === 'cash';
  if (st === 'wait' && cash) qrNote = 'ยื่นเงินสดให้ ' + esc(b.payer) + ' แล้วกด ฉันจ่ายแล้ว · ' + esc(b.payer) + ' จะกดยืนยันว่าได้รับ';
  else if (st === 'wait') {
    const text = pay.qr ? emvAmount(pay.qr, due) : pay.pp ? ppPayload(pay.pp, due) : '';
    if (text) {
      try { payCanvas = qrCanvas(text, 'จ่าย ' + baht(due), b.title); qr = `<img alt="QR จ่าย ${baht(due)} ให้ ${esc(b.payer)}" src="${payCanvas.toDataURL('image/png')}">`; qrNote = (pay.qr ? 'QR ของ ' : 'พร้อมเพย์ของ ') + esc(b.payer) + ' · ใส่ยอด ' + baht(due) + ' ให้แล้ว'; } catch (e) {}
    } else if (pay.qrImg) { qr = '<div id="qrImg"><div class="spin" role="status" aria-label="กำลังโหลด QR"></div></div>'; qrNote = 'QR ของ ' + esc(b.payer) + ' · ตอนโอนพิมพ์ยอด ' + baht(due) + ' เอง'; }
    else if (!pay.bank) qrNote = esc(b.payer) + ' ยังไม่ได้ตั้ง QR พร้อมเพย์ หรือเลขบัญชี ถามช่องทางโอนจากเจ้าตัวได้เลย';
  }
  const bankCard = st === 'wait' && !cash && pay.bank ? `<div class="sec" style="padding:14px;display:flex;flex-direction:column;gap:10px">
      <div class="lbl">${qr ? 'หรือโอนเข้าบัญชี' : 'โอนเข้าบัญชี'}</div>
      <div style="display:flex;align-items:center;gap:12px">${bankBadge(pay.bank.code, 44)}<div style="flex:1;min-width:0"><div class="nm" style="font-weight:600">${esc(pay.bank.name)}</div>
        <div class="h num" style="font-size:20px;font-weight:700;letter-spacing:.5px">${esc(fmtAcct(pay.bank.acct))}</div>${pay.bank.holder ? `<div class="lbl">${esc(pay.bank.holder)}</div>` : ''}</div></div>
      <div class="row2"><button class="btn sm" type="button" id="cpAcct">คัดลอกเลขบัญชี</button><button class="btn sm" type="button" id="cpAmt">คัดลอกยอด ${baht(due)}</button></div>
    </div>` : '';
  const others = (b.others || []).map(o => `<div class="item" style="padding:8px 14px"><div class="mid">${esc(o.name)}</div><span class="pill ${o.st === 'wait' ? 'warn' : 'ok'}">${o.st === 'wait' ? 'ยังไม่จ่าย' : o.st === 'ok' ? 'ได้รับแล้ว' : 'จ่ายแล้ว'}</span></div>`).join('');
  $('#app').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div class="lbl">${esc([b.title, b.group].filter(Boolean).join(' · '))} · เห็นเฉพาะยอดของคุณ</div><span class="pill soft">คนที่ต้องจ่าย</span></div>
    ${partsView(b)}
    ${b.rcpt ? '<button type="button" class="lnk" id="seeRc" style="align-self:flex-start;padding:0">🧾 ดูรูปใบเสร็จ</button>' : ''}
    <div class="sec qrbox">
      ${st !== 'wait' ? '<img src="jod-cheer.png?v=100" alt="" style="width:88px;height:88px;image-rendering:auto">' : ''}
      ${st === 'wait' ? `<div class="tabs" role="group" aria-label="ช่องทางจ่าย" style="align-self:stretch;margin-bottom:10px"><button type="button" class="tab" data-m="transfer" aria-pressed="${!cash}">โอน / สแกน QR</button><button type="button" class="tab" data-m="cash" aria-pressed="${cash}">เงินสด</button></div>` : ''}
      <div class="lbl">${st === 'wait' ? 'ต้องจ่ายให้ ' + esc(b.payer) : st === 'told' ? (b.mine.some(m => m.via === 'cash') ? 'แจ้งจ่ายเงินสดแล้ว' : 'แจ้งจ่ายแล้ว') + ' รอ ' + esc(b.payer) + ' ยืนยัน' : esc(b.payer) + ' ได้รับเงินแล้ว'}</div>
      <div class="due">${baht(st === 'wait' ? due : b.sumS)}</div>
      <div class="brk">${brk}</div>
      ${uNote}
      ${qr ? `<div style="margin-top:10px">${qr}</div>` : ''}
      ${qrNote ? `<div class="lbl" style="text-align:center">${qrNote}</div>` : ''}
    </div>
    ${bankCard}
    ${st === 'wait' && !cash ? `<div class="row2">${payCanvas ? '<button class="btn" type="button" id="saveQr">บันทึกรูป QR</button>' : ''}<button class="btn" type="button" id="slip">แนบสลิป</button></div>
      <div class="lbl" id="slipOk" style="text-align:center">แนบสลิปแล้วแมวกวักตรวจให้ ยอดตรงติ๊กจ่ายให้เลย ไม่ต้องรอ ${esc(b.payer)} ยืนยัน</div>` : ''}
    ${st === 'told' && !b.mine.some(m => m.via === 'cash') ? `<button class="btn" type="button" id="slip2">ส่งสลิปให้แมวกวักตรวจ</button>` : ''}
    ${others ? `<div class="sec list"><div class="sec-h">คนอื่นในบิล</div>${others}</div>` : ''}`;
  if (st === 'wait') {
    foot(`<button class="btn ink" type="button" id="paid">${cash ? 'ฉันจ่ายเงินสดแล้ว' : 'ฉันจ่ายแล้ว'}</button>`);
    $('#paid').onclick = () => markPaid();
    $('#app').querySelectorAll('[data-m]').forEach(t => t.onclick = () => { view.method = t.dataset.m; drawPay(); });
    const sl = $('#slip'); if (sl) sl.onclick = attachSlip;
    const sq = $('#saveQr'); if (sq) sq.onclick = saveQr;
    const ca = $('#cpAcct'); if (ca) ca.onclick = () => copyText(pay.bank.acct, 'คัดลอกเลขบัญชีแล้ว');
    const cm = $('#cpAmt'); if (cm) cm.onclick = () => copyText(plain(due), 'คัดลอกยอดแล้ว');
    if (!cash && pay.qrImg && !pay.qr && !pay.pp) loadQrImg();
  }
  const sr = $('#seeRc'); if (sr) sr.onclick = () => showRcpt(b);
  const s2 = $('#slip2');
  if (s2) s2.onclick = async () => { await attachSlip(); if (slipData) markPaid(s2); };
  if (own) {
    $('#uDec').onclick = () => { view.uDraft = Math.max(0.5, view.uDraft - 0.5); drawPay(); };
    $('#uInc').onclick = () => { view.uDraft = Math.min(24, view.uDraft + 0.5); drawPay(); };
    const us = $('#uSave');
    if (us) us.onclick = async () => {
      busy(us, true);
      try { const d = await call('hk_units', { b: b.id, units: view.uDraft }); view.bill = d.bill; view.uDraft = null; toast('อัปเดตชั่วโมงแล้ว ยอดของทุกคนคำนวณใหม่'); drawPay(); }
      catch (e) { toast(e.message); busy(us, false); }
    };
  }
}
async function showRcpt(b) {
  dlg('<div class="spin" role="status" aria-label="กำลังโหลดรูปใบเสร็จ"></div>');
  try {
    const d = await call('hk_rcptimg', { b: b.id });
    dlg(`<img class="photo" alt="รูปใบเสร็จ ${esc(b.title)}" src="data:image/jpeg;base64,${d.data}" style="width:100%;border-radius:10px"><button class="btn" type="button" id="rcClose" style="margin-top:10px">ปิด</button>`, d2 => { d2.querySelector('#rcClose').onclick = () => d2.close(); });
  } catch (e) { $('#dlg').close(); toast(e.message); }
}
async function loadQrImg() {
  try { const d = await call('hk_qrimg', { b: view.bill.id }); const el = $('#qrImg'); if (el) el.innerHTML = `<img class="photo" alt="QR รับเงินของ ${esc(view.bill.payer)}" src="data:image/jpeg;base64,${d.data}">`; }
  catch (e) { const el = $('#qrImg'); if (el) el.textContent = e.message; }
}
function saveQr() {
  payCanvas.toBlob(async blob => {
    const file = new File([blob], 'qr-' + plain(view.bill.dueS) + '.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('ถ้าบันทึกไม่ได้ ให้กดค้างที่รูป QR แล้วเลือกบันทึกรูป');
  });
}
let slipData = '';
async function attachSlip() {
  const f = await pickFile();
  if (!f) return;
  slipData = await shrink(f, 1200, 0.8);
  const el = $('#slipOk'); if (el) el.textContent = 'แนบสลิปแล้ว กด ฉันจ่ายแล้ว ให้แมวกวักตรวจได้เลย';
  const sb = $('#slip'); if (sb) sb.textContent = 'เปลี่ยนสลิป';
}
async function markPaid(b2) {
  const btn = b2 && b2.nodeType ? b2 : $('#paid'); busy(btn, true);
  try {
    const cash = view.method === 'cash';
    const d = await call('hk_paid', { b: view.bill.id, slip: cash ? '' : slipData || '', via: cash ? 'cash' : 'transfer' });
    slipData = '';
    view.bill = d.bill;
    if (d.text) await postToChat({ type: 'text', text: d.text });
    toast(d.auto ? 'แมวกวักตรวจสลิปแล้ว ติ๊กจ่ายให้เรียบร้อย' : d.why ? d.why + ' · แจ้ง ' + view.bill.payer + ' ให้ยืนยันแทน' : 'แจ้ง ' + view.bill.payer + ' แล้ว');
    loadHome().catch(() => {});
    drawPay();
  } catch (e) { toast(e.message); busy(btn, false); }
}

/* ===================== ชื่อ + ช่องทางรับเงิน ===================== */
function openMe() {
  const m = home.me;
  const cur = m.qr ? 'QR รับเงิน (ใส่ยอดให้เพื่อนได้)' : m.qrImg ? 'รูป QR (เพื่อนต้องพิมพ์ยอดเอง)' : m.ppSet ? 'พร้อมเพย์ ' + m.pp : 'ยังไม่ได้ตั้ง';
  let pick = m.bank ? m.bank.code : '';
  dlg(`<h1 style="font-size:18px">ชื่อและช่องทางรับเงิน</h1>
    <label class="field"><span class="lbl">ชื่อที่เพื่อนเห็น (ชื่อ LINE: ${esc(m.name || '-')})</span><input id="mNick" type="text" maxlength="30" value="${esc(m.nick)}" placeholder="${esc(m.name || 'ชื่อเล่น')}"></label>
    <div class="lbl">ถ้าเพื่อนเคยใส่ชื่อนี้เป็น "คนนอกกลุ่ม" ไว้ ยอดนั้นจะย้ายมาเป็นของบัญชีนี้</div>
    <div class="sec-h" style="padding:6px 0 0;font-weight:600;color:var(--ink)">1. QR หรือพร้อมเพย์ <span class="lbl" style="font-weight:400">ตอนนี้: ${esc(cur)}</span></div>
    <button class="btn" type="button" id="mQr">อัปรูป QR รับเงิน (จากแอปธนาคาร)</button>
    <label class="field"><span class="lbl">หรือใส่พร้อมเพย์ (เบอร์ 10 หลัก / เลข 13 หลัก)</span><input id="mPp" type="text" inputmode="numeric" placeholder="08xxxxxxxx"></label>
    <div class="sec-h" style="padding:6px 0 0;font-weight:600;color:var(--ink)">2. บัญชีธนาคาร <span class="lbl" style="font-weight:400">(มีพร้อมกับ QR ได้)</span></div>
    <div role="group" aria-label="เลือกธนาคาร" id="mBanks" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">${BANKS.map(b => `<button type="button" class="chip" data-bank="${b[0]}" aria-pressed="${pick === b[0]}" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 2px;border-radius:12px;text-align:center">${bankBadge(b[0], 30)}<span style="font-size:11px;line-height:1.2">${esc(b[1])}</span></button>`).join('')}</div>
    <label class="field"><span class="lbl">เลขบัญชี</span><input id="mAcct" class="num" type="text" inputmode="numeric" placeholder="xxx-x-xxxxx-x" value="${esc(m.bank ? fmtAcct(m.bank.acct) : '')}"></label>
    <label class="field"><span class="lbl">ชื่อบัญชี (ให้เพื่อนเช็กก่อนโอน)</span><input id="mHolder" type="text" maxlength="60" placeholder="เช่น นาย ก. ใจดี" value="${esc(m.bank ? m.bank.holder : '')}"></label>
    ${m.bank ? '<button class="lnk" type="button" id="mNoBank" style="align-self:flex-start">ลบบัญชีธนาคาร</button>' : ''}
    <div class="row2"><button class="btn" type="button" id="mX">ปิด</button><button class="btn ink" type="button" id="mOk">บันทึก</button></div>`, d => {
    $('#mX').onclick = () => d.close();
    document.querySelectorAll('#mBanks [data-bank]').forEach(b => b.onclick = () => { pick = b.dataset.bank; document.querySelectorAll('#mBanks [data-bank]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    const nb = $('#mNoBank'); if (nb) nb.onclick = async () => { try { const res = await call('hk_me_set', { acct: '' }); home.me = res.me; d.close(); toast('ลบบัญชีธนาคารแล้ว'); draw(); } catch (e) { toast(e.message); } };
    $('#mQr').onclick = async () => {
      const f = await pickFile(); if (!f) return;
      $('#mQr').textContent = 'กำลังอ่าน QR…';
      try {
        let text = '';
        if ('BarcodeDetector' in window) { try { const r = await new BarcodeDetector({ formats: ['qr_code'] }).detect(await createImageBitmap(f)); text = (r[0] && r[0].rawValue) || ''; } catch (e) {} }
        const res = text && /^000201/.test(text) ? await call('hk_me_set', { qr: text }) : await call('hk_me_set', { qrImg: await shrink(f, 900, 0.9) });
        home.me = res.me;
        toast(res.me.qr ? 'บันทึก QR แล้ว เพื่อนจะได้ QR พร้อมยอด' : 'บันทึกรูป QR แล้ว (เครื่องนี้อ่าน QR ไม่ได้ เพื่อนต้องพิมพ์ยอดเอง)');
        d.close(); draw();
      } catch (e) { toast(e.message); $('#mQr').textContent = 'อัปรูป QR รับเงิน (จากแอปธนาคาร)'; }
    };
    $('#mOk').onclick = async () => {
      const p = {}, nick = $('#mNick').value.trim(), pp = $('#mPp').value.trim();
      const acct = $('#mAcct').value.replace(/\D/g, ''), holder = $('#mHolder').value.trim();
      if (nick !== m.nick) p.nick = nick;
      if (pp) p.pp = pp;
      if (acct && (!m.bank || acct !== m.bank.acct || pick !== m.bank.code || holder !== m.bank.holder)) {
        if (!pick) { toast('เลือกธนาคารก่อนครับ'); return; }
        Object.assign(p, { acct: acct, bank: pick, acctName: holder });
      }
      if (!Object.keys(p).length) return d.close();
      try { const res = await call('hk_me_set', p); home.me = res.me; d.close(); toast(res.me.claimed || 'บันทึกแล้ว'); await loadHome(); draw(); }
      catch (e) { toast(e.message); }
    };
  });
}

boot();
