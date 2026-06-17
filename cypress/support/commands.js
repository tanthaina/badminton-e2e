// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// --- Custom Commands สำหรับแอปพลิเคชันแบดมินตัน ---
Cypress.Commands.add('addPlayer', (name, prefix = 'ทั่วไป') => {
  cy.get('#newPlayerPrefix').should('be.visible').and('be.enabled').select(prefix);
  cy.get('#newPlayerName').should('be.visible').and('be.enabled').clear().type(name, { delay: 0 });
  cy.get('#btnAddPlayer').should('be.visible').and('be.enabled').click();
});

// --- Custom Commands สำหรับการฉีดข้อมูลตั้งต้น (ประหยัดเวลา Setup) ---
Cypress.Commands.add('seedPlayers', (playersArray) => {
  // ใช้คำสั่งนี้ "ก่อน" เรียก cy.visit('/index.html') เสมอ
  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  
  // จำลอง State เริ่มต้นของแอป
  const initialState = {
    masterPlayerList: [...playersArray].sort((a, b) => a.localeCompare(b, 'th')),
    allTransactions: [],
    allPayments: [],
    dailyData: {
      [todayStr]: {
        players: playersArray.map(name => ({ name, paid: false, present: true })),
        games: []
      }
    },
    settings: { shuttlecockPrice: 0 }
  };
  
  // ยัดข้อมูลลง Local Storage 
  // พอ Cypress สั่ง cy.visit() โค้ดในแอปของคุณจะโหลดข้อมูลนี้ขึ้นมาใช้งานทันที
  cy.window().then((win) => {
    win.localStorage.setItem('badmintonAppState_v2', JSON.stringify(initialState));
  });
});

// --- Custom Commands สำหรับการฉีดข้อมูลเกม (ประหยัดเวลา Setup สำหรับเทสหมวดบัญชี) ---
Cypress.Commands.add('seedGames', (playersArray, gamesArray, defaultPrice = 20) => {
  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  
  const formattedGames = gamesArray.map((g, index) => ({
    id: Date.now() + index,
    players: g.players,
    shuttlecocksUsed: g.speeds ? g.speeds.length : 0,
    shuttlecockPrice: g.price || defaultPrice,
    shuttlecockSpeeds: g.speeds || []
  }));

  const initialState = {
    masterPlayerList: [...playersArray].sort((a, b) => a.localeCompare(b, 'th')),
    allTransactions: [], // ปล่อยว่างไว้ เมื่อโหลดหน้าเว็บ index.html จะทำการ Sync จาก dailyData ให้เองอัตโนมัติ
    allPayments: [],
    dailyData: {
      [todayStr]: {
        players: playersArray.map(name => ({ name, paid: false, present: true })),
        games: formattedGames
      }
    },
    settings: { shuttlecockPrice: defaultPrice }
  };
  
  cy.window().then((win) => {
    win.localStorage.setItem('badmintonAppState_v2', JSON.stringify(initialState));
  });
});

// --- Custom Commands สำหรับการตั้งหนี้ (หน้าบัญชี) ---
Cypress.Commands.add('addDebt', (name, amount) => {
  cy.get('#btnAddDebt').should('be.visible').and('be.enabled').click();
  cy.get('#debt-name').should('be.visible').and('be.enabled').clear().type(name, { delay: 0 });
  cy.get('#debt-amount').should('be.visible').and('be.enabled').clear().type(amount, { delay: 0 });
  cy.get('#btnSubmitDebt').should('be.visible').and('be.enabled').click();
});

// --- Custom Commands สำหรับการจ่ายเงิน (หน้าบัญชีรวม) ---
Cypress.Commands.add('payDebt', (name, amount) => {
  cy.contains('#unpaid-list-overall div', name).find('button').contains('จ่าย').should('be.visible').and('be.enabled').click();
  if (amount !== undefined) {
    cy.get('#payment-amount').should('be.visible').and('be.enabled').clear().type(amount, { delay: 0 });
  }
  cy.get('#btnSubmitPayment').should('be.visible').and('be.enabled').click();
});

// --- Custom Commands สำหรับการจัดทีมและบันทึกเกม ---
Cypress.Commands.add('recordGame', (p1, p2, p3, p4, speeds, price) => {
  if (p1) cy.get('#player1').should('be.visible').and('be.enabled').select(p1);
  if (p2) cy.get('#player2').should('be.visible').and('be.enabled').select(p2);
  if (p3) cy.get('#player3').should('be.visible').and('be.enabled').select(p3);
  if (p4) cy.get('#player4').should('be.visible').and('be.enabled').select(p4);
  if (speeds !== undefined && speeds !== null) cy.get('#shuttlecockSpeeds').should('be.visible').and('be.enabled').clear().type(speeds, { delay: 0 });
  if (price !== undefined && price !== null) cy.get('#shuttlecockPrice').should('be.visible').and('be.enabled').clear().type(price, { delay: 0 });
  cy.get('#btnRecordGame').should('be.visible').and('be.enabled').click();
});