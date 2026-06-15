describe('07 - S-Pen Smart Board & Settings', () => {
  beforeEach(() => { cy.visit('/index.html'); });

  it('ทดสอบ 1: S-Pen จัดทีมถูกต้อง (Exact Match & Status Green)', () => {
    const players = ['เอก', 'บอย', 'แคท', 'ดิว'];
    players.forEach(p => cy.addPlayer(p));
    
    cy.get('button[data-tab="daily"]').click();
    cy.get('#btnOpenPenInput').click();
    cy.get('#pen-input-modal').should('not.have.class', 'hidden');
    
    // พิมพ์ชื่อลงในช่อง (จำลองการเขียน/พิมพ์)
    cy.get('#penP1').type('เอก'); cy.get('#penP2').type('บอย');
    cy.get('#penP3').type('แคท'); cy.get('#penP4').type('ดิว');
    
    // เลือกเบอร์ลูก 1 และ 2
    cy.contains('.ball-btn', '1').click(); cy.contains('.ball-btn', '2').click();
    cy.get('#btnScanPen').click();
    
    // กล่องต้องเป็นสีเขียวทั้งหมด และปุ่มยืนยันต้องโผล่มา
    cy.get('#penP1').should('have.class', 'status-green');
    cy.get('#penP4').should('have.class', 'status-green');
    cy.get('#btnConfirmPenInput').should('not.have.class', 'hidden').click();
    
    // ข้อมูลต้องถูกส่งกลับมาที่หน้าหลัก
    cy.get('#player1').should('have.value', 'เอก');
    cy.get('#shuttlecockSpeeds').should('have.value', '1, 2');
  });

  it('ทดสอบ 2: S-Pen แก้คำผิดอัตโนมัติ (Auto-Correct / Edit Distance)', () => {
    ['สมเกียรติ', 'บอย', 'แคท', 'ดิว'].forEach(p => cy.addPlayer(p));
    cy.get('#btnOpenPenInput').click();
    
    // พิมพ์ตกตัว ร.เรือ (ระยะห่างตัวอักษร = 1)
    cy.get('#penP1').type('สมเกียติ');
    cy.get('#penP2').type('บอย');
    cy.get('#penP3').type('แคท');
    cy.get('#penP4').type('ดิว');

    cy.contains('.ball-btn', '5').click();
    cy.get('#btnScanPen').click();
    
    // ระบบต้องแก้เป็น สมเกียรติ อัตโนมัติและขึ้นสีเขียวให้
    cy.get('#penP1').should('have.value', 'สมเกียรติ').and('have.class', 'status-green');
    cy.get('#btnConfirmPenInput').should('not.have.class', 'hidden');
  });

  it('ทดสอบ 3: S-Pen ตรวจจับชื่อซ้ำและแจ้งเตือน (Duplicate / Yellow Status)', () => {
    cy.addPlayer('แอน');
    cy.get('#btnOpenPenInput').click();
    
    // จัดแอนลง 2 กล่อง
    cy.get('#penP1').type('แอน'); cy.get('#penP2').type('แอน');
    cy.contains('.ball-btn', '3').click();
    cy.get('#btnScanPen').click();
    
    // กล่องที่ซ้ำกันต้องเป็นสีเหลือง
    cy.get('#penP1').should('have.class', 'status-yellow');
    cy.get('#penP2').should('have.class', 'status-yellow');
    // แจ้งเตือนต้องแสดง และปุ่มยืนยันต้องถูกซ่อน
    cy.get('#penReviewSection').should('not.have.class', 'hidden');
    cy.get('#penErrorText').should('contain.text', 'ซ้ำกันในสนาม');
    cy.get('#btnConfirmPenInput').should('have.class', 'hidden');
  });

  it('ทดสอบ 4: การตั้งค่าราคาลูกแบดเริ่มต้น (Default Price Sync)', () => {
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingDefaultPrice').clear().type('28').blur(); // พิมพ์แล้วคลิกออก
    
    // กลับไปแท็บรายวันเพื่อเช็คว่าราคาช่องหลักถูกอัปเดตตามหรือไม่
    cy.get('button[data-tab="daily"]').click();
    cy.get('#shuttlecockPrice').should('have.value', '28');
  });
  
  it('ทดสอบ 5: Factory Reset ล้างข้อมูลทั้งหมด (Data Management)', () => {
    cy.addPlayer('ผู้เล่นที่จะโดนลบ');
    cy.get('button[data-tab="settings"]').click();
    
    cy.get('#btnFactoryReset').click();
    cy.get('.swal2-confirm').click(); // กดยืนยันในหน้าต่างแจ้งเตือน
    
    // ปิดหน้าต่างแจ้งเตือน "ล้างข้อมูลสำเร็จ" ที่เด้งขึ้นมาซ้อน
    cy.get('.swal2-popup').should('contain.text', 'ล้างข้อมูลสำเร็จ');
    cy.get('.swal2-confirm').click();

    // กลับไปหน้ารายวัน ต้องไม่มีผู้เล่นคนนี้หลงเหลืออยู่
    cy.get('button[data-tab="daily"]').click();
    cy.get('#playerList').should('not.contain.text', 'ผู้เล่นที่จะโดนลบ');
  });
});