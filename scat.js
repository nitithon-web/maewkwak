/* แมวกวัก — หารกัน: 🏷 หมวดของบิล · หารตามชั่วโมง/ชิ้น · 💾 ชุดของกลุ่ม · 🗓 หารทุกเดือน · ปัดยอดโอน · 📊 สรุปเดือน
 * โหลดหลัง owe.js (ใช้ sp, owe, saveDocs, openSplit, paintSplit, apportion …) · owe.js เรียกฟังก์ชันในนี้ผ่าน typeof ทุกจุด */

/* หมวด: ic ไอคอน · n ชื่อ · money หมวดรายจ่ายของส่วนเรา · method วิธีหารเริ่มต้น · sug รายการแนะนำ (u หน่วย · rate ราคาต่อหน่วย · step ทีละ · def ค่าเริ่มทุกคน) */
const SCATS = [
  { k: 'food', ic: '🍜', n: 'อาหาร', money: 'อาหาร', method: 'menu', sug: ['ค่าอาหาร', 'เครื่องดื่ม', 'ของหวาน', 'ค่าน้ำแข็ง/โซดา', 'ค่าเปิดขวด'] },
  { k: 'mart', ic: '🏪', n: 'เซเว่น/มินิมาร์ท', money: 'อาหาร', method: 'menu', sug: ['ขนม', 'เครื่องดื่ม', 'ข้าวกล่อง', 'ของใช้'] },
  { k: 'sport', ic: '🏸', n: 'กีฬา', money: 'ออกกำลังกาย', method: 'unit', sug: [{ n: 'ค่าสนาม', u: 'ชม.', step: 0.5 }, { n: 'ลูกแบด', u: 'ลูก', rate: 1 }, { n: 'ค่าคอร์ท', u: 'ชม.', step: 0.5 }, { n: 'ค่าน้ำ/น้ำแข็ง' }, { n: 'ค่าโค้ช', u: 'ชม.' }] },
  { k: 'karaoke', ic: '🎤', n: 'คาราโอเกะ', money: 'บันเทิง/ท่องเที่ยว', method: 'unit', sug: [{ n: 'ค่าห้อง', u: 'ชม.', step: 0.5 }, { n: 'เครื่องดื่ม' }, { n: 'อาหาร' }, { n: 'Service' }] },
  { k: 'drink', ic: '🍻', n: 'ปาร์ตี้', money: 'เครื่องดื่ม/กาแฟ', method: 'menu', sug: ['เบียร์', 'เหล้า', 'มิกเซอร์', 'น้ำแข็ง', 'กับแกล้ม', 'ค่าเข้าร้าน'] },
  { k: 'ride', ic: '🚕', n: 'เดินทาง', money: 'เดินทาง', method: 'unit', sug: [{ n: 'ค่ารถ' }, { n: 'ทางด่วน' }, { n: 'ค่าน้ำมัน' }, { n: 'ค่าจอดรถ' }, { n: 'ค่ารถต่อระยะ', u: 'กม.', rate: 1 }] },
  { k: 'trip', ic: '🧳', n: 'ทริป/ที่พัก', money: 'บันเทิง/ท่องเที่ยว', method: 'unit', sug: [{ n: 'ค่าที่พัก', u: 'คืน' }, { n: 'ค่าเช่ารถ', u: 'วัน' }, { n: 'ค่าน้ำมัน' }, { n: 'ค่าตั๋ว', u: 'ใบ', rate: 1 }, { n: 'ค่ากิจกรรม' }] },
  { k: 'movie', ic: '🎬', n: 'หนัง/กิจกรรม', money: 'บันเทิง/ท่องเที่ยว', method: 'unit', sug: [{ n: 'ตั๋วหนัง', u: 'ใบ', rate: 1 }, { n: 'ป๊อปคอร์น' }, { n: 'ค่าเข้า', u: 'ใบ', rate: 1 }] },
  { k: 'home', ic: '🏠', n: 'บ้าน/รายเดือน', money: 'ค่าน้ำไฟ/โทรศัพท์', method: 'equal', sug: ['ค่าเน็ต', 'ค่าไฟ', 'ค่าน้ำ', 'ค่าส่วนกลาง', 'Netflix', 'YouTube Premium', 'Spotify'] },
  { k: 'gift', ic: '🎁', n: 'ของขวัญ/ช่วยกัน', money: 'อื่นๆ', method: 'equal', sug: ['ของขวัญวันเกิด', 'เค้ก', 'ซองงานแต่ง', 'ช่วยงานศพ'] },
  { k: 'other', ic: '🧾', n: 'อื่นๆ', money: '', method: 'equal', sug: [] },
];
const scatOf = k => SCATS.find(c => c.k === k);
const sugObj = s => typeof s === 'string' ? { n: s } : s;
const catOf = s => s ? s.cat || (typeof scatGuess === 'function' ? scatGuess(s.title) : '') : '';   // บิลที่ไม่มีหมวด → เดาจากชื่อ
function scatIcon(s) { const c = scatOf(catOf(s)); return c ? c.ic : ''; }
function scatMoney(s) { const c = scatOf(s && s.cat); return c ? c.money : ''; }

