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
    cy.get('#player2').should('have.value', 'แทน');
    cy.get('#shuttlecockSpeeds').should('have.value', '1, 2');
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
    cy.get('#player1').should('have.value', 'ตากฟ้า: สมชาย');
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

    cy.get('#btnClosePenInput').click();
    cy.addPlayer('ก้อง', 'ตาคลี');
    cy.get('#btnOpenPenInput').click();
    cy.get('#penP1').clear(); cy.get('#penP2').clear(); cy.get('#penP3').clear(); cy.get('#penP4').clear();
    cy.window().then((win) => { win.processVoiceCommand('ก้อง'); });
    cy.get('#penP1').should('have.class', 'status-yellow');
  });
});