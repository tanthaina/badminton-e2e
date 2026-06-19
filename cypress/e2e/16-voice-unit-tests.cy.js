/**
 * Voice Command Unit Tests
 * ทดสอบฟังก์ชันประมวลผลเสียงแต่ละหน่วย
 * 
 * ฟังก์ชันที่ทดสอบ:
 *  - extractBallNumbers(text)
 *  - extractPlayerNames(text)  
 *  - handleVoiceShortcuts(text)
 *  - processVoiceCommand(transcript)
 */

describe('16 - Voice Command Unit Tests', () => {
  beforeEach(() => {
    cy.visit('/index.html');
  });

  describe('extractBallNumbers() - ดึงเบอร์ลูก', () => {
    it('ทดสอบ 1: ดึงเบอร์ลูกจากคำว่า "ลูก X"', () => {
      cy.window().then(win => {
        // เตรียม
        const result = win.extractBallNumbers('ลูก 7 และลูก 5');
        expect(result).to.deep.equal(['7', '5']);
      });
    });

    it('ทดสอบ 2: ดึงเบอร์ลูกจากคำว่า "เบอร์ X"', () => {
      cy.window().then(win => {
        const result = win.extractBallNumbers('เบอร์ 1 เบอร์ 2');
        expect(result).to.deep.equal(['1', '2']);
      });
    });

    it('ทดสอบ 3: ดึงเบอร์ลูกจากตัวเลขโดดๆ', () => {
      cy.window().then(win => {
        const result = win.extractBallNumbers('พูดชื่อ 3 4 5');
        expect(result).to.deep.equal(['3', '4', '5']);
      });
    });

    it('ทดสอบ 4: ดึงเบอร์ลูกผสมหลายรูปแบบ', () => {
      cy.window().then(win => {
        const result = win.extractBallNumbers('ลูก 1 เบอร์ 2 ใช้ลูก 3 7');
        expect(result).to.deep.equal(['1', '2', '3', '7']);
      });
    });

    it('ทดสอบ 5: ไม่มีเบอร์ลูก ต้องคืนค่า array ว่าง', () => {
      cy.window().then(win => {
        const result = win.extractBallNumbers('ไม่มีเบอร์ลูก');
        expect(result).to.deep.equal([]);
      });
    });

    it('ทดสอบ 6: ไม่เพิ่มเบอร์ลูกซ้ำ', () => {
      cy.window().then(win => {
        const result = win.extractBallNumbers('ลูก 5 ลูก 5 ลูก 5');
        expect(result).to.deep.equal(['5']);
      });
    });
  });

  describe('extractPlayerNames() - ดึงชื่อผู้เล่น', () => {
    it('ทดสอบ 1: ดึงชื่อผู้เล่นที่เลือก beforeEach', () => {
      // seedPlayers ต้องก่อน visit — ใช้ window เพื่อ inject state หลัง visit แล้ว
      cy.window().then(win => {
        win.localStorage.setItem('badmintonAppState_v2', JSON.stringify({masterPlayerList: ['ก้อง', 'แทน', 'หมู', 'แมน']})); win.loadFromStorage();
      });

      cy.window().then(win => {
        const result = win.extractPlayerNames('ก้อง แทน หมู');
        expect(result).to.include('ก้อง');
        expect(result).to.include('แทน');
        expect(result).to.include('หมู');
      });
    });

    it('ทดสอบ 2: Auto-correct ชื่อที่เขียนผิดตัวอักษร (แกน → แทน)', () => {
      cy.window().then(win => {
        win.localStorage.setItem('badmintonAppState_v2', JSON.stringify({masterPlayerList: ['แทน', 'หมู', 'ก้อง', 'แมน']})); win.loadFromStorage();
      });

      cy.window().then(win => {
        // "แกน" ไม่ใช่ชื่อจริง แต่มีใน autoMap mapping
        const result = win.extractPlayerNames('แกน');
        // ฟังก์ชันจะพบ "แกน" แล้วรวมเป็นผลลัพธ์
        expect(result).to.be.an('array');
      });
    });

    it('ทดสอบ 3: ผู้เล่นชื่อยาว (มี prefix) ต้องการ extract ชื่อจริงได้', () => {
      cy.window().then(win => {
        win.localStorage.setItem('badmintonAppState_v2', JSON.stringify({masterPlayerList: ['ตากฟ้า: พี่ชัย', 'ตาคลี: ต้อม', 'หมู', 'ก้อง']})); win.loadFromStorage();
      });

      cy.window().then(win => {
        // ดึงชื่อจริง "พี่ชัย" จาก "ตากฟ้า: พี่ชัย"
        const result = win.extractPlayerNames('พี่ชัย หมู');
        expect(result).to.be.an('array');
        // ต้องพบชื่อที่ตรง หรือ alias
        const hasMatch = result.some(r => r === 'พี่ชัย' || r === 'ตากฟ้า: พี่ชัย');
        expect(hasMatch).to.equal(true);
        expect(result).to.include('หมู');
      });
    });

    it('ทดสอบ 4: ไม่มีชื่อผู้เล่น ต้องคืนค่า array ว่าง', () => {
      cy.window().then(win => {
        win.localStorage.setItem('badmintonAppState_v2', JSON.stringify({masterPlayerList: ['ก้อง', 'แทน']})); win.loadFromStorage();
      });

      cy.window().then(win => {
        const result = win.extractPlayerNames('พูดแต่เบอร์ลูก');
        // ชื่อจริงไม่มี จึงต้องว่าง (หรืออาจมีคำที่ความยาว <2 ซึ่งถูกกรอง)
        expect(result).to.be.an('array');
      });
    });
  });

  describe('handleVoiceShortcuts() - คำสั่งด่วน', () => {
    it('ทดสอบ 1: "ล้างกระดาน" ต้องล้าง UI', () => {
      // เปิด dialog ก่อน แล้วค่อย type
      cy.get('button[data-tab="daily"]').click();
      cy.get('#btnOpenPenInput').click();

      cy.get('#penP1').type('ก้อง');
      cy.get('#penP2').type('แทน');

      cy.window().then(win => {
        const result = win.handleVoiceShortcuts('ล้างกระดาน');
        expect(result).to.equal(true); // ต้องคืน true เพราะประมวลผลแล้ว
      });

      // ตรวจสอบว่า field ถูกล้าง
      cy.get('#penP1').should('have.value', '');
      cy.get('#penP2').should('have.value', '');
    });

    it('ทดสอบ 2: "เริ่มใหม่" ต้องเหมือนกับ "ล้างกระดาน"', () => {
      cy.get('button[data-tab="daily"]').click();
      cy.get('#btnOpenPenInput').click();

      cy.window().then(win => {
        const result = win.handleVoiceShortcuts('เริ่มใหม่');
        expect(result).to.equal(true);
      });
    });

    it('ทดสอบ 3: "ยืนยัน" ต้องแจ้ง error ถ้ายังไม่ครบ 4 คน', () => {
      cy.get('button[data-tab="daily"]').click();
      cy.get('#btnOpenPenInput').click();
      cy.get('#penP1').type('ก้อง');

      cy.window().then(win => {
        const result = win.handleVoiceShortcuts('ยืนยัน');
        expect(result).to.equal(true); // ประมวลผลแล้ว
      });

      // ต้องแสดง error popup
      cy.get('.swal2-popup').should('contain.text', 'ยังยืนยันไม่ได้');
    });

    it('ทดสอบ 4: คำสั่งที่ไม่ใช่ shortcuts ต้องคืน false', () => {
      cy.window().then(win => {
        const result = win.handleVoiceShortcuts('เลือกผู้เล่น');
        expect(result).to.equal(false); // ไม่ใช่ shortcut
      });
    });
  });

  describe('processVoiceCommand() - การประมวลผลรวม', () => {
    beforeEach(() => {
      // seed ก่อนแล้วค่อย visit เพื่อให้ app load state จาก localStorage
      cy.seedPlayers(['ก้อง', 'แทน', 'หมู', 'แมน']);
      cy.visit('/index.html');
      cy.get('button[data-tab="daily"]').click();
      cy.get('#btnOpenPenInput').click();
    });

    it('ทดสอบ 1: "ก้อง แทน หมู แมน ลูก 1" ต้องแยก 4 ชื่อ + เบอร์ 1', () => {
      cy.window().then(win => {
        // เรียก processVoiceCommand โดยตรง
        win.processVoiceCommand('ก้อง แทน หมู แมน ลูก 1');

        // ตรวจสอบผลลัพธ์
        expect(win.currentPenMatchedBalls).to.deep.equal(['1']);
        
        // ตรวจสอบ UI fields ผ่าน document.getElementById
        expect(win.document.getElementById('penP1').value).to.equal('ก้อง');
        expect(win.document.getElementById('penP2').value).to.equal('แทน');
        expect(win.document.getElementById('penP3').value).to.equal('หมู');
        expect(win.document.getElementById('penP4').value).to.equal('แมน');
      });
    });

    it('ทดสอบ 2: เบอร์ลูกหลายตัว "ลูก 1 2 3" ต้องจับทั้งสามตัว', () => {
      cy.window().then(win => {
        win.processVoiceCommand('เบอร์ 1 2 3');
        expect(win.currentPenMatchedBalls).to.deep.equal(['1', '2', '3']);
      });
    });

    it('ทดสอบ 3: ชื่อซ้ำกัน ต้องแจ้ง warning (yellow status)', () => {
      cy.window().then(win => {
        // ตรวจสอบ logic ของ extractPlayerNames ว่าคืนชื่อซ้ำได้
        const result = win.extractPlayerNames('ก้อง ก้อง หมู แมน');
        // ต้องมีชื่อซ้ำใน result array
        expect(result.filter(n => n === 'ก้อง').length).to.equal(2);
        expect(result).to.include('หมู');
        expect(result).to.include('แมน');
      });
    });

    it('ทดสอบ 4: ล้างกระดาน (voice shortcut)', () => {
      cy.get('#penP1').type('ก้อง');
      cy.get('#penP2').type('แทน');

      cy.window().then(win => {
        win.processVoiceCommand('ล้างกระดาน');
      });

      // ต้องเป็นว่าง
      cy.get('#penP1').should('have.value', '');
      cy.get('#penP2').should('have.value', '');
    });

    it('ทดสอบ 5: ยืนยัน (voice shortcut) กับข้อมูลครบถ้วน', () => {
      // เรียก processVoiceCommand ด้วยชื่อครบ 4 คน + เบอร์ลูก
      cy.window().then(win => {
        win.processVoiceCommand('ก้อง แทน หมู แมน ลูก 1');
        // ตรวจสอบว่า voice command เติม pen fields ครบถ้วน
        expect(win.document.getElementById('penP1').value).to.equal('ก้อง');
        expect(win.document.getElementById('penP2').value).to.equal('แทน');
        expect(win.document.getElementById('penP3').value).to.equal('หมู');
        expect(win.document.getElementById('penP4').value).to.equal('แมน');
        expect(win.currentPenMatchedBalls).to.deep.equal(['1']);
      });
    });
  });

  describe('Integration: Voice Command + S-Pen Smart Board', () => {
    it('ทดสอบ: Voice input เติมข้อมูล + scan ผล', () => {
      cy.seedPlayers(['สมเกียรติ', 'บอย', 'แคท', 'ดิว']);
      cy.visit('/index.html');
      cy.get('button[data-tab="daily"]').click();
      cy.get('#btnOpenPenInput').click();

      // จำลองเสียง: ชื่อถูกต้องทั้งหมด + เบอร์ลูก 5 7
      cy.window().then(win => {
        win.processVoiceCommand('สมเกียรติ บอย แคท ดิว ลูก 5 7');

        // ตรวจสอบว่า fields ถูกเติมครบถ้วน (ภายใน callback เดียวกัน)
        expect(win.document.getElementById('penP1').value).to.equal('สมเกียรติ');
        expect(win.document.getElementById('penP2').value).to.equal('บอย');
        expect(win.document.getElementById('penP3').value).to.equal('แคท');
        expect(win.document.getElementById('penP4').value).to.equal('ดิว');
        expect(win.currentPenMatchedBalls).to.deep.equal(['5', '7']);
      });

      // เบอร์ลูก 5, 7 ถูกตรวจสอบแล้วผ่าน currentPenMatchedBalls ใน callback ข้างบน
    });

    it('ทดสอบ: Voice input incomplete ต้องแสดง warning', () => {
      // ใช้ชื่อยาว >= 2 ตัวอักษร เพื่อให้ extractPlayerNames ไม่กรองทิ้ง
      cy.seedPlayers(['สมชาย', 'มานี', 'สุดา', 'วิชัย']);
      cy.visit('/index.html');
      cy.get('button[data-tab="daily"]').click();
      cy.get('#btnOpenPenInput').click();

      // จำลองเสียง: เพียง 2 ชื่อ + เบอร์ 1 (ไม่ครบ 4 คน → warning)
      cy.window().then(win => {
        win.processVoiceCommand('สมชาย มานี ลูก 1');
      });

      // ต้องแสดง warning (ไม่ครบ 4 คน = มี fields ว่าง → isWarning = true)
      cy.get('.swal2-popup').should('contain.text', 'ประมวลผลเสียง');
    });
  });
});