/* ---------- 🏷 เลือกหมวด (หัวหน้าต่างหารกัน) ---------- */
function paintCat() {
  const box = $('#sCat');
  if (!box || !sp) return;
  box.innerHTML = SCATS.map(c => `<button type="button" data-k="${c.k}" class="${sp.cat === c.k ? 'on' : ''}">${c.ic} ${esc(c.n)}</button>`).join('');
  const on = box.querySelector('.on');
  box.scrollLeft = on ? Math.max(0, on.offsetLeft - 40) : 0;
  const t = sp.tplId && tpls().find(x => x.id === sp.tplId), up = $('#sTplUp');
  if (up) { up.hidden = !t; if (t) up.textContent = `🔄 อัปเดตชุด "${t.name}" ให้เป็นแบบบิลนี้`; }
}
const billBlank = b => !toS(b.total) && !Object.values(b.custom || {}).some(v => toS(v))
  && !(b.items || []).some(it => it.name || toS(it.price)) && !(b.lines || []).some(l => l.name || toS(l.price));
const newLine = s => { s = sugObj(s || {}); return { name: s.n || '', price: '', unit: s.u || '', rate: !!s.rate, step: s.step || 1, def: s.def || 1, u: {} }; };
function setCat(k) {
  sp.cat = sp.cat === k ? '' : k;
  const c = scatOf(sp.cat);
  if (c) sp.bills.forEach(b => {
    if (!billBlank(b) || b.method === c.method) return;
    b.method = c.method;
    if (c.method === 'menu' && !b.items.length) b.items.push({ name: '', price: '', who: [...sp.people], all: true });
    if (c.method === 'unit' && !(b.lines || []).length) b.lines = [newLine(c.sug[0])];
  });
  paintCat(); paintSplit();
}
if ($('#sCat')) $('#sCat').onclick = e => { const c = e.target.closest('button'); if (c && sp) setCat(c.dataset.k); };
/* พิมพ์ชื่อบิลเสร็จ แล้วยังไม่ได้เลือกหมวด → เดาหมวดจากชื่อให้ (เปลี่ยนได้) */
if ($('#sForm')) $('#sForm').elements.title.addEventListener('change', e => {
  if (!sp || sp.cat) return;
  const k = scatGuess(e.target.value);
  if (k) { sp.cat = k; paintCat(); }
});

/* รายการแนะนำของหมวด ใต้แต่ละบิล → แตะเพิ่มเป็นแถว */
function paintSug(b, box) {
  if (!box) return;
  const c = scatOf(sp.cat);
  const have = new Set([...(b.items || []).map(it => it.name), ...(b.lines || []).map(l => l.name), b.title, $('#sForm').elements.title.value].map(x => String(x || '').trim()));
  const list = c ? c.sug.map(sugObj).filter(s => !have.has(s.n)) : [];
  box.innerHTML = list.length ? `<small>แนะนำ</small>${list.map((s, i) => `<button type="button" data-i="${i}">＋ ${esc(s.n)}${s.u ? `<i>/${esc(s.u)}</i>` : ''}</button>`).join('')}` : '';
  box.onclick = e => {
    const btn = e.target.closest('button'); if (!btn) return;
    const s = list[+btn.dataset.i];
    if (b.method === 'unit') {
      const blank = (b.lines || []).find(l => !l.name && !toS(l.price));
      if (blank) Object.assign(blank, newLine(s)); else (b.lines = b.lines || []).push(newLine(s));
    } else if (b.method === 'menu') {
      const blank = b.items.find(it => !it.name && !toS(it.price));
      if (blank) blank.name = s.n; else b.items.push({ name: s.n, price: '', who: [...sp.people], all: true });
    } else {
      const f = $('#sForm').elements;
      if (!f.title.value.trim()) f.title.value = s.n;
      else if (sp.bills.length > 1 && !b.title) b.title = s.n;
      else f.title.value = f.title.value.trim() + ' + ' + s.n;
    }
    paintSplit();
    setTimeout(() => { const ins = [...document.querySelectorAll('#sBills .s-lprice, #sBills .s-iprice, #sBills .s-total')].filter(i => !i.value); ins[0] && ins[0].focus(); }, 30);
  };
}

/* ---------- ⏱ หารตามชั่วโมง / ชิ้น (method: 'unit') ----------
 * แถวละ 1 อย่าง: ราคารวม หารตามจำนวนหน่วยของแต่ละคน (ค่าสนาม 600 · อ๊อก 2 ชม. ฉัน 1 ชม.)
 * หรือ ราคาต่อหน่วย × จำนวนของแต่ละคน (ลูกแบด ลูกละ 85 · อ๊อก 3 ลูก) · ใส่ 0 = ไม่ร่วมแถวนี้ */
