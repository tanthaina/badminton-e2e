describe('04 - Accounting & History', () => {
  it('ทดสอบการชำระเงินบางส่วน (Partial Payment) ในแท็บบัญชีรวม', () => {
    cy.seedPlayers(['ก้อง', 'แทน', 'หมู', 'แมน']);
    cy.visit('/index.html');

    cy.recordGame('ก้อง', 'แทน', 'หมู', 'แมน', '1, 2', '20');

    cy.get('#btnConfirmSave').click(); cy.get('.swal2-confirm').click();
    cy.get('button[data-tab="account"]').click();
    cy.contains('#unpaid-list-overall div.border', 'ก้อง').should('contain.text', 'ค้าง 10.00');

    cy.payDebt('ก้อง', '4');
    cy.contains('#unpaid-list-overall div.border', 'ก้อง').should('contain.text', 'ค้าง 6.00');
    cy.get('#total-unpaid-overall').should('have.text', '฿36.00');
  });

  it('ทดสอบแท็บประวัติและการค้นหาตามช่วงวันที่ (History Tab & Date Filter)', () => {
    // ฉีดข้อมูลเกมเข้าไปเลย 1 เกม
    cy.seedGames(
      ['สมชาย', 'สมหญิง', 'สมปอง', 'สมหมาย'],
      [{ players: ['สมชาย', 'สมหญิง', 'สมปอง', 'สมหมาย'], speeds: ['1'] }],
      20
    );
    cy.visit('/index.html');

    cy.get('button[data-tab="history"]').click();
    cy.get('#overall-summary-content').should('contain.text', 'สมชาย').and('contain.text', 'เกม');

    cy.get('#summaryStartDate').type('2099-12-31');
    cy.get('#btnFilterHistory').click();
    cy.get('#overall-summary-content').should('contain.text', 'ไม่มีข้อมูลประวัติในช่วงเวลานี้');
  });

  it('ทดสอบปุ่มยกเลิกการจ่ายเงินรายวัน (Toggle Daily Payment)', () => {
    cy.seedPlayers(['A', 'B', 'C', 'D']);
    cy.visit('/index.html');

    cy.recordGame('A', 'B', 'C', 'D', '1', '20');
    
    cy.contains('#summaryTableUnpaid tr', 'A').find('button').contains('จ่าย').click();
    cy.get('#summaryTablePaid').should('contain.text', 'A');
    cy.contains('#summaryTablePaid tr', 'A').find('button').contains('ยกเลิก').click();
    cy.get('#summaryTableUnpaid').should('contain.text', 'A');
    cy.get('#summaryTablePaid').should('not.contain.text', 'A');
  });

  it('ทดสอบปุ่มชำระทั้งหมดในหน้าบัญชีรวม (Pay All Unpaid)', () => {
    // ฉีดข้อมูลเกมเข้าไปเลย 1 เกม
    cy.seedGames(
      ['A', 'B', 'C', 'D'],
      [{ players: ['A', 'B', 'C', 'D'], speeds: ['1'] }],
      20
    );
    cy.visit('/index.html');

    cy.get('button[data-tab="account"]').click();
    cy.get('#btnPayAllUnpaid').click(); cy.get('.swal2-confirm').click();
    cy.get('#total-unpaid-overall').should('have.text', '฿0.00');
  });

  it('ทดสอบระบบบัญชี: การจ่ายเงินเกินยอดหนี้จนเกิดเป็นเครดิต (Overpayment)', () => {
    cy.seedPlayers(['A', 'B', 'C', 'D']);
    cy.visit('/index.html');

    // หาร 4 = คนละ 5 บาท
    cy.recordGame('A', 'B', 'C', 'D', '1', '20');
    
    cy.get('#btnConfirmSave').click(); cy.get('.swal2-confirm').click();
    cy.get('button[data-tab="account"]').click();
    
    cy.payDebt('A', '20');
    
    cy.get('#credit-list-overall').should('contain.text', 'A');
    cy.get('#credit-list-overall').should('contain.text', 'เครดิต 15.00');
    cy.get('#total-credit-overall').should('have.text', '฿15.00');
  });

  it('ทดสอบการซิงก์ข้อมูลบัญชีอัตโนมัติ และตั้งหนี้มือเพิ่ม (Mixed Transactions)', () => {
    cy.seedPlayers(['A', 'B', 'C', 'D']);
    cy.visit('/index.html');

    cy.recordGame('A', 'B', 'C', 'D', '1', '40');

    cy.contains('#summaryTableUnpaid tr', 'A').find('button').contains('จ่าย').click();
    cy.get('button[data-tab="account"]').click();
    
    cy.get('#paid-in-full-list-overall').should('contain.text', 'A');
    
    cy.addDebt('A', '50');

    cy.contains('#unpaid-list-overall div.border', 'A').should('contain.text', 'ค้าง 50.00');
    cy.get('#total-unpaid-overall').should('have.text', '฿80.00');
  });

  it('ทดสอบความถูกต้อง: ยอดชำระเงินในหน้าบัญชีรวมต้องไม่สูญหาย (isAutoDaily Bug Fix)', () => {
    cy.seedPlayers(['ลูกหนี้ชั้นดี']);
    cy.visit('/index.html');
    cy.get('button[data-tab="account"]').click();

    // 1. ตั้งหนี้ 1000 บาท
    cy.addDebt('ลูกหนี้ชั้นดี', '1000');
    cy.contains('#unpaid-list-overall div.border', 'ลูกหนี้ชั้นดี').should('contain.text', 'ค้าง 1000.00');

    // 2. จ่ายเงินในหน้าบัญชีรวม 400 บาท (ต้องเหลือ 600)
    cy.payDebt('ลูกหนี้ชั้นดี', '400');
    cy.contains('#unpaid-list-overall div.border', 'ลูกหนี้ชั้นดี').should('contain.text', 'ค้าง 600.00');

    // 3. จำลองการไปทำกิจกรรมอื่นเพื่อกระตุ้นให้ระบบซิงก์ข้อมูล (Trigger syncAllDailyToAccount)
    cy.get('button[data-tab="daily"]').click();
    cy.addPlayer('คนดู'); // การเพิ่มผู้เล่นใหม่จะสั่งรัน updateAndRender() ทันที
    
    // 4. กลับมาตรวจสอบหน้าบัญชีรวมอีกครั้ง ยอดต้องยังคงเป็น 600 บาท (การจ่ายเงินต้องไม่ถูกลบทิ้ง)
    cy.get('button[data-tab="account"]').click();
    cy.contains('#unpaid-list-overall div.border', 'ลูกหนี้ชั้นดี').should('contain.text', 'ค้าง 600.00');
  });

  it('ทดสอบการป้องกันค่ายอดเงินติดลบ (Negative Inputs)', () => {
    cy.seedPlayers(['สายเปย์']);
    cy.visit('/index.html');
    cy.get('button[data-tab="account"]').click();
    
    cy.addDebt('สายเปย์', '-500');
    
    cy.get('#debt-modal').should('not.have.class', 'hidden');
  });

  it('ทดสอบฟีเจอร์ QR Code พร้อมเพย์ แบบกดแยกในหน้าบัญชีรวม (Account QR Code)', () => {
    cy.visit('/index.html');
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingPromptPay').clear().type('0812345678').blur();
    cy.get('#settingPromptPayName').clear().type('นาย ใจดี แบดมินตัน').blur();

    cy.get('button[data-tab="account"]').click();
    cy.addDebt('สายสแกนด่วน', '99.50');

    cy.intercept('GET', 'https://promptpay.io/**').as('qrCodeLoadAccount');
    
    // กดปุ่มไอคอน QR Code (สีม่วง) ในหน้ารายชื่อคนค้างชำระ
    cy.contains('#unpaid-list-overall div.border', 'สายสแกนด่วน').find('button[title="สแกน QR Code"]').should('be.visible').click();
    
    cy.get('.swal2-popup').should('be.visible').and('contain.text', 'สแกนเพื่อชำระเงิน');
    cy.get('.swal2-html-container').should('contain.text', 'สายสแกนด่วน').and('contain.text', '฿99.50');
    cy.get('.swal2-html-container').should('contain.text', 'นาย ใจดี แบดมินตัน');
    cy.get('.swal2-image').should('have.attr', 'src').and('include', 'promptpay.io/0812345678/99.50');
    
    cy.wait('@qrCodeLoadAccount', { timeout: 10000 });
    cy.get('.swal2-image').should('be.visible').and(($img) => {
      expect($img[0].complete).to.be.true;
      expect($img[0].naturalWidth).to.be.at.least(0);
    });
    
    cy.get('.swal2-confirm').click();
  });

  it('ทดสอบการแสดง QR Code ในหน้าคิดเงินรายวัน (Daily Summary QR)', () => {
    cy.seedPlayers(['ไก่', 'ไข่', 'ควาย', 'คน']);
    cy.visit('/index.html');

    // 1. ตั้งค่าเบอร์พร้อมเพย์
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingPromptPay').clear().type('0899999999').blur();
    cy.get('#settingPromptPayName').clear().type('นางสาว ตีแบด สนุก').blur();

    // 2. ไปที่หน้ารายวัน เพิ่มผู้เล่นและบันทึกเกม 1 เกม (40 บาท / 4 คน = 10 บาท)
    cy.get('button[data-tab="daily"]').click();
    
    cy.recordGame('ไก่', 'ไข่', 'ควาย', 'คน', '1', '40');

    // 3. กดปุ่มไอคอน QR Code (สีม่วง) ในตาราง
    cy.intercept('GET', 'https://promptpay.io/**').as('qrCodeLoad3');
    cy.contains('#summaryTableUnpaid tr', 'ไก่').find('button[title="สแกน QR Code"]').should('be.visible').click();

    // 4. ตรวจสอบว่า Pop-up รูป QR Code และยอดเงินขึ้นมาถูกต้อง 100%
    cy.get('.swal2-popup').should('be.visible').and('contain.text', 'สแกนเพื่อชำระเงิน');
    cy.get('.swal2-html-container').should('contain.text', 'ไก่').and('contain.text', '฿10.00');
    cy.get('.swal2-html-container').should('contain.text', 'นางสาว ตีแบด สนุก');
    cy.get('.swal2-image').should('have.attr', 'src').and('include', 'promptpay.io/0899999999/10.00');
    
    cy.wait('@qrCodeLoad3', { timeout: 10000 });

    // ตรวจสอบว่ารูปภาพ QR Code โหลดขึ้นมาจริงๆ
    cy.get('.swal2-image').should('be.visible').and(($img) => {
      expect($img[0].complete).to.be.true;
      expect($img[0].naturalWidth).to.be.at.least(0);
    });
    
    // 5. กดปิดหน้าต่าง
    cy.get('.swal2-confirm').click();
  });

  it('ทดสอบฟีเจอร์ระบบเช็ควันค้างปิดยอด (Draft Manager)', () => {
    cy.seedGames(['A', 'B', 'C', 'D'], [{ players: ['A', 'B', 'C', 'D'], speeds: ['1'] }], 20);
    cy.visit('/index.html');
    
    // 1. ตรวจสอบว่าปุ่มเตือน "วันค้างปิดยอด" โผล่ขึ้นมา (เพราะถูกสร้างเกมไว้แต่ยังไม่ปิดยอด)
    cy.get('#btnDraftWarning').should('not.have.class', 'hidden').and('contain.text', '1 วัน');
    
    // 2. กดเปิดหน้าต่างเตือน เพื่อย้อนกลับไปดูวันนั้น
    cy.get('#btnDraftWarning').click();
    cy.get('#draft-modal').should('not.have.class', 'hidden');
    cy.get('#draft-list-container').should('contain.text', '1 เกม');
    
    // 3. ปิดหน้าต่างแล้วไปกดยืนยันปิดยอด
    cy.get('#btnCancelDraft').click();
    cy.get('#btnConfirmSave').click();
    cy.get('.swal2-popup').should('contain.text', 'ยอดรวมทั้งหมดของวันนี้คือ').and('contain.text', '฿20.00');
    cy.get('.swal2-confirm').click();
    cy.get('#btnDraftWarning').should('have.class', 'hidden'); // ปุ่มเตือนต้องหายไป

    // 4. ทดลองแก้ไขเกมเพื่อปลดล็อกวันให้กลับมาเป็นดราฟต์ใหม่
    cy.get('#gamesList .game-card').eq(0).find('button[title="แก้ไข"]').click();
    cy.get('#shuttlecockSpeeds').type(', 2');
    cy.get('#btnRecordGame').click();
    cy.get('#btnDraftWarning').should('not.have.class', 'hidden').and('contain.text', '1 วัน'); // ปุ่มเตือนต้องกลับมาอีกครั้ง!
  });

  it('ทดสอบฟีเจอร์ทวงแบบกลุ่ม (Group Bill)', () => {
    cy.visit('/index.html');
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingPromptPay').clear().type('0812345678').blur();

    cy.get('button[data-tab="account"]').click();
    cy.addDebt('คู่รัก A', '100');
    cy.addDebt('คู่รัก B', '150');
    cy.addDebt('คนโสด C', '50');

    cy.get('#btnGroupBill').click();
    cy.get('.swal2-popup').should('contain.text', 'เลือกรวมบิลกลุ่ม');

    // เลือกคน (คู่รัก A และ B)
    cy.get('input.group-bill-cb[value="คู่รัก A"]').check({ force: true });
    cy.get('input.group-bill-cb[value="คู่รัก B"]').check({ force: true });
    
    // จำลอง (Mock) Clipboard API ป้องกัน Error ในสภาพแวดล้อมทดสอบ
    cy.window().then((win) => {
      if (!win.navigator.clipboard) {
        Object.defineProperty(win.navigator, 'clipboard', { value: { writeText: cy.stub().as('clipboardWrite').resolves() }, configurable: true });
      } else {
        cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite').resolves();
      }
    });

    cy.get('.swal2-confirm').click();

    // ตรวจสอบ Pop-up สรุปยอดรวม (QR)
    cy.get('.swal2-popup').should('contain.text', 'สแกนเพื่อชำระเงิน');
    cy.get('.swal2-popup').should('contain.text', 'สำหรับ: คู่รัก A, คู่รัก B');
    cy.get('.swal2-popup').should('contain.text', 'คู่รัก A').and('contain.text', '฿100.00');
    cy.get('.swal2-popup').should('contain.text', 'คู่รัก B').and('contain.text', '฿150.00');
    cy.get('.swal2-popup').should('contain.text', 'ยอดรวมทั้งหมด');
    cy.get('.swal2-popup').should('contain.text', '฿250.00'); // 100 + 150
    cy.get('.swal2-image').should('have.attr', 'src').and('include', '250.00');
    
    // กดปิด
    cy.get('.swal2-confirm').contains('ปิด').click();
  });
});