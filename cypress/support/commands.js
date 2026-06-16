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
  cy.get('#newPlayerPrefix').select(prefix);
  cy.get('#newPlayerName').clear().type(name, { delay: 0 });
  cy.get('#btnAddPlayer').click();
});

// --- Custom Commands สำหรับการตั้งหนี้ (หน้าบัญชี) ---
Cypress.Commands.add('addDebt', (name, amount) => {
  cy.get('#btnAddDebt').click();
  cy.get('#debt-name').clear().type(name, { delay: 0 });
  cy.get('#debt-amount').clear().type(amount, { delay: 0 });
  cy.get('#btnSubmitDebt').click();
});

// --- Custom Commands สำหรับการจ่ายเงิน (หน้าบัญชีรวม) ---
Cypress.Commands.add('payDebt', (name, amount) => {
  cy.contains('#unpaid-list-overall div', name).find('button').contains('จ่าย').click();
  if (amount !== undefined) {
    cy.get('#payment-amount').clear().type(amount, { delay: 0 });
  }
  cy.get('#btnSubmitPayment').click();
});

// --- Custom Commands สำหรับการจัดทีมและบันทึกเกม ---
Cypress.Commands.add('recordGame', (p1, p2, p3, p4, speeds, price) => {
  if (p1) cy.get('#player1').select(p1);
  if (p2) cy.get('#player2').select(p2);
  if (p3) cy.get('#player3').select(p3);
  if (p4) cy.get('#player4').select(p4);
  if (speeds !== undefined && speeds !== null) cy.get('#shuttlecockSpeeds').clear().type(speeds, { delay: 0 });
  if (price !== undefined && price !== null) cy.get('#shuttlecockPrice').clear().type(price, { delay: 0 });
  cy.get('#btnRecordGame').click();
});