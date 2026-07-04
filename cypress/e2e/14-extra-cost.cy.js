describe('14 - Individual Extra Expense (ค่าจิปาถะ)', () => {
  beforeEach(() => {
    cy.visit('/index.html');
  });

  it('ทดสอบ 1: เพิ่มและลบค่าจิปาถะในหน้าคิดเงินรายวัน', () => {
    cy.seedPlayers(['กิตติ', 'สมเกียรติ', 'แมน', 'หมู']);
    cy.visit('/index.html'); 
    
    // บันทึก 1 เกม (รวม 40 บาท -> ตกคนละ 10 บาท)
    cy.recordGame('กิตติ', 'สมเกียรติ', 'แมน', 'หมู', '1', '40'); 
    
    // เพิ่มค่าจิปาถะให้ "กิตติ" 15 บาท
    cy.contains('#summaryTableUnpaid tr', 'กิตติ').find('.group').click();
    cy.get('.swal2-popup').should('contain.text', 'ค่าจิปาถะ: กิตติ');
    cy.get('#extraCostInput').clear().type('15');
    cy.get('.swal2-confirm').click();

    // ตรวจสอบ UI: ยอดของกิตติต้องเป็น 25.00 และมีป้าย +15
    cy.contains('#summaryTableUnpaid tr', 'กิตติ').should('contain.text', '+15');
    cy.contains('#summaryTableUnpaid tr', 'กิตติ').should('contain.text', '25.00');
    cy.get('#grandTotal').should('have.text', '55.00'); // ยอดรวมทั้งหมด 40 + 15 = 55

    // ทดสอบการกดยกเลิก/ล้างยอด (Clear)
    cy.contains('#summaryTableUnpaid tr', 'กิตติ').find('.group').click();
    cy.get('.swal2-deny').contains('ล้างยอด').click();

    // ยอดต้องกลับมาเป็น 10.00 และป้าย +15 ต้องหายไป
    cy.contains('#summaryTableUnpaid tr', 'กิตติ').should('not.contain.text', '+15');
    cy.contains('#summaryTableUnpaid tr', 'กิตติ').should('contain.text', '10.00');
    cy.get('#grandTotal').should('have.text', '40.00');
  });

  it('ทดสอบ 2: ซิงก์ค่าจิปาถะลงบัญชีรวมและตรวจสอบหน้าใบเสร็จ (Personal Slip)', () => {
    const today = '2024-01-01';
    // จำลองสถานการณ์: มี 1 เกม (คนละ 10 บาท) และ A มีค่าจิปาถะ 20 บาท
    cy.seedSessionState('extraCostSync', { masterPlayerList: ['A', 'B', 'C', 'D'], dailyData: { [today]: { players: [ { name: 'A', paid: false, present: true, extraCost: 20 }, { name: 'B', paid: false, present: true }, { name: 'C', paid: false, present: true }, { name: 'D', paid: false, present: true } ], games: [{ id: 1, players: ['A', 'B', 'C', 'D'], shuttlecocksUsed: 1, shuttlecockPrice: 40, shuttlecockSpeeds: ['1'] }] } }, settings: { shuttlecockPrice: 40 } });
    cy.mockTime(today + 'T12:00:00Z');
    cy.visit('/index.html');

    // 1. ตรวจสอบในหน้าบัญชีรวมว่าหนี้ถูกรวมถูกต้อง (A = ค่าเกม 10 + จิปาถะ 20 = 30 บาท)
    cy.get('button[data-tab="account"]').click();
    cy.contains('#unpaid-list-overall > div', 'A').should('contain.text', 'ค้าง 30.00');

    // ตรวจสอบว่ามีปุ่ม "คัดลอกข้อความ LINE" โผล่ขึ้นมาด้วย
    cy.contains('#unpaid-list-overall > div', 'A')
      .find('button[title="คัดลอกข้อความ LINE"]').should('be.visible');

    // 2. จำลองการกดแชร์ใบเสร็จ และตรวจสอบว่าบิลมีการแจกแจงค่าจิปาถะให้เห็น
    cy.contains('#unpaid-list-overall > div', 'A').find('button[title="แชร์/บันทึกใบเสร็จ"]').click();
    cy.get('#slip-template').should('contain.text', '+ จิปาถะ 20 บ.');
    cy.get('#slip-total').should('have.text', '฿30.00');
  });

  it('ทดสอบ 3: ลบค่าจิปาถะแล้ว ยอดรวมใน QR Code กลุ่มต้องลดลงตาม (Daily Group Bill)', () => {
    cy.seedPlayers(['กิตติ', 'สมเกียรติ', 'แมน', 'หมู']);
    cy.visit('/index.html');

    // 1. ตั้งค่าพร้อมเพย์เพื่อไม่ให้ติดแจ้งเตือนตอนกดเปิด QR Code
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingPromptPay').clear().type('0812345678').blur();
    cy.get('button[data-tab="daily"]').click();

    // 2. บันทึกเกม 1 เกม (40 บาท -> คนละ 10 บาท)
    cy.recordGame('กิตติ', 'สมเกียรติ', 'แมน', 'หมู', '1', '40');

    // 3. เพิ่มค่าจิปาถะให้กิตติ (+20) และ สมเกียรติ (+15)
    cy.contains('#summaryTableUnpaid tr', 'กิตติ').find('.group').click();
    cy.get('#extraCostInput').clear().type('20'); cy.get('.swal2-confirm').click();
    
    cy.contains('#summaryTableUnpaid tr', 'สมเกียรติ').find('.group').click();
    cy.get('#extraCostInput').clear().type('15'); cy.get('.swal2-confirm').click();

    // 4. ทดลองรวมบิลกลุ่ม (กิตติ 30 + สมเกียรติ 25 = 55 บาท)
    cy.get('#btnDailyGroupBill').click();
    cy.get('input.daily-group-bill-cb[value="กิตติ"]').check({ force: true });
    cy.get('input.daily-group-bill-cb[value="สมเกียรติ"]').check({ force: true });
    cy.get('.swal2-confirm').contains('รวมบิล').click();

    // ตรวจสอบยอดก่อนลบ
    cy.get('.swal2-popup').should('contain.text', 'ยอดรวมทั้งหมด: ฿55.00');
    cy.get('.swal2-cancel').contains('ปิด').click();

    // 5. ล้างยอดค่าจิปาถะของ "กิตติ" ออก (ยอดกิตติต้องกลับเป็น 10)
    cy.contains('#summaryTableUnpaid tr', 'กิตติ').find('.group').click();
    cy.get('.swal2-deny').contains('ล้างยอด').click();

    // 6. รวมบิลกลุ่มอีกครั้ง (กิตติ 10 + สมเกียรติ 25 = 35 บาท)
    cy.get('#btnDailyGroupBill').click();
    cy.get('input.daily-group-bill-cb[value="กิตติ"]').check({ force: true });
    cy.get('input.daily-group-bill-cb[value="สมเกียรติ"]').check({ force: true });
    cy.get('.swal2-confirm').contains('รวมบิล').click();

    // ตรวจสอบว่ายอดใน QR Code ปรับลดลงถูกต้อง
    cy.get('.swal2-popup').should('contain.text', 'ยอดรวมทั้งหมด: ฿35.00');
  });

  it('ทดสอบ 4: ดูรายละเอียดค้างชำระและค่าจิปาถะในหน้าบัญชีรวม', () => {
    const today = '2024-01-01';
    // จำลอง State ที่มีการบันทึกเกมและมีค่าจิปาถะค้างไว้
    cy.seedSessionState('debtDetailsTest', {
      masterPlayerList: ['กิตติ', 'สมเกียรติ', 'แมน', 'หมู'],
      dailyData: {
        [today]: {
          players: [
            { name: 'กิตติ', paid: false, present: true, extraCost: 15 },
            { name: 'สมเกียรติ', paid: false, present: true },
            { name: 'แมน', paid: false, present: true },
            { name: 'หมู', paid: false, present: true }
          ],
          games: [{
            id: 1, players: ['กิตติ', 'สมเกียรติ', 'แมน', 'หมู'],
            shuttlecocksUsed: 1, shuttlecockPrice: 40, shuttlecockSpeeds: ['1']
          }]
        }
      },
      allTransactions: [
        { id: 1, date: today, name: 'กิตติ', totalCost: 25, isAutoDaily: true },
        { id: 2, date: today, name: 'สมเกียรติ', totalCost: 10, isAutoDaily: true }
      ],
      settings: { shuttlecockPrice: 40 }
    });
    cy.mockTime(today + 'T12:00:00Z');
    cy.visit('/index.html');

    // 1. ไปที่หน้าบัญชีรวม แล้วคลิกที่ชื่อเพื่อดูรายละเอียดค้างชำระของ "กิตติ"
    cy.get('button[data-tab="account"]').click();
    cy.contains('#unpaid-list-overall > div', 'กิตติ').find('.cursor-pointer').click();

    // 2. ตรวจสอบข้อมูลใน Pop-up ว่าแจกแจงรายละเอียดและมีค่าจิปาถะแสดงอยู่จริง
    cy.get('.swal2-popup').should('contain.text', 'รายละเอียดค้างชำระ');
    cy.get('.swal2-html-container').should('contain.text', 'กิตติ')
      .and('contain.text', 'ยอดค้างรวม: ฿25.00')
      .and('contain.text', today)
      .and('contain.text', 'ตี 1 เกม')
      .and('contain.text', '+ จิปาถะ 15 บ.');

    // 3. กดปิดหน้าต่าง
    cy.get('.swal2-confirm').contains('ปิดหน้าต่าง').click({ force: true });
  });
});