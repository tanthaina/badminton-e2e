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

  it('ทดสอบ 3: ระบบค้นหาชื่อในหน้าประวัติ (History Name Search)', () => {
    // สร้างข้อมูลประวัติสำหรับ 2 คน
    cy.addPlayer('น้องก้อง');
    cy.addPlayer('น้องแทน');
    
    cy.get('button[data-tab="account"]').click();
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('น้องก้อง'); cy.get('#debt-amount').type('100'); cy.get('#btnSubmitDebt').click();
    
    cy.get('#btnAddDebt').click();
    cy.get('#debt-name').type('น้องแทน'); cy.get('#debt-amount').type('200'); cy.get('#btnSubmitDebt').click();

    // ไปที่แท็บประวัติ
    cy.get('button[data-tab="history"]').click();
    
    // ตอนแรกต้องเจอทั้ง 2 คน และยอดรวมต้องเป็น 300
    cy.get('#overall-summary-content').should('contain.text', 'น้องก้อง').and('contain.text', 'น้องแทน');
    cy.get('#history-total-cost').should('contain.text', '฿300.00');

    // พิมพ์ค้นหาชื่อ "น้องก้อง"
    cy.get('#summarySearchName').type('น้องก้อง');
    
    // ตารางต้องเหลือแค่น้องก้อง (ไม่เห็นน้องแทน) และยอดรวมต้องอัปเดตเหลือ 100 แบบเรียลไทม์
    cy.get('#overall-summary-content').should('contain.text', 'น้องก้อง').and('not.contain.text', 'น้องแทน');
    cy.get('#history-total-cost').should('contain.text', '฿100.00');
  });

  it('ทดสอบ 4: ฟีเจอร์สรุปยอดรวมรายเดือน (Monthly Report)', () => {
    cy.visit('/index.html');
    
    // จำลองการตั้งหนี้และจ่ายเงินแบบข้ามเดือน โดยยัดลง LocalStorage โดยตรง
    const mockState = {
      masterPlayerList: ["สายเปย์"],
      allTransactions: [
        { id: 1, date: "2024-01-15", name: "สายเปย์", totalCost: 500, isAutoDaily: false },
        { id: 2, date: "2024-02-10", name: "สายเปย์", totalCost: 300, isAutoDaily: false }
      ],
      allPayments: [
        { id: 3, date: "2024-01-20", name: "สายเปย์", amount: 600, isAutoDaily: false }
      ],
      dailyData: {},
      settings: { shuttlecockPrice: 20 }
    };
    cy.window().then((win) => { win.localStorage.setItem('badmintonAppState_v2', JSON.stringify(mockState)); });
    cy.reload();

    cy.get('button[data-tab="history"]').click();
    
    // ตรวจสอบกล่องสรุปรายเดือน
    cy.get('#monthly-summary-container').should('not.have.class', 'hidden');
    cy.get('#monthly-summary-container').should('contain.text', 'ม.ค. 2024').and('contain.text', '+฿100.00'); // จ่าย 600 - ใช้ 500
    cy.get('#monthly-summary-container').should('contain.text', 'ก.พ. 2024').and('contain.text', '-฿300.00'); // ใช้ 300
  });
});