describe('12 - PWA Offline Support (Service Worker & Cache)', () => {
  
  it('ทดสอบ 1: ตรวจสอบการทำงานของ Service Worker และ Cache Storage', () => {
    cy.visit('/index.html');

    // 1. ตรวจสอบว่าเบราว์เซอร์รองรับและมีการใช้งาน Service Worker
    cy.window().its('navigator.serviceWorker').should('exist');

    // 2. รอจนกว่า Service Worker จะติดตั้งและพร้อมใช้งาน (Activated)
    // ใช้ .then() คืนค่า Promise ออกมา เพื่อให้ Cypress ช่วยรอ (Unwrap) จนกว่า SW จะพร้อมใช้งานจริงๆ
    cy.window().then((win) => win.navigator.serviceWorker.ready).then((registration) => {
      expect(registration.active).to.exist;
      expect(registration.active.state).to.equal('activated');
    });

    // 3. เพื่อแก้ปัญหาความเปราะบาง (Flaky) จากขั้นตอน Install
    // เราจะใช้ท่าไม้ตายคือการ รีโหลดหน้าเว็บ 1 ครั้ง เพื่อบังคับให้ SW ทำการจับ (Intercept) 
    // และเขียนไฟล์ลง Cache ทีละไฟล์ผ่านโค้ด Network-First ใน event 'fetch' ของคุณแทน
    cy.reload();
    cy.wait(1000); // รอเวลาให้ SW ทำการเขียนไฟล์ลง Cache ให้สมบูรณ์

    // 4. ตรวจสอบว่า Cache ถูกสร้างขึ้นและมีไฟล์ถูกเก็บไว้จริงๆ
    cy.window().then((win) => {
      return win.caches.keys().then(keys => {
        expect(keys).to.include('badminton-pay-v3');
        return win.caches.open('badminton-pay-v3');
      }).then(cache => cache.keys()).then(requests => {
        expect(requests.length).to.be.greaterThan(0); // ต้องมีไฟล์ในแคชอย่างน้อย 1 ไฟล์
        const urls = requests.map(req => req.url);
        // ตรวจสอบว่ามี url ที่ลงท้ายด้วย / หรือมีคำว่า index.html
        const hasIndexOrRoot = urls.some(url => url.includes('index.html') || url.endsWith('/'));
        expect(hasIndexOrRoot).to.be.true;
      });
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