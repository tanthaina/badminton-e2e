describe('06 - Deep Financial Logic & Edge Cases', () => {
  beforeEach(() => { cy.visit('/index.html'); });

  it('ทดสอบ 1: การคำนวณทศนิยม (Fractional Cost) 3 ลูก ราคา 25 บาท', () => {
    // 3 ลูก * 25 บาท = 75 บาท -> หาร 4 คน = 18.75 บาท/คน
    const players = ['A', 'B', 'C', 'D'];
    players.forEach(p => { cy.addPlayer(p); });
    cy.get('#player1').select('A'); cy.get('#player2').select('B');
    cy.get('#player3').select('C'); cy.get('#player4').select('D');
    
    cy.get('#shuttlecockSpeeds').type('1, 2, 3'); 
    cy.get('#shuttlecockPrice').clear().type('25');
    cy.get('#btnRecordGame').click();

    // ตรวจสอบตารางหน้าคิดเงินรายวัน
    cy.contains('#summaryTableUnpaid tr', 'A').should('contain.text', '18.75');
    cy.get('#grandTotal').should('have.text', '75.00');

    // ซิงก์ลงบัญชีและตรวจสอบหน้าบัญชีรวม
    cy.get('#btnConfirmSave').click(); cy.get('.swal2-confirm').click();
    cy.get('button[data-tab="account"]').click();
    cy.contains('#unpaid-list-overall div', 'A').should('contain.text', 'ค้าง 18.75');
  });

  it('ทดสอบ 2: เครดิตหักลบหนี้เกมใหม่โดยอัตโนมัติ (Credit Auto-Offset)', () => {
    cy.addPlayer('สายเปย์');
    cy.get('button[data-tab="account"]').click();
    
    // 1. ตั้งหนี้ 50 บาท แล้วจ่าย 100 บาท -> จะต้องมีเครดิต 50 บาท
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('สายเปย์'); cy.get('#debt-amount').type('50');
    cy.get('#btnSubmitDebt').click();
    cy.contains('#unpaid-list-overall div', 'สายเปย์').find('button').contains('จ่าย').click();
    cy.get('#payment-amount').clear().type('100'); cy.get('#btnSubmitPayment').click();
    cy.contains('#credit-list-overall div', 'สายเปย์').should('contain.text', 'เครดิต 50.00');

    // 2. กลับไปเล่นเกมใหม่ 1 เกม (มูลค่า 80 บาท หาร 4 = คนละ 20 บาท)
    cy.get('button[data-tab="daily"]').click();
    ['A', 'B', 'C'].forEach(p => cy.addPlayer(p));
    cy.get('#player1').select('สายเปย์'); cy.get('#player2').select('A');
    cy.get('#player3').select('B'); cy.get('#player4').select('C');
    cy.get('#shuttlecockSpeeds').type('1'); cy.get('#shuttlecockPrice').clear().type('80');
    cy.get('#btnRecordGame').click();

    // 3. ซิงก์บัญชี -> เครดิตเดิม 50 หักลบหนี้ใหม่ 20 จะต้องเหลือเครดิต 30 บาท และไม่ติดหนี้
    cy.get('#btnConfirmSave').click(); cy.get('.swal2-confirm').click();
    cy.get('button[data-tab="account"]').click();
    cy.contains('#credit-list-overall div', 'สายเปย์').should('contain.text', 'เครดิต 30.00');
    cy.get('#unpaid-list-overall').should('not.contain.text', 'สายเปย์');
  });

  it('ทดสอบ 3: ปัญหาทศนิยมดิ้น จ่ายยิบย่อยจนครบต้องไม่มียอดค้าง (Floating Point Precision)', () => {
    cy.addPlayer('คนคิดมาก');
    cy.get('button[data-tab="account"]').click();
    
    // ตั้งหนี้ 10 บาท
    cy.get('#btnAddDebt').click(); cy.get('#debt-name').type('คนคิดมาก'); cy.get('#debt-amount').type('10'); cy.get('#btnSubmitDebt').click();

    // ทยอยจ่ายทีละนิด: 3.33 -> 3.33 -> 3.34 (รวม 10.00 พอดี)
    cy.contains('#unpaid-list-overall div', 'คนคิดมาก').find('button').contains('จ่าย').click();
    cy.get('#payment-amount').clear().type('3.33'); cy.get('#btnSubmitPayment').click();
    cy.contains('#unpaid-list-overall div', 'คนคิดมาก').find('button').contains('จ่าย').click();
    cy.get('#payment-amount').clear().type('3.33'); cy.get('#btnSubmitPayment').click();
    cy.contains('#unpaid-list-overall div', 'คนคิดมาก').find('button').contains('จ่าย').click();
    cy.get('#payment-amount').clear().type('3.34'); cy.get('#btnSubmitPayment').click();

    // ยอดต้องตัดเป็น 0 ไปอยู่ช่องจ่ายครบแล้ว (ห้ามค้าง 0.00 หรือติดลบ)
    cy.get('#unpaid-list-overall').should('not.contain.text', 'คนคิดมาก');
    cy.get('#paid-in-full-list-overall').should('contain.text', 'คนคิดมาก');
  });

  it('ทดสอบ 4: ชำระทั้งหมด (Pay All) ยอดรวมต้องเป็นศูนย์โดยไม่กระทบคนที่มีเครดิต', () => {
    // รันการคำนวณหลายๆ ธุรกรรม
    cy.addPlayer('ค้างเยอะ'); cy.addPlayer('มีบุญคุณ');
    cy.get('button[data-tab="account"]').click();
    
    // ตั้งหนี้ "ค้างเยอะ" 100 บาท
    cy.get('#btnAddDebt').click(); cy.get('#debt-name').type('ค้างเยอะ'); cy.get('#debt-amount').type('100'); cy.get('#btnSubmitDebt').click();
    // ตั้งหนี้ "มีบุญคุณ" 20 และจ่าย 50 -> เครดิต 30
    cy.get('#btnAddDebt').click(); cy.get('#debt-name').type('มีบุญคุณ'); cy.get('#debt-amount').type('20'); cy.get('#btnSubmitDebt').click();
    cy.contains('#unpaid-list-overall div', 'มีบุญคุณ').find('button').contains('จ่าย').click();
    cy.get('#payment-amount').clear().type('50'); cy.get('#btnSubmitPayment').click();

    // เช็คยอดก่อนกด (หนี้รวม 100 / เครดิตรวม 30)
    cy.get('#total-unpaid-overall').should('have.text', '฿100.00');
    cy.get('#total-credit-overall').should('have.text', '฿30.00');

    // กดปุ่มชำระทั้งหมด
    cy.get('#btnPayAllUnpaid').click(); cy.get('.swal2-confirm').click();

    // หนี้รวมต้องเป็น 0 แต่เครดิตของคนมีบุญคุณต้องยังอยู่ 30 บาทเท่าเดิม
    cy.get('#total-unpaid-overall').should('have.text', '฿0.00');
    cy.get('#total-credit-overall').should('have.text', '฿30.00');
  });
});