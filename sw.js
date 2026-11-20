const CACHE = 'amaya-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Jangan cache Google Analytics & WA & Drive thumbnail yang berubah-ubah - langsung network
  if (url.hostname.includes('googletagmanager') || url.hostname.includes('google-analytics') || url.hostname.includes('wa.me') || url.hostname.includes('cek-ongkir')) {
    return;
  }
  // Untuk foto Drive: stale-while-revalidate (tampilin cache dulu, update di belakang)
  if (url.hostname.includes('googleusercontent') || url.hostname.includes('drive.google')) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const fetchP = fetch(e.request).then(res => { if(res.ok) cache.put(e.request, res.clone()); return res; }).catch(()=>cached);
      return cached || fetchP;
    }));
    return;
  }
  // App shell: network first, fallback cache (biar harga selalu baru)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.json')) {
    e.respondWith(fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  // Lainnya: cache first
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
    if(res.ok){ const clone=res.clone(); caches.open(CACHE).then(c=>c.put(e.request, clone)); }
    return res;
  }).catch(()=>cached)));
});
