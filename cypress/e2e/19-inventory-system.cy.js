const getTodayString = () => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

describe('Shuttlecock Inventory System', () => {
    beforeEach(() => {
        cy.seedSessionState('inventory-test-session', {
            settings: {
                shuttlecockPrice: 20,
                syncRoomId: 'test_room',
                inventoryEnabled: true,
                inventoryStock: 12
            },
            dailyData: {
                [getTodayString()]: {
                    players: [{ name: 'A', present: true }, { name: 'B', present: true }, { name: 'C', present: true }, { name: 'D', present: true }],
                    games: []
                }
            }
        });
        cy.visit('http://127.0.0.1:5500');
    });

    it('should deduct stock when a game is recorded', () => {
        // Check initial badge
        cy.get('#dailyInventoryBadge').should('contain', 'สต๊อก: 12 ลูก').and('not.have.class', 'bg-red-100');

        // Select players
        cy.get('#player1').select('A');
        cy.get('#player2').select('B');
        cy.get('#player3').select('C');
        cy.get('#player4').select('D');

        // Select shuttlecocks
        cy.get('#shuttlecockSpeedButtons button').contains('1').click();
        cy.get('#shuttlecockSpeedButtons button').contains('2').click();
        
        // Record game
        cy.get('#btnRecordGame').click();

        // Check badge updated (12 - 2 = 10)
        cy.get('#dailyInventoryBadge').should('contain', 'สต๊อก: 10 ลูก');
        
        // Check warning threshold (< 12)
        cy.get('#dailyInventoryBadge').should('have.class', 'bg-red-100');
    });

    it('should restore stock when a game is deleted', () => {
        // Setup initial game with inventoryDeducted = 3
        cy.window().then((win) => {
            const today = getTodayString();
            win.state.dailyData[today].games.push({
                id: 1,
                players: ['A', 'B', 'C', 'D'],
                shuttlecocksUsed: 3,
                shuttlecockSpeeds: ['1', '2', '3'],
                inventoryDeducted: 3
            });
            win.state.settings.inventoryStock = 9; // 12 - 3
            win.updateAndRender();
        });

        cy.get('#dailyInventoryBadge').should('contain', 'สต๊อก: 9 ลูก');

        // Delete the game (the delete button has text-red-500 class)
        cy.get('#gamesList .text-red-500').first().click();

        // Check badge restored (9 + 3 = 12)
        cy.get('#dailyInventoryBadge').should('contain', 'สต๊อก: 12 ลูก');
        cy.get('#dailyInventoryBadge').should('not.have.class', 'bg-red-100');
    });
});
