const CACHE_NAME = 'badminton-pay-v3';
const urlsToCache = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // บังคับให้เวอร์ชันใหม่ทำงานทันที
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
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
  // Network-First Strategy: ดึงจากเน็ตก่อน ถ้าออฟไลน์ค่อยดึงจากแคช
  event.respondWith(
    fetch(event.request)
      .then(response => caches.open(CACHE_NAME).then(cache => { cache.put(event.request, response.clone()); return response; }))
      .catch(() => caches.match(event.request))
  );
});