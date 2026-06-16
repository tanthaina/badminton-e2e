describe('02 - Player Management & Security', () => {
  beforeEach(() => { cy.visit('/index.html'); });

  it('ทดสอบระบบค้นหารายชื่อผู้เล่น (Search Filtering Test)', () => {
    const players = ['ก้อง', 'แทน', 'กิตติ'];
    players.forEach(p => { cy.addPlayer(p); });

    cy.get('#playerList').children().should('have.length', 3);
    cy.get('#searchDailyPlayer').type('ก');
    cy.get('#playerList').children().should('have.length', 2);
    cy.get('#playerList').should('contain.text', 'ก้อง').and('contain.text', 'กิตติ').and('not.contain.text', 'แทน');

    cy.get('#searchDailyPlayer').clear().type('ไม่มีชื่อนี้แน่ๆ');
    cy.get('#playerList').children().should('have.length', 0);

    cy.get('#searchDailyPlayer').clear();
    cy.get('#playerList').children().should('have.length', 3);
  });

  it('ทดสอบระบบป้องกันการลบผู้เล่นที่มียอดหนี้ค้าง (Delete Player Validation)', () => {
    const players = ['ก้อง', 'แทน', 'หมู', 'แมน'];
    players.forEach(p => { cy.addPlayer(p); });
    
    cy.recordGame('ก้อง', 'แทน', 'หมู', 'แมน', '1', '20');

    cy.get('#btnConfirmSave').click(); cy.get('.swal2-confirm').click();
    cy.contains('.player-chip', 'ก้อง').find('.fa-trash-alt').click();
    cy.get('.swal2-popup').should('be.visible');
    cy.get('.swal2-html-container').should('contain.text', 'ยังมียอดค้างชำระ');
  });

  it('ทดสอบการเปลี่ยนชื่อผู้เล่น (Rename Player)', () => {
    cy.addPlayer('สมหมาย');
    cy.contains('.player-chip', 'สมหมาย').find('.fa-edit').click();
    cy.get('#rename-new-name').clear().type('สมชาย'); cy.get('#btnSubmitRename').click();
    cy.get('#playerList').should('not.contain.text', 'สมหมาย').and('contain.text', 'สมชาย');
  });

  it('ทดสอบ User Error: เปลี่ยนชื่อไปซ้ำกับคนที่มีอยู่แล้ว (Duplicate Rename)', () => {
    cy.addPlayer('สมชาย');
    cy.addPlayer('กิตติ');
    cy.contains('.player-chip', 'สมชาย').find('.fa-edit').click();
    cy.get('#rename-new-name').clear().type('กิตติ'); cy.get('#btnSubmitRename').click();
    cy.get('.swal2-popup').should('be.visible');
    cy.get('.swal2-title').should('contain.text', 'ซ้ำ!');
  });

  it('ทดสอบ Edge Case: ป้องกันการลบผู้เล่นที่มีเครดิตคงเหลือ (Credit Loss Prevention)', () => {
    cy.addPlayer('A');
    cy.get('button[data-tab="account"]').click();
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('A'); cy.get('#debt-amount').type('10');
    cy.get('#btnSubmitDebt').click();
    
    cy.contains('#unpaid-list-overall div', 'A').find('button').contains('จ่าย').click();
    cy.get('#payment-amount').clear().type('50');
    cy.get('#btnSubmitPayment').click();

    cy.get('button[data-tab="daily"]').click();
    cy.contains('.player-chip', 'A').find('.fa-trash-alt').click();
    cy.get('.swal2-popup').should('be.visible');
    cy.get('.swal2-html-container').should('contain.text', 'ยังมียอดเครดิตคงเหลือ');
  });

  it('ทดสอบ Edge Case: การกดยกเลิก (Cancel) ล้างรายชื่อวันนี้ ข้อมูลต้องไม่หาย', () => {
    cy.addPlayer('ผู้เล่นสำคัญ');
    cy.get('#playerList').should('contain.text', 'ผู้เล่นสำคัญ');

    cy.get('#btnClearTodayPlayers').click();
    cy.get('.swal2-popup').should('be.visible');
    cy.get('.swal2-cancel').click();
    cy.get('#playerList').should('contain.text', 'ผู้เล่นสำคัญ');
  });

  it('ทดสอบ Security (XSS): ป้องกันการฝังโค้ดอันตรายในชื่อผู้เล่น', () => {
    const xssPayload = '<img src="x" onerror="alert(\'HACKED\')">สคริปต์ป่วน';
    cy.addPlayer(xssPayload);
    
    cy.on('window:alert', cy.stub().as('alertStub'));
    cy.get('#playerList').should('contain.text', 'สคริปต์ป่วน');
    cy.get('@alertStub').should('not.have.been.called');
  });

  it('ทดสอบ Edge Case: ป้องกันการกดล้างรายชื่อวันนี้ หากมีการบันทึกเกมไปแล้ว (Prevent Data Loss)', () => {
    const players = ['A', 'B', 'C', 'D'];
    players.forEach(p => cy.addPlayer(p));
    
    cy.recordGame('A', 'B', 'C', 'D', '1', '20');

    cy.get('#btnClearTodayPlayers').click();
    cy.get('.swal2-popup').should('be.visible');
    cy.get('.swal2-html-container').should('contain.text', 'โปรดเคลียร์เกมออกก่อน');
  });

  it('ทดสอบการเพิ่มผู้เล่นพร้อม Prefix (Prefix Selection & UI Display)', () => {
    cy.addPlayer('สมปอง', 'ตากฟ้า');
    cy.addPlayer('สมศรี'); 
    cy.contains('.player-chip', 'สมปอง').should('contain.text', 'ตากฟ้า');
    cy.contains('.player-chip', 'สมศรี').should('not.contain.text', 'ทั่วไป');
    cy.get('#player1').find('option').contains('สมปอง (ตากฟ้า)').should('have.attr', 'value', 'ตากฟ้า: สมปอง');
    cy.get('#player1').find('option').contains('สมศรี').should('have.attr', 'value', 'สมศรี');
  });
});