describe('Badminton App - End-to-End Testing', () => {
  
  beforeEach(() => {
    // สมมติว่าเปิด Live Server ไว้ที่พอร์ต 3000 (เปลี่ยน URL ให้ตรงกับโปรเจกต์จริงของคุณ)
    cy.visit('http://127.0.0.1:5500/index.html');
  });

  it('ทดสอบโฟลว์หลัก: เพิ่มผู้เล่น -> บันทึกเกม -> เช็คยอดเงิน -> จ่ายเงิน', () => {
    
    // 1. จำลองการพิมพ์เพิ่มชื่อผู้เล่นใหม่ 4 คน
    const players = ['ก้อง', 'แทน', 'หมู', 'แมน'];
    players.forEach(player => {
      cy.get('#newPlayerName').type(player);
      cy.get('#btnAddPlayer').click();
    });

    // ตรวจสอบว่ามีผู้เล่นในระบบครบ 4 คนจริง
    cy.get('#playerList').children().should('have.length', 4);

    // 2. จำลองการเลือกผู้เล่นลงสนามเพื่อบันทึกเกม
    cy.get('#player1').select('ก้อง');
    cy.get('#player2').select('แทน');
    cy.get('#player3').select('หมู');
    cy.get('#player4').select('แมน');

    // กรอกเบอร์ลูกแบด 2 ลูก และราคาลูกละ 20 บาท
    cy.get('#shuttlecockSpeeds').type('75, 76');
    cy.get('#shuttlecockPrice').clear().type('20');
    
    // กดบันทึก
    cy.get('#btnRecordGame').click();

    // 3. ตรวจสอบผลลัพธ์
    // ต้องมีเกมปรากฏขึ้น 1 เกม
    cy.get('#gamesList').children().should('have.length', 1);
    // ตรวจสอบว่าระบบหารค่าลูกแบดถูกต้อง (2 ลูก * 20 บาท / 4 คน = 10 บาท/คน)
    cy.get('#gamesList').should('contain.text', 'ลูก 75,76 (10.00 บ./คน)');

    // 4. ตรวจสอบตารางสรุปรายวัน
    // ทุกคนต้องติดค้างชำระคนละ 10 บาท (รวมยอดเป็น 40.00 บาท)
    cy.get('#summaryTableUnpaid').find('tr').should('have.length', 4);
    cy.get('#grandTotal').should('have.text', '40.00');
    
    // 5. ทดสอบจำลองการกด "จ่ายเงิน" ให้ผู้เล่นที่ชื่อ "ก้อง"
    cy.contains('#summaryTableUnpaid tr', 'ก้อง').find('button').contains('จ่าย').click();
    
    // ตรวจสอบว่า "ก้อง" ถูกย้ายไปอยู่ตารางที่ชำระเงินแล้ว
    cy.get('#summaryTablePaid').find('tr').should('have.length', 1);
    cy.get('#summaryTablePaid').should('contain.text', 'ก้อง');
    cy.get('#summaryTablePaid').should('contain.text', 'จ่ายแล้ว');
  });
});