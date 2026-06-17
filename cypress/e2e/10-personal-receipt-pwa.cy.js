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

  it('ทดสอบ 2: การสร้างรูปใบเสร็จรายบุคคล และ QR Code พร้อมเพย์', () => {
    cy.seedPlayers(['สมเกียรติ']);
    cy.visit('/index.html');
    
    // 1. ตั้งค่าพร้อมเพย์เพื่อทดสอบระบบดึง QR Code
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingPromptPay').clear().type('0812345678').blur();

    // 2. ตั้งหนี้ให้ "สมเกียรติ" 150.75 บาท
    cy.get('button[data-tab="account"]').click();
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('สมเกียรติ'); 
    cy.get('#debt-amount').type('150.75');
    cy.get('#btnSubmitDebt').click();

    // จำลองการปิด Web Share API เพื่อบังคับให้เข้า Fallback (แสดง Popup ดาวน์โหลดแทนการเปิดแชร์ของ OS)
    cy.window().then((win) => {
      win.navigator.canShare = false;
    });

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
    
    // รอจนกว่าการสร้างรูป (html2canvas) จะเสร็จสมบูรณ์ และขึ้น Popup สร้างรูปภาพสำเร็จ
    cy.get('.swal2-title', { timeout: 15000 }).should('contain.text', 'สร้างรูปภาพสำเร็จ');
    cy.get('.swal2-confirm').click(); // กดปิดหน้าต่างเพื่อไม่ให้กวนเทสถัดไป
  });

  it('ทดสอบ 3: รองรับการแชร์รูปภาพผ่าน Web Share API (สำหรับมือถือ)', () => {
    cy.seedPlayers(['น้องแชร์']);
    cy.visit('/index.html');

    // 1. ตั้งค่าพร้อมเพย์ก่อน เพื่อให้มีหน้าต่างถามว่าจะแสดงพร้อมเพย์ไหม
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingPromptPay').clear().type('0812345678').blur();

    cy.get('button[data-tab="account"]').click();
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('น้องแชร์'); cy.get('#debt-amount').type('50');
    cy.get('#btnSubmitDebt').click();

    // จำลอง (Mock) ว่าเบราว์เซอร์นี้เป็นมือถือที่รองรับการแชร์รูป
    cy.window().then((win) => {
      win.navigator.canShare = () => true;
      win.navigator.share = cy.stub().as('shareStub').resolves();
    });

    // กดแชร์ครั้งที่ 1
    cy.contains('#unpaid-list-overall div.border', 'น้องแชร์').find('button[onclick*="generatePersonalSlip"]').click();
    cy.get('.swal2-confirm').contains('แสดง').click();
    
    // ตรวจสอบว่าระบบได้เรียกใช้คำสั่ง share() สำเร็จ
    cy.get('@shareStub', { timeout: 5000 }).should('have.been.calledOnce');

    // จำลองกรณีเผลอปิดหน้าต่างแชร์ แล้วกดส่งใหม่ (ครั้งที่ 2 และ 3)
    cy.contains('#unpaid-list-overall div.border', 'น้องแชร์').find('button[onclick*="generatePersonalSlip"]').click();
    cy.get('.swal2-confirm').contains('แสดง').click();
    cy.get('@shareStub', { timeout: 5000 }).should('have.been.calledTwice');

    cy.contains('#unpaid-list-overall div.border', 'น้องแชร์').find('button[onclick*="generatePersonalSlip"]').click();
    cy.get('.swal2-confirm').contains('แสดง').click();
    cy.get('@shareStub', { timeout: 5000 }).should('have.been.calledThrice');
  });

  it('ทดสอบ 4: จำลองการคลิก "แชร์/บันทึกรูป" และตรวจสอบการดาวน์โหลดไฟล์ .png (Desktop Fallback)', () => {
    cy.visit('/index.html');
    cy.get('button[data-tab="account"]').click();

    // บังคับให้เบราว์เซอร์จำลองว่าไม่รองรับ Web Share (เพื่อเข้าเงื่อนไขการดาวน์โหลดไฟล์แทน)
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'canShare', { value: false, configurable: true });
    });

    // หาชื่อไฟล์ที่คาดหวัง (เนื่องจากเราแช่แข็งเวลาไว้ที่ 2024-01-01 แอปจะสร้างไฟล์ชื่อนี้เสมอ)
    const expectedFileName = 'account-2024-01-01.png';

    // กดปุ่ม "แชร์/บันทึกรูป" ในหน้าบัญชีรวม
    cy.get('#btnExportAccountImg').click();
    cy.get('.swal2-popup').should('contain.text', 'กำลังสร้างรูป...');

    // รอหน้าต่าง "สร้างรูปสำเร็จ" แสดงขึ้นมา แล้วจำลองการคลิกปุ่ม "โหลดลงเครื่อง"
    cy.get('.swal2-title', { timeout: 10000 }).should('contain.text', 'สร้างรูปภาพสำเร็จ');
    cy.get('.swal2-cancel').contains('โหลดลงเครื่อง').click();

    // ตรวจสอบว่าไฟล์ .png ถูกดาวน์โหลดมาที่โฟลเดอร์ cypress/downloads สำเร็จ
    cy.readFile(`cypress/downloads/${expectedFileName}`, 'base64', { timeout: 15000 }).should('exist');
  });
});