describe('10 - Personal Receipt & PWA', () => {
  beforeEach(() => { cy.visit('/index.html'); });

  it('ทดสอบ 1: ตรวจสอบการรองรับ PWA (Manifest)', () => {
    // ตรวจสอบว่าหน้าเว็บมีการเชื่อมโยงไฟล์ manifest.json สำหรับทำ PWA
    cy.get('head link[rel="manifest"]').should('have.attr', 'href', 'manifest.json');
    cy.get('head meta[name="theme-color"]').should('have.attr', 'content', '#1d4ed8');
  });

  it('ทดสอบ 2: การสร้างรูปใบเสร็จรายบุคคล และ QR Code พร้อมเพย์', () => {
    // จำลองการตั้งหนี้ให้ผู้เล่น
    cy.addPlayer('สมเกียรติ');
    
    // 1. ตั้งค่าพร้อมเพย์เพื่อทดสอบระบบดึง QR Code
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingPromptPay').clear().type('0812345678').blur();

    // 2. ตั้งหนี้ให้ "สมเกียรติ" 150.75 บาท
    cy.get('button[data-tab="account"]').click();
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('สมเกียรติ'); 
    cy.get('#debt-amount').type('150.75');
    cy.get('#btnSubmitDebt').click();

    // 3. กดปุ่มสร้างใบเสร็จ (ไอคอน file-invoice-dollar สีฟ้า)
    cy.contains('#unpaid-list-overall div.border', 'สมเกียรติ')
      .find('button[onclick*="generatePersonalSlip"]').click();

    // 4. ตรวจสอบว่าหน้าต่างโหลด (Loading) แสดงขึ้นมา
    cy.get('.swal2-popup').should('contain.text', 'กำลังสร้างใบเสร็จ...');

    // 5. ตรวจสอบข้อมูลในแม่แบบใบเสร็จ (Hidden Slip Template) ก่อนที่มันจะถูกเซฟเป็นรูป
    cy.get('#slip-template').should('exist');
    cy.get('#slip-name').should('contain.text', 'คุณ: สมเกียรติ');
    cy.get('#slip-total').should('contain.text', '฿150.75');
    
    // 6. ตรวจสอบว่า QR Code ถูกสร้างขึ้นมาและดึงข้อมูลพร้อมเพย์ไปใช้ถูกต้อง
    cy.get('#slip-qr-container').should('not.have.css', 'display', 'none');
    cy.get('#slip-qr').should('have.attr', 'src').and('include', '150.75');
    cy.get('#slip-pp-text').should('contain.text', '0812345678');
  });

  it('ทดสอบ 3: รองรับการแชร์รูปภาพผ่าน Web Share API (สำหรับมือถือ)', () => {
    cy.addPlayer('น้องแชร์');
    cy.get('button[data-tab="account"]').click();
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('น้องแชร์'); cy.get('#debt-amount').type('50');
    cy.get('#btnSubmitDebt').click();

    // จำลอง (Mock) ว่าเบราว์เซอร์นี้เป็นมือถือที่รองรับการแชร์รูป
    cy.window().then((win) => {
      win.navigator.canShare = () => true;
      win.navigator.share = cy.stub().as('shareStub').resolves();
    });

    cy.contains('#unpaid-list-overall div.border', 'น้องแชร์').find('button[onclick*="generatePersonalSlip"]').click();
    
    // ตรวจสอบว่าระบบได้เรียกใช้คำสั่ง share() ส่งไปให้มือถือ
    cy.get('@shareStub', { timeout: 5000 }).should('have.been.called');
  });
});