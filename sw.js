const CACHE_NAME = 'badminton-pay-v6';
const urlsToCache = [
  'index.html',
  'manifest.json',
  'app.js',
  'styles.css'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // บังคับให้เวอร์ชันใหม่ทำงานทันที
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // แยกแคชทีละไฟล์ ป้องกัน error "all-or-nothing" ถ้าบางไฟล์ดึงไม่สำเร็จตอนรัน Cypress
        return Promise.all(urlsToCache.map(url => cache.add(url).catch(e => console.warn('Cache failed:', url, e))));
      })
  );
});

self.addEventListener('activate', event => {
  // ลบแคชเวอร์ชันเก่าทิ้งเมื่อมีการอัปเดต
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(cacheName => {
        if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // ป้องกัน Error จาก URL ที่ไม่ใช่ HTTP (เช่น การแทรกแซงของ Cypress หรือ Extension)
  if (!event.request.url.startsWith('http')) return;

  // Network-First Strategy: ดึงจากเน็ตก่อน ถ้าออฟไลน์ค่อยดึงจากแคช
  event.respondWith(
    fetch(event.request)
      .then(response => caches.open(CACHE_NAME).then(cache => { cache.put(event.request, response.clone()); return response; }))
      .catch(() => caches.match(event.request))
  );
});