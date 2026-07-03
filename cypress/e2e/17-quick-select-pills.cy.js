describe('Quick-Tap Player Pills in Smart Board', () => {
    beforeEach(() => {
        cy.visit('http://127.0.0.1:5500');
        // Wait for auth to complete
        cy.window().should('have.property', 'state');
        // Go to daily tab
        cy.get('button[data-tab="daily"]').click();
    });

    it('should show player pills inside Smart Board and allow tapping to fill the court', () => {
        // Mock the state to have present players if none exist
        cy.window().then((win) => {
            if (win.state.masterPlayerList.length === 0) {
                win.state.masterPlayerList = ['แทน', 'หมู', 'แมน', 'ตากฟ้า: พี่หนุ่ม', 'เก่ง'];
                win.saveToStorage();
            }

            // Setup present status for today
            const dd = win.getCurrentDailyData();
            if (dd.players.length === 0) {
                dd.players = [
                    { name: 'แทน', present: true, games: 0, cost: 0, status: 'playing' },
                    { name: 'หมู', present: true, games: 0, cost: 0, status: 'playing' },
                    { name: 'แมน', present: true, games: 0, cost: 0, status: 'playing' },
                    { name: 'เก่ง', present: true, games: 0, cost: 0, status: 'playing' }
                ];
                win.saveToStorage();
            }
            win.renderDaily();
        });

        // Open the Smart Board
        cy.get('#btnOpenPenInput').click();

        // Assert the quick pills container is visible and has players
        cy.get('#boardQuickPlaySelection').should('not.have.class', 'hidden');
        cy.get('#boardQuickPlayerPills button').should('have.length.at.least', 4);

        // Click the first pill (e.g., 'เก่ง')
        cy.get('#boardQuickPlayerPills button').contains('เก่ง').click();

        // Assert 'เก่ง' is in penP1 and has confirmed status
        cy.get('#penP1').should('have.value', 'เก่ง');
        cy.get('#penP1').should('have.class', 'status-green');

        // Click the second pill (e.g., 'แทน')
        cy.get('#boardQuickPlayerPills button').contains('แทน').click();

        // Assert 'แทน' is in penP2
        cy.get('#penP2').should('have.value', 'แทน');
        cy.get('#penP2').should('have.class', 'status-green');

        // Click 'เก่ง' again to remove from the board
        cy.get('#boardQuickPlayerPills button').contains('เก่ง').click();

        // Assert penP1 is empty again
        cy.get('#penP1').should('have.value', '');
    });
});
