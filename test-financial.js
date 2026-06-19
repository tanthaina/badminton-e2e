/**
 * test-financial.js
 * ทดสอบ Financial Logic ของระบบบัดมินตัน
 * รันได้ทันที: node test-financial.js
 * ไม่ต้องการ Browser, Cypress, หรือ Server
 */

'use strict';

// ==========================================
// CORE FINANCIAL LOGIC (copy จาก app.js)
// ==========================================
const TOLERANCE = 0.005;

/**
 * คำนวณยอดคงค้างของผู้เล่นแต่ละคน
 * @param {object} state - { allTransactions, allPayments }
 * @returns {object} { playerName: netBalance } (ลบ = ค้างชำระ, บวก = เครดิต)
 */
function calculateBalances(state) {
    const balances = {};

    // รวมหนี้ (totalCost) ทุกรายการ
    (state.allTransactions || []).forEach(t => {
        if (!balances[t.name]) balances[t.name] = 0;
        balances[t.name] -= t.totalCost; // หนี้ = ติดลบ
    });

    // รวมเงินที่จ่ายมา (amount) ทุกรายการ
    (state.allPayments || []).forEach(p => {
        if (!balances[p.name]) balances[p.name] = 0;
        balances[p.name] += p.amount; // จ่ายแล้ว = บวก
    });

    return balances;
}

/**
 * คำนวณต้นทุนต่อคนต่อเกม
 * @param {number} shuttlecocksUsed - จำนวนลูก
 * @param {number} pricePerShuttle - ราคาต่อลูก
 * @param {number} numPlayers - จำนวนคน
 * @returns {number} ต้นทุนต่อคน (ปัดเป็น 2 ตำแหน่ง)
 */
function calcCostPerPlayer(shuttlecocksUsed, pricePerShuttle, numPlayers) {
    return (shuttlecocksUsed * pricePerShuttle) / numPlayers;
}

/**
 * ยอดสุทธิที่ต้องชำระ (รวมหนี้เก่า ลบเครดิต)
 * @param {string} name - ชื่อผู้เล่น
 * @param {number} todayCost - หนี้วันนี้
 * @param {object} balances - ยอดคงค้างรวม
 * @returns {number} ยอดสุทธิ (ลบ = ค้างชำระ, บวก = เครดิต)
 */
function getNetBalance(name, todayCost, balances) {
    const historicBalance = balances[name] || 0; // ยอดก่อนวันนี้
    return historicBalance - todayCost; // หักหนี้วันนี้
}

// ==========================================
// TEST RUNNER
// ==========================================
let passed = 0;
let failed = 0;
const errors = [];

function assert(description, actual, expected, opts = {}) {
    const tolerance = opts.tolerance || 0;
    const ok = Math.abs(actual - expected) <= tolerance;
    if (ok) {
        passed++;
        console.log(`  ✅ ${description}: ${actual}`);
    } else {
        failed++;
        const msg = `  ❌ ${description}: คาดว่า ${expected} แต่ได้ ${actual}`;
        errors.push(msg);
        console.log(msg);
    }
}

function assertStr(description, actual, expected) {
    const ok = actual === expected;
    if (ok) {
        passed++;
        console.log(`  ✅ ${description}: "${actual}"`);
    } else {
        failed++;
        const msg = `  ❌ ${description}: คาดว่า "${expected}" แต่ได้ "${actual}"`;
        errors.push(msg);
        console.log(msg);
    }
}

function test(name, fn) {
    console.log(`\n📋 ${name}`);
    try {
        fn();
    } catch (e) {
        failed++;
        const msg = `  ❌ EXCEPTION: ${e.message}`;
        errors.push(msg);
        console.log(msg);
    }
}

// ==========================================
// TEST CASES
// ==========================================

test('TC1: การคำนวณทศนิยม (Fractional Cost) 3 ลูก ราคา 25 บาท หาร 4 คน', () => {
    const cost = calcCostPerPlayer(3, 25, 4);
    // 3 * 25 = 75 / 4 = 18.75
    assert('ค่าใช้จ่ายต่อคน', cost, 18.75);
    assert('ยอดรวมทั้งหมด', cost * 4, 75);
});

