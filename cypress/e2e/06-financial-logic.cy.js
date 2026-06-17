describe('06 - Deep Financial Logic & Edge Cases', () => {
  it('ทดสอบ 1: การคำนวณทศนิยม (Fractional Cost) 3 ลูก ราคา 25 บาท', () => {
    cy.seedPlayers(['A', 'B', 'C', 'D']);
    cy.visit('/index.html');

    // 3 ลูก * 25 บาท = 75 บาท -> หาร 4 คน = 18.75 บาท/คน
    cy.recordGame('A', 'B', 'C', 'D', '1, 2, 3', '25');

    // ตรวจสอบตารางหน้าคิดเงินรายวัน
    cy.contains('#summaryTableUnpaid tr', 'A').should('contain.text', '18.75');
    cy.get('#grandTotal').should('have.text', '75.00');

    // ซิงก์ลงบัญชีและตรวจสอบหน้าบัญชีรวม
    cy.get('#btnConfirmSave').click(); 
    cy.get('.swal2-confirm').should('be.visible').click();
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

    // 4. ซิงก์บัญชี -> เครดิตเดิม 50 หักลบหนี้ใหม่ 20 จะต้องเหลือเครดิต 30 บาท และไม่ติดหนี้
    cy.get('#btnConfirmSave').click(); 
    cy.get('.swal2-confirm').should('be.visible').click();
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

  it('ทดสอบ 4: ชำระทั้งหมด (Pay All) ยอดรวมต้องเป็นศูนย์โดยไม่กระทบคนที่มีเครดิต', () => {
    cy.seedSessionState('payAllSetup', {
      masterPlayerList: ['ค้างเยอะ', 'มีบุญคุณ'],
      allTransactions: [
        { id: 1, date: '2024-01-01', name: 'ค้างเยอะ', totalCost: 100, isAutoDaily: false },
        { id: 2, date: '2024-01-01', name: 'มีบุญคุณ', totalCost: 20, isAutoDaily: false }
      ],
      allPayments: [
        { id: 3, date: '2024-01-01', name: 'มีบุญคุณ', amount: 50, isAutoDaily: false }
      ]
    });

    cy.visit('/index.html');

    cy.get('button[data-tab="account"]').click();
    
    // เช็คยอดก่อนกด (หนี้รวม 100 / เครดิตรวม 30)
    cy.get('#total-unpaid-overall').should('have.text', '฿100.00');
    cy.get('#total-credit-overall').should('have.text', '฿30.00');

    // กดปุ่มชำระทั้งหมด
    cy.get('#btnPayAllUnpaid').click(); 
    cy.get('.swal2-confirm').should('be.visible').click();

    // หนี้รวมต้องเป็น 0 แต่เครดิตของคนมีบุญคุณต้องยังอยู่ 30 บาทเท่าเดิม
    cy.get('#total-unpaid-overall').should('have.text', '฿0.00');
    cy.get('#total-credit-overall').should('have.text', '฿30.00');
  });
});