const unitsOf = (l, p) => { const v = (l.u || {})[p]; return v === undefined || v === '' ? Number(l.def) || 0 : Number(v) || 0; };
const fmtU = n => String(Math.round(n * 100) / 100);
function lineTotalS(l, people) {
  const U = people.reduce((s, p) => s + unitsOf(l, p), 0);
  return l.rate ? Math.round(toS(l.price) * U) : toS(l.price);
}
function unitShares(b, people) {
  people = people || sp.people;
  const sh = {};
  let tot = 0;
  (b.lines || []).forEach(l => {
    const us = people.map(p => unitsOf(l, p));
    const T = lineTotalS(l, people);
    if (!T || !us.some(Boolean)) return;
    const parts = apportion(T, us, T % 100 === 0 && !l.rate ? 100 : 1);
    people.forEach((p, i) => { if (parts[i]) sh[p] = (sh[p] || 0) + parts[i]; });
    tot += T;
  });
  return { shares: sh, total: tot };
}
function unitBody(b, body) {
  b.lines = b.lines || [];
  if (!b.lines.length) b.lines.push(newLine());
  body.innerHTML = b.lines.map((l, li) => {
    const U = sp.people.reduce((s, p) => s + unitsOf(l, p), 0), T = lineTotalS(l, sp.people), un = l.unit || 'หน่วย';
    return `<div class="s-line" data-i="${li}">
      <div class="s-ih"><input class="s-lname" placeholder="เช่น ค่าสนาม" value="${esc(l.name)}"><input class="s-lprice" inputmode="decimal" placeholder="${l.rate ? 'ราคาต่อ' + esc(un) : 'ราคารวม'}" value="${esc(l.price)}"><input class="s-lunit" placeholder="หน่วย" value="${esc(l.unit)}" aria-label="หน่วย เช่น ชม. ลูก"><button type="button" class="mini s-lrm" aria-label="ลบแถว">✕</button></div>
      <div class="s-lopt"><div class="seg s-lmode"><button type="button" data-m="0" class="${l.rate ? '' : 'on'}">ราคารวม</button><button type="button" data-m="1" class="${l.rate ? 'on' : ''}">ราคาต่อ${esc(un)}</button></div>
        <label class="s-ldef">ทุกคน <input class="s-ldefv" inputmode="decimal" value="${esc(fmtU(Number(l.def) || 0))}"> ${esc(un)}</label></div>
      <div class="s-units">${sp.people.map(p => { const n = unitsOf(l, p); return `<div class="s-u${n ? '' : ' off'}" data-p="${esc(p)}"><span>${esc(who(p))}</span><button type="button" class="s-dec" aria-label="ลด">−</button><b>${esc(fmtU(n))}</b><button type="button" class="s-inc" aria-label="เพิ่ม">＋</button></div>`; }).join('')}</div>
      <small class="s-lnote">รวม ${esc(fmtU(U))} ${esc(un)}${T && U ? ` · ${l.rate ? 'ยอด ' + bahtS(T) : esc(un) + 'ละ ' + bahtS(Math.round(T / U))}` : ''}</small>
    </div>`;
  }).join('') + `<button type="button" class="ghost s-ladd">＋ เพิ่มแถว</button><small class="hint">แตะ − ＋ ใส่จำนวนชั่วโมง/ชิ้นของแต่ละคน · 0 = ไม่ร่วมแถวนั้น</small>`;
  body.querySelectorAll('.s-line').forEach(row => {
    const l = b.lines[+row.dataset.i];
    const note = () => { const U = sp.people.reduce((s, p) => s + unitsOf(l, p), 0), T = lineTotalS(l, sp.people), un = l.unit || 'หน่วย'; row.querySelector('.s-lnote').textContent = `รวม ${fmtU(U)} ${un}${T && U ? ` · ${l.rate ? 'ยอด ' + bahtS(T) : un + 'ละ ' + bahtS(Math.round(T / U))}` : ''}`; };
    row.querySelector('.s-lname').oninput = e => { l.name = e.target.value; };
    row.querySelector('.s-lprice').oninput = e => { l.price = e.target.value; note(); paintSum(); };
    row.querySelector('.s-lunit').onchange = e => { l.unit = e.target.value.trim(); l.step = /ชม|ชั่วโมง|hr|hour/i.test(l.unit) ? 0.5 : 1; paintSplit(); };
    row.querySelector('.s-lrm').onclick = () => { b.lines.splice(+row.dataset.i, 1); paintSplit(); };
    row.querySelector('.s-lmode').onclick = e => { const c = e.target.closest('button'); if (!c) return; l.rate = c.dataset.m === '1'; paintSplit(); };
    row.querySelector('.s-ldefv').onchange = e => { l.def = Math.max(0, Number(e.target.value) || 0); l.u = {}; paintSplit(); };
    row.querySelector('.s-units').onclick = e => {
      const c = e.target.closest('button'); if (!c) return;
      const box = c.closest('.s-u'), p = box.dataset.p, st = Number(l.step) || 1;
      const n = Math.max(0, unitsOf(l, p) + (c.classList.contains('s-inc') ? st : -st));
      (l.u = l.u || {})[p] = n;
      box.querySelector('b').textContent = fmtU(n); box.classList.toggle('off', !n);
      note(); paintSum();
    };
  });
  body.querySelector('.s-ladd').onclick = () => { b.lines.push(newLine()); paintSplit(); setTimeout(() => { const ins = body.querySelectorAll('.s-lname'); ins[ins.length - 1]?.focus(); }, 30); };
}
/* หน้ารายละเอียดบิล: แถวตามชั่วโมง/ชิ้น */
function unitDetail(b, s, eaten) {
  const people = s.people || [];
  return (b.lines || []).filter(l => l.name || toS(l.price)).map(l => {
    const un = l.unit || 'หน่วย', T = lineTotalS(l, people);
    const us = people.map(p => [p, unitsOf(l, p)]).filter(x => x[1]);
    us.forEach(([p, n]) => { (eaten[p] = eaten[p] || []).push(esc(`${l.name || 'รายการ'} ${fmtU(n)} ${un}`)); });
    return `<div class="di-r"><span>${esc(l.name || 'รายการ')}<small>${esc(us.map(([p, n]) => `${who(p)} ${fmtU(n)}`).join(' · '))} ${esc(un)}${l.rate ? ` · ${un}ละ ${num(toS(l.price))}` : ''}</small></span><b>${bahtS(T)}</b></div>`;
  }).join('');
}
function unitMsgLines(s) {
  const people = s.people || [];
  return (s.bills || []).filter(b => b.method === 'unit').flatMap(b => (b.lines || []).filter(l => l.name || toS(l.price)).map(l => {
    const un = l.unit || 'หน่วย';
    const us = people.map(p => [p, unitsOf(l, p)]).filter(x => x[1]);
    return `• ${l.name || 'รายการ'} ${num(lineTotalS(l, people))}${l.rate ? ` (${un}ละ ${num(toS(l.price))})` : ''} — ${us.map(([p, n]) => `${whoMsg(p)} ${fmtU(n)}`).join(', ')} ${un}`;
  }));
}

