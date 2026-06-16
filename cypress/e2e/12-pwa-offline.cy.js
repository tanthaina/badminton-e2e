describe('12 - PWA Offline Support (Service Worker & Cache)', () => {
  
  it('ทดสอบ 1: ตรวจสอบการทำงานของ Service Worker และ Cache Storage', () => {
    cy.visit('/index.html');

    cy.window().then(async (win) => {
      // 1. ตรวจสอบว่าเบราว์เซอร์รองรับและมีการใช้งาน Service Worker
      expect(win.navigator.serviceWorker).to.exist;
      
      // 2. รอจนกว่า Service Worker จะติดตั้งและพร้อมใช้งาน (Activated)
      const registration = await win.navigator.serviceWorker.ready;
      expect(registration.active.state).to.equal('activated');
      
      // 3. ตรวจสอบว่ามี Cache ชื่อ 'badminton-pay-v2' ถูกสร้างขึ้นมา
      const cacheKeys = await win.caches.keys();
      expect(cacheKeys).to.include('badminton-pay-v2');

      // 4. เปิดดูใน Cache ว่ามีการเก็บไฟล์หน้าเว็บ (index.html) ไว้เผื่อตอนออฟไลน์แล้ว
      const cache = await win.caches.open('badminton-pay-v2');
      const requests = await cache.keys();
      const cachedUrls = requests.map(req => req.url);
      const hasIndex = cachedUrls.some(url => url.includes('index.html'));
      expect(hasIndex).to.be.true;
    });
  });

  it('ทดสอบ 2: จำลองการตัดอินเทอร์เน็ต (Offline Mode) แอปต้องยังใช้งานได้', () => {
    cy.visit('/index.html');

    // ใช้คำสั่งระดับลึกของ Chrome (CDP) เพื่อจำลองการตัดเน็ต
    cy.log('** กำลังตัดอินเทอร์เน็ต (Go Offline) **');
    cy.wrap(Cypress.automation('remote:debugger:protocol', { command: 'Network.emulateNetworkConditions', params: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 } }));

    // รีเฟรชหน้าเว็บขณะที่ไม่มีเน็ต
    cy.reload();
    cy.get('h1').should('contain.text', 'โปรแกรมคำนวณค่าลูกแบดมินตัน'); // ถ้ายังหาข้อความเจอ แปลว่าดึงมาจาก Cache!
  });
});