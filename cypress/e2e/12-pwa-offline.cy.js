describe('12 - PWA Offline Support (Service Worker & Cache)', () => {
  

  it('ทดสอบ 1: ตรวจสอบการทำงานของ Service Worker และ Cache Storage', () => {
    cy.visit('/index.html');

    cy.window().its('navigator.serviceWorker').should('exist');

    cy.window().then((win) => win.navigator.serviceWorker.ready).then((registration) => {
      expect(registration.active).to.exist;
      expect(registration.active.state).to.equal('activated');
    });
  });

  it('ทดสอบ 2: จำลองการตัดอินเทอร์เน็ต (Offline Mode) แอปต้องยังใช้งานได้', () => {
    cy.visit('/index.html');

    // สั่งดึงไฟล์เพื่อให้ Service Worker เก็บลง Cache แน่นอน 100% (จำลองพฤติกรรมจริง)
    cy.window().then(win => win.fetch('/index.html').catch(()=>{}));
    // รอจนกว่า Cache จะถูกสร้างขึ้นมาจริงๆ แทนการใช้เวลาตายตัว
    cy.window().then(win => win.caches.has('badminton-pay-v3')).should('be.true');

    // ใช้คำสั่งระดับลึกของ Chrome (CDP) เพื่อจำลองการตัดเน็ต
    cy.log('** กำลังตัดอินเทอร์เน็ต (Go Offline) **');
    cy.wrap(Cypress.automation('remote:debugger:protocol', { command: 'Network.emulateNetworkConditions', params: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 } }));

    // รีเฟรชหน้าเว็บขณะที่ไม่มีเน็ต
    cy.reload();
    cy.get('h1').should('contain.text', 'โปรแกรมคำนวณค่าลูกแบดมินตัน'); // ถ้ายังหาข้อความเจอ แปลว่าดึงมาจาก Cache!

    // ต่อเน็ตกลับคืน เพื่อไม่ให้ส่งผลกระทบต่อเทสไฟล์อื่นๆ
    cy.wrap(Cypress.automation('remote:debugger:protocol', { command: 'Network.emulateNetworkConditions', params: { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 } }));
  });

  it('ทดสอบ 3: จำลองการตัดเน็ตและตรวจสอบสถานะปุ่ม Cloud Sync (Online/Offline UI)', () => {
    cy.visit('/index.html');

    // 1. ตรวจสอบสถานะปกติ (Online) ปุ่มต้องใช้งานได้และเป็นสีฟ้า/น้ำเงิน
    // (หมายเหตุ: Cypress จะดึงค่าสีออกมาในรูปแบบ RGB เสมอ)
    cy.get('#btnPushCloud').should('not.be.disabled')
      .and('have.css', 'background-color', 'rgb(2, 132, 199)') // เทียบเท่า #0284c7
      .and('have.attr', 'title', 'ซิงก์ข้อมูลขึ้นคลาวด์');
    cy.get('#btnPullCloud').should('not.be.disabled')
      .and('have.css', 'background-color', 'rgb(14, 165, 233)') // เทียบเท่า #0ea5e9
      .and('have.attr', 'title', 'ดึงข้อมูลจากคลาวด์');

    // 2. จำลองการตัดเน็ต และบังคับยิง Event Offline
    cy.log('** กำลังตัดอินเทอร์เน็ต (Go Offline) **');
    cy.wrap(Cypress.automation('remote:debugger:protocol', { command: 'Network.emulateNetworkConditions', params: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 } }));
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { value: false, configurable: true });
      win.dispatchEvent(new Event('offline'));
    });

    // 3. ตรวจสอบสถานะหลังตัดเน็ต (Offline) ปุ่มต้องเป็นสีเทาและติดสถานะ disabled
    cy.get('#btnPushCloud').should('be.disabled')
      .and('have.css', 'background-color', 'rgb(148, 163, 184)') // เทียบเท่า #94a3b8 (สีเทา slate-400)
      .and('have.attr', 'title', 'ออฟไลน์ (ไม่มีอินเทอร์เน็ต)');
    cy.get('#btnPullCloud').should('be.disabled')
      .and('have.css', 'background-color', 'rgb(148, 163, 184)');

    // 4. ต่อเน็ตกลับคืน (Online) และตรวจสอบว่า UI คืนค่าเดิมได้ถูกต้อง
    cy.wrap(Cypress.automation('remote:debugger:protocol', { command: 'Network.emulateNetworkConditions', params: { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 } }));
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { value: true, configurable: true });
      win.dispatchEvent(new Event('online'));
    });
    cy.get('#btnPushCloud').should('not.be.disabled').and('have.css', 'background-color', 'rgb(2, 132, 199)');
  });
});