describe('04 - Accounting & History', () => {
  it('ทดสอบการชำระเงินบางส่วน (Partial Payment) ในแท็บบัญชีรวม', () => {
    const players = ['ก้อง', 'แทน', 'หมู', 'แมน'];
    // 1. ตั้งค่า State เริ่มต้น: ผู้เล่นทุกคนมีหนี้คนละ 10 บาท
    cy.seedSessionState('partialPaymentSetup', {
      masterPlayerList: players,
      allTransactions: players.map((player, index) => ({
        id: index + 1,
        date: '2024-01-01',
        name: player,
        totalCost: 10,
        isAutoDaily: false
      }))
    });

    cy.visit('/index.html');
    cy.get('button[data-tab="account"]').click();

    // 2. ตรวจสอบว่า 'ก้อง' มีหนี้ 10 บาท และยอดรวมหนี้คือ 40 บาท
    cy.contains('#unpaid-list-overall div.border', 'ก้อง').should('contain.text', 'ค้าง 10.00');
    cy.get('#total-unpaid-overall').should('have.text', '฿40.00');

    // 3. จ่ายเงินบางส่วน (จ่าย 4 บาท)
    cy.payDebt('ก้อง', '4');

    // 4. ตรวจสอบว่า 'ก้อง' เหลือหนี้ 6 บาท และยอดรวมหนี้ลดลงเหลือ 36 บาท
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
    // 1. ตั้งค่า State เริ่มต้น: ผู้เล่น A มีหนี้ 5 บาท
    cy.seedSessionState('overpaymentSetup', {
      masterPlayerList: ['A', 'B', 'C', 'D'],
      allTransactions: [
        { id: 1, date: '2024-01-01', name: 'A', totalCost: 5, isAutoDaily: false }
      ]
    });

    cy.visit('/index.html');
    cy.get('button[data-tab="account"]').click();

    // 2. ตรวจสอบว่า A มีหนี้ 5 บาทจริง
    cy.contains('#unpaid-list-overall div.border', 'A').should('contain.text', 'ค้าง 5.00');

    // 3. จ่ายเงินเกินยอด (จ่าย 20)
    cy.payDebt('A', '20');
    
    // 4. ตรวจสอบว่า A มีเครดิต 15 บาท
    cy.contains('#credit-list-overall div.border', 'A').should('contain.text', 'เครดิต 15.00');
    cy.get('#total-credit-overall').should('have.text', '฿15.00');
    cy.get('#unpaid-list-overall').should('not.contain.text', 'A');
  });

  it('ทดสอบการซิงก์ข้อมูลบัญชีอัตโนมัติ และตั้งหนี้มือเพิ่ม (Mixed Transactions)', () => {
    const players = ['A', 'B', 'C', 'D'];
    const today = '2024-01-01';

    // 1. ตั้งค่า State เริ่มต้น: มีเกม 1 เกม และผู้เล่น A จ่ายเงินแล้ว
    cy.seedSessionState('mixedTxSetup', {
      masterPlayerList: players,
      dailyData: {
        [today]: {
          players: [
            { name: 'A', paid: true, present: true },
            { name: 'B', paid: false, present: true },
            { name: 'C', paid: false, present: true },
            { name: 'D', paid: false, present: true }
          ],
          games: [{
            id: 1,
            players: players,
            shuttlecocksUsed: 1,
            shuttlecockPrice: 40,
            shuttlecockSpeeds: ['1']
          }]
        }
      }
    });

    cy.mockTime(today + 'T12:00:00Z');
    cy.visit('/index.html');

    // 2. ไปที่หน้าบัญชีและตรวจสอบว่า State เริ่มต้นถูกต้อง (A จ่ายแล้ว, B, C, D ค้างคนละ 10 บาท)
    cy.get('button[data-tab="account"]').click();
    cy.get('#paid-in-full-list-overall').should('contain.text', 'A');
    
    // 3. เพิ่มหนี้ให้ A ด้วยตนเอง 50 บาท
    cy.addDebt('A', '50');

    // 4. ตรวจสอบผลลัพธ์: A ต้องย้ายมาอยู่ฝั่งค้างชำระด้วยยอด 50 บาท และยอดรวมค้างชำระต้องเป็น 80 บาท (B:10 + C:10 + D:10 + A:50)
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
    cy.get('#shuttlecockSpeeds').type(', 2', { force: true });
    cy.get('#btnRecordGame').click();
    cy.get('#btnDraftWarning').should('not.have.class', 'hidden').and('contain.text', '1 วัน'); // ปุ่มเตือนต้องกลับมาอีกครั้ง!
  });

  it('ทดสอบฟีเจอร์ทวงแบบกลุ่ม (Group Bill) และบันทึกการจ่ายเงิน', () => {
    // ใช้ cy.seedSessionState เพื่อจำลอง State ของหน้าบัญชีรวม
    cy.seedSessionState('groupBillSetup', {
      masterPlayerList: ['คู่รัก A', 'คู่รัก B', 'คนโสด C'],
      allTransactions: [
        { id: 1, date: '2024-01-01', name: 'คู่รัก A', totalCost: 100, isAutoDaily: false },
        { id: 2, date: '2024-01-01', name: 'คู่รัก B', totalCost: 150, isAutoDaily: false },
        { id: 3, date: '2024-01-01', name: 'คนโสด C', totalCost: 50, isAutoDaily: false }
      ],
      settings: {
        promptpayId: '0812345678'
      }
    });

    cy.visit('/index.html');
    cy.get('button[data-tab="account"]').click();

    // ตรวจสอบว่าทุกคนอยู่ในรายการค้างชำระก่อน
    cy.get('#unpaid-list-overall').should('contain.text', 'คู่รัก A').and('contain.text', 'คู่รัก B').and('contain.text', 'คนโสด C');

    cy.get('#btnGroupBill').click();
    cy.get('.swal2-popup').should('contain.text', 'เลือกรวมบิลกลุ่ม');

    // เลือกคน (คู่รัก A และ B)
    cy.get('input.group-bill-cb[value="คู่รัก A"]').check({ force: true });
    cy.get('input.group-bill-cb[value="คู่รัก B"]').check({ force: true });

    cy.get('.swal2-confirm').contains('รวมบิล').click();

    // ตรวจสอบ Pop-up สรุปยอดรวม (QR)
    cy.get('.swal2-popup').should('contain.text', 'สแกนเพื่อชำระเงิน');
    cy.get('.swal2-popup').should('contain.text', 'สำหรับ: คู่รัก A, คู่รัก B');
    cy.get('.swal2-popup').should('contain.text', 'คู่รัก A').and('contain.text', '฿100.00');
    cy.get('.swal2-popup').should('contain.text', 'คู่รัก B').and('contain.text', '฿150.00');
    cy.get('.swal2-popup').should('contain.text', 'ยอดรวมทั้งหมด: ฿250.00'); // 100 + 150
    cy.get('.swal2-image').should('have.attr', 'src').and('include', '250.00');
    
    // ตรวจสอบว่ามีปุ่มคัดลอกลง LINE อยู่ในหน้าจอ
    cy.get('#btnCopyGroupLine').should('be.visible').and('contain.text', 'คัดลอกข้อความส่ง LINE');

    // กดปุ่ม "บันทึกว่าจ่ายแล้ว"
    cy.get('.swal2-confirm').contains('บันทึกว่าจ่ายแล้ว').click();

    // ตรวจสอบ Toast และการอัปเดต UI
    cy.get('.swal2-toast').should('contain.text', 'บันทึกชำระเงินเรียบร้อย');

    // คู่รัก A และ B ต้องหายไปจากรายการค้างชำระ และไปอยู่ในรายการจ่ายครบแล้ว
    cy.get('#unpaid-list-overall').should('not.contain.text', 'คู่รัก A').and('not.contain.text', 'คู่รัก B');
    cy.get('#unpaid-list-overall').should('contain.text', 'คนโสด C'); // คนโสด C ต้องยังอยู่
    cy.get('#paid-in-full-list-overall').should('contain.text', 'คู่รัก A').and('contain.text', 'คู่รัก B');
  });

  it('ทดสอบการส่งออกรูปภาพหน้าบัญชีรวม (Export Account Image)', () => {
    // 1. Setup state ให้มีทั้งคนค้าง, มีเครดิต, และจ่ายครบแล้ว
    cy.seedSessionState('accountExportSetup', {
      masterPlayerList: ['คนค้าง', 'คนจ่ายครบ', 'คนมีเครดิต'],
      allTransactions: [
        { id: 1, date: '2024-01-01', name: 'คนค้าง', totalCost: 100, isAutoDaily: false },
        { id: 2, date: '2024-01-01', name: 'คนจ่ายครบ', totalCost: 50, isAutoDaily: false },
        { id: 3, date: '2024-01-01', name: 'คนมีเครดิต', totalCost: 200, isAutoDaily: false }
      ],
      allPayments: [
        { id: 4, date: '2024-01-01', name: 'คนจ่ายครบ', amount: 50, isAutoDaily: false },
        { id: 5, date: '2024-01-01', name: 'คนมีเครดิต', amount: 250, isAutoDaily: false }
      ]
    });
    cy.mockTime('2024-01-01T12:00:00Z');
    cy.visit('/index.html');
    cy.get('button[data-tab="account"]').click();

    // 2. กดปุ่ม "บันทึกรูปภาพ"
    cy.get('#btnExportAccountImg').click();
    cy.get('.swal2-popup').should('contain.text', 'กำลังสร้างรูป...');

    // 3. ตรวจสอบว่าไฟล์ถูกดาวน์โหลดลงเครื่องสำเร็จ
    const expectedFileName = 'account-2024-01-01.png';
    cy.readFile(`cypress/downloads/${expectedFileName}`, 'base64', { timeout: 15000 }).should('exist');
  });

  it('ทดสอบการเชื่อมโยงชำระเงินข้ามแท็บ (Auto-Reconcile Daily Debts)', () => {
    // 1. จำลองข้อมูล: ผู้เล่น 'สายเปย์' มียอดค้างชำระในหน้ารายวัน 40 บาท (1 เกม)
    const today = '2024-01-01';
    cy.seedSessionState('autoReconcileSetup', {
      masterPlayerList: ['สายเปย์', 'A', 'B', 'C'],
      dailyData: {
        [today]: {
          players: [
            { name: 'สายเปย์', paid: false, present: true },
            { name: 'A', paid: false, present: true },
            { name: 'B', paid: false, present: true },
            { name: 'C', paid: false, present: true }
          ],
          games: [{
            id: 1,
            players: ['สายเปย์', 'A', 'B', 'C'],
            shuttlecocksUsed: 1,
            shuttlecockPrice: 160,
            shuttlecockSpeeds: ['1']
          }],
          isClosed: false
        }
      }
    });

    cy.mockTime(today + 'T12:00:00Z');
    cy.visit('/index.html');

    // 2. ไปที่หน้าบัญชีรวม ตรวจสอบว่ามีหนี้ 40 บาท
    cy.get('button[data-tab="account"]').click();
    cy.contains('#unpaid-list-overall div.border', 'สายเปย์').should('contain.text', 'ค้าง 40.00');

    // 3. กดจ่ายเงิน 40 บาท
    cy.payDebt('สายเปย์', '40');

    // 4. ไปที่หน้ารายวัน ตรวจสอบว่า 'สายเปย์' เปลี่ยนสถานะเป็น 'จ่ายแล้ว' อัตโนมัติ
    cy.get('button[data-tab="daily"]').click();
    cy.contains('#summaryTablePaid tr', 'สายเปย์').should('exist');
    cy.contains('#summaryTablePaid tr', 'สายเปย์').should('contain.text', 'จ่ายแล้ว');

    // 5. กลับไปที่หน้าบัญชี ตรวจสอบว่าไม่มียอดค้างชำระ
    cy.get('button[data-tab="account"]').click();
    cy.get('#paid-in-full-list-overall').should('contain.text', 'สายเปย์');
  });
});