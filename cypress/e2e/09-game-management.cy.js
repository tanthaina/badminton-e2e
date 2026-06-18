describe('09 - Game Management (Move & Edit)', () => {
  it('ทดสอบระบบเลื่อนลำดับเกม (Move Game Up/Down)', () => {
    cy.seedPlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    cy.visit('/index.html');

    // บันทึกเกมที่ 1
    cy.recordGame('A', 'B', 'C', 'D', '1', '20');

    // บันทึกเกมที่ 2
    cy.recordGame('E', 'F', 'G', 'H', '2', '20');

    // ตรวจสอบก่อนเลื่อน (เกม 1 = 1, เกม 2 = 2)
    cy.get('#gamesList .game-card').eq(0).should('contain.text', 'ลูก 1');
    cy.get('#gamesList .game-card').eq(1).should('contain.text', 'ลูก 2');

    // กด "เลื่อนลง" ที่เกม 1
    cy.get('#gamesList .game-card').eq(0).find('button[title="เลื่อนลง"]').click();

    // ตรวจสอบหลังเลื่อน (เกม 1 ควรกลายเป็น 2, เกม 2 กลายเป็น 1)
    cy.get('#gamesList .game-card').eq(0).should('contain.text', 'ลูก 2');
    cy.get('#gamesList .game-card').eq(1).should('contain.text', 'ลูก 1');

    // กด "เลื่อนขึ้น" ที่เกม 2 เพื่อให้กลับไปที่เดิม
    cy.get('#gamesList .game-card').eq(1).find('button[title="เลื่อนขึ้น"]').click();
    cy.get('#gamesList .game-card').eq(0).should('contain.text', 'ลูก 1');
    cy.get('#gamesList .game-card').eq(1).should('contain.text', 'ลูก 2');
  });

  it('ทดสอบระบบแก้ไขเกม (Edit Game)', () => {
    cy.seedPlayers(['เอก', 'บอย', 'แคท', 'ดิว', 'จอย']);
    cy.visit('/index.html');
    
    // บันทึกเกม
    cy.recordGame('เอก', 'บอย', 'แคท', 'ดิว', '5', '20');
    
    // กดปุ่มแก้ไขที่เกมแรก
    cy.get('#gamesList .game-card').eq(0).find('button[title="แก้ไข"]').click();
    
    // ตรวจสอบ UI ว่าดึงข้อมูลมาถูกต้อง
    cy.get('#player1').should('have.value', 'เอก');
    cy.get('#shuttlecockSpeeds').should('have.value', '5');
    cy.get('#btnRecordGame').should('contain.text', 'อัปเดตเกม').and('have.class', 'btn-warning');
    cy.get('#btnCancelEditGame').should('not.have.class', 'hidden');
    
    // เปลี่ยนผู้เล่น 1 เป็น จอย และแก้เบอร์ลูก
    cy.get('#player1').select('จอย');
    cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', /^5$/).click(); // เอา 5 ออก
    cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', /^9$/).click(); // เลือก 9
    cy.get('#btnRecordGame').click(); // กดอัปเดตเกม
    
    // ตรวจสอบผลลัพธ์หลังแก้ไข ว่าการ์ดอัปเดตแล้ว
    cy.get('#gamesList .game-card').eq(0).should('contain.text', 'จอย').and('contain.text', 'ลูก 9');
    cy.get('#gamesList .game-card').eq(0).should('not.contain.text', 'เอก');
    
    // UI กลับสู่โหมดบันทึกเกมใหม่ปกติ
    cy.get('#btnRecordGame').should('contain.text', 'บันทึกเกมนี้').and('have.class', 'btn-success');
    cy.get('#btnCancelEditGame').should('have.class', 'hidden');
  });

  it('ทดสอบป้องกันบั๊กข้อมูลฟอร์มหายเวลากดแก้ไขเกม (Edit Form State Preservation)', () => {
    cy.seedPlayers(['หมู', 'หมา', 'กา', 'ไก่']);
    cy.visit('/index.html');

    // บันทึกเกม
    cy.recordGame('หมู', 'หมา', 'กา', 'ไก่', '1, 2', '25');

    // กดปุ่มแก้ไขที่เกมแรก
    cy.get('#gamesList .game-card').eq(0).find('button[title="แก้ไข"]').click();

    // ข้อมูลต้องถูกดึงมาใส่ฟอร์มอย่างครบถ้วน ไม่ว่างเปล่า (ยืนยันว่าบั๊กเก่าถูกแก้แล้ว 100%)
    cy.get('#player1').should('have.value', 'หมู');
    cy.get('#player2').should('have.value', 'หมา');
    cy.get('#player3').should('have.value', 'กา');
    cy.get('#player4').should('have.value', 'ไก่');
    cy.get('#shuttlecockSpeeds').should('have.value', '1, 2');
    cy.get('#shuttlecockPrice').should('have.value', '25');

    // กดยกเลิกการแก้ไข ฟอร์มต้องถูกล้างค่าและกลับสู่สถานะปกติ
    cy.get('#btnCancelEditGame').click();
    cy.get('#player1').should('have.value', '');
    cy.get('#shuttlecockSpeeds').should('have.value', '');
    cy.get('#btnRecordGame').should('contain.text', 'บันทึกเกมนี้').and('have.class', 'btn-success');
  });
});