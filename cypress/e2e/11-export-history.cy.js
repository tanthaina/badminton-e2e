describe('11 - History Summary & CSV Export', () => {
  beforeEach(() => { cy.visit('/index.html'); });

  it('ทดสอบ 1: แจ้งเตือนเมื่อกดส่งออกโดยไม่มีข้อมูลประวัติ', () => {
    cy.get('button[data-tab="history"]').click();
    cy.get('#btnExportHistoryCSV').click();
    
    // ต้องมีแจ้งเตือนขึ้นมา และไฟล์ต้องไม่ถูกดาวน์โหลด
    cy.get('.swal2-popup').should('contain.text', 'ไม่มีข้อมูลประวัติให้ส่งออกในช่วงเวลานี้');
  });

  it('ทดสอบ 2: กล่องสรุปยอดรวม และการดาวน์โหลดไฟล์ CSV ถูกต้อง', () => {
    // จำลองการตั้งหนี้เพื่อสร้างข้อมูลประวัติ
    cy.addPlayer('น้องประวัติ');
    cy.get('button[data-tab="account"]').click();
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('น้องประวัติ'); cy.get('#debt-amount').type('999.99');
    cy.get('#btnSubmitDebt').click();

    // ไปที่แท็บประวัติ
    cy.get('button[data-tab="history"]').click();
    cy.get('#overall-summary-content').should('contain.text', 'น้องประวัติ');

    // ตรวจสอบว่ากล่องสรุปยอดรวม (Summary Box) แสดงผลถูกต้อง
    cy.get('#history-summary-box').should('not.have.class', 'hidden');
    cy.get('#history-total-cost').should('contain.text', '฿999.99');

    // กดปุ่มส่งออก CSV
    cy.get('#btnExportHistoryCSV').click();

    // ตรวจสอบว่าไฟล์ถูกดาวน์โหลดลงเครื่อง และอ่านเนื้อหาข้างในไฟล์เพื่อเช็คความถูกต้อง
    const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    cy.readFile(`cypress/downloads/history-${todayStr}.csv`).should('contain', 'น้องประวัติ').and('contain', '999.99').and('contain', 'วันที่,ประเภท,ชื่อ,ยอดเงิน (บาท)');
  });
});