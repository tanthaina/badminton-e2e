describe('06 - Deep Financial Logic & Edge Cases', () => {
  it('ทดสอบ 1: การคำนวณทศนิยม (Fractional Cost) 3 ลูก ราคา 25 บาท', () => {
    cy.seedPlayers(['A', 'B', 'C', 'D']);
    cy.visit('/index.html');

    // 3 ลูก * 25 บาท = 75 บาท -> หาร 4 คน = 18.75 บาท/คน
    cy.recordGame('A', 'B', 'C', 'D', '1, 2, 3', '25');

    // ตรวจสอบตารางหน้าคิดเงินรายวัน
    cy.contains('#summaryTableUnpaid tr', 'A').should('contain.text', '18.75');
    cy.get('#grandTotal').should('have.text', '75.00');

    // ตรวจสอบหน้าบัญชีรวม
    cy.get('button[data-tab="account"]').click();
    cy.contains('#unpaid-list-overall div.border', 'A').should('contain.text', 'ค้าง 18.75');
  });

  it('ทดสอบ 2: เครดิตหักลบหนี้เกมใหม่โดยอัตโนมัติ (Credit Auto-Offset)', () => {
    const players = ['สายเปย์', 'A', 'B', 'C'];
    const today = '2024-01-01';

    // 1. ตั้งค่า State เริ่มต้น: 'สายเปย์' มีหนี้ 50 บาท และจ่าย 100 บาท (เครดิต 50 บาท)
    cy.seedSessionState('creditAutoOffsetSetup', {
      masterPlayerList: players,
      allTransactions: [{ id: 1, date: today, name: 'สายเปย์', totalCost: 50, isAutoDaily: false }],
      allPayments: [{ id: 2, date: today, name: 'สายเปย์', amount: 100, isAutoDaily: false }],
      dailyData: {
        [today]: {
          players: players.map(name => ({ name, paid: false, present: true })),
          games: []
        }
      }
    });

    cy.mockTime(today + 'T12:00:00Z');
    cy.visit('/index.html');

    cy.get('button[data-tab="account"]').click();
    
    // 2. ตรวจสอบว่ามีเครดิต 50 บาทจริงในหน้าบัญชี
    cy.contains('#credit-list-overall div.border', 'สายเปย์').should('contain.text', 'เครดิต 50.00');

    // 3. กลับไปเล่นเกมใหม่ 1 เกม (มูลค่า 80 บาท หาร 4 = คนละ 20 บาท)
    cy.get('button[data-tab="daily"]').click();
    cy.recordGame('สายเปย์', 'A', 'B', 'C', '1', '80');

    // 4. ตรวจสอบบัญชี -> เครดิตเดิม 50 หักลบหนี้ใหม่ 20 จะต้องเหลือเครดิต 30 บาท และไม่ติดหนี้
    cy.get('button[data-tab="account"]').click();
    cy.contains('#credit-list-overall div.border', 'สายเปย์').should('contain.text', 'เครดิต 30.00');
    cy.get('#unpaid-list-overall').should('not.contain.text', 'สายเปย์');
  });

  it('ทดสอบ 3: ปัญหาทศนิยมดิ้น จ่ายยิบย่อยจนครบต้องไม่มียอดค้าง (Floating Point Precision)', () => {
    // 1. ตั้งค่า State เริ่มต้น: 'คนคิดมาก' มีหนี้ 10 บาท
    cy.seedSessionState('floatingPointSetup', {
      masterPlayerList: ['คนคิดมาก'],
      allTransactions: [{ id: 1, date: '2024-01-01', name: 'คนคิดมาก', totalCost: 10, isAutoDaily: false }]
    });

    cy.visit('/index.html');
    cy.get('button[data-tab="account"]').click();
    
    cy.contains('#unpaid-list-overall div.border', 'คนคิดมาก').should('contain.text', 'ค้าง 10.00');

    // 2. ทยอยจ่ายทีละนิด: 3.33 -> 3.33 -> 3.34 (รวม 10.00 พอดี)
    cy.payDebt('คนคิดมาก', '3.33');
    cy.payDebt('คนคิดมาก', '3.33');
    cy.payDebt('คนคิดมาก', '3.34');

    // 3. ยอดต้องตัดเป็น 0 ไปอยู่ช่องจ่ายครบแล้ว (ห้ามค้าง 0.00 หรือติดลบ)
    cy.get('#unpaid-list-overall').should('not.contain.text', 'คนคิดมาก');
    cy.get('#paid-in-full-list-overall').should('contain.text', 'คนคิดมาก');
  });



  it('ทดสอบ 5: การแสดงผลหนี้สะสม (Accumulated Debt) และปุ่ม QR Code บนหน้ารายวัน', () => {
    const today = '2024-01-01';
    cy.seedSessionState('accumulatedDebtSetup', {
      masterPlayerList: ['A', 'B', 'C', 'D'],
      allTransactions: [
        // A ค้างเก่า 100 บาท
        { id: 1, date: '2023-12-31', name: 'A', totalCost: 100, isAutoDaily: false }
      ],
      dailyData: {
        [today]: {
          players: ['A', 'B', 'C', 'D'].map(name => ({ name, paid: false, present: true })),
          games: []
        }
      },
      settings: { promptpayId: '0812345678' }
    });

    cy.mockTime(today + 'T12:00:00Z');
    cy.visit('/index.html');

    // บันทึกเกมวันนี้ 80 บาท (หาร 4 = คนละ 20 บาท)
    cy.recordGame('A', 'B', 'C', 'D', '1', '80');

    // 1. ตรวจสอบสถานะบนหน้ารายวัน
    // A ต้องขึ้น "ค้างชำระ (สะสม: ฿120)" (20 วันนี้ + 100 หนี้เก่า)
    cy.contains('#summaryTableUnpaid tr', 'A').should('contain.text', 'ค้างชำระ (สะสม: ฿120)');
    // B ต้องขึ้น "ค้างชำระ" ปกติ (เพราะไม่มีหนี้สะสมเดิม)
    cy.contains('#summaryTableUnpaid tr', 'B').should('contain.text', 'ค้างชำระ').and('not.contain.text', 'สะสม');

    // 2. ตรวจสอบการเปิด QR Code ของ A
    cy.contains('#summaryTableUnpaid tr', 'A').find('button[title="สแกน QR Code"]').click();
    cy.get('.swal2-popup').should('be.visible');
    cy.get('.swal2-popup').should('contain.text', 'ยอดต้องชำระสุทธิ: ฿120.00');
    cy.get('.swal2-popup').should('contain.text', 'ยอดเล่นวันนี้: ฿20.00');
    cy.get('.swal2-popup').should('contain.text', 'ยอดค้างเก่าสะสม: +฿100.00');
    
    // ตรวจสอบลิ้งก์รูปภาพ QR Code ว่ามียอดเงิน 120.00
    cy.get('.swal2-image').should('have.attr', 'src').and('include', 'promptpay.io/').and('include', '/120.00');
    cy.get('.swal2-confirm').click(); // ปิด popup
  });

  it('ทดสอบ 6: การแสดงผลหนี้ค้างสุทธิกรณีหักเครดิตบางส่วน (Partial Credit Offset) บนหน้ารายวัน', () => {
    const today = '2024-01-01';
    cy.seedSessionState('partialCreditSetup', {
      masterPlayerList: ['A', 'B', 'C', 'D'],
      allTransactions: [
        { id: 1, date: '2023-12-31', name: 'A', totalCost: 30, isAutoDaily: false }
      ],
      allPayments: [
        // A เติมเงินล่วงหน้ามา 40 บาท (หักหนี้เก่า 30 จะมีเครดิตเหลือ 10 บาท)
        { id: 2, date: '2023-12-31', name: 'A', amount: 40, isAutoDaily: false }
      ],
      dailyData: {
        [today]: {
          players: ['A', 'B', 'C', 'D'].map(name => ({ name, paid: false, present: true })),
          games: []
        }
      },
      settings: { promptpayId: '0812345678' }
    });

    cy.mockTime(today + 'T12:00:00Z');
    cy.visit('/index.html');

    // บันทึกเกมวันนี้ 160 บาท (หาร 4 = คนละ 40 บาท)
    cy.recordGame('A', 'B', 'C', 'D', '1', '160');

    // 1. ตรวจสอบสถานะบนหน้ารายวัน
    // A ต้องขึ้น "ค้างชำระ (สุทธิ: ฿30)" (ค่าเล่น 40 - เครดิตเดิม 10)
    cy.contains('#summaryTableUnpaid tr', 'A').should('contain.text', 'ค้างชำระ (สุทธิ: ฿30)');

    // 2. ตรวจสอบการเปิด QR Code ของ A
    cy.contains('#summaryTableUnpaid tr', 'A').find('button[title="สแกน QR Code"]').click();
    cy.get('.swal2-popup').should('be.visible');
    cy.get('.swal2-popup').should('contain.text', 'ยอดต้องชำระสุทธิ: ฿30.00');
    cy.get('.swal2-popup').should('contain.text', 'ยอดเล่นวันนี้: ฿40.00');
    cy.get('.swal2-popup').should('contain.text', 'หักเครดิตเก่า: -฿10.00');
    
    // QR Code ต้องถูกเจนสำหรับยอดเงิน 30.00
    cy.get('.swal2-image').should('have.attr', 'src').and('include', '/30.00');
  });
});