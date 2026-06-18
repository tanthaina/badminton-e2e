describe('ทดสอบระบบโปรแกรมคำนวณค่าลูกแบดมินตัน', () => {
  beforeEach(() => {
    // เปิดไฟล์ index.html ในโฟลเดอร์ root ของโปรเจกต์
    cy.visit('./index.html')
  })

  it('1. โหลดหน้าเว็บและแสดงหัวข้อได้ถูกต้อง', () => {
    cy.get('h1').contains('โปรแกรมคำนวณค่าลูกแบดมินตัน').should('be.visible')
    cy.get('.tab-btn.active').contains('คิดเงินรายวัน').should('be.visible')
  })

  it('2. สามารถเพิ่มรายชื่อผู้เล่นใหม่ได้', () => {
    // เลือกระบุ Prefix เป็น "ทั่วไป"
    cy.get('#newPlayerPrefix').select('ทั่วไป')
    cy.get('#newPlayerName').type('สมชาย')
    cy.get('#btnAddPlayer').click()

    // เลือกระบุ Prefix เป็น "ตากฟ้า"
    cy.get('#newPlayerPrefix').select('ตากฟ้า')
    cy.get('#newPlayerName').type('เมย์')
    cy.get('#btnAddPlayer').click()
    
    // ตรวจสอบว่ามีชื่อแสดงในรายชื่อผู้เล่น
    cy.get('#playerList').contains('.player-chip', 'สมชาย').should('be.visible')
    cy.get('#playerList').contains('.player-chip', 'เมย์').should('contain.text', 'ตากฟ้า').and('be.visible')
  })

  it('3. สามารถสลับแท็บใช้งานได้', () => {
    // สลับไปแท็บตั้งค่า
    cy.get('button[data-tab="settings"]').click()
    cy.get('#tab-settings').should('not.have.class', 'hidden')
    cy.get('#tab-daily').should('have.class', 'hidden')
  })

  it('4. สามารถบันทึกเกมและคำนวณเงินได้ถูกต้อง', () => {
    // สร้างผู้เล่น 4 คนสำหรับเทส
    const testPlayers = ['เอก', 'บอย', 'แคท', 'ดิว'];
    testPlayers.forEach(player => {
      cy.get('#newPlayerName').clear().type(player)
      cy.get('#btnAddPlayer').click()
    })

    // จัดผู้เล่นลงสนามและระบุเบอร์ลูกพร้อมราคา
    // (ใช้ 2 ลูก ราคา 25 บาท)
    cy.recordGame('เอก', 'บอย', 'แคท', 'ดิว', '1, 2', '25');

    // ตรวจสอบผลลัพธ์ว่าบันทึกเกมสำเร็จ
    cy.get('#shuttlecockSpeedSummary').contains('รวมเกม: 1 | รวมลูก: 2').should('be.visible')
    cy.get('#gamesList').contains('เกม 1').should('be.visible')
  })
})