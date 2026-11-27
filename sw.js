/* แอปเงิน: ตัวเก็บไฟล์ในเครื่อง (v127)
 * เปิดจากเครื่องทันที (ไม่รอเน็ต) · ติดตั้งเวอร์ชันใหม่เบื้องหลัง: ดึงทุกไฟล์สด แล้วเช็กลายนิ้วมือ (SHA-1) ต้องตรงชุดทุกไฟล์ ไม่ตรง = ไม่ติดตั้ง (กันไฟล์เก่า/ใหม่ปนกัน)
 * ติดตั้งเสร็จแล้วรอ (หน้าแอปขึ้นแถบ "มีเวอร์ชันใหม่" → แตะ = ข้อความ skip) · hk.html/hk.js (แอปเล็กใน LINE) ใช้เน็ตก่อน ช้าเกิน 3 วิใช้ของในเครื่อง
 * ไฟล์นี้สร้างด้วย build_sw.py (อย่าแก้ HASH เอง) */
const VER = '127';
const CACHE = 'ngoen-v' + VER;
const HASH = {
 "money.html": "5764083cb5d9",
 "split.html": "87a8d82d1904",
 "vault.html": "b777af76b16c",
 "hk.html": "a82ed06cf263",
 "hk.js": "a398646b5c6d",
 "jod.png": "8817909bb7c3",
 "manifest.json": "9bd7b3b4ea31",
 "style.css": "1c5972fe8392",
 "hub.js": "82a24516a282",
 "mcore.js": "99b3a7ccfff2",
 "money.js": "11485239aac1",
 "owe.js": "dbd85b661984",
 "scat.js": "af401954b3f5",
 "qrcode.js": "e84be42f244b",
 "vault.js": "1edc55fd2372",
 "icon-192.png": "ff9b9b11a836",
 "icon-512.png": "9a24e3a2b937",
 "icon-180.png": "0992d0e67e43"
};
const NET_FIRST = /\/(hk\.html|hk\.js)$/;

async function sha1(buf) { const h = await crypto.subtle.digest('SHA-1', buf); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12); }
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    try {
    for (const f of Object.keys(HASH)) {
      const res = await fetch(new Request(f + '?sw=' + VER, { cache: 'reload' }));
      if (!res.ok) throw new Error('fetch ' + f + ' ' + res.status);
      const buf = await res.clone().arrayBuffer();
      if ((await sha1(buf)) !== HASH[f]) throw new Error('ไฟล์ยังไม่ตรงชุด ' + f);   // GitHub ยังอัปไม่ครบ/แคชเก่า → ไม่ติดตั้ง ลองใหม่รอบหน้า
      await c.put(new URL(f, self.registration.scope).href, new Response(buf, { headers: { 'Content-Type': res.headers.get('Content-Type') || 'text/html' } }));
    }
    } catch (err) { await caches.delete(CACHE); throw err; }   // ไม่ครบชุด: ทิ้งของที่โหลดมาครึ่งๆ
    if (!self.registration.active) self.skipWaiting();   // ติดตั้งครั้งแรก ใช้ได้เลย
  })());
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ngoen-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const keyOf = req => { const u = new URL(req.url); u.search = ''; u.hash = ''; if (u.href === self.registration.scope) u.href = new URL('money.html', self.registration.scope).href; return u.href; };
function timed(req, ms) {
  const net = fetch(req);
  return new Promise(resolve => {
    let done = false;
    const use = r => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(() => caches.match(keyOf(req)).then(use), ms);
    net.then(r => { clearTimeout(t); use(r); }).catch(() => { clearTimeout(t); caches.match(keyOf(req)).then(r => use(r || Response.error())); });
  });
}
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.searchParams.has('sw') || url.searchParams.has('fix')) return;
  if (NET_FIRST.test(url.pathname)) { e.respondWith(timed(e.request, 3000)); return; }
  e.respondWith(caches.open(CACHE).then(c => c.match(keyOf(e.request))).then(hit => hit || fetch(e.request)));
});
