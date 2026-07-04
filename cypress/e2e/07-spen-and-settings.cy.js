describe('07 - S-Pen Smart Board & Settings', () => {
  // เติม ?v= โค้ดสุ่ม เพื่อทะลวง Cache ของทั้ง PWA และ http-server ให้ดึงไฟล์ใหม่ล่าสุดเสมอ
  beforeEach(() => { cy.visit('/index.html?v=' + Date.now()); });

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
    
    // ข้อมูลต้องถูกบันทึกอัตโนมัติ
    cy.get('#gamesList').should('contain.text', 'เอก');
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
    
    cy.get('#btnFactoryReset').scrollIntoView().should('be.visible').click({ force: true });
    cy.get('.swal2-popup').should('be.visible').and('contain.text', 'ล้างข้อมูลทั้งหมด');
    cy.get('.swal2-confirm').should('be.visible').click({ force: true }); 
    
    // ปิดหน้าต่างแจ้งเตือน "ล้างข้อมูลสำเร็จ" ที่เด้งขึ้นมาซ้อน
    cy.get('.swal2-popup').should('be.visible').and('contain.text', 'ล้างข้อมูลสำเร็จ');
    cy.get('.swal2-confirm').should('be.visible').click({ force: true });

    // กลับไปหน้ารายวัน ต้องไม่มีผู้เล่นคนนี้หลงเหลืออยู่
    cy.get('button[data-tab="daily"]').click();
    cy.get('#playerList').should('not.contain.text', 'ผู้เล่นที่จะโดนลบ');
  });

  it('ทดสอบ 6: ระบบธีมมืด (Dark Mode Toggle)', () => {
    // บังคับให้หน้าเว็บเริ่มต้นด้วยโหมดสว่าง
    cy.visit('/index.html?v=' + Date.now(), {
      onBeforeLoad: (win) => { win.localStorage.setItem('theme', 'light'); }
    });

    // ตรวจสอบสถานะเริ่มต้น (ต้องไม่มีคลาส dark)
    cy.get('html').should('not.have.class', 'dark');
    cy.get('#btnToggleTheme').should('be.visible');

    // กดปุ่มเปิด Dark Mode
    cy.get('#btnToggleTheme').click();
    cy.get('html').should('have.class', 'dark');
    cy.window().its('localStorage.theme').should('eq', 'dark');

    // กดปุ่มปิด Dark Mode สลับกลับมาโหมดสว่าง
    cy.get('#btnToggleTheme').click();
    cy.get('html').should('not.have.class', 'dark');
    cy.window().its('localStorage.theme').should('eq', 'light');
  });

  it('ทดสอบ 7: เครื่องมือคำนวณต้นทุนและกำไรผู้ขาย (Seller Mode)', () => {
    cy.get('button[data-tab="settings"]').click();
    cy.get('#tab-settings').should('not.have.class', 'hidden');
    
    // จำลองกรอกต้นทุนหลอดละ 1101 บาท, หลอดละ 12 ลูก, ต้องการกำไรลูกละ 12 บาท
    cy.get('#settingTubeCost').should('exist').scrollIntoView().clear().type('1101', { delay: 0 });
    cy.get('#settingTubeAmount').clear().type('12');
    cy.get('#settingTargetProfit').clear().type('12');
    
    // ตรวจสอบการคำนวณ (ต้นทุนลูกละ 91.75 + กำไร 12 = 103.75 -> ปัดเศษขึ้นเป็น 104)
    cy.get('#displayCostPerBall').should('have.text', '91.75');
    cy.get('#displayRecommendedPrice').should('have.text', '฿104.00');

    // กดนำไปใช้เป็นราคาลูกแบดเริ่มต้น
    cy.get('#btnApplyRecommendedPrice').click();
    cy.get('#settingDefaultPrice').should('have.value', '104');
    
    // ตรวจสอบว่าซิงก์ราคาไปที่หน้าคิดเงินรายวันเรียบร้อย
    cy.get('button[data-tab="daily"]').click();
    cy.get('#shuttlecockPrice').should('have.value', '104');
  });

  it('ทดสอบ 8: จัดทีมที่มีผู้เล่นที่ลงทะเบียนไว้แต่ไม่ได้เช็คอินวันนี้ (absent) และบันทึกสำเร็จ', () => {
    const players = ['เอก', 'บอย', 'แคท', 'ดิว'];
    players.forEach(p => cy.addPlayer(p));
    
    // เอา ดิว ออก (absent)
    cy.contains('.player-chip', 'ดิว').click();
    cy.contains('.player-chip', 'ดิว').should('have.class', 'absent');
    
    cy.get('#btnOpenPenInput').click();
    cy.get('#penP1').type('เอก'); cy.get('#penP2').type('บอย');
    cy.get('#penP3').type('แคท'); cy.get('#penP4').type('ดิว');
    
    cy.contains('.ball-btn', '1').click();
    cy.get('#btnScanPen').click();
    
    cy.get('#btnConfirmPenInput').should('not.have.class', 'hidden').click();
    
    // ต้องบันทึกสำเร็จ ดิว กลับมาไม่ขึ้น absent
    cy.get('#pen-input-modal').should('have.class', 'hidden');
    cy.get('#gamesList').should('contain.text', 'ดิว');
    cy.contains('.player-chip', 'ดิว').should('not.have.class', 'absent');
  });
});