/* ---------- 🪙 ปัดยอดโอน (ทีละ 1 / 5 / 10 บาท) · คนรับเงินรับส่วนต่างเอง ---------- */
function roundTransfers(tr) {
  const R = Number(sp && sp.round) || 0;
  if (!R) return tr;
  return tr.map(t => ({ ...t, rawS: t.amountS, amountS: Math.round(t.amountS / (R * 100)) * R * 100 })).filter(t => t.amountS > 0);
}
function sumExtra(r) {
  const R = Number(sp.round) || 0;
  const pl = r.pool ? `<p class="note">${esc(poolLine(r.pool))}</p>` : '';
  const changed = (r.transfers || []).filter(t => t.rawS !== undefined && t.rawS !== t.amountS);
  return `<div class="s-round"><span class="lbl">ปัดยอดโอน</span><div class="seg s-rnd">${[[0, 'ไม่ปัด'], [1, '1 บาท'], [5, '5 บาท'], [10, '10 บาท']].map(([v, t]) => `<button type="button" data-r="${v}" class="${R === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>` +
    (changed.length ? `<p class="note">🪙 ${changed.map(t => `${esc(who(t.from))} → ${esc(who(t.to))} ${bahtS(t.rawS)} ปัดเป็น ${bahtS(t.amountS)}`).join(' · ')}</p>` : '') + pl;
}
document.addEventListener('click', e => {
  const c = e.target.closest && e.target.closest('.s-rnd button');
  if (!c || !sp) return;
  sp.round = Number(c.dataset.r) || 0;
  paintSum();
});

/* ---------- 🤖 เดาหมวดจากใบเสร็จ (ชื่อร้าน + รายการ) ---------- */
const SCAT_KW = [
  ['mart', /7-?eleven|เซเว่น|seven|family\s*mart|แฟมิลี่มาร์ท|lawson|ลอว์สัน|cj\s*(more|express)|tops\s*daily|lotus.?s\s*go|มินิบิ๊กซี|mini\s*big\s*c/i],
  ['karaoke', /คาราโอเกะ|karaoke|ห้องร้องเพลง|ร้องเพลง/i],
  ['sport', /แบด|badminton|ค่าสนาม|คอร์ท|court|ฟุตซอล|futsal|ฟุตบอล|เทนนิส|tennis|โบว์ลิ่ง|bowling|ฟิตเนส|สนามกีฬา|ลูกขนไก่/i],
  ['movie', /major|เมเจอร์|sf\s*cinema|เอสเอฟ|โรงหนัง|cinema|ป๊อปคอร์น|popcorn|ตั๋วหนัง/i],
  ['trip', /โรงแรม|hotel|resort|รีสอร์ท|agoda|booking\.com|ที่พัก|airbnb|โฮมสเตย์|homestay/i],
  ['ride', /grab(?!\s*food)|bolt|taxi|แท็กซี่|ทางด่วน|easy\s*pass|ค่ารถ|เติมน้ำมัน|ปตท|ptt|บางจาก|bangchak|shell|caltex|ค่าจอด/i],
  ['home', /ค่าไวไฟ|ไวไฟ|wi-?fi|ค่าเน็ต|ค่าไฟ|การไฟฟ้า|ค่าน้ำประปา|การประปา|ค่าเน็ต|อินเทอร์เน็ต|internet|3bb|ais\s*fibre|true\s*online|netflix|spotify|youtube\s*premium|ค่าส่วนกลาง/i],
  ['drink', /เบียร์|beer|เหล้า|ผับ|\bpub\b|\bbar\b|บาร์|ลีโอ|ช้าง|สิงห์|heineken|โซจู|soju/i],
  ['food', /ร้านอาหาร|อาหาร|ชาบู|shabu|หมูกระทะ|หมูกะทะ|กะเพรา|กระเพรา|ส้มตำ|ผัด|ต้มยำ|แกง|ตลาด|เซฟวัน|save\s*one|บุฟเฟ่|buffet|ก๋วยเตี๋ยว|ข้าว|kfc|\bmk\b|grab\s*food|line\s*man|foodpanda|robinhood|ซูชิ|sushi|ปิ้งย่าง|steak|สเต็ก|pizza|พิซซ่า|cafe|คาเฟ่/i],
];
function scatGuess(text) {
  const t = String(text || '');
  const hit = SCAT_KW.find(([, re]) => re.test(t));
  return hit ? hit[0] : '';
}
function scatFromReceipt(o) {
  if (!sp || sp.cat || !o) return;
  const k = scatGuess([o.vendor, o.desc].join(' ')) || scatGuess((o.items || []).map(it => it.name).join(' '));
  if (!k) return;
  sp.cat = k; paintCat();
}

