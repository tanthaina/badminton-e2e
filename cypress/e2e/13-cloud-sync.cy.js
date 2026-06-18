describe('13 - Firebase Realtime Sync', () => {
  beforeEach(() => {
    cy.visit('/index.html');
  });

  it('ทดสอบ 1: สามารถเปลี่ยนชื่อกลุ่ม (Room ID) ได้และระบบจำค่า', () => {
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingSyncRoomId').clear().type('vip_group_99').blur();
    
    cy.get('.swal2-toast').should('contain.text', 'เปลี่ยนรหัสกลุ่มเรียบร้อย');
    cy.reload(); // รีเฟรชเพื่อดูว่าค่าเซฟลง LocalStorage หรือไม่
    
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingSyncRoomId').should('have.value', 'vip_group_99');
  });

  it('ทดสอบ 2: Factory Reset ต้องล้างค่ากลับเป็นค่าเริ่มต้น', () => {
    cy.visit('/index.html');
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingSyncRoomId').clear().type('custom_room_id').blur();
    cy.get('#btnFactoryReset').click();
    cy.get('.swal2-confirm').contains('ล้างข้อมูลเลย').click();
    
    cy.get('#settingSyncRoomId').should('have.value', 'badminton_default');
  });
});