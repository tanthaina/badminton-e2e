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
    cy.seedPlayers(['สายเปย์', 'A', 'B', 'C']);
    cy.visit('/index.html');

    cy.get('button[data-tab="account"]').click();
    
    // 1. ตั้งหนี้ 50 บาท แล้วจ่าย 100 บาท -> จะต้องมีเครดิต 50 บาท
    cy.addDebt('สายเปย์', '50');
    cy.payDebt('สายเปย์', '100');
    cy.contains('#credit-list-overall div.border', 'สายเปย์').should('contain.text', 'เครดิต 50.00');

    // 2. กลับไปเล่นเกมใหม่ 1 เกม (มูลค่า 80 บาท หาร 4 = คนละ 20 บาท)
    cy.get('button[data-tab="daily"]').click();
    cy.recordGame('สายเปย์', 'A', 'B', 'C', '1', '80');

    // 3. ซิงก์บัญชี -> เครดิตเดิม 50 หักลบหนี้ใหม่ 20 จะต้องเหลือเครดิต 30 บาท และไม่ติดหนี้
    cy.get('#btnConfirmSave').click(); 
    cy.get('.swal2-confirm').should('be.visible').click();
    cy.get('button[data-tab="account"]').click();
    cy.contains('#credit-list-overall div.border', 'สายเปย์').should('contain.text', 'เครดิต 30.00');
    cy.get('#unpaid-list-overall').should('not.contain.text', 'สายเปย์');
  });

  it('ทดสอบ 3: ปัญหาทศนิยมดิ้น จ่ายยิบย่อยจนครบต้องไม่มียอดค้าง (Floating Point Precision)', () => {
    cy.seedPlayers(['คนคิดมาก']);
    cy.visit('/index.html');

    cy.get('button[data-tab="account"]').click();
    
    // ตั้งหนี้ 10 บาท
    cy.addDebt('คนคิดมาก', '10');

    // ทยอยจ่ายทีละนิด: 3.33 -> 3.33 -> 3.34 (รวม 10.00 พอดี)
    cy.payDebt('คนคิดมาก', '3.33');
    cy.payDebt('คนคิดมาก', '3.33');
    cy.payDebt('คนคิดมาก', '3.34');

    // ยอดต้องตัดเป็น 0 ไปอยู่ช่องจ่ายครบแล้ว (ห้ามค้าง 0.00 หรือติดลบ)
    cy.get('#unpaid-list-overall').should('not.contain.text', 'คนคิดมาก');
    cy.get('#paid-in-full-list-overall').should('contain.text', 'คนคิดมาก');
  });

  it('ทดสอบ 4: ชำระทั้งหมด (Pay All) ยอดรวมต้องเป็นศูนย์โดยไม่กระทบคนที่มีเครดิต', () => {
    cy.seedPlayers(['ค้างเยอะ', 'มีบุญคุณ']);
    cy.visit('/index.html');

    // รันการคำนวณหลายๆ ธุรกรรม
    cy.get('button[data-tab="account"]').click();
    
    // ตั้งหนี้ "ค้างเยอะ" 100 บาท
    cy.addDebt('ค้างเยอะ', '100');
    // ตั้งหนี้ "มีบุญคุณ" 20 และจ่าย 50 -> เครดิต 30
    cy.addDebt('มีบุญคุณ', '20');
    cy.payDebt('มีบุญคุณ', '50');

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