/* ---------- 💾 ชุดของกลุ่ม (เก็บใน Owe เป็น kind=tpl) ---------- */
const tpls = () => owe.filter(d => d.kind === 'tpl').sort((a, b) => String(b.used || '').localeCompare(String(a.used || '')) || String(a.name).localeCompare(String(b.name)));
let tEdit = null;
function tplFromSplit(keep) {
  const f = $('#sForm').elements;
  return {
    title: f.title.value.trim(), cat: sp.cat || '', people: [...sp.people], round: Number(sp.round) || 0, keep: !!keep,
    bills: sp.bills.map(b => ({
      title: b.title || '', payer: b.payer, method: b.method, who: [...(b.who || [])], svc: !!b.svc, vat: !!b.vat,
      total: keep ? b.total || '' : '', custom: keep ? { ...(b.custom || {}) } : {},
      items: (b.items || []).filter(it => it.name).map(it => ({ name: it.name, price: keep ? it.price || '' : '', who: [...(it.who || [])], all: !!it.all })),
      lines: (b.lines || []).filter(l => l.name || toS(l.price)).map(l => ({ name: l.name, price: l.price || '',   // ค่าสนาม/ค่าห้อง/ราคาต่อลูก มักเท่าเดิม → จำไว้เสมอ
        unit: l.unit || '', rate: !!l.rate, step: l.step || 1, def: l.def || 1, u: {} })),
    })),
  };
}
function openTplDlg(t) {
  tEdit = t || null;
  const f = $('#tForm').elements;
  f.name.value = t ? t.name : ($('#sForm').elements.title.value.trim() || '');
  f.keep.checked = t ? !!t.keep : sp && (sp.cat === 'home' || sp.bills.every(b => b.method === 'equal'));
  f.monthly.checked = !!(t && t.monthly);
  f.day.value = t && t.monthly ? t.monthly : new Date().getDate();
  $('#tDay').hidden = !f.monthly.checked;
  $('#tKeepRow').hidden = !!t;
  $('#tDel').hidden = !t;
  $('#tTitle').textContent = t ? '⚙ ตั้งค่าชุด' : '💾 เก็บเป็นชุด';
  $('#tDlg').showModal();
}
if ($('#tDlg')) {
  $('#tForm').elements.monthly.onchange = e => { $('#tDay').hidden = !e.target.checked; };
  $('#tCancel').onclick = () => $('#tDlg').close();
  $('#tDel').onclick = async () => {
    if (!tEdit || !confirm(`ลบชุด "${tEdit.name}"? (บิลที่เคยหารไว้ไม่หาย)`)) return;
    $('#tDlg').close();
    await delDocs([tEdit.id]);
    toast('ลบชุดแล้ว');
  };
  $('#tForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = $('#tForm').elements;
    const name = f.name.value.trim().slice(0, 40);
    if (!name) { f.name.focus(); return; }
    const day = f.monthly.checked ? Math.min(31, Math.max(1, Number(f.day.value) || 1)) : 0;
    const ym = today().slice(0, 7);
    let t;
    if (tEdit) t = Object.assign(JSON.parse(JSON.stringify(tEdit)), { name, monthly: day });
    else {
      t = Object.assign({ id: uid(), kind: 'tpl', name, created: today() }, tplFromSplit(f.keep.checked), { monthly: day });
      if (sp) sp.tplId = t.id;
    }
    // เพิ่งตั้งหลังวันที่ของเดือนนี้ (หรือเพิ่งหารเดือนนี้ไปแล้ว) → เริ่มเตือนเดือนหน้า
    if (day && (!tEdit || tEdit.monthly !== day)) t.lastRemind = day <= new Date().getDate() ? ym : '';
    $('#tDlg').close();
    await saveDocs([t]);
    toast(day ? `💾 เก็บชุด "${name}" แล้ว · แมวกวักจะเตือนใน LINE ทุกวันที่ ${day}` : `💾 เก็บชุด "${name}" แล้ว · ครั้งหน้าแตะที่หน้าหารกัน`);
  });
}
if ($('#sTpl')) $('#sTpl').onclick = () => { if (sp) openTplDlg(); };
/* 🔄 อัปเดตชุดเดิมจากบิลที่เปิดอยู่ (คน หมวด รายการ ราคาที่จำไว้) · ชื่อชุด / วันเตือน คงเดิม */
if ($('#sTplUp')) $('#sTplUp').onclick = async () => {
  const t = sp && sp.tplId && tpls().find(x => x.id === sp.tplId);
  if (!t) return;
  const next = tplFromSplit(t.keep);
  next.people = [...new Set([...(t.people || []), ...next.people])];   // คนที่ไม่มาครั้งนี้ยังอยู่ในกลุ่ม · คนใหม่เพิ่มเข้าไป
  const names = next.people.filter(p => p !== ME).join(', ') || '-';
  if (!confirm(`อัปเดตชุด "${t.name}" ให้เป็นแบบบิลนี้?\nคน: ${names}\nรายการ: ${next.bills.flatMap(b => [...b.items, ...b.lines].map(x => x.name)).filter(Boolean).join(', ') || (next.title || '-')}${t.keep ? '\n(จำยอดเงินตามบิลนี้)' : ''}`)) return;
  const nt = Object.assign({}, t, next, { id: t.id, kind: 'tpl', name: t.name, monthly: t.monthly || 0, lastRemind: t.lastRemind || '', created: t.created, used: t.used });
  await saveDocs([nt]);
  paintCat();
  toast(`🔄 อัปเดตชุด "${t.name}" แล้ว`);
};
/* เปิดบิลใหม่จากชุด */
function openFromTpl(t) {
  openSplit();
  sp.title = t.title || t.name; sp.cat = t.cat || ''; sp.round = t.round || 0; sp.tplId = t.id;
  const people = [...new Set([ME, ...(t.people || [])])];
  sp.people = people;
  sp.bills = (t.bills && t.bills.length ? t.bills : [{ method: 'equal' }]).map(b => Object.assign(blankBill(b.payer || ME), JSON.parse(JSON.stringify(b)), { id: uid() }));
  sp.bills.forEach(b => {
    b.who = (b.who && b.who.length ? b.who : people).filter(p => people.includes(p));
    b.items = (b.items || []).map(it => ({ ...it, disc: '', who: it.all ? [...people] : (it.who || []).filter(p => people.includes(p)) }));
    b.lines = b.lines || []; b.custom = b.custom || {};
    if (!people.includes(b.payer)) b.payer = ME;
  });
  $('#sForm').elements.title.value = sp.title;
  paintCat(); paintSplit();
  toast(`📋 ${t.name} · แตะ ✕ ที่ชื่อคนที่ไม่มาครั้งนี้ แล้วใส่ยอด`);
  t.used = today();
  saveDocs([t]);
}

