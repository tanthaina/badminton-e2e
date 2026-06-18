describe('01 - Core Flow & Game Management', () => {
  beforeEach(() => { cy.visit('/index.html'); });

  it('ทดสอบโฟลว์หลัก: เพิ่มผู้เล่น -> บันทึกเกม -> เช็คยอดเงิน -> จ่ายเงิน', () => {
    const players = ['ก้อง', 'แทน', 'หมู', 'แมน'];
    players.forEach(player => {
      cy.addPlayer(player);
    });

    cy.get('#playerList').children().should('have.length', 4);
    cy.recordGame('ก้อง', 'แทน', 'หมู', 'แมน', '1, 2', '20');

    cy.get('#gamesList').children().should('have.length', 1);
    cy.get('#gamesList').should('contain.text', 'ลูก 1,2').and('contain.text', '10.00 บ./คน');
    cy.get('#summaryTableUnpaid').find('tr').should('have.length', 4);
    cy.get('#grandTotal').should('have.text', '40.00');
    cy.contains('#summaryTableUnpaid tr', 'ก้อง').should('contain.text', '1').and('contain.text', '2');
    
    cy.contains('#summaryTableUnpaid tr', 'ก้อง').find('button').contains('จ่าย').click();
    cy.get('#summaryTablePaid').find('tr').should('have.length', 1);
    cy.get('#summaryTablePaid').should('contain.text', 'ก้อง').and('contain.text', 'จ่ายแล้ว');
  });

  it('ทดสอบกรณีเลือกผู้เล่นซ้ำกันหรือลืมกรอกเบอร์ลูก (Negative Test)', () => {
    cy.addPlayer('ก้อง');
    cy.addPlayer('แทน');
    cy.recordGame('ก้อง', 'ก้อง');
    cy.get('.swal2-popup').should('be.visible');
    cy.get('.swal2-html-container').should('contain.text', 'เลือก 4 คนไม่ซ้ำกัน');
  });

  it('ทดสอบการเพิ่มผู้เล่นด่วน (Quick Add Player) จากแถบเครื่องมือบันทึกเกม', () => {
    // กดปุ่มเพิ่มผู้เล่นด่วน
    cy.get('#btnQuickAddPlayer').click();
    
    // กรอกข้อมูลใน SweetAlert Popup
    cy.get('.swal2-popup').should('be.visible').and('contain.text', 'เพิ่มผู้เล่นด่วน');
    cy.get('#swalQuickPrefix').select('ตากฟ้า');
    cy.get('#swalQuickName').type('สายฟ้า');
    cy.get('.swal2-confirm').contains('เพิ่มผู้เล่น').click();
    
    // ตรวจสอบว่าชื่อเข้าไปอยู่ใน Dropdown ผู้เล่นแล้ว
    cy.get('#player1').find('option[value="ตากฟ้า: สายฟ้า"]').should('exist');
  });

  it('ทดสอบระบบบันทึกข้อมูลอัตโนมัติ (Data Persistence)', () => {
    cy.addPlayer('ผู้เล่นทดสอบ');
    cy.get('#playerList').should('contain.text', 'ผู้เล่นทดสอบ');
    cy.reload();
    cy.get('#playerList').should('contain.text', 'ผู้เล่นทดสอบ');
  });

  it('ทดสอบการแสดงผลตารางบนหน้าจอมือถือ (Mobile View & Sticky Column)', () => {
    cy.viewport('iphone-xr');
    const players = ['ก้อง', 'แทน', 'หมู', 'ชื่อยาวมากยาวสุดๆทะลุจอ'];
    players.forEach(p => { cy.addPlayer(p); });
    cy.recordGame('ก้อง', 'แทน', 'หมู', 'ชื่อยาวมากยาวสุดๆทะลุจอ', '1', '20');

    cy.get('#summaryTable').scrollIntoView();
    cy.get('#summaryTable').parent().should('have.class', 'overflow-x-auto');
    cy.get('#summaryTableUnpaid tr').first().find('td').first()
      .should('have.class', 'sticky-col')
      .and('have.css', 'position', 'sticky')
      .and('have.css', 'left', '0px');
  });

  it('ทดสอบการลบเกม และการคำนวณยอดเงินใหม่ (Delete Game)', () => {
    const players = ['A', 'B', 'C', 'D'];
    players.forEach(p => { cy.addPlayer(p); });
    cy.recordGame('A', 'B', 'C', 'D', '1', '20');
    
    cy.get('#grandTotal').should('have.text', '20.00'); 
    cy.get('.game-card').find('.fa-trash-alt').click();
    cy.get('#grandTotal').should('have.text', '0.00');
    cy.get('#gamesList .game-card').should('have.length', 0);
  });

  it('ทดสอบ User Error: บันทึกเกมโดยที่เลือกผู้เล่นไม่ครบ 4 คน', () => {
    cy.addPlayer('A');
    cy.addPlayer('B');
    cy.addPlayer('C');

    cy.recordGame('A', 'B', 'C', null, '1');

    cy.get('.swal2-popup').should('be.visible');
    cy.get('.swal2-html-container').should('contain.text', 'เลือก 4 คนไม่ซ้ำกัน');
  });

  it('ทดสอบ Performance (Stress Test): จำลองการบันทึกเกมจำนวนมากต่อเนื่อง', () => {
    const players = ['P1', 'P2', 'P3', 'P4'];
    players.forEach(p => { cy.addPlayer(p); });
    
    cy.get('#player1').select('P1'); cy.get('#player2').select('P2');
    cy.get('#player3').select('P3'); cy.get('#player4').select('P4');
    cy.get('#shuttlecockPrice').clear().type('20');

    for(let i = 1; i <= 12; i++) {
      if (i > 1) {
        cy.get('#btnUseLastTeam').click({ force: true });
      }
      cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', new RegExp(`^${i}$`)).click();
      cy.get('#btnRecordGame').click({ force: true });
      cy.get('#gamesList').children().should('have.length', i);
    }

    cy.get('#gamesList').children().should('have.length', 12);
    cy.get('#grandTotal').should('have.text', '240.00');
  });

  it('ทดสอบ Edge Case: ป้องกันการบันทึกเกมด้วยราคาลูกติดลบ (Negative Price)', () => {
    const players = ['A', 'B', 'C', 'D'];
    players.forEach(p => cy.addPlayer(p));
    
    // จงใจใส่ค่าติดลบ
    cy.recordGame('A', 'B', 'C', 'D', '1', '-50');

    // ตรวจสอบว่าระบบป้องกันราคาติดลบ (ปัดเป็น 0 อัตโนมัติ)
    cy.get('#gamesList').should('contain.text', '0.00 บ./คน');
    cy.get('#grandTotal').should('have.text', '0.00');
  });
});