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