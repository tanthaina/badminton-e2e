describe('12 - PWA Offline Support (Service Worker & Cache)', () => {
  

  it('ทดสอบ 1: ตรวจสอบการทำงานของ Service Worker และ Cache Storage', () => {
    cy.visit('/index.html');

    cy.window().its('navigator.serviceWorker').should('exist');

    cy.window().then((win) => win.navigator.serviceWorker.ready).then((registration) => {
      expect(registration.active).to.exist;
      expect(registration.active.state).to.be.oneOf(['activated', 'activating']);
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
});