/* ---------- หน้าหารกัน: ชุดของกลุ่ม · ถึงรอบหารรายเดือน · 📊 สรุปเดือน ---------- */
let monthOff = 0;
const ymOf = off => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + off); return d.toISOString ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : ''; };
const ymLabel = ym => new Date(ym + '-01T00:00:00').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
function dueTpls() {
  const ym = today().slice(0, 7), day = new Date().getDate();
  const last = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  return tpls().filter(t => t.monthly && Math.min(t.monthly, last) <= day && !splits().some(s => s.tplId === t.id && String(s.date).slice(0, 7) === ym));
}
function renderTplRow() {
  const box = $('#spTpl');
  if (!box) return;
  const list = tpls(), due = dueTpls();
  box.innerHTML = (due.length ? due.map(t => `<div class="note sp-due">🗓 ถึงรอบหาร <b>${esc(t.name)}</b> ของเดือนนี้แล้ว <button type="button" class="link-btn" data-use="${esc(t.id)}">หารเลย</button></div>`).join('') : '') +
    (list.length ? `<div class="sp-tpl-h"><b>ชุดของกลุ่ม</b><small>แตะเพื่อหารใหม่ด้วยคนและรายการเดิม</small></div><div class="sp-tpls">${list.map(t => {
      const c = scatOf(t.cat), names = (t.people || []).filter(p => p !== ME);
      return `<div class="sp-t"><button type="button" class="sp-tu" data-use="${esc(t.id)}"><span>${c ? c.ic : '📋'}</span><b>${esc(t.name)}</b><small>${esc(names.slice(0, 3).join(', '))}${names.length > 3 ? ` +${names.length - 3}` : ''}${t.monthly ? ` · ทุกวันที่ ${t.monthly}` : ''}</small></button><button type="button" class="sp-tg" data-set="${esc(t.id)}" aria-label="ตั้งค่าชุด ${esc(t.name)}">⚙</button></div>`;
    }).join('')}</div>` : '');
  box.onclick = e => {
    const u = e.target.closest('[data-use]'), g = e.target.closest('[data-set]');
    const t = tpls().find(x => x.id === (u ? u.dataset.use : g ? g.dataset.set : ''));
    if (!t) return;
    if (u) openFromTpl(t); else openTplDlg(t);
  };
}
function renderMonth() {
  const box = $('#spMonth');
  if (!box) return;
  const ym = ymOf(monthOff);
  const list = splits().filter(s => String(s.date).slice(0, 7) === ym);
  const mineOf = s => toS((s.bills || []).reduce((x, b) => x + Number((b.shares || {})[ME] || 0), 0));
  const byCat = {}, byGroup = {};
  let mine = 0, all = 0;
  list.forEach(s => {
    const m = mineOf(s), c = scatOf(catOf(s)) || { k: '', ic: '🧾', n: 'ไม่ระบุหมวด' };
    mine += m; all += toS(s.total);
    const a = byCat[c.k] || (byCat[c.k] = { c, n: 0, s: 0 }); a.n++; a.s += m;
    const g = (s.people || []).filter(p => p !== ME).sort().join(', ') || 'คนเดียว';
    const b = byGroup[g] || (byGroup[g] = { n: 0, s: 0, t: 0 }); b.n++; b.s += m; b.t += toS(s.total);
  });
  const cats = Object.values(byCat).sort((a, b) => b.s - a.s);
  const groups = Object.entries(byGroup).sort((a, b) => b[1].s - a[1].s);
  const max = Math.max(1, ...cats.map(x => x.s));
  const wasOpen = box.querySelector('details') ? box.querySelector('details').open : false;
  box.innerHTML = `<details class="sp-month"${wasOpen ? ' open' : ''}><summary><b>📊 สรุป${esc(ymLabel(ym))}</b><small>${list.length ? `${list.length} บิล · ส่วนเรา ${bahtS(mine)}` : 'ยังไม่มีบิล'}</small></summary>
    <div class="spm-nav"><button type="button" class="mini" data-m="-1" aria-label="เดือนก่อน">‹</button><span>${esc(ymLabel(ym))}</span><button type="button" class="mini" data-m="1" ${monthOff >= 0 ? 'disabled' : ''} aria-label="เดือนถัดไป">›</button></div>
    ${list.length ? `<div class="spm-k"><div><small>ยอดบิลทั้งหมด</small><b>${bahtS(all)}</b></div><div><small>ส่วนของเรา</small><b>${bahtS(mine)}</b></div></div>
    <h4>แยกหมวด</h4>${cats.map(x => `<div class="spm-r"><span>${x.c.ic} ${esc(x.c.n)}<small>${x.n} บิล</small></span><i style="--w:${Math.round(x.s / max * 100)}%"></i><b>${bahtS(x.s)}</b></div>`).join('')}
    <h4>แยกกลุ่ม</h4>${groups.map(([g, x]) => `<div class="spm-r g"><span>${esc(g)}<small>${x.n} บิล · ยอดรวม ${bahtS(x.t)}</small></span><b>${bahtS(x.s)}</b></div>`).join('')}
    <p class="hint">ยอดเป็นส่วนของเรา (ที่จดลงรายจ่าย) · บิลเก่าที่ยังไม่มีหมวด แก้บิลแล้วเลือกหมวดได้</p>` : '<p class="hint">เดือนนี้ยังไม่มีบิลหาร</p>'}</details>`;
  box.querySelector('.spm-nav').onclick = e => {
    const c = e.target.closest('button'); if (!c || c.disabled) return;
    monthOff = Math.min(0, monthOff + Number(c.dataset.m));
    renderMonth();
  };
}
function scatRender() { renderTplRow(); renderMonth(); }

