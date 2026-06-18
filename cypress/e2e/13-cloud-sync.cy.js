describe('13 - Cloud Sync (Mock API)', () => {
  beforeEach(() => {
    // ป้องกัน Background Sync ทำงานทับซ้อนและสร้าง Race condition ในการเทส
    cy.intercept('GET', 'https://api.jsonbin.io/v3/b/*/latest', {
      statusCode: 200, body: { record: {} }
    }).as('globalBgCheck');
    cy.visit('/index.html');
  });

  it('ทดสอบ 1: แจ้งเตือนเมื่อกดซิงก์แต่ยังไม่ได้ตั้งค่า API Key และ Bin ID', () => {
    // ตรวจสอบปุ่ม Push
    cy.get('#btnPushCloud').click();
    cy.get('.swal2-popup').should('contain.text', 'ข้อมูลไม่ครบ')
      .and('contain.text', 'โปรดตั้งค่า Bin ID');
    cy.get('.swal2-confirm').click();

    // ตรวจสอบปุ่ม Pull
    cy.get('#btnPullCloud').click();
    cy.get('.swal2-popup').should('contain.text', 'ข้อมูลไม่ครบ');
  });

  it('ทดสอบ 2: ดักจับและจำลองการดันข้อมูลขึ้นคลาวด์สำเร็จ (Mock Push)', () => {
    // 1. ไปที่หน้าตั้งค่าและกรอกข้อมูล
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingSyncApiKey').clear().type('test_api_key', { delay: 0 }).blur();
    cy.get('#settingSyncBinId').clear().type('test_bin_id', { delay: 0 }).blur();

    // 2. ดักจับ (Intercept) API PUT request และสั่งให้ตอบ 200 OK ทันที
    cy.intercept('PUT', 'https://api.jsonbin.io/v3/b/test_bin_id', {
      statusCode: 200,
      body: { success: true, parentId: 'test_bin_id' }
    }).as('pushCloudReq');

    // 3. กดปุ่มซิงก์
    cy.get('#btnPushCloud').click();

    // 4. รอจนกว่า Request จะวิ่งออกไป และตรวจสอบว่า Payload มีข้อมูลถูกต้อง
    cy.wait('@pushCloudReq').its('request.body').should('have.property', 'masterPlayerList');
    
    // 5. ตรวจสอบว่ามี Toast แจ้งเตือนความสำเร็จแสดงขึ้นมา
    cy.get('.swal2-toast').should('contain.text', 'ซิงก์ข้อมูลสำเร็จ!');
  });

  it('ทดสอบ 3: ดักจับและจำลองการดึงข้อมูลจากคลาวด์มาทับ State เครื่อง (Mock Pull)', () => {
    cy.get('button[data-tab="settings"]').click();
    cy.get('#settingSyncApiKey').clear().type('test_api_key', { delay: 0 }).blur();
    cy.get('#settingSyncBinId').clear().type('test_bin_id', { delay: 0 }).blur();

    // 1. สร้าง Data ปลอม (สมมติว่าเป็นข้อมูลใหม่ที่เพิ่งดึงมาจากคลาวด์)
    const mockCloudState = {
      record: {
        masterPlayerList: ['นักแบดคลาวด์ A', 'นักแบดคลาวด์ B'],
        allTransactions: [], allPayments: [], dailyData: {},
        settings: { shuttlecockPrice: 35, syncApiKey: 'test_api_key', syncBinId: 'test_bin_id' }
      }
    };

    // 2. ดักจับ GET request
    cy.intercept('GET', 'https://api.jsonbin.io/v3/b/test_bin_id/latest', {
      statusCode: 200,
      body: mockCloudState
    }).as('pullCloudReq');

    // 3. กดปุ่มดึงข้อมูล
    cy.get('#btnPullCloud').click();

    // 4. รอ Request และตรวจสอบว่าแนบ Header API Key ไปถูกต้อง
    cy.wait('@pullCloudReq').its('request.headers').should('have.property', 'x-master-key', 'test_api_key');

    // 5. ตรวจสอบว่าระบบเด้งกลับมาที่แท็บ "คิดเงินรายวัน" และข้อมูลถูกดึงมาทับหน้าจอเรียบร้อย
    cy.get('#tab-daily').should('not.have.class', 'hidden');
    cy.get('.swal2-toast').should('contain.text', 'ดึงข้อมูลสำเร็จ!');
    cy.get('#playerList').should('contain.text', 'นักแบดคลาวด์ A').and('contain.text', 'นักแบดคลาวด์ B');
    cy.get('#shuttlecockPrice').should('have.value', '35');
  });

  it('ทดสอบ 4: แสดงข้อผิดพลาดที่ถูกต้องเมื่อ API คลาวด์มีปัญหา (Mock API Error)', () => {
    cy.seedSessionState('cloudErrorSetup', { settings: { syncApiKey: 'test', syncBinId: 'test' } });
    cy.visit('/index.html');
    cy.wait('@globalBgCheck'); // รอให้ Background Sync ทำงานเสร็จก่อน

    // ดักจับและสั่งให้ API จำลองการล่ม (HTTP 500)
    cy.intercept('PUT', 'https://api.jsonbin.io/v3/b/test', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('pushError');

    cy.get('#btnPushCloud').click();
    cy.wait('@pushError');

    // ตรวจสอบการแจ้งเตือน Error
    cy.get('.swal2-popup').should('contain.text', 'ข้อผิดพลาด')
      .and('contain.text', 'ไม่สามารถซิงก์ขึ้นคลาวด์ได้');
  });

  it('ทดสอบ 5: ระบบ Auto-Sync เบื้องหลัง ดึงข้อมูลอัตโนมัติเมื่อเครื่องคลีน (Clean State)', () => {
    // จำลองตั้งค่า API และให้ State เครื่องว่างเปล่า (Clean)
    cy.seedSessionState('autoSyncClean', { settings: { syncApiKey: 'test', syncBinId: 'test' } });
    
    const mockCloudState = { record: { masterPlayerList: ['นักแบดออโต้'], allTransactions: [], allPayments: [], dailyData: {}, settings: { shuttlecockPrice: 0 } } };
    cy.intercept('GET', 'https://api.jsonbin.io/v3/b/test/latest', { statusCode: 200, body: mockCloudState }).as('bgSync');

    cy.visit('/index.html');

    // รอ 1.5 วินาทีที่แอปหน่วงเวลาไว้ แล้วดูว่า Request ถูกยิงออกไปไหม
    cy.wait('@bgSync', { timeout: 3000 });

    // ตรวจสอบว่าระบบอัปเดตหน้าจอเงียบๆ และขึ้นแค่ Toast (ไม่ขึ้น Pop-up เตือนอันตราย)
    cy.get('.swal2-toast').should('contain.text', 'ดึงข้อมูลล่าสุดจากคลาวด์เรียบร้อยแล้ว');
    cy.get('#playerList').should('contain.text', 'นักแบดออโต้');
  });

  it('ทดสอบ 6: ระบบ Auto-Sync เบื้องหลัง แจ้งเตือนเมื่อเครื่องมีข้อมูลยังไม่ซิงก์ (Dirty State)', () => {
    // จำลองตั้งค่า API และแกล้งทำเป็นว่าเครื่องเคยซิงก์แล้ว (มี _lastSync) 
    const lastSyncState = { masterPlayerList: ['คนเก่า'], allTransactions: [], allPayments: [], dailyData: {}, settings: { syncApiKey: 'test', syncBinId: 'test' } };
    cy.seedSessionState('autoSyncDirty', lastSyncState);
    
    // ดักจับและเตรียมข้อมูลคลาวด์เวอร์ชันใหม่กว่า
    const mockCloudState = { record: { ...lastSyncState, masterPlayerList: ['คนเก่า', 'คนใหม่จากคลาวด์'] } };
    cy.intercept('GET', 'https://api.jsonbin.io/v3/b/test/latest', { statusCode: 200, body: mockCloudState }).as('bgSyncDirty');

    cy.visit('/index.html', {
      onBeforeLoad: (win) => { 
        win.localStorage.setItem('badmintonAppState_v2_lastSync', JSON.stringify(lastSyncState));
        // ทำให้ Local State ปัจจุบันเปลี่ยนไปจาก _lastSync (กลายเป็น Dirty)
        const dirtyState = { ...lastSyncState, masterPlayerList: ['คนเก่า', 'คนที่เพิ่งจดออฟไลน์'] };
        win.localStorage.setItem('badmintonAppState_v2', JSON.stringify(dirtyState));
      }
    });

    cy.wait('@bgSyncDirty', { timeout: 3000 });

    // ระบบต้องเด้ง Pop-up เตือน! ไม่ทับข้อมูลทันที
    cy.get('.swal2-popup').should('contain.text', 'พบข้อมูลใหม่บนคลาวด์')
      .and('contain.text', 'ข้อมูลที่ยังไม่ซิงก์บนเครื่องนี้จะหายไป');
    
    // กดตกลงเพื่อยอมให้ทับ
    cy.get('.swal2-confirm').contains('ดึงข้อมูลมาทับหน้าจอ').click();
    cy.get('#playerList').should('contain.text', 'คนใหม่จากคลาวด์');
  });

  it('ทดสอบ 7: ไอคอนก้อนเมฆหมุน (fa-spin) ระหว่างซิงก์ข้อมูล', () => {
    cy.seedSessionState('spinTest', { settings: { syncApiKey: 'test', syncBinId: 'test' } });
    cy.visit('/index.html');
    cy.wait('@globalBgCheck'); // รอให้ Background Sync เสร็จก่อนเพื่อป้องกันไอคอนหมุนค้าง

    // หน่วงเวลา API ไว้ 1 วินาที เพื่อให้เห็นการหมุนชัดเจน
    cy.intercept('PUT', 'https://api.jsonbin.io/v3/b/test', {
      statusCode: 200,
      body: {},
      delay: 1000
    }).as('slowPush');

    // ไอคอนต้องไม่มี fa-spin ตอนเริ่มต้น
    cy.get('#btnPushCloud i').should('not.have.class', 'fa-spin');

    // พอกดแล้วต้องมี fa-spin
    cy.get('#btnPushCloud').click();
    cy.get('#btnPushCloud i').should('have.class', 'fa-spin');

    // รอให้โหลดเสร็จ ไอคอนต้องหยุดหมุน
    cy.wait('@slowPush');
    cy.get('#btnPushCloud i').should('not.have.class', 'fa-spin');
  });

  it('ทดสอบ 8: Factory Reset ต้องไม่ทำให้ Default API Key หายไป', () => {
    cy.visit('/index.html');
    cy.get('button[data-tab="settings"]').click();

    // แกล้งแก้ช่อง Bin ID เป็นค่าอื่น
    cy.get('#settingSyncBinId').clear().type('custom_bin_id').blur();

    // กด Factory Reset
    cy.get('#btnFactoryReset').click();
    cy.get('.swal2-confirm').contains('ล้างข้อมูลเลย').click();

    // ตรวจสอบว่าค่าในช่องต้องเด้งกลับมาเป็น Default ที่เราฝังไว้ในโค้ด (6a335...) ทันที
    cy.get('#settingSyncBinId').should('have.value', '6a33513dda38895dfed44a46');
  });
});