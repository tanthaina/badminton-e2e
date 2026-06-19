describe('03 - Smart Board & Voice Command', () => {
  beforeEach(() => { cy.visit('/index.html'); });

  it('ทดสอบกระดานจัดทัพอัจฉริยะ (Smart Board & Auto-mapping)', () => {
    const players = ['ก้อง', 'แทน', 'หมู', 'แมน'];
    players.forEach(p => { cy.addPlayer(p); });

    cy.get('#btnOpenPenInput').click();
    cy.get('#pen-input-modal').should('not.have.class', 'hidden');

    cy.get('#penP1').type('ก้อง'); cy.get('#penP2').type('แกน');
    cy.get('#penP3').type('หนู'); cy.get('#penP4').type('เบน');
    
    cy.get('#btnScanPen').click();
    cy.get('#penErrorText').should('be.visible').and('contain.text', 'อย่าลืมเลือกเบอร์ลูก');
    cy.get('#btnConfirmPenInput').should('have.class', 'hidden');

    cy.contains('.ball-btn', '1').click(); cy.contains('.ball-btn', '2').click();
    cy.get('#btnScanPen').click();

    cy.get('#btnConfirmPenInput').should('not.have.class', 'hidden').click();
    cy.get('#gamesList').should('contain.text', 'แทน');
  });

  it('ทดสอบกระดานจัดทัพ: การแก้ไขคำผิดและจิ้มเลือกชื่อจาก Quick Pad', () => {
    cy.addPlayer('สมชาย', 'ตาคลี');
    cy.addPlayer('สมชาย', 'ตากฟ้า');
    cy.addPlayer('กิตติ');
    cy.addPlayer('สมหมาย');

    cy.get('#btnOpenPenInput').click();

    cy.get('#penP1').type('สมชาย'); cy.get('#penP2').type('ใครก็ไม่รู้');
    cy.get('#penP3').type('กิตติ'); cy.get('#penP4').type('สมหมาย');
    cy.get('#btnScanPen').click();

    cy.get('#penP1').should('have.class', 'status-yellow');
    cy.get('#penP2').should('have.class', 'status-red');
    cy.get('#penP3').should('have.class', 'status-green');
    cy.get('#penReviewSection').should('not.have.class', 'hidden');
    cy.get('#penQuickPad').should('not.have.class', 'hidden');

    cy.get('#penP1').focus(); cy.contains('.quick-pad-chip', 'ตากฟ้า').click();
    cy.get('#penP1').should('have.value', 'ตากฟ้า: สมชาย').and('have.class', 'status-green');

    cy.get('#penP2').focus(); 
    cy.get('#penP2').clear().type('สมชาย'); cy.get('#btnScanPen').click();
    cy.contains('.quick-pad-chip', 'ตาคลี').click();
    cy.get('#penP2').should('have.value', 'ตาคลี: สมชาย').and('have.class', 'status-green');

    cy.contains('.ball-btn', '1').click();
    cy.get('#btnConfirmPenInput').should('not.have.class', 'hidden').click();
    cy.get('#gamesList').should('contain.text', 'สมชาย(ตากฟ้า)');
  });

  it('ทดสอบกระดานจัดทัพ: การสั่งงานด้วยเสียง (Voice Command Simulation)', () => {
    const players = ['ก้อง', 'แทน', 'หมู', 'แมน'];
    players.forEach(p => { cy.addPlayer(p); });
    cy.get('#btnOpenPenInput').click();

    cy.window().then((win) => { win.processVoiceCommand('ก้อง คู่กับ แทน เจอ หมู และ แมน'); });
    cy.get('#penP1').should('have.value', 'ก้อง').and('have.class', 'status-green');
    cy.get('#penP2').should('have.value', 'แทน').and('have.class', 'status-green');
    cy.get('#penP3').should('have.value', 'หมู').and('have.class', 'status-green');
    cy.get('#penP4').should('have.value', 'แมน').and('have.class', 'status-green');

    cy.get('#penP3').clear(); cy.get('#penP4').clear();
    cy.window().then((win) => { win.processVoiceCommand('หมู แมน'); });
    cy.get('#penP1').should('have.value', 'ก้อง'); cy.get('#penP3').should('have.value', 'หมู');

    cy.get('#btnClosePenInput').click({ force: true });
    cy.addPlayer('ก้อง', 'ตาคลี');
    cy.addPlayer('กิตติ');
    cy.get('#btnOpenPenInput').click();
    cy.get('#penP1').clear(); cy.get('#penP2').clear(); cy.get('#penP3').clear(); cy.get('#penP4').clear();
    cy.window().then((win) => { win.processVoiceCommand('ก้อง'); });
    cy.get('#penP1').should('have.class', 'status-yellow');

    // ทดสอบ Voice Shortcut: ล้างกระดาน
    cy.window().then((win) => { win.processVoiceCommand('ล้างกระดาน'); }); 
    cy.get('#penP1').should('have.value', '');
    
    // ทดสอบดึงเบอร์ลูกอัตโนมัติ (Extract Shuttlecock Number)
    cy.window().then((win) => { win.processVoiceCommand('กิตติ คู่กับ แทน เจอ หมู และ แมน ใช้ลูกเบอร์ 5 และ 6'); });
    cy.get('#penP1').should('have.value', 'กิตติ');
    cy.get('#btnConfirmPenInput').should('not.have.class', 'hidden'); // ปุ่มยืนยันต้องโผล่
    
    // ทดสอบ Voice Shortcut: ยืนยันอัตโนมัติ
    cy.window().then((win) => { win.processVoiceCommand('ยืนยัน'); });
    cy.get('#pen-input-modal').should('have.class', 'hidden'); // Modal ต้องถูกปิดไปเอง
    cy.get('#gamesList').should('contain.text', 'กิตติ'); // บันทึกเกมอัตโนมัติสำเร็จ
  });

  it('ทดสอบกระดานจัดทัพ: จัดทีมที่มีผู้เล่นที่ลงทะเบียนไว้แต่ไม่ได้เช็คอินวันนี้ (absent) และบันทึกสำเร็จ', () => {
    const players = ['ก้อง', 'แทน', 'หมู', 'แมน'];
    players.forEach(p => { cy.addPlayer(p); });
    
    // คลิกที่ชิปผู้เล่นเพื่อเอาออกจากสนามในวันนั้น (toggle to absent)
    cy.contains('.player-chip', 'แทน').click();
    cy.contains('.player-chip', 'แทน').should('have.class', 'absent');
    
    // เปิดกระดานจัดทัพและเลือก แทน ลงสนาม
    cy.get('#btnOpenPenInput').click();
    cy.get('#penP1').type('ก้อง');
    cy.get('#penP2').type('แทน');
    cy.get('#penP3').type('หมู');
    cy.get('#penP4').type('แมน');
    
    cy.contains('.ball-btn', '1').click();
    cy.get('#btnScanPen').click();
    cy.get('#btnConfirmPenInput').should('not.have.class', 'hidden').click();
    
    // บันทึกเกมสำเร็จและดึง แทน กลับมาเป็นเช็คอินวันนี้อัตโนมัติ
    cy.get('#pen-input-modal').should('have.class', 'hidden');
    cy.get('#gamesList').should('contain.text', 'แทน');
    cy.contains('.player-chip', 'แทน').should('not.have.class', 'absent');
  });

  it('ทดสอบกระดานจัดทัพ: การสร้างคำนำหน้ากลุ่มใหม่ และการเพิ่มผู้เล่นด่วนผ่านกระดานจัดทัพ', () => {
    // 1. ทดสอบการเลือก "+ เพิ่มคำนำหน้าใหม่..." ในหน้าหลักเพื่อสร้างคำนำหน้าใหม่
    // จำลองการกรอกข้อมูลผ่าน window.prompt
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('กลุ่มใหม่');
    });

    cy.get('#newPlayerPrefix').select('ADD_NEW_PREFIX');
    cy.get('#newPlayerPrefix').should('have.value', 'กลุ่มใหม่');

    // 2. ทดสอบเพิ่มผู้เล่นด่วนจากกระดานจัดทัพ
    cy.get('#btnOpenPenInput').click();
    cy.get('#pen-input-modal').should('not.have.class', 'hidden');

    // ตั้งค่าโฟกัสที่ช่อง P1
    cy.get('#penP1').focus();

    // กดปุ่ม เพิ่มผู้เล่นด่วน บนกระดานจัดทัพ
    cy.get('#btnPenQuickAddPlayer').click();
    cy.get('.swal2-popup').should('be.visible');

    // ใน modal เพิ่มผู้เล่นด่วน ควรมีกลุ่มใหม่ที่เราเพิ่งแอดไปให้เลือก
    cy.get('#swalQuickPrefix').should('contain.text', 'กลุ่มใหม่').select('กลุ่มใหม่');
    cy.get('#swalQuickName').type('สมศักดิ์');
    cy.get('.swal2-confirm').click();

    // ชื่อผู้เล่นใหม่ "สมศักดิ์" พร้อมกลุ่มใหม่ "กลุ่มใหม่: สมศักดิ์" ควรเข้าไปอยู่ในช่อง penP1 ทันที และเป็นสีเขียว
    cy.get('#penP1').should('have.value', 'กลุ่มใหม่: สมศักดิ์').and('have.class', 'status-green');
  });
});