/* ลิงก์จากแมวกวักใน LINE: split.html?tpl=<id> → เปิดบิลใหม่จากชุด (รอข้อมูลโหลดก่อน) */
(function () {
  const id = new URLSearchParams(location.search).get('tpl');
  if (!id || !$('#sDlg')) return;
  let n = 0;
  const go = () => {
    const t = tpls().find(x => x.id === id);
    if (t) { history.replaceState(null, '', location.pathname); openFromTpl(t); return; }
    if (++n < 20) setTimeout(go, 500);
  };
  setTimeout(go, 400);
})();
if ($('#spList')) scatRender();

/* ---------- 🏦 กองกลางทริป (sp.pool = { on, holder, c: { คน: ยอดที่ลงกอง } }) ----------
 * ทุกคนลงเงินกองก่อน (นับเหมือนจ่ายไปแล้ว) · บิลที่จ่ายจากกอง เลือกคนจ่าย = "🏦 กองกลาง"
 * เงินกองที่เหลือ อยู่ที่คนถือกอง → คนถือกองต้องคืน (ถ้ากองขาด คนถือกองออกเพิ่ม = ได้คืน) · โอนให้จบในยอดโอนรวม
 * ยอดลงกองไม่ใช่รายจ่าย: รายจ่ายของเรายังเป็นส่วนของเราเท่านั้น */
