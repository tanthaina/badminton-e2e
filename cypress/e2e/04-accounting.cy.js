describe('04 - Accounting & History', () => {
  beforeEach(() => { cy.visit('/index.html'); });

  it('ทดสอบการชำระเงินบางส่วน (Partial Payment) ในแท็บบัญชีรวม', () => {
    const players = ['ก้อง', 'แทน', 'หมู', 'แมน'];
    players.forEach(p => { cy.addPlayer(p); });
    cy.get('#player1').select('ก้อง'); cy.get('#player2').select('แทน');
    cy.get('#player3').select('หมู'); cy.get('#player4').select('แมน');
    cy.get('#shuttlecockSpeeds').type('1, 2'); cy.get('#shuttlecockPrice').clear().type('20');
    cy.get('#btnRecordGame').click();

    cy.get('#btnConfirmSave').click(); cy.get('.swal2-confirm').click();
    cy.get('button[data-tab="account"]').click();
    cy.contains('#unpaid-list-overall div', 'ก้อง').should('contain.text', 'ค้าง 10.00');
    cy.contains('#unpaid-list-overall div', 'ก้อง').find('button').contains('จ่าย').click();

    cy.get('#payment-amount').clear().type('4'); cy.get('#btnSubmitPayment').click();
    cy.contains('#unpaid-list-overall div', 'ก้อง').should('contain.text', 'ค้าง 6.00');
    cy.get('#total-unpaid-overall').should('have.text', '฿36.00');
  });

  it('ทดสอบแท็บประวัติและการค้นหาตามช่วงวันที่ (History Tab & Date Filter)', () => {
    const players = ['สมชาย', 'สมหญิง', 'สมปอง', 'สมหมาย'];
    players.forEach(p => { cy.addPlayer(p); });
    cy.get('#player1').select('สมชาย'); cy.get('#player2').select('สมหญิง');
    cy.get('#player3').select('สมปอง'); cy.get('#player4').select('สมหมาย');
    cy.get('#shuttlecockSpeeds').type('1'); cy.get('#shuttlecockPrice').clear().type('20');
    cy.get('#btnRecordGame').click();
    
    cy.get('#btnConfirmSave').click(); cy.get('.swal2-confirm').click();
    cy.get('button[data-tab="history"]').click();
    cy.get('#overall-summary-content').should('contain.text', 'สมชาย').and('contain.text', 'เกม');

    cy.get('#summaryStartDate').type('2099-12-31');
    cy.get('#btnFilterHistory').click();
    cy.get('#overall-summary-content').should('contain.text', 'ไม่มีข้อมูลประวัติในช่วงเวลานี้');
  });

  it('ทดสอบปุ่มยกเลิกการจ่ายเงินรายวัน (Toggle Daily Payment)', () => {
    const players = ['A', 'B', 'C', 'D'];
    players.forEach(p => { cy.addPlayer(p); });
    cy.get('#player1').select('A'); cy.get('#player2').select('B');
    cy.get('#player3').select('C'); cy.get('#player4').select('D');
    cy.get('#shuttlecockSpeeds').type('1'); cy.get('#shuttlecockPrice').clear().type('20');
    cy.get('#btnRecordGame').click();
    
    cy.contains('#summaryTableUnpaid tr', 'A').find('button').contains('จ่าย').click();
    cy.get('#summaryTablePaid').should('contain.text', 'A');
    cy.contains('#summaryTablePaid tr', 'A').find('button').contains('ยกเลิก').click();
    cy.get('#summaryTableUnpaid').should('contain.text', 'A');
    cy.get('#summaryTablePaid').should('not.contain.text', 'A');
  });

  it('ทดสอบปุ่มชำระทั้งหมดในหน้าบัญชีรวม (Pay All Unpaid)', () => {
    const players = ['A', 'B', 'C', 'D'];
    players.forEach(p => { cy.addPlayer(p); });
    cy.get('#player1').select('A'); cy.get('#player2').select('B');
    cy.get('#player3').select('C'); cy.get('#player4').select('D');
    cy.get('#shuttlecockSpeeds').type('1'); cy.get('#shuttlecockPrice').clear().type('20');
    cy.get('#btnRecordGame').click();
    
    cy.get('#btnConfirmSave').click(); cy.get('.swal2-confirm').click();
    cy.get('button[data-tab="account"]').click();
    cy.get('#btnPayAllUnpaid').click(); cy.get('.swal2-confirm').click();
    cy.get('#total-unpaid-overall').should('have.text', '฿0.00');
  });

  it('ทดสอบระบบบัญชี: การจ่ายเงินเกินยอดหนี้จนเกิดเป็นเครดิต (Overpayment)', () => {
    const players = ['A', 'B', 'C', 'D'];
    players.forEach(p => { cy.addPlayer(p); });
    cy.get('#player1').select('A'); cy.get('#player2').select('B');
    cy.get('#player3').select('C'); cy.get('#player4').select('D');
    cy.get('#shuttlecockSpeeds').type('1'); cy.get('#shuttlecockPrice').clear().type('20'); // หาร 4 = คนละ 5 บาท
    cy.get('#btnRecordGame').click();
    
    cy.get('#btnConfirmSave').click(); cy.get('.swal2-confirm').click();
    cy.get('button[data-tab="account"]').click();
    
    cy.contains('#unpaid-list-overall div', 'A').find('button').contains('จ่าย').click();
    cy.get('#payment-amount').clear().type('20');
    cy.get('#btnSubmitPayment').click();
    
    cy.get('#credit-list-overall').should('contain.text', 'A');
    cy.get('#credit-list-overall').should('contain.text', 'เครดิต 15.00');
    cy.get('#total-credit-overall').should('have.text', '฿15.00');
  });

  it('ทดสอบการซิงก์ข้อมูลบัญชีอัตโนมัติ และตั้งหนี้มือเพิ่ม (Mixed Transactions)', () => {
    const players = ['A', 'B', 'C', 'D'];
    players.forEach(p => { cy.addPlayer(p); });
    cy.get('#player1').select('A'); cy.get('#player2').select('B');
    cy.get('#player3').select('C'); cy.get('#player4').select('D');
    cy.get('#shuttlecockSpeeds').type('1'); cy.get('#shuttlecockPrice').clear().type('40');
    cy.get('#btnRecordGame').click();

    cy.contains('#summaryTableUnpaid tr', 'A').find('button').contains('จ่าย').click();
    cy.get('button[data-tab="account"]').click();
    
    cy.get('#paid-in-full-list-overall').should('contain.text', 'A');
    
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('A'); cy.get('#debt-amount').type('50');
    cy.get('#btnSubmitDebt').click();

    cy.contains('#unpaid-list-overall div', 'A').should('contain.text', 'ค้าง 50.00');
    cy.get('#total-unpaid-overall').should('have.text', '฿80.00');
  });

  it('ทดสอบการป้องกันค่ายอดเงินติดลบ (Negative Inputs)', () => {
    cy.addPlayer('สายเปย์');
    cy.get('button[data-tab="account"]').click();
    
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('สายเปย์');
    cy.get('#debt-amount').type('-500');
    cy.get('#btnSubmitDebt').click();
    
    cy.get('#debt-modal').should('not.have.class', 'hidden');
  });

  it('ทดสอบฟีเจอร์ QR Code พร้อมเพย์ ในหน้าต่างชำระเงิน', () => {
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingPromptPay').type('0812345678').blur();

    cy.get('button[data-tab="account"]').click();
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('นักสแกน'); cy.get('#debt-amount').type('150.50');
    cy.get('#btnSubmitDebt').click();

    cy.contains('#unpaid-list-overall div', 'นักสแกน').find('button').contains('จ่าย').click();
    cy.get('#qr-container').should('not.have.class', 'hidden');
    cy.get('#promptpay-qr').should('have.attr', 'src').and('include', '150.50');

    cy.get('#payment-amount').clear().type('100');
    cy.get('#promptpay-qr').should('have.attr', 'src').and('include', '100.00');
  });
});