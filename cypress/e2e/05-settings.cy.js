describe('05 - Settings & Data Integrity', () => {
  beforeEach(() => { cy.visit('/index.html'); });

  it('ทดสอบหน้าตั้งค่า: เปลี่ยนราคาลูกแบดเริ่มต้น (Default Price Sync)', () => {
    cy.get('button[data-tab="settings"]').click();
    cy.get('#tab-settings').should('not.have.class', 'hidden');

    cy.get('#settingDefaultPrice').clear().type('25').blur();
    cy.get('.swal2-popup').should('contain.text', 'บันทึกการตั้งค่าแล้ว');

    cy.get('button[data-tab="daily"]').click();
    cy.get('#shuttlecockPrice').should('have.value', '25');
  });

  it('ทดสอบหน้าตั้งค่า: การล้างข้อมูลทั้งหมด (Factory Reset)', () => {
    cy.addPlayer('สมชาย');
    cy.get('button[data-tab="settings"]').click();
    cy.get('#btnFactoryReset').click();
    cy.get('.swal2-confirm').click();
    cy.get('#playerList').children().should('have.length', 0);
  });

  it('ทดสอบ Data Integrity: ป้องกันหน้าเว็บพังเมื่อโหลดไฟล์ JSON ที่ชำรุด', () => {
    const invalidJson = "{ bad_format: true, missing_quotes_and_brackets }";
    cy.get('#loadFile').selectFile({ contents: Cypress.Buffer.from(invalidJson), fileName: 'bad-data.json', mimeType: 'application/json' }, { force: true });
    
    cy.get('.swal2-popup').should('be.visible');
    cy.get('.swal2-html-container').should('contain.text', 'ไฟล์ไม่ถูกต้องหรือชำรุด');
  });

  it('ทดสอบ Data Integrity: โหลดไฟล์ JSON เก่าที่มีการชำระเงินแบบแมนนวล (Legacy Data Migration)', () => {
    // จำลองโครงสร้างไฟล์ JSON จากเวอร์ชันเก่าที่ยังไม่มี property isAutoDaily
    const legacyJson = {
      masterPlayerList: ["สมปอง"],
      settings: { shuttlecockPrice: 20 },
      dailyData: {},
      allTransactions: [{ id: 1, date: "2023-01-01", name: "สมปอง", totalCost: 500 }], // ไม่มี isAutoDaily
      allPayments: [{ id: 2, date: "2023-01-01", name: "สมปอง", amount: 200 }] // ไม่มี isAutoDaily
    };
    
    cy.get('#loadFile').selectFile({ contents: Cypress.Buffer.from(JSON.stringify(legacyJson)), fileName: 'legacy.json', mimeType: 'application/json' }, { force: true });
    
    cy.get('.swal2-popup').should('contain.text', 'โหลดข้อมูลสำเร็จ!');
    
    cy.get('button[data-tab="account"]').click();
    cy.contains('#unpaid-list-overall div.border', 'สมปอง').should('contain.text', 'ค้าง 300.00'); // 500 - 200 = 300
    cy.get('button[data-tab="history"]').click();
    cy.get('#overall-summary-content').should('contain.text', 'สมปอง').and('contain.text', 'ชำระเงิน').and('contain.text', '200.00');
  });

  it('ทดสอบ Data Migration: โหลดไฟล์ JSON จริงที่มีข้อมูลซับซ้อน (2026-06-15) ยอดต้องไม่เบิ้ลและคำนวณถูก', () => {
    // โหลดไฟล์จาก Fixture (ต้องมีไฟล์ badminton-2026-06-15.json ใน cypress/fixtures/)
    cy.fixture('badminton-2026-06-15.json').then((fileContent) => {
      cy.get('#loadFile').selectFile({ contents: Cypress.Buffer.from(JSON.stringify(fileContent)), fileName: 'badminton-2026-06-15.json', mimeType: 'application/json' }, { force: true });
    });
    
    cy.get('.swal2-popup').should('contain.text', 'โหลดข้อมูลสำเร็จ!');
    
    cy.get('button[data-tab="account"]').click();
    // ตาคลี: ต้อม ต้องจ่ายครบพอดี (หนี้เก่า 364 + ตีเพิ่มรวม 78 - จ่าย 416 - จ่าย 26 = 0)
    cy.get('#paid-in-full-list-overall').should('contain.text', 'ตาคลี: ต้อม');
    // ตากฟ้า: พี่ชัย ต้องมีเครดิต 742 (ตีหลายวัน 312 + หนี้เก่า 53 - จ่าย 1000 - จ่าย 107 = -742)
    cy.get('#credit-list-overall').contains('div.border', 'ตากฟ้า: พี่ชัย').should('contain.text', 'เครดิต 742.00');
  });

  it('ทดสอบ Data Cleansing: ล้างบิลผีและซ่อมแซมข้อมูลวันที่ (Undefined Date Bug)', () => {
    const corruptedJson = {
      masterPlayerList: ["เหยื่อบั๊ก"],
      settings: { shuttlecockPrice: 20 },
      dailyData: {
        "undefined": { players: [{name: "เหยื่อบั๊ก", paid: false}], games: [{ players: ["เหยื่อบั๊ก", "A", "B", "C"], shuttlecocksUsed: 2, shuttlecockPrice: 20 }] }
      },
      allTransactions: [{ id: 1, date: "undefined", name: "เหยื่อบั๊ก", totalCost: 999 }]
    };
    cy.get('#loadFile').selectFile({ contents: Cypress.Buffer.from(JSON.stringify(corruptedJson)), fileName: 'corrupted.json', mimeType: 'application/json' }, { force: true });
    
    cy.get('button[data-tab="history"]').click();
    cy.get('#overall-summary-content').should('not.contain.text', 'undefined'); // ไม่ควรมีคำว่า undefined ปรากฏในหัวบิล
    cy.get('#overall-summary-content').should('contain.text', 'เหยื่อบั๊ก');
  });

  it('ทดสอบการดาวน์โหลดไฟล์ข้อมูล (Export JSON Validation)', () => {
    cy.addPlayer('สมหมาย');
    
    cy.get('#btnSave').click();
    cy.get('.swal2-popup').should('contain.text', 'บันทึกไฟล์สำเร็จ');

    const dateStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    cy.readFile(`cypress/downloads/badminton-${dateStr}.json`).then((fileContent) => {
      expect(fileContent.masterPlayerList).to.include('สมหมาย');
    });
  });
});