function poolAdjust(net, paid) {
  const P = sp && sp.pool;
  if (!P || !P.on) return null;
  const holder = sp.people.includes(P.holder) ? P.holder : ME;
  let sumC = 0;
  sp.people.forEach(p => { const c = toS((P.c || {})[p]); if (c) { net[p] = (net[p] || 0) + c; sumC += c; } });
  const spent = paid.__pool || 0, left = sumC - spent;
  net[holder] = (net[holder] || 0) - left;
  return { sumC, spent, left, holder };
}
function poolLine(pl) {
  if (!pl) return '';
  const h = who(pl.holder);
  return `🏦 กองกลาง: ลง ${bahtS(pl.sumC)} · จ่ายบิลไป ${bahtS(pl.spent)} · ${pl.left > 0 ? `เหลือ ${bahtS(pl.left)} อยู่ที่${h} (รวมอยู่ในสรุปโอนแล้ว)` : pl.left < 0 ? `ขาด ${bahtS(-pl.left)} ${h}ออกเพิ่ม (รวมอยู่ในสรุปโอนแล้ว)` : 'ใช้พอดี'}`;
}
function paintPool() {
  const box = $('#sPool');
  if (!box || !sp) return;
  const P = sp.pool || { on: false, holder: ME, c: {} };
  const used = sp.bills.some(b => b.payer === '__pool');
  box.innerHTML = `<details class="s-pool"${P.on ? ' open' : ''}><summary>🏦 กองกลาง <small>${P.on ? 'ลงกอง ' + bahtS(sp.people.reduce((x, p) => x + toS((P.c || {})[p]), 0)) : 'ทุกคนลงเงินก่อน แล้วจ่ายบิลจากกอง'}</small></summary>
    <label class="t-chk"><input type="checkbox" id="plOn" ${P.on ? 'checked' : ''}> ทริปนี้มีกองกลาง</label>
    ${P.on ? `<label>ใครถือเงินกอง <select id="plHolder">${sp.people.map(p => `<option value="${esc(p)}" ${p === (sp.people.includes(P.holder) ? P.holder : ME) ? 'selected' : ''}>${esc(who(p))}</option>`).join('')}</select></label>
    <div class="pl-eq"><span>ทุกคนลงคนละ</span><input id="plEq" inputmode="decimal" placeholder="บาท"><button type="button" class="mini" id="plEqGo">ใส่ให้ทุกคน</button></div>
    <div class="pl-rows">${sp.people.map(p => `<label class="pl-r"><span>${esc(who(p))}</span><input inputmode="decimal" data-plp="${esc(p)}" value="${esc((P.c || {})[p] || '')}" placeholder="0"></label>`).join('')}</div>
    <small class="hint">บิลที่จ่ายจากกอง ให้เลือก "ใครจ่ายไปก่อน" เป็น 🏦 กองกลาง${used ? '' : ' (ยังไม่มีบิลไหนจ่ายจากกอง)'}</small>` : ''}</details>`;
  const d = box.querySelector('details');
  box.querySelector('#plOn').onchange = e => {
    sp.pool = Object.assign({ holder: ME, c: {} }, sp.pool || {}, { on: e.target.checked });
    if (!sp.pool.on) sp.bills.forEach(b => { if (b.payer === '__pool') b.payer = ME; });   // ปิดกอง → บิลที่จ่ายจากกองกลับเป็นเรา
    else sp.bills.forEach(b => { if (billBlank(b) || b.payer === ME) b.payer = '__pool'; });   // เปิดกอง: บิลของเรา → จ่ายจากกอง (เปลี่ยนได้)
    paintSplit();
    const dd = $('#sPool details'); if (dd) dd.open = true;
  };
  if (!P.on) return;
  box.querySelector('#plHolder').onchange = e => { sp.pool.holder = e.target.value; paintSum(); };
  box.querySelectorAll('[data-plp]').forEach(i => i.oninput = () => { (sp.pool.c = sp.pool.c || {})[i.dataset.plp] = i.value; paintSum(); d.querySelector('summary small').textContent = 'ลงกอง ' + bahtS(sp.people.reduce((x, p) => x + toS(sp.pool.c[p]), 0)); });
  box.querySelector('#plEqGo').onclick = () => {
    const v = box.querySelector('#plEq').value.trim();
    if (!toS(v)) { box.querySelector('#plEq').focus(); return; }
    sp.people.forEach(p => { sp.pool.c[p] = v; });
    paintPool(); paintSum();
  };
}
/* ข้อความสรุป + หน้ารายละเอียด (ใช้ข้อมูลที่บันทึกไว้ s.pool) */
function poolCalcSaved(s) {
  const P = s.pool;
  if (!P || !P.on) return null;
  const people = s.people || [];
  const sumC = people.reduce((x, p) => x + toS((P.c || {})[p]), 0);
  const spent = (s.bills || []).filter(b => b.payer === '__pool').reduce((x, b) => x + (toS(b.total) || Object.values(b.shares || {}).reduce((y, v) => y + toS(v), 0)), 0);
  return { sumC, spent, left: sumC - spent, holder: people.includes(P.holder) ? P.holder : ME, c: P.c || {} };
}
function poolMsgLines(s) {
  const pl = poolCalcSaved(s);
  if (!pl) return [];
  return ['', `กองกลาง (${whoMsg(pl.holder)} ถือ):`]
    .concat((s.people || []).filter(p => toS(pl.c[p])).map(p => `• ${whoMsg(p)} ลง ${num(toS(pl.c[p]))}`))
    .concat([`• จ่ายบิลจากกอง ${num(pl.spent)} · ${pl.left >= 0 ? 'เหลือ ' + num(pl.left) : 'ขาด ' + num(-pl.left)}`]);
}
function poolDetail(s) {
  const pl = poolCalcSaved(s);
  if (!pl) return '';
  return `<div class="di-bill"><div class="di-h">🏦 กองกลาง · ${esc(who(pl.holder))}ถือเงินกอง</div>${(s.people || []).filter(p => toS(pl.c[p])).map(p => `<div class="di-r"><span>${esc(who(p))} ลงกอง</span><b>${bahtS(toS(pl.c[p]))}</b></div>`).join('')}
    <div class="di-r"><span>จ่ายบิลจากกอง</span><b>${bahtS(pl.spent)}</b></div><div class="di-r tot"><span>${pl.left >= 0 ? 'เงินกองเหลือ (คืนในยอดโอน)' : 'กองขาด (คนถือกองออกเพิ่ม)'}</span><b>${bahtS(Math.abs(pl.left))}</b></div></div>`;
}
