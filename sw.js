/* แอปเงิน: เก็บไฟล์หน้าแอปไว้ในเครื่อง (ไฟล์ร่วมอยู่โฟลเดอร์แม่) */
const CACHE = 'ngoen-v123';
const FILES = ['./', 'money.html', 'split.html', 'vault.html', 'hk.html', 'hk.js', 'jod.png', 'manifest.json', 'style.css', 'hub.js', 'mcore.js', 'money.js', 'owe.js', 'scat.js', 'qrcode.js', 'vault.js', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ngoen-') && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // เน็ตก่อน แต่ถ้าช้าเกิน 3 วิ (เช่น GitHub Pages ช้า) ใช้ไฟล์ในเครื่องไปก่อน แล้วเก็บของใหม่ตามหลัง · ไม่มีในเครื่อง = รอเน็ต
  const net = fetch(e.request.mode === 'navigate' ? e.request : new Request(e.request, { cache: 'no-cache' }))
    .then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; });
  e.waitUntil(net.catch(() => {}));
  e.respondWith(new Promise(resolve => {
    let done = false;
    const use = r => { if (!done && r) { done = true; resolve(r); } };
    const cached = () => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' });
    const t = setTimeout(() => cached().then(use), 3000);
    net.then(r => { clearTimeout(t); use(r); }).catch(() => { clearTimeout(t); cached().then(r => use(r || Response.error())); });
  }));
});
