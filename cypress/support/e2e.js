// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// ล้าง Cache และ Service Worker ของหน้าต่างแอปพลิเคชัน (AUT) อย่างถูกต้องก่อนโหลดหน้าเว็บ
Cypress.on('window:before:load', (win) => {
  if (win.navigator && win.navigator.serviceWorker) {
    win.navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
  // ระเบิด Cache Storage ทิ้งเพื่อให้ Cypress โหลดไฟล์โค้ดล่าสุดเสมอ
  if (win.caches) {
    win.caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => win.caches.delete(key)));
    });
  }
});