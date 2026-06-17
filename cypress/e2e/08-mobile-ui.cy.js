describe('08 - Mobile UI & Responsive Design', () => {
  beforeEach(() => {
    // จำลองขนาดหน้าจอเป็นมือถือ (iPhone X: กว้าง 375px, สูง 812px)
    cy.viewport('iphone-x');
    cy.visit('/index.html');
  });

  it('ทดสอบ 1: แถบเมนู (Tab Nav) สามารถเลื่อนซ้ายขวาได้', () => {
    // ตรวจสอบว่า container ของแท็บมีการตั้งค่า overflow-x ให้เลื่อนได้
    cy.get('.tab-nav').should('have.css', 'overflow-x', 'auto');
    
    // เลื่อนไปหาแท็บสุดท้าย (ตั้งค่าบัญชี) และคลิกเพื่อดูว่ากดได้จริงบนจอแคบ
    cy.get('button[data-tab="settings"]').scrollIntoView().should('be.visible').click();
    cy.get('#tab-settings').should('not.have.class', 'hidden');
  });

  it('ทดสอบ 2: กลุ่มปุ่มใน Header ของการ์ดรองรับ Flex Wrap (ไม่ตกขอบจอ)', () => {
    cy.get('button[data-tab="account"]').click();
    
    // ตรวจสอบว่ากล่องที่ครอบปุ่มต่างๆ (ส่งออกรูป, เพิ่มหนี้, ส่ง LINE, ชำระทั้งหมด) มีคลาส flex-wrap
    cy.get('#tab-account .card-header > div.ml-auto').should('have.class', 'flex-wrap');
    
    // เช็คว่าปุ่ม "แชร์/บันทึกรูป" แสดงผลได้ปกติและไม่ล้นจอ
    cy.get('#btnExportAccountImg').should('be.visible');

    // เช็คว่าปุ่ม "ชำระทั้งหมด" ซึ่งอยู่ท้ายสุด ยังสามารถมองเห็นและคลิกได้
    cy.get('#btnPayAllUnpaid').should('be.visible');
  });

  it('ทดสอบ 3: ชื่อผู้เล่นยาวๆ ในหน้าบัญชีต้องไม่เบียดปุ่มทวง/จ่ายตกขอบ (Break Word)', () => {
    // จำลองการเพิ่มชื่อผู้เล่นที่ยาวมากๆ 
    const longName = 'นายทดสอบชื่อยาวมากๆจนอาจจะทะลุขอบจอได้ถ้าไม่ทำwrap';
    cy.addPlayer(longName);
    
    // ตั้งหนี้ให้คนนี้
    cy.get('button[data-tab="account"]').click();
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type(longName);
    cy.get('#debt-amount').type('100');
    cy.get('#btnSubmitDebt').click();

    // ตรวจสอบว่ากล่องค้างชำระใช้ flex-col (สำหรับมือถือ) และชื่อถูกสั่งให้ตัดคำ (break-all)
    cy.contains('#unpaid-list-overall div.border', longName).should('have.class', 'flex-col');
    cy.contains('#unpaid-list-overall div.border', longName).find('div.break-all').should('be.visible');
    
    // ปุ่ม 'ทวงส่วนตัว (LINE)' และ 'จ่าย' ต้องยังอยู่ในหน้าจอ
    cy.contains('#unpaid-list-overall div.border', longName).find('button').contains('จ่าย').should('be.visible');
  });

  it('ทดสอบ 4: หน้าต่าง Modal กระดานจัดทัพ สามารถใช้งานได้ปกติบนมือถือ', () => {
    cy.get('button[data-tab="daily"]').click();
    cy.get('#btnOpenPenInput').click();
    
    // ตรวจสอบว่ากล่อง Modal แสดงขึ้นมา
    cy.get('#pen-input-modal .modal-box').should('be.visible');
    
    // กล่องใส่ชื่อนักกีฬา (ซ้าย/ขวา) ต้องมองเห็น
    cy.get('#penP1').should('be.visible');
    cy.get('#penP2').should('be.visible');
    
    // ปุ่มปิด Modal ด้านบนขวา ต้องกดปิดได้ (ไม่ทะลุขอบ)
    cy.get('#btnClosePenInput').scrollIntoView().should('be.visible').click();
    cy.get('#pen-input-modal').should('have.class', 'hidden');
  });

  it('ทดสอบ 5: การแสดงผลบน Tablet (iPad-2) ทั้งแนวตั้งและแนวนอน', () => {
    // Override ขนาดจอในเคสนี้ให้เป็น iPad-2 (768x1024)
    cy.viewport('ipad-2');
    
    // ตรวจสอบว่าในจอ Tablet ปุ่มเมนูทั้งหมดควรแสดงครบโดยไม่ต้องเลื่อนแล้ว
    cy.get('button[data-tab="settings"]').should('be.visible');
    
    // ทดสอบกล่องเลือกนักกีฬา 4 ช่อง ควรแสดงผลได้พอดี
    cy.get('button[data-tab="daily"]').click();
    cy.get('#player1').should('be.visible');
    cy.get('#player4').should('be.visible');
    
    // ทดลองหมุนจอเป็นแนวนอน (Landscape: 1024x768)
    cy.viewport('ipad-2', 'landscape');
    
    // เปิด Modal ของ S-Pen เพื่อเช็คว่าจอใหญ่แล้ว Modal ไม่ล้น
    cy.get('#btnOpenPenInput').click();
    cy.get('#pen-input-modal .modal-box').should('be.visible');
    cy.get('#btnClosePenInput').click();
  });

  it('ทดสอบ 6: ปุ่มกระดานจัดทัพเปลี่ยนเป็น FAB บนหน้าจอมือถือ', () => {
    // ใน Viewport มือถือ (iPhone X จาก beforeEach)
    cy.get('button[data-tab="daily"]').click();
    cy.get('#btnOpenPenInput').should('have.css', 'position', 'fixed');
    cy.get('#btnOpenPenInput').should('have.css', 'bottom', '24px');
    cy.get('#btnOpenPenInput span').should('not.be.visible'); // ข้อความต้องถูกซ่อน

    // เมื่อขยายจอเป็น Tablet หรือ Desktop (กว้างกว่า 640px)
    cy.viewport('ipad-2');
    cy.get('#btnOpenPenInput').should('not.have.css', 'position', 'fixed');
    cy.get('#btnOpenPenInput span').should('be.visible'); // ข้อความต้องกลับมาแสดง
  });
});