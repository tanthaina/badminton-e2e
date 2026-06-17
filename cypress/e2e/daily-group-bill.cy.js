describe('Badminton App - Daily Group Bill Feature', () => {
  beforeEach(() => {
    cy.mockTime('2024-01-01T12:00:00Z'); // เรียกใช้ Custom Command สั้นๆ
    cy.visit('/index.html');
  });

  it('ควรแสดงแจ้งเตือน "ข้อมูลไม่พอ" ถ้าผู้ค้างชำระของวันนี้น้อยกว่า 2 คน', () => {
    // ทดสอบบน State ที่ว่างเปล่า (ไม่มีเกม)
    // พอกดตอนที่ไม่มีเกมเลย จะต้องขึ้นแจ้งเตือนทันที
    cy.get('#btnDailyGroupBill').click();
    cy.get('.swal2-popup').should('contain.text', 'ข้อมูลไม่พอ')
      .and('contain.text', 'ต้องมีผู้ค้างชำระของวันนี้อย่างน้อย 2 คน');
    cy.get('.swal2-confirm').click();
  });

  it('ควรสามารถรวมบิลรายวันและเปลี่ยนสถานะเป็น "จ่ายแล้ว" ได้อัตโนมัติ', () => {
    // Setup State สำหรับเทสนี้โดยเฉพาะ
    const today = '2024-01-01';
    const players = ['ก้อง', 'แทน', 'หมู', 'แมน'];
    cy.seedSessionState('dailyGroupBillSetup', {
      masterPlayerList: players,
      dailyData: {
        [today]: {
          players: players.map(name => ({ name, paid: false, present: true })),
          games: [{
            id: 1,
            players: ['ก้อง', 'แทน', 'หมู', 'แมน'],
            shuttlecocksUsed: 2,
            shuttlecockPrice: 100,
            shuttlecockSpeeds: ['1', '2']
          }]
        }
      },
      settings: {
        promptpayId: '0812345678',
        shuttlecockPrice: 100
      }
    });
    cy.visit('/index.html'); // โหลดหน้าเว็บใหม่พร้อม State ที่เราสร้าง

    // ตรวจสอบว่าทุกคนอยู่ในตาราง "ค้างชำระ" (Unpaid) ก่อน
    cy.get('#summaryTableUnpaid').should('contain.text', 'ก้อง').and('contain.text', 'แมน');
    cy.get('#summaryTablePaid').should('be.empty'); // ตารางจ่ายแล้วต้องว่าง

    // 4. กดปุ่ม QR จ่ายกลุ่ม
    cy.get('#btnDailyGroupBill').click();
    cy.get('.swal2-popup').should('contain.text', 'เลือกรวมบิลกลุ่ม (ประจำวัน)');

    // 5. เลือก ก้อง และ แทน เพื่อรวมบิล
    cy.get('.swal2-html-container').within(() => {
      cy.get('input[type="checkbox"][value="ก้อง"]').check();
      cy.get('input[type="checkbox"][value="แทน"]').check();
    });
    cy.get('.swal2-confirm').contains('รวมบิล').click();

    // 6. ตรวจสอบหน้าจอ QR Code
    cy.get('.swal2-popup').should('contain.text', 'สแกนเพื่อชำระเงิน')
      .and('contain.text', 'สำหรับ: ก้อง, แทน')
      .and('contain.text', 'ยอดรวมทั้งหมด: ฿100.00'); // 50+50

    // 7. กดปุ่มยืนยัน "บันทึกว่าจ่ายแล้ว"
    cy.get('.swal2-confirm').contains('บันทึกว่าจ่ายแล้ว').click();

    // ตรวจสอบแจ้งเตือนมุมขวาบน
    cy.get('.swal2-toast').should('contain.text', 'บันทึกชำระเงินเรียบร้อย');

    // 8. ตรวจสอบตารางประจำวัน ว่า "ก้อง" และ "แทน" ถูกย้ายลงมาตารางชำระแล้ว 
    cy.get('#summaryTableUnpaid').should('contain.text', 'หมู').and('contain.text', 'แมน');
    cy.get('#summaryTableUnpaid').should('not.contain.text', 'ก้อง').and('not.contain.text', 'แทน');
    cy.get('#summaryTablePaid').should('contain.text', 'ก้อง').and('contain.text', 'แทน');
  });
});