/* แอปเงิน: เก็บไฟล์หน้าแอปไว้ในเครื่อง (ไฟล์ร่วมอยู่โฟลเดอร์แม่) */
const CACHE = 'ngoen-v117';
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
  e.respondWith(
    fetch(e.request.mode === 'navigate' ? e.request : new Request(e.request, { cache: 'no-cache' }))
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request))
  );
});
