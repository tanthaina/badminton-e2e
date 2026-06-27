describe('Auto Transfer Listener', () => {
    beforeEach(() => {
        cy.visit('index.html');
        cy.window().then((win) => {
            // Reset state
            win.state = win.createDefaultState();
            win.state.masterPlayerList = ['UserA', 'UserB', 'UserC'];
            
            // Give them some debt
            win.state.allTransactions = [
                { id: 1, type: 'GAME_FEE', name: 'UserA', totalCost: 150.00, date: win.getTodayString() },
                { id: 2, type: 'GAME_FEE', name: 'UserB', totalCost: 150.00, date: win.getTodayString() },
                { id: 3, type: 'GAME_FEE', name: 'UserC', totalCost: 80.00, date: win.getTodayString() }
            ];
            
            win.updateAndRender();
        });
        cy.get('.tab-btn[data-tab="account"]').click();
    });

    it('should show test button when listener is activated', () => {
        cy.get('#btnTransferListener').click();
        cy.get('#btnSimulateTransfer').should('be.visible');
        cy.get('#transferListenerTimer').should('be.visible');
        
        // Disable it
        cy.get('#btnTransferListener').click();
        cy.get('#btnSimulateTransfer').should('not.be.visible');
    });

    it('should automatically pay if only one user matches the exact amount', () => {
        cy.get('#btnTransferListener').click();
        cy.get('#btnSimulateTransfer').click();
        
        // Enter 80.00, which only UserC owes
        cy.get('#swal-sim-amount').type('80');
        cy.get('.swal2-confirm').click();

        // Should show success toast for UserC
        cy.get('.swal2-toast').contains('รับยอดโอนสำเร็จ');
        cy.get('.swal2-toast').contains('UserC');

        // UserC should now be paid and show in paid list or no longer in unpaid list
        cy.get('#unpaid-list-overall').should('not.contain', 'UserC');
        cy.get('#paid-in-full-list-overall').should('contain', 'UserC');
    });

    it('should prompt admin to select user if multiple users match the amount', () => {
        cy.get('#btnTransferListener').click();
        cy.get('#btnSimulateTransfer').click();
        
        // Enter 150.00, which both UserA and UserB owe
        cy.get('#swal-sim-amount').type('150');
        cy.get('.swal2-confirm').click();

        // Should show collision popup
        cy.get('.swal2-popup').contains('พบผู้ค้างชำระยอดนี้หลายคน');
        cy.get('.swal2-popup').contains('UserA');
        cy.get('.swal2-popup').contains('UserB');

        // Select UserA
        cy.get('input[name="collision_pick"][value="UserA"]').check();
        cy.get('.swal2-confirm').click();

        // Should show success toast for UserA
        cy.get('.swal2-toast').contains('รับยอดโอนสำเร็จ');
        cy.get('.swal2-toast').contains('UserA');

        // UserA should be paid, UserB still unpaid
        cy.get('#unpaid-list-overall').should('not.contain', 'UserA');
        cy.get('#paid-in-full-list-overall').should('contain', 'UserA');
        cy.get('#unpaid-list-overall').should('contain', 'UserB');
    });

    it('should show warning if no user matches the amount', () => {
        cy.get('#btnTransferListener').click();
        cy.get('#btnSimulateTransfer').click();
        
        // Enter 500.00, which no one owes
        cy.get('#swal-sim-amount').type('500');
        cy.get('.swal2-confirm').click();

        // Should show warning toast
        cy.get('.swal2-toast').contains('มียอดโอนเข้า ฿500.00');
        cy.get('.swal2-toast').contains('ไม่พบผู้ค้างชำระตรงกับยอดนี้');
    });
});
