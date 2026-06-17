describe('10 - Personal Receipt & PWA', () => {
  beforeEach(() => { 
    // แช่แข็งเฉพาะ Object Date ป้องกัน Flaky ข้ามวัน แต่ปล่อยให้ setTimeout ทำงานได้ตามปกติ
    cy.clock(new Date('2024-01-01T12:00:00Z').getTime(), ['Date']); 
  });

  it('ทดสอบ 1: ตรวจสอบการรองรับ PWA (Manifest)', () => {
    cy.visit('/index.html');
    // ตรวจสอบว่าหน้าเว็บมีการเชื่อมโยงไฟล์ manifest.json สำหรับทำ PWA
    cy.get('head link[rel="manifest"]').should('have.attr', 'href', 'manifest.json');
    cy.get('head meta[name="theme-color"]').should('have.attr', 'content', '#1d4ed8');
  });

  it('ทดสอบ 2: การสร้างรูปใบเสร็จรายบุคคล และดาวน์โหลดอัตโนมัติ (Direct Download)', () => {
    cy.seedPlayers(['สมเกียรติ']);
    cy.visit('/index.html');
    
    // 1. ตั้งค่าพร้อมเพย์เพื่อทดสอบระบบดึง QR Code
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingPromptPay').clear().type('0812345678').blur();
    cy.get('#settingPromptPayName').clear().type('สมเกียรติ ยอดนักโอน').blur();

    // 2. ตั้งหนี้ให้ "สมเกียรติ" 150.75 บาท
    cy.get('button[data-tab="account"]').click();
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('สมเกียรติ'); 
    cy.get('#debt-amount').type('150.75');
    cy.get('#btnSubmitDebt').click();

    // 3. กดปุ่มสร้างใบเสร็จ (ไอคอน file-invoice-dollar สีฟ้า)
    cy.contains('#unpaid-list-overall div.border', 'สมเกียรติ')
      .find('button[onclick*="generatePersonalSlip"]').click();
      
    // กดเลือกแสดงพร้อมเพย์ในหน้าต่างตัวเลือก
    cy.get('.swal2-confirm').contains('แสดง').click();

    // 4. ตรวจสอบว่าหน้าต่างโหลด (Loading) แสดงขึ้นมา
    cy.get('.swal2-popup').should('contain.text', 'กำลังสร้างใบเสร็จ...');

    // 5. ตรวจสอบข้อมูลในแม่แบบใบเสร็จ (Hidden Slip Template) ก่อนที่มันจะถูกเซฟเป็นรูป
    cy.get('#slip-template').should('exist');
    cy.get('#slip-name').should('contain.text', 'คุณ: สมเกียรติ');
    cy.get('#slip-total').should('contain.text', '฿150.75');
    cy.get('#slip-promptpay-name').should('exist').and('contain.text', 'สมเกียรติ ยอดนักโอน');
    
    // รอจนกว่าการสร้างรูป (html2canvas) จะเสร็จสมบูรณ์ และเช็คว่ามี Toast แจ้งเตือน
    cy.get('.swal2-toast', { timeout: 15000 }).should('contain.text', 'โหลดรูปลงเครื่องแล้ว');
    
    // ตรวจสอบว่าไฟล์ถูกดาวน์โหลด
    cy.readFile(`cypress/downloads/receipt-สมเกียรติ.png`, 'base64', { timeout: 15000 }).should('exist');
  });

  it('ทดสอบ 3: ตรวจสอบการดาวน์โหลดไฟล์ .png ของหน้าบัญชีรวม', () => {
    cy.visit('/index.html');
    cy.get('button[data-tab="account"]').click();

    // หาชื่อไฟล์ที่คาดหวัง
    const expectedFileName = 'account-2024-01-01.png';

    // กดปุ่ม "บันทึกรูปภาพ" ในหน้าบัญชีรวม
    cy.get('#btnExportAccountImg').click();
    cy.get('.swal2-popup').should('contain.text', 'กำลังสร้างรูป...');

    // รอ Toast โหลดรูปลงเครื่อง
    cy.get('.swal2-toast', { timeout: 15000 }).should('contain.text', 'โหลดรูปลงเครื่องแล้ว');

    // ตรวจสอบว่าไฟล์ .png ถูกดาวน์โหลด
    cy.readFile(`cypress/downloads/${expectedFileName}`, 'base64', { timeout: 15000 }).should('exist');
  });
});