test('TC2: เครดิตหักลบหนี้เกมใหม่อัตโนมัติ (Credit Auto-Offset)', () => {
    // สายเปย์ มีหนี้ 50 บาท และจ่ายมา 100 บาท = เครดิต 50 บาท
    const state = {
        allTransactions: [{ id: 1, date: '2024-01-01', name: 'สายเปย์', totalCost: 50 }],
        allPayments:     [{ id: 2, date: '2024-01-01', name: 'สายเปย์', amount: 100 }]
    };
    const balances = calculateBalances(state);
    assert('เครดิตเดิมของสายเปย์', balances['สายเปย์'], 50); // +100 - 50 = +50

    // เล่นเกมใหม่ คนละ 20 บาท (80 หาร 4)
    const todayCost = calcCostPerPlayer(1, 80, 4);
    assert('ค่าใช้จ่ายวันนี้', todayCost, 20);

    // ยอดสุทธิ = เครดิตเดิม 50 - หนี้ใหม่ 20 = เครดิต 30
    const net = balances['สายเปย์'] - todayCost;
    assert('ยอดสุทธิ (เครดิตเดิม 50 - หนี้ใหม่ 20)', net, 30);
    assert('ไม่มียอดค้างชำระ (> 0 = เครดิต)', net > 0 ? 1 : 0, 1);
});

test('TC3: ปัญหาทศนิยมดิ้น จ่ายยิบย่อย 3.33 + 3.33 + 3.34 ต้องครบ 10 บาทพอดี', () => {
    const state = {
        allTransactions: [{ id: 1, date: '2024-01-01', name: 'คนคิดมาก', totalCost: 10 }],
        allPayments: [
            { id: 2, date: '2024-01-01', name: 'คนคิดมาก', amount: 3.33 },
            { id: 3, date: '2024-01-01', name: 'คนคิดมาก', amount: 3.33 },
            { id: 4, date: '2024-01-01', name: 'คนคิดมาก', amount: 3.34 }
        ]
    };
    const balances = calculateBalances(state);
    // ยอดสุทธิ = -10 + 3.33 + 3.33 + 3.34 = 0 (อาจมีทศนิยม floating point error)
    assert('ยอดหลังจ่ายครบต้องเป็น 0 (ใน tolerance ±0.005)', balances['คนคิดมาก'], 0, { tolerance: TOLERANCE });
    assert('ไม่มียอดค้างชำระ (ใช้ tolerance check)', Math.abs(balances['คนคิดมาก']) < TOLERANCE ? 1 : 0, 1);
});

test('TC4: ชำระทั้งหมด (Pay All) ยอดรวมต้องเป็นศูนย์ โดยไม่กระทบเครดิต', () => {
    const state = {
        allTransactions: [
            { id: 1, date: '2024-01-01', name: 'ค้างเยอะ',  totalCost: 100 },
            { id: 2, date: '2024-01-01', name: 'มีบุญคุณ', totalCost: 20 }
        ],
        allPayments: [
            { id: 3, date: '2024-01-01', name: 'มีบุญคุณ', amount: 50 }
        ]
    };
    const balancesBefore = calculateBalances(state);

    // ก่อน Pay All
    assert('หนี้รวม "ค้างเยอะ" ก่อน Pay All', balancesBefore['ค้างเยอะ'], -100);
    assert('เครดิต "มีบุญคุณ" ก่อน Pay All', balancesBefore['มีบุญคุณ'], 30); // -20 + 50

    // Pay All: เพิ่ม payment 100 บาทให้ "ค้างเยอะ"
    state.allPayments.push({ id: 4, date: '2024-01-01', name: 'ค้างเยอะ', amount: 100 });
    const balancesAfter = calculateBalances(state);

    assert('"ค้างเยอะ" หลัง Pay All ต้องเป็น 0', balancesAfter['ค้างเยอะ'], 0, { tolerance: TOLERANCE });
    assert('"มีบุญคุณ" เครดิตต้องไม่เปลี่ยน', balancesAfter['มีบุญคุณ'], 30); // ไม่กระทบ
});

test('TC5: หนี้สะสม (Accumulated Debt) — A มีหนี้เก่า 100 + วันนี้ 20 = รวม 120', () => {
    // ยอดหนี้เก่า (ก่อนวันนี้)
    const historicState = {
        allTransactions: [{ id: 1, date: '2023-12-31', name: 'A', totalCost: 100 }],
        allPayments: []
    };
    const historicBalances = calculateBalances(historicState);
    assert('หนี้เก่าของ A (ก่อนวันนี้)', historicBalances['A'], -100);

    // ค่าเล่นวันนี้ 80 / 4 คน = 20
    const todayCost = calcCostPerPlayer(1, 80, 4);
    assert('ค่าเล่นวันนี้', todayCost, 20);

    // ยอดสุทธิที่ต้องจ่าย = |หนี้เก่า| + วันนี้ = 100 + 20 = 120
    const totalOwed = Math.abs(historicBalances['A']) + todayCost;
    assert('ยอดรวมสุทธิ (สะสม: ฿120)', totalOwed, 120);
});

test('TC6: Partial Credit Offset — A มีเครดิตเก่า 10 บาท ค่าเล่นวันนี้ 40 บาท = ต้องจ่ายสุทธิ 30', () => {
    // A มีหนี้เก่า 30 แต่จ่ายมาแล้ว 40 → เครดิตเดิม = 10
    const historicState = {
        allTransactions: [{ id: 1, date: '2023-12-31', name: 'A', totalCost: 30 }],
        allPayments:     [{ id: 2, date: '2023-12-31', name: 'A', amount: 40 }]
    };
    const historicBalances = calculateBalances(historicState);
    assert('เครดิตเดิมของ A', historicBalances['A'], 10); // -30 + 40 = +10

    // ค่าเล่นวันนี้ 160 / 4 คน = 40
    const todayCost = calcCostPerPlayer(1, 160, 4);
    assert('ค่าเล่นวันนี้', todayCost, 40);

    // ยอดสุทธิ = หนี้วันนี้ 40 - เครดิต 10 = 30
    const netOwed = todayCost - historicBalances['A'];
    assert('ยอดสุทธิ (สุทธิ: ฿30)', netOwed, 30);
    assert('ยังมียอดค้าง (> 0)', netOwed > 0 ? 1 : 0, 1);
});

test('TC7: ตรวจสอบ Grand Total ถูกต้อง — 4 คน 2 ลูก ราคา 25 บาท', () => {
    const costPerPlayer = calcCostPerPlayer(2, 25, 4);
    assert('ต้นทุนต่อคน (2*25/4 = 12.50)', costPerPlayer, 12.50);
    assert('Grand Total (12.50 * 4 = 50)', costPerPlayer * 4, 50);
});

test('TC8: กรณีไม่มีข้อมูล (Empty State) ต้องไม่ crash', () => {
    const state = { allTransactions: [], allPayments: [] };
    const balances = calculateBalances(state);
    assert('ไม่มี player ที่มียอดค้าง', Object.keys(balances).length, 0);
});

test('TC9: ผู้เล่นหลายคน Balance แยกกันถูกต้อง', () => {
    const state = {
        allTransactions: [
            { id: 1, date: '2024-01-01', name: 'A', totalCost: 100 },
            { id: 2, date: '2024-01-01', name: 'B', totalCost: 50 },
            { id: 3, date: '2024-01-01', name: 'C', totalCost: 75 }
        ],
        allPayments: [
            { id: 4, date: '2024-01-01', name: 'A', amount: 80 }, // ยังค้าง 20
            { id: 5, date: '2024-01-01', name: 'B', amount: 50 }, // จ่ายครบ
            { id: 6, date: '2024-01-01', name: 'C', amount: 100 } // เครดิต 25
        ]
    };
    const balances = calculateBalances(state);
    assert('A ค้างชำระ 20 บาท', balances['A'], -20);
    assert('B จ่ายครบ (0)', balances['B'], 0, { tolerance: TOLERANCE });
    assert('C มีเครดิต 25 บาท', balances['C'], 25);
});

test('TC10: รวม Transaction หลายวัน ต้องสะสมถูกต้อง', () => {
    const state = {
        allTransactions: [
            { id: 1, date: '2024-01-01', name: 'A', totalCost: 30 },
            { id: 2, date: '2024-01-02', name: 'A', totalCost: 20 },
            { id: 3, date: '2024-01-03', name: 'A', totalCost: 50 }
        ],
        allPayments: [
            { id: 4, date: '2024-01-03', name: 'A', amount: 60 }
        ]
    };
    const balances = calculateBalances(state);
    // รวมหนี้ = 30+20+50 = 100, จ่าย = 60, ค้าง = 40
    assert('A ค้างชำระ 40 บาท (3 วันสะสม - จ่าย 60)', balances['A'], -40);
});

// ==========================================
// SUMMARY REPORT
// ==========================================
console.log('\n' + '='.repeat(50));
console.log(`📊 ผลการทดสอบ Financial Logic`);
console.log('='.repeat(50));
console.log(`✅ ผ่าน: ${passed} tests`);
console.log(`❌ ล้มเหลว: ${failed} tests`);

if (errors.length > 0) {
    console.log('\n🔍 รายละเอียดที่ล้มเหลว:');
    errors.forEach(e => console.log(e));
}

console.log('='.repeat(50));

// Exit code: 0 = ผ่านทั้งหมด, 1 = มีบาง test ล้มเหลว
process.exit(failed > 0 ? 1 : 0);
