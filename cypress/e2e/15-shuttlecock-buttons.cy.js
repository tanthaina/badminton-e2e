describe('15 - Shuttlecock Speed Buttons & Indicator', () => {
  beforeEach(() => {
    cy.visit('/index.html');
  });

  it('ทดสอบ 1: การกดเลือกเบอร์ลูกและแสดงผลบนหน้าจอ (Select & Deselect)', () => {
    // ตรวจสอบสถานะเริ่มต้น
    cy.get('#shuttlecockSpeedsDisplay').should('contain.text', 'คลิกเลือกเบอร์ลูกด้านล่าง');
    
    // กดปุ่มเบอร์ 3 และ 5
    cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', /^3$/).click();
    cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', /^5$/).click();
    
    // ตรวจสอบว่าปุ่มเปลี่ยนเป็นสถานะ Active
    cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', /^3$/).should('have.class', 'active');
    cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', /^5$/).should('have.class', 'active');
    
    // ตรวจสอบหน้าจอแสดงผล
    cy.get('#shuttlecockSpeedsDisplay').should('contain.text', '3').and('contain.text', '5');
    cy.get('#shuttlecockSpeeds').should('have.value', '3, 5');
    
    // กดปุ่ม 3 ซ้ำเพื่อเอาออก
    cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', /^3$/).click();
    cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', /^3$/).should('not.have.class', 'active');
    cy.get('#shuttlecockSpeedsDisplay').should('not.contain.text', '3').and('contain.text', '5');
  });

  it('ทดสอบ 2: ป้ายแจ้งเตือนลูกล่าสุด (Last Used Indicator) และโหมดแก้ไข (Edit Mode)', () => {
    cy.seedPlayers(['A', 'B', 'C', 'D']);
    cy.visit('/index.html');

    // ตรวจสอบตอนยังไม่มีเกม
    cy.get('#lastShuttlecockIndicator').should('be.empty');

    // บันทึกเกมที่ 1 ใช้ลูกเบอร์ 7, 8
    cy.recordGame('A', 'B', 'C', 'D', '7, 8', '20');

    // ตรวจสอบว่าปุ่มถูกรีเซ็ตกลับเป็นค่าเริ่มต้น
    cy.get('#shuttlecockSpeedsDisplay').should('contain.text', 'คลิกเลือกเบอร์ลูกด้านล่าง');
    cy.get('.shuttle-speed-btn.active').should('have.length', 0);
    
    // ตรวจสอบป้ายบอกลูกล่าสุด ว่าระบุเป็นเบอร์ 8 (เบอร์สูงสุดใน 7, 8)
    cy.get('#lastShuttlecockIndicator').should('contain.text', 'ลูกล่าสุด:').and('contain.text', '8');

    // ลองกดปุ่มแก้ไขเกม
    cy.get('#gamesList .game-card').eq(0).find('button[title="แก้ไข"]').click();
    
    // ตรวจสอบว่าปุ่มเบอร์ 7 และ 8 กลับมา Active อีกครั้งในโหมดแก้ไข
    cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', /^7$/).should('have.class', 'active');
    cy.contains('#shuttlecockSpeedButtons .shuttle-speed-btn', /^8$/).should('have.class', 'active');
  });
});