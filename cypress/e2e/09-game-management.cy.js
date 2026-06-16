describe('09 - Game Management (Move & Edit)', () => {
  beforeEach(() => { cy.visit('/index.html'); });

  it('ทดสอบระบบเลื่อนลำดับเกม (Move Game Up/Down)', () => {
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(p => cy.addPlayer(p));

    // บันทึกเกมที่ 1
    cy.get('#player1').select('A'); cy.get('#player2').select('B');
    cy.get('#player3').select('C'); cy.get('#player4').select('D');
    cy.get('#shuttlecockSpeeds').type('101'); cy.get('#shuttlecockPrice').clear().type('20');
    cy.get('#btnRecordGame').click();

    // บันทึกเกมที่ 2
    cy.get('#player1').select('E'); cy.get('#player2').select('F');
    cy.get('#player3').select('G'); cy.get('#player4').select('H');
    cy.get('#shuttlecockSpeeds').type('202'); cy.get('#shuttlecockPrice').clear().type('20');
    cy.get('#btnRecordGame').click();

    // ตรวจสอบก่อนเลื่อน (เกม 1 = 101, เกม 2 = 202)
    cy.get('#gamesList .game-card').eq(0).should('contain.text', 'ลูก 101');
    cy.get('#gamesList .game-card').eq(1).should('contain.text', 'ลูก 202');

    // กด "เลื่อนลง" ที่เกม 1
    cy.get('#gamesList .game-card').eq(0).find('button[title="เลื่อนลง"]').click();

    // ตรวจสอบหลังเลื่อน (เกม 1 ควรกลายเป็น 202, เกม 2 กลายเป็น 101)
    cy.get('#gamesList .game-card').eq(0).should('contain.text', 'ลูก 202');
    cy.get('#gamesList .game-card').eq(1).should('contain.text', 'ลูก 101');

    // กด "เลื่อนขึ้น" ที่เกม 2 เพื่อให้กลับไปที่เดิม
    cy.get('#gamesList .game-card').eq(1).find('button[title="เลื่อนขึ้น"]').click();
    cy.get('#gamesList .game-card').eq(0).should('contain.text', 'ลูก 101');
    cy.get('#gamesList .game-card').eq(1).should('contain.text', 'ลูก 202');
  });

  it('ทดสอบระบบแก้ไขเกม (Edit Game)', () => {
    ['เอก', 'บอย', 'แคท', 'ดิว', 'จอย'].forEach(p => cy.addPlayer(p));
    
    // บันทึกเกม
    cy.get('#player1').select('เอก'); cy.get('#player2').select('บอย');
    cy.get('#player3').select('แคท'); cy.get('#player4').select('ดิว');
    cy.get('#shuttlecockSpeeds').type('55'); cy.get('#shuttlecockPrice').clear().type('20');
    cy.get('#btnRecordGame').click();
    
    // กดปุ่มแก้ไขที่เกมแรก
    cy.get('#gamesList .game-card').eq(0).find('button[title="แก้ไข"]').click();
    
    // ตรวจสอบ UI ว่าดึงข้อมูลมาถูกต้อง
    cy.get('#player1').should('have.value', 'เอก');
    cy.get('#shuttlecockSpeeds').should('have.value', '55');
    cy.get('#btnRecordGame').should('contain.text', 'อัปเดตเกม').and('have.class', 'btn-warning');
    cy.get('#btnCancelEditGame').should('not.have.class', 'hidden');
    
    // เปลี่ยนผู้เล่น 1 เป็น จอย และแก้เบอร์ลูก
    cy.get('#player1').select('จอย');
    cy.get('#shuttlecockSpeeds').clear().type('99');
    cy.get('#btnRecordGame').click(); // กดอัปเดตเกม
    
    // ตรวจสอบผลลัพธ์หลังแก้ไข ว่าการ์ดอัปเดตแล้ว
    cy.get('#gamesList .game-card').eq(0).should('contain.text', 'จอย').and('contain.text', 'ลูก 99');
    cy.get('#gamesList .game-card').eq(0).should('not.contain.text', 'เอก');
    
    // UI กลับสู่โหมดบันทึกเกมใหม่ปกติ
    cy.get('#btnRecordGame').should('contain.text', 'บันทึกเกมนี้').and('have.class', 'btn-success');
    cy.get('#btnCancelEditGame').should('have.class', 'hidden');
  });
});