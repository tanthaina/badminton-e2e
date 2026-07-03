'use strict';

// --- FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyD7StlLRpU4VnQwTxujQp3ccah8HLIm1b4",
    authDomain: "badminton-6456a.firebaseapp.com",
    databaseURL: "https://badminton-6456a-default-rtdb.asia-southeast1.firebasedatabase.app", // <--- วาง URL ที่คัดลอกมาตรงนี้ (อย่าลืมใส่ลูกน้ำต่อท้าย)
    databaseURL: "https://badminton-6456a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "badminton-6456a",
    storageBucket: "badminton-6456a.firebasestorage.app",
    messagingSenderId: "895370760778",
    appId: "1:895370760778:web:4b6ee0fbe3602696940cb3",
    measurementId: "G-CS2QVLBMQH"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let isFirebaseUpdating = false;
let firebaseListenerRef = null;

const $ = id => document.getElementById(id);
const PEN_FIELDS = ['penP1', 'penP2', 'penP3', 'penP4'];
const PLAYER_FIELDS = ['player1', 'player2', 'player3', 'player4'];

const TOLERANCE = 0.005; const STORAGE_KEY = 'badmintonAppState_v2';
const PLAYER_COLORS = [{ bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', tag: '#ef4444' }, { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', tag: '#3b82f6' }, { bg: '#dcfce7', border: '#86efac', text: '#166534', tag: '#22c55e' }, { bg: '#fef9c3', border: '#fde047', text: '#713f12', tag: '#eab308' }, { bg: '#ede9fe', border: '#c4b5fd', text: '#4c1d95', tag: '#8b5cf6' }, { bg: '#fce7f3', border: '#f9a8d4', text: '#831843', tag: '#ec4899' }, { bg: '#ccfbf1', border: '#5eead4', text: '#134e4a', tag: '#14b8a6' }, { bg: '#ffedd5', border: '#fdba74', text: '#7c2d12', tag: '#f97316' }];
let state = createDefaultState(); let selectedDate = getTodayString(); let currentGameSelection = { player1: '', player2: '', player3: '', player4: '' }; let _gameIdCounter = Date.now(); let _isDailyDirty = false;
let currentPenMatchedBalls = []; let focusedFieldId = 'penP1'; let _editGameId = null;
let currentGameShuttlecockSpeeds = [];

// --- AUTO TRANSFER LISTENER ---
let _transferListenerRef = null;    // Firebase ref สำหรับดักฟังยอดโอน
let _transferCountdownInterval = null; // interval ของตัวนับถอยหลัง
let _transferSecondsLeft = 0;       // วินาทีที่เหลือ

function createDefaultState() { return { masterPlayerList: [], allTransactions: [], allPayments: [], dailyData: {}, transferLogs: [], settings: { shuttlecockPrice: 0, syncRoomId: 'badminton_default', prefixes: ['ทั่วไป', 'ตากฟ้า', 'ตาคลี', 'นครสวรรค์'] }, timestamp: 0 }; }
function getTodayString() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]; }
function escapeHtml(str) { return String(str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function escapeJsString(str) { return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"'); }
function getPlayerColor(name) { if (!name) return PLAYER_COLORS[0]; const sum = [...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0); return PLAYER_COLORS[sum % PLAYER_COLORS.length]; }
function getCurrentDailyData() { if (!state.dailyData[selectedDate]) state.dailyData[selectedDate] = { players: [], games: [] }; return state.dailyData[selectedDate]; }

function saveToStorage() {
    try {
        if (!isFirebaseUpdating) state.timestamp = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

        // ผลักข้อมูลขึ้น Firebase หากไม่ได้เกิดจากการรับข้อมูลของคนอื่น
        if (!isFirebaseUpdating && !window.Cypress) {
            const roomId = state.settings.syncRoomId || 'badminton_default';
            db.ref('rooms/' + roomId).set({
                state: state,
                timestamp: state.timestamp
            }).catch(err => console.warn("Firebase sync error:", err));
        }
    } catch (e) { console.warn("Storage full"); }
}

function loadFromStorage() { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) state = JSON.parse(raw) || createDefaultState(); } catch (e) { state = createDefaultState(); } }

// --- CYPRESS TEST HOOK ---
// expose state บน window เฉพาะตอนรัน Cypress เพื่อให้ test สามารถ inject/read state ได้โดยตรง
if (typeof window !== 'undefined' && window.Cypress) {
    Object.defineProperty(window, 'state', {
        get: () => state,
        set: (v) => { state = v; },
        configurable: true
    });
    Object.defineProperty(window, 'currentPenMatchedBalls', {
        get: () => currentPenMatchedBalls,
        set: (v) => { currentPenMatchedBalls = v; },
        configurable: true
    });
    window.loadFromStorage = loadFromStorage;
}
function ensureIntegrity() {
    state.settings = state.settings || { shuttlecockPrice: 0 };
    if (!state.settings.prefixes) state.settings.prefixes = ['ทั่วไป', 'ตากฟ้า', 'ตาคลี', 'นครสวรรค์'];
    state.settings.syncRoomId = String(state.settings.syncRoomId || 'badminton_default').replace(/[^a-zA-Z0-9_-]/g, '') || 'badminton_default';
    state.masterPlayerList = (state.masterPlayerList || []).filter(Boolean);
    state.allTransactions = state.allTransactions || []; state.allPayments = state.allPayments || []; state.dailyData = state.dailyData || {}; state.transferLogs = state.transferLogs || [];

    // Data Cleansing: ล้างคีย์ 'undefined' หรือ 'null' ออกจากฐานข้อมูลเพื่อป้องกันบั๊กบิลผี
    ['undefined', 'null', ''].forEach(badKey => { if (state.dailyData[badKey]) delete state.dailyData[badKey]; });

    // ซ่อมแซม date ในประวัติธุรกรรมที่อาจจะชำรุดไปแล้วให้กลับมาเป็นวันปัจจุบัน
    const fallbackDate = getTodayString();
    state.allTransactions.forEach(t => { if (!t.date || t.date === 'undefined' || t.date === 'null') t.date = fallbackDate; });
    state.allPayments.forEach(p => { if (!p.date || p.date === 'undefined' || p.date === 'null') p.date = fallbackDate; });

    Object.values(state.dailyData).forEach(d => {
        d.players = (d.players || []);
        d.players.forEach(p => { if (p.present === undefined) p.present = true; });
        d.games = (d.games || []);
        d.games.forEach(g => { g.shuttlecockSpeeds = (g.shuttlecockSpeeds || []); if (!g.id) g.id = ++_gameIdCounter; });
    });

    // Data Migration: ซ่อมแซมไฟล์ JSON เก่า แยกแยะหนี้รายวันอัตโนมัติ กับหนี้ตั้งมือ เพื่อป้องกันข้อมูลเบิ้ล
    let expectedDaily = {};
    Object.keys(state.dailyData).forEach(date => {
        const dd = state.dailyData[date]; if (!dd.players || !dd.games) return;
        expectedDaily[date] = {}; dd.players.forEach(p => expectedDaily[date][p.name] = { cost: (p.extraCost || 0), paid: false });
        dd.games.forEach(g => { let c = (g.shuttlecocksUsed * (g.shuttlecockPrice || 0)) / 4; g.players.forEach(p => { if (!expectedDaily[date][p]) { let px = dd.players.find(x => x.name === p); expectedDaily[date][p] = { cost: (px ? px.extraCost || 0 : 0), paid: false }; } expectedDaily[date][p].cost += c; }); });
        dd.players.filter(p => p.paid).forEach(p => { if (expectedDaily[date][p.name]) expectedDaily[date][p.name].paid = true; });
    });

    state.allTransactions.forEach(t => {
        // บังคับประเมิน isAutoDaily ใหม่ทุกครั้ง เพื่อแก้บั๊กข้อมูลเก่าที่จำค่าผิดพลาด
        if (t.source === 'daily') t.isAutoDaily = true;
        else if (t.source === 'quick_debt' || t.source === 'manual_payment') t.isAutoDaily = false;
        else {
            let exp = expectedDaily[t.date]?.[t.name];
            t.isAutoDaily = exp ? (Math.abs(t.totalCost - exp.cost) < TOLERANCE) : false;
        }
    });
    state.allPayments.forEach(p => {
        let pDate = p.paymentDate || p.date;
        if (!p.date) p.date = pDate;
        if (p.source === 'daily') p.isAutoDaily = true;
        else if (p.source === 'quick_debt' || p.source === 'manual_payment') p.isAutoDaily = false;
        else {
            let exp = expectedDaily[pDate]?.[p.name];
            p.isAutoDaily = exp ? (exp.paid && Math.abs(p.amount - exp.cost) < TOLERANCE) : false;
        }
    });
}
function syncGameIdCounter() { let max = _gameIdCounter; Object.values(state.dailyData).forEach(d => (d.games || []).forEach(g => { if (g.id > max) max = g.id; })); _gameIdCounter = max; }

// Helper: ลดการ Render DOM ซ้ำซ้อนตอนพิมพ์ค้นหาอย่างรวดเร็ว
function debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// --- FILE SYSTEM ---
function saveToFile() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `badminton-${getTodayString()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); Swal.fire({ icon: 'success', title: 'บันทึกไฟล์สำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
}
function loadFromFile(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const loaded = JSON.parse(e.target.result);
            if (loaded && ('masterPlayerList' in loaded || 'dailyData' in loaded)) {
                // เก็บค่าตั้งค่าของเครื่องปัจจุบันไว้ก่อน (ป้องกันไฟล์เก่ามาทับคีย์ API และพร้อมเพย์)
                const currentSettings = state.settings ? JSON.parse(JSON.stringify(state.settings)) : {};

                state = loaded; ensureIntegrity(); syncGameIdCounter();

                // คืนค่าตั้งค่าระบบที่สำคัญกลับมา (ไม่ยอมให้ไฟล์เก่าทับ)
                state.settings.syncRoomId = currentSettings.syncRoomId || state.settings.syncRoomId;
                state.settings.promptpayId = currentSettings.promptpayId || state.settings.promptpayId;
                state.settings.promptpayName = currentSettings.promptpayName || state.settings.promptpayName;
                state.settings.prefixes = state.settings.prefixes || currentSettings.prefixes || ['ทั่วไป', 'ตากฟ้า', 'ตาคลี', 'นครสวรรค์'];

                document.getElementById('shuttlecockPrice').value = state.settings.shuttlecockPrice || 0;
                document.getElementById('settingDefaultPrice').value = state.settings.shuttlecockPrice || 0;
                const settingSyncRoomId = document.getElementById('settingSyncRoomId'); if (settingSyncRoomId) settingSyncRoomId.value = state.settings.syncRoomId || '';
                updateAndRender(); switchTab('daily'); Swal.fire({ icon: 'success', title: 'โหลดข้อมูลสำเร็จ!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
            } else throw new Error('Invalid');
        } catch (err) { Swal.fire('ข้อผิดพลาด', 'ไฟล์ไม่ถูกต้องหรือชำรุด', 'error'); }
    }; reader.readAsText(file); event.target.value = null;
}

// --- FIREBASE REALTIME SYNC ---
function initFirebaseListener() {
    if (window.Cypress) return; // ป้องกันการดึง/ส่งข้อมูล Firebase ขณะรันเทส (ป้องกันข้อมูลขยะ)

    const roomId = state.settings.syncRoomId || 'badminton_default';
    if (firebaseListenerRef) firebaseListenerRef.off();

    firebaseListenerRef = db.ref('rooms/' + roomId);

    let isFirstLoad = true;
    if (navigator.onLine) {
        Swal.fire({
            title: 'กำลังซิงก์คลาวด์...',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });
        // ป้องกัน Loading หมุนค้างกรณีอินเทอร์เน็ตช้าหรือมีปัญหา (ปิดอัตโนมัติใน 3 วินาที)
        setTimeout(() => {
            if (isFirstLoad && Swal.isVisible() && Swal.getTitle()?.textContent === 'กำลังซิงก์คลาวด์...') Swal.close();
        }, 3000);
    }

    firebaseListenerRef.on('value', (snapshot) => {
        if (isFirstLoad) {
            isFirstLoad = false;
            if (Swal.isVisible() && Swal.getTitle()?.textContent === 'กำลังซิงก์คลาวด์...') Swal.close();
        }

        const data = snapshot.val();
        // ถ้ารับข้อมูลมาจากคลาวด์และเป็นข้อมูลที่ใหม่กว่าของในเครื่อง
        if (data && data.state && data.timestamp > (state.timestamp || 0)) {
            isFirebaseUpdating = true; // ป้องกันการเซฟทับกลับขึ้นไปในจังหวะนี้
            state = data.state;
            state.timestamp = data.timestamp;
            ensureIntegrity(); syncGameIdCounter();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

            $('shuttlecockPrice').value = state.settings.shuttlecockPrice || 0;
            $('settingDefaultPrice').value = state.settings.shuttlecockPrice || 0;
            const roomInput = $('settingSyncRoomId'); if (roomInput) roomInput.value = state.settings.syncRoomId || '';

            updateAndRender();

            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
            Toast.fire({ icon: 'info', title: 'อัปเดตข้อมูลจากคลาวด์แล้ว' });

            isFirebaseUpdating = false;
        }
    });
}

function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    const btnPush = $('btnPushCloud');
    const btnPull = $('btnPullCloud');

    if (btnPush && btnPull) {
        btnPush.disabled = !isOnline;
        btnPull.disabled = !isOnline;
        if (isOnline) {
            btnPush.style.background = '#0284c7';
            btnPull.style.background = '#0ea5e9';
            btnPush.title = 'ซิงก์ข้อมูลขึ้นคลาวด์';
            btnPull.title = 'ดึงข้อมูลจากคลาวด์';
        } else {
            btnPush.style.background = '#94a3b8'; // สีเทา slate-400
            btnPull.style.background = '#94a3b8';
            btnPush.title = 'ออฟไลน์ (ไม่มีอินเทอร์เน็ต)';
            btnPull.title = 'ออฟไลน์ (ไม่มีอินเทอร์เน็ต)';
        }
    }
}

// --- PLAYER MGMT ---
function getPrefixOptionsHtml() {
    let opts = state.settings.prefixes.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    opts += `<option value="ADD_NEW_PREFIX" style="font-weight: bold; color: #4f46e5;">+ เพิ่มคำนำหน้าใหม่...</option>`;
    return opts;
}

function renderPrefixDropdowns() {
    const opts = getPrefixOptionsHtml();
    const mainEl = $('newPlayerPrefix');
    if (mainEl) {
        const currentVal = mainEl.value;
        mainEl.innerHTML = opts;
        if (state.settings.prefixes.includes(currentVal)) {
            mainEl.value = currentVal;
        } else {
            mainEl.value = 'ทั่วไป';
        }
    }
}

function handlePrefixChange(e) {
    if (e.target && e.target.value === 'ADD_NEW_PREFIX') {
        const selectEl = e.target;
        setTimeout(() => {
            const val = prompt('พิมพ์คำนำหน้าใหม่ (เช่น ตาคลี, นครสวรรค์):');
            if (val && val.trim()) {
                const cleaned = val.trim();
                if (state.settings.prefixes.includes(cleaned)) {
                    Swal.fire({ icon: 'warning', title: 'มีคำนำหน้านี้อยู่แล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                    selectEl.value = cleaned;
                } else {
                    state.settings.prefixes.push(cleaned);
                    _isDailyDirty = true;
                    saveToStorage();
                    renderPrefixDropdowns();
                    const swalEl = $('swalQuickPrefix');
                    if (swalEl) {
                        swalEl.innerHTML = getPrefixOptionsHtml();
                        swalEl.value = cleaned;
                    } else {
                        selectEl.value = cleaned;
                    }
                    Swal.fire({ icon: 'success', title: 'เพิ่มคำนำหน้าสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                }
            } else {
                selectEl.value = state.settings.prefixes[0] || 'ทั่วไป';
            }
        }, 10);
    }
}

function addPlayer() {
    const pfx = $('newPlayerPrefix').value;
    const raw = $('newPlayerName').value.trim();
    if (!raw) return;

    const name = pfx === 'ทั่วไป' ? raw : `${pfx}: ${raw}`;
    if (state.masterPlayerList.includes(name)) return;

    state.masterPlayerList.push(name);
    state.masterPlayerList.sort((a, b) => a.localeCompare(b, 'th'));

    const dd = getCurrentDailyData();
    if (!dd.players.find(p => p.name === name)) {
        dd.players.push({ name, paid: false, present: true });
    }

    $('newPlayerName').value = '';
    updateAndRender();
}
function quickAddPlayer() {
    Swal.fire({
        title: 'เพิ่มผู้เล่นด่วน',
        html: `<select id="swalQuickPrefix" class="swal2-select" style="margin: 10px auto; width: 85%; font-size: 16px;">${getPrefixOptionsHtml()}</select>
               <input id="swalQuickName" class="swal2-input" placeholder="พิมพ์ชื่อผู้เล่น..." style="margin: 10px auto; width: 85%;">`,
        showCancelButton: true, confirmButtonText: 'เพิ่มผู้เล่น', cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const pfx = $('swalQuickPrefix').value; const raw = $('swalQuickName').value.trim();
            if (!raw) { Swal.showValidationMessage('กรุณาพิมพ์ชื่อผู้เล่น'); return false; }
            return { pfx, raw };
        }
    }).then(r => {
        if (r.isConfirmed) {
            const name = r.value.pfx === 'ทั่วไป' ? r.value.raw : `${r.value.pfx}: ${r.value.raw}`;
            if (state.masterPlayerList.includes(name)) return Swal.fire({ icon: 'warning', title: 'มีชื่อนี้ในระบบแล้ว', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            state.masterPlayerList.push(name); state.masterPlayerList.sort((a, b) => a.localeCompare(b, 'th'));
            const dd = getCurrentDailyData(); if (!dd.players.find(p => p.name === name)) dd.players.push({ name, paid: false, present: true });
            updateAndRender();

            // UX Polish: If Smart Board modal is open, auto-fill current active field
            if (!$('pen-input-modal').classList.contains('hidden') && focusedFieldId) {
                $(focusedFieldId).value = name;
                $(focusedFieldId).dataset.confirmed = '1';
                scanPenInput();
                // Focus next field
                let nIdx = (PEN_FIELDS.indexOf(focusedFieldId) + 1) % 4;
                let c = 0;
                while ($(PEN_FIELDS[nIdx]).value !== '' && c < 4) {
                    nIdx = (nIdx + 1) % 4;
                    c++;
                }
                focusedFieldId = PEN_FIELDS[nIdx];
                $(focusedFieldId).focus();
            }

            Swal.fire({ icon: 'success', title: 'เพิ่มสำเร็จ!', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
        }
    });
}
function togglePlayer(name) {
    const dd = getCurrentDailyData(); let p = dd.players.find(x => x.name === name);
    if (!p) dd.players.push({ name, paid: false, present: true }); else p.present = !p.present;
    updateAndRender();
}
function deletePlayer(name) {
    // เช็คหนี้คงค้างก่อนลบ
    const sum = calculateOverallBalances();
    const b = sum[name] ? sum[name].d - sum[name].p : 0;
    if (b > TOLERANCE) return Swal.fire('ลบไม่ได้!', `${name} ยังมียอดค้างชำระ ${b.toFixed(2)} บาท<br>โปรดเคลียร์ยอดก่อนลบ`, 'error');
    if (b < -TOLERANCE) return Swal.fire('ลบไม่ได้!', `${name} ยังมียอดเครดิตคงเหลือ ${(-b).toFixed(2)} บาท<br>โปรดเคลียร์ยอดก่อนลบ`, 'error');

    Swal.fire({ title: `ลบ ${name}?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'ลบเลย' }).then(r => {
        if (r.isConfirmed) {
            state.masterPlayerList = state.masterPlayerList.filter(x => x !== name);
            Object.values(state.dailyData).forEach(d => d.players = d.players.filter(x => x.name !== name));
            state.allTransactions = state.allTransactions.filter(x => x.name !== name); state.allPayments = state.allPayments.filter(x => x.name !== name);
            updateAndRender();
        }
    });
}
function submitRename() {
    const oldN = $('rename-old-name').value; const newN = $('rename-new-name').value.trim();
    if (!newN || oldN === newN) { $('rename-modal').classList.add('hidden'); return; }
    if (state.masterPlayerList.includes(newN)) { Swal.fire('ซ้ำ!', 'ชื่อนี้มีในระบบแล้ว โปรดใช้ชื่ออื่น', 'warning'); return; }
    let idx = state.masterPlayerList.indexOf(oldN); if (idx !== -1) state.masterPlayerList[idx] = newN;
    state.allTransactions.forEach(t => { if (t.name === oldN) t.name = newN; }); state.allPayments.forEach(t => { if (t.name === oldN) t.name = newN; });
    Object.values(state.dailyData).forEach(d => { d.players.forEach(p => { if (p.name === oldN) p.name = newN; }); d.games.forEach(g => g.players = g.players.map(x => x === oldN ? newN : x)); });
    $('rename-modal').classList.add('hidden'); updateAndRender();
}

function togglePlayerPaidStatus(playerName) {
    const dd = getCurrentDailyData();
    let player = dd.players.find(x => x.name === playerName);
    if (!player) {
        player = { name: playerName, paid: false, present: true };
        dd.players.push(player);
    }
    player.paid = !player.paid; updateAndRender();
}

function addExtraCost(name) {
    const dd = getCurrentDailyData();
    let p = dd.players.find(x => x.name === name);
    if (!p) { p = { name, paid: false, present: true, extraCost: 0 }; dd.players.push(p); }
    let currentExtra = p.extraCost || 0;

    Swal.fire({
        title: `ค่าจิปาถะ: ${name}`,
        html: `
            <div class="text-sm text-gray-500 mb-4">ระบุยอดรวมค่าใช้จ่ายอื่นๆ เช่น ค่าน้ำ ค่ากริป</div>
            <input type="number" id="extraCostInput" class="swal2-input mt-0" value="${currentExtra > 0 ? currentExtra : ''}" placeholder="0.00" min="0" step="1">
        `,
        showCancelButton: true, showDenyButton: currentExtra > 0, denyButtonText: 'ล้างยอด', confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const val = document.getElementById('extraCostInput').value;
            if (val === '') return 0;
            const num = parseFloat(val);
            if (isNaN(num) || num < 0) { Swal.showValidationMessage('กรุณาใส่จำนวนเงินที่ถูกต้อง'); return false; }
            return num;
        }
    }).then(r => {
        if (r.isConfirmed) { p.extraCost = r.value; _isDailyDirty = true; updateAndRender(); Swal.fire({ icon: 'success', title: 'อัปเดตยอดแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }); }
        else if (r.isDenied) { p.extraCost = 0; _isDailyDirty = true; updateAndRender(); Swal.fire({ icon: 'success', title: 'ล้างยอดแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }); }
    });
}

// --- S PEN SMART BOARD (V4) ---
function openPenInputModal() {
    $('pen-input-modal').classList.remove('hidden');
    PEN_FIELDS.forEach(id => { const el = $(id); el.value = ''; el.dataset.confirmed = ''; el.className = 'court-input'; });
    document.querySelectorAll('.ball-btn').forEach(b => b.classList.remove('active')); currentPenMatchedBalls = []; focusedFieldId = 'penP1';
    $('penReviewSection').classList.add('hidden'); $('penQuickPad').classList.add('hidden'); $('btnConfirmPenInput').classList.add('hidden');

    const badge = $('penShuttleCountBadge');
    if (badge) {
        const lastSpeeds = getGlobalLastShuttlecockSpeeds();
        badge.innerHTML = lastSpeeds ? `ลูกล่าสุด: <b>${lastSpeeds.join(', ')}</b>` : 'ยังไม่มีเกม';
    }

    renderBoardQuickPills();
}
function closePenInputModal() { $('pen-input-modal').classList.add('hidden'); }
function clearPenField(id) { const el = $(id); el.value = ''; el.dataset.confirmed = ''; el.className = 'court-input'; el.focus(); focusedFieldId = id; scanPenInput(); }
function clearAllPenFields() { PEN_FIELDS.forEach(id => { const el = $(id); el.value = ''; el.dataset.confirmed = ''; el.className = 'court-input'; }); $('penP1').focus(); focusedFieldId = 'penP1'; scanPenInput(); }
function swapPenTeams() {
    const swap = (id1, id2) => {
        const el1 = $(id1), el2 = $(id2);
        const tempVal = el1.value, tempConf = el1.dataset.confirmed;
        el1.value = el2.value; el1.dataset.confirmed = el2.dataset.confirmed;
        el2.value = tempVal; el2.dataset.confirmed = tempConf;
    };
    swap('penP1', 'penP3'); // Swap A (Left) with B (Left)
    swap('penP2', 'penP4'); // Swap A (Right) with B (Right)
    scanPenInput();
}
function toggleBallBtn(btn, num) {
    btn.classList.toggle('active'); if (btn.classList.contains('active')) currentPenMatchedBalls.push(num); else currentPenMatchedBalls = currentPenMatchedBalls.filter(b => b !== num);
    currentPenMatchedBalls.sort((a, b) => a - b); scanPenInput();
}

function scanPenInput() {
    let p1 = $('penP1').value.trim(); let p2 = $('penP2').value.trim();
    let p3 = $('penP3').value.trim(); let p4 = $('penP4').value.trim();

    // Auto Split (Block if contains : )
    if (p1 && !p1.includes(':') && !state.masterPlayerList.includes(p1)) {
        let tk = p1.replace(/vs/ig, ' ').replace(/[-,\/]/g, ' ').split(/\s+/).filter(Boolean);
        if (tk.length > 1) { p1 = tk[0]; $('penP1').value = p1; if (!p2 && tk[1]) { p2 = tk[1]; $('penP2').value = p2; } else if (!p3 && tk[1]) { p3 = tk[1]; $('penP3').value = p3; } }
    }

    let vals = [p1, p2, p3, p4]; let fNames = ['', '', '', '']; let status = ['white', 'white', 'white', 'white'];
    const autoMap = { 'แกน': 'แทน', 'หนู': 'หมู', 'เบน': 'แมน', 'สากล': 'สากดา', 'พี่ปุ้ย': 'พี่ปุ๋ย' };
    let aliasMap = state.masterPlayerList.map(n => ({ full: n, short: n.includes(': ') ? n.split(': ')[1].toLowerCase() : n.toLowerCase() }));

    PEN_FIELDS.forEach((id, i) => {
        let v = vals[i]; const el = $(id);
        if (!v) { el.className = 'court-input'; el.dataset.confirmed = ''; return; }

        let exact = state.masterPlayerList.find(m => m.toLowerCase() === v.toLowerCase());
        let exactShort = exact ? (exact.includes(': ') ? exact.split(': ')[1].toLowerCase() : exact.toLowerCase()) : '';
        let isAmbiguous = (v.toLowerCase() === exactShort) && (aliasMap.filter(m => m.short === exactShort).length > 1);
        if (exact && (!isAmbiguous || el.dataset.confirmed === '1')) { status[i] = 'green'; fNames[i] = exact; el.value = exact; return; }

        let t = v.toLowerCase(); if (autoMap[t]) t = autoMap[t].toLowerCase();
        let matches = [];
        aliasMap.forEach(item => {
            if (t === item.short) matches.push({ name: item.full, d: 0 });
            else if (t.includes(item.short) || item.short.includes(t)) matches.push({ name: item.full, d: 1 });
            else { let d = getEditDistance(t, item.short); if (d <= (t.length <= 3 ? 1 : 2)) matches.push({ name: item.full, d: d + 2 }); }
        });
        matches.sort((a, b) => a.d - b.d);

        // ตรวจ prefix ambiguity: input ตรง short เป๊ะ (d:0) แต่มีชื่ออื่นที่ short ขึ้นต้นด้วย input ด้วย
        // เช่น "พี่หนุ่ม" === short ของ "ตากฟ้า: พี่หนุ่ม" แต่ "พี่หนุ่มผมยาว" ก็ startsWith("พี่หนุ่ม") → ambiguous
        let prefixCandidates = aliasMap.filter(item => item.short === t || item.short.startsWith(t));
        let hasPrefixAmbiguity = prefixCandidates.length > 1 && prefixCandidates.some(item => item.short === t);

        if (matches.length === 0) status[i] = 'red';
        else if ((matches.length > 1 && matches[0].d === matches[1].d) || hasPrefixAmbiguity) { status[i] = 'yellow'; fNames[i] = t; }
        else { status[i] = 'green'; fNames[i] = matches[0].name; el.value = matches[0].name; }
    });

    let nonE = fNames.filter(Boolean); let dup = new Set(nonE).size !== nonE.length;
    if (dup) fNames.forEach((n, i) => { if (n && fNames.indexOf(n) !== fNames.lastIndexOf(n)) status[i] = 'yellow'; });

    PEN_FIELDS.forEach((id, i) => $(id).className = 'court-input status-' + status[i]);

    let allG = status.every(c => c === 'green') && vals.every(v => v !== ''); let hasB = currentPenMatchedBalls.length > 0;
    const rev = $('penReviewSection'); const pad = $('penQuickPad'); const btnConf = $('btnConfirmPenInput');

    if (dup || status.includes('yellow') || status.includes('red') || (!hasB && vals.some(v => v !== ''))) {
        rev.classList.remove('hidden'); btnConf.classList.add('hidden'); pad.classList.remove('hidden');
        if (dup) $('penErrorText').innerHTML = "⚠️ พบชื่อซ้ำกันในสนาม"; else if (!hasB && allG) $('penErrorText').innerHTML = "⚠️ อย่าลืมเลือกเบอร์ลูก"; else $('penErrorText').innerHTML = "⚠️ จิ้มรายชื่อด้านล่างเพื่อแก้กล่องที่ผิด";
        renderQuickPad(status);
    } else if (allG && hasB) { rev.classList.add('hidden'); pad.classList.add('hidden'); btnConf.classList.remove('hidden'); }

    renderBoardQuickPills();
}

function renderBoardQuickPills() {
    const container = $('boardQuickPlayerPills');
    if (!container) return;

    const dd = getCurrentDailyData();
    const prs = dd.players.filter(p => p.present).sort((a, b) => a.name.localeCompare(b.name, 'th'));
    const containerWrapper = $('boardQuickPlaySelection');

    if (prs.length === 0) {
        containerWrapper.classList.add('hidden');
        return;
    }

    containerWrapper.classList.remove('hidden');

    const currentOnBoard = PEN_FIELDS.map(id => $(id).value.trim()).filter(Boolean);

    container.innerHTML = prs.map(p => {
        // Only mark as selected if the name strictly matches or if they are "green" on the board
        // To be simple, we check if the name is in the values array
        // We handle exact match
        const isSelected = currentOnBoard.some(val => {
            const exact = state.masterPlayerList.find(m => m.toLowerCase() === val.toLowerCase());
            return exact === p.name || val.toLowerCase() === p.name.toLowerCase() || (val && p.name.toLowerCase().includes(val.toLowerCase()));
        });

        const col = getPlayerColor(p.name);
        const sh = p.name.includes(': ') ? p.name.split(': ')[1] : p.name;
        const px = p.name.includes(': ') ? p.name.split(': ')[0] : '';
        const display = px ? `${escapeHtml(sh)} <span class="text-[9px] opacity-60">(${escapeHtml(px)})</span>` : escapeHtml(sh);

        return `<button type="button" onclick="toggleBoardQuickPlayer('${escapeHtml(escapeJsString(p.name))}')" 
            class="px-2.5 py-1 text-xs font-semibold rounded-full border transition-all duration-200 flex items-center gap-1 ${isSelected ? 'shadow-sm bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-indigo-50'}"
            style="${isSelected ? '' : `color: ${col.text}; background: ${col.bg}25; border-color: ${col.border}`}">
            ${isSelected ? '<i class="fas fa-check-circle text-[10px]"></i>' : ''}
            <span>${display}</span>
        </button>`;
    }).join('');
}

function toggleBoardQuickPlayer(name) {
    const vals = PEN_FIELDS.map(id => $(id).value.trim());

    // Check if player is already on board
    let foundIndex = -1;
    for (let i = 0; i < vals.length; i++) {
        const val = vals[i];
        if (!val) continue;
        const exact = state.masterPlayerList.find(m => m.toLowerCase() === val.toLowerCase());
        if (exact === name || val.toLowerCase() === name.toLowerCase() || name.toLowerCase().includes(val.toLowerCase())) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex !== -1) {
        // Remove from board
        $(PEN_FIELDS[foundIndex]).value = '';
        $(PEN_FIELDS[foundIndex]).dataset.confirmed = '';
    } else {
        // Add to board: prefer the focused field if it's empty, otherwise find first empty
        let targetIndex = -1;

        // Is focused field empty?
        if (focusedFieldId && PEN_FIELDS.includes(focusedFieldId) && !$(focusedFieldId).value.trim()) {
            targetIndex = PEN_FIELDS.indexOf(focusedFieldId);
        } else {
            // Find first empty
            for (let i = 0; i < PEN_FIELDS.length; i++) {
                if (!$(PEN_FIELDS[i]).value.trim()) {
                    targetIndex = i;
                    break;
                }
            }
        }

        if (targetIndex !== -1) {
            $(PEN_FIELDS[targetIndex]).value = name;
            $(PEN_FIELDS[targetIndex]).dataset.confirmed = '1';

            // Advance focus to next empty field
            let nextIndex = (targetIndex + 1) % 4;
            let checks = 0;
            while ($(PEN_FIELDS[nextIndex]).value.trim() && checks < 4) {
                nextIndex = (nextIndex + 1) % 4;
                checks++;
            }
            if (checks < 4) {
                focusedFieldId = PEN_FIELDS[nextIndex];
                $(focusedFieldId).focus();
            }
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'สนามเต็มแล้ว',
                text: 'กรุณาเอาคนเก่าออกก่อนเพื่อเพิ่มคนใหม่',
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000
            });
            return;
        }
    }

    scanPenInput();
}

function renderQuickPad(status) {
    const pad = $('penQuickPadList');
    let tIdx = status.indexOf('yellow'); if (tIdx === -1) tIdx = status.indexOf('red'); if (tIdx === -1) tIdx = PEN_FIELDS.indexOf(focusedFieldId);
    let targetId = PEN_FIELDS[tIdx !== -1 ? tIdx : 0]; let targetEl = $(targetId);
    let cText = targetEl ? targetEl.value.trim().toLowerCase() : ''; let isY = status[tIdx] === 'yellow';

    let list = [...state.masterPlayerList].sort((a, b) => a.localeCompare(b, 'th'));
    if (isY && cText) list = list.filter(n => { let s = n.includes(': ') ? n.split(': ')[1].toLowerCase() : n.toLowerCase(); return s.includes(cText) || cText.includes(s); });

    pad.innerHTML = list.map(n => {
        let sh = n.includes(': ') ? n.split(': ')[1] : n; let px = n.includes(': ') ? n.split(': ')[0] : '';
        let display = px ? `<span class="text-sm font-bold text-gray-800">${escapeHtml(sh)}</span> <span class="text-[10px] text-gray-400">(${escapeHtml(px)})</span>` : `<span class="text-sm font-bold text-gray-800">${escapeHtml(sh)}</span>`;
        return `<div class="quick-pad-chip" onclick="selectPad('${escapeHtml(escapeJsString(n))}', '${targetId}')">${display}</div>`;
    }).join('');
}
function selectPad(name, targetId) {
    $(targetId).value = name; $(targetId).dataset.confirmed = '1'; scanPenInput();
    let nIdx = (PEN_FIELDS.indexOf(targetId) + 1) % 4; let c = 0;
    while ($(PEN_FIELDS[nIdx]).value !== '' && c < 4) { nIdx = (nIdx + 1) % 4; c++; }
    focusedFieldId = PEN_FIELDS[nIdx]; $(focusedFieldId).focus(); scanPenInput();
}
function getEditDistance(a, b) {
    if (a.length === 0) return b.length; if (b.length === 0) return a.length; let m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i]; for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) { for (let j = 1; j <= a.length; j++) { m[i][j] = b.charAt(i - 1) === a.charAt(j - 1) ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, Math.min(m[i][j - 1] + 1, m[i - 1][j] + 1)); } }
    return m[b.length][a.length];
}
function confirmPenData() {
    const n = PEN_FIELDS.map(id => $(id).value);
    const dd = getCurrentDailyData();
    n.forEach(x => {
        let p = dd.players.find(y => y.name === x);
        if (!p) dd.players.push({ name: x, paid: false, present: true });
        else p.present = true;
    });

    // Re-render the daily page to populate select dropdown options with the newly added/present players
    renderDaily();

    PLAYER_FIELDS.forEach((id, i) => { currentGameSelection[id] = n[i]; $(id).value = n[i]; });
    $('shuttlecockSpeeds').value = currentPenMatchedBalls.join(', ');
    currentGameShuttlecockSpeeds = [...currentPenMatchedBalls];

    closePenInputModal();

    // Automatically record the game
    recordGame();
}

/**
 * ===== VOICE COMMAND SYSTEM (Smart Board AI Input) =====
 * 
 * ฟีเจอร์นี้ใช้ Web Speech API เพื่อรับคำพูดเป็นภาษาไทย
 * ฟังก์ชันหลัก:
 *   - startVoiceCommand(): เปิดไมค์และรับเสียงพูด
 *   - processVoiceCommand(text): วิเคราะห์ข้อความและ map ไป UI
 *   - Helper functions: extractBallNumbers, extractPlayerNames
 */

// --- VOICE COMMAND: Text-to-Speech ---
function speakText(text) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    window.speechSynthesis.speak(utterance);
}

// --- VOICE COMMAND: Initialize & Listen ---
function startVoiceCommand() {
    // ตรวจสอบว่าเบราว์เซอร์รองรับ Speech Recognition API
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        Swal.fire('ไม่รองรับ', 'เบราว์เซอร์นี้ไม่รองรับระบบเสียง โปรดใช้ Chrome หรือ Safari เวอร์ชั่นล่าสุด', 'error');
        return;
    }

    const rec = new SR();
    rec.lang = 'th-TH';           // ตั้งเป็นภาษาไทย
    rec.interimResults = false;   // ไม่ต้องแสดงผลระหว่างพูด
    rec.maxAlternatives = 1;      // รับคำตรวจหลักเดียว

    // Handler ปัญหาด้านไมค์
    rec.onerror = e => {
        Swal.close();
        if (e.error === 'not-allowed') {
            Swal.fire('ไม่อนุญาตให้ใช้ไมค์', 'โปรดตรวจสอบสิทธิ์การเข้าถึงไมโครโฟนในการตั้งค่าเบราว์เซอร์ของคุณ', 'error');
        } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
            Swal.fire('ผิดพลาด', 'ระบบฟังเสียงขัดข้องหรือฟังไม่ถนัด ลองใหม่อีกครั้งครับ', 'warning');
        }
    };

    // ปิด popup เมื่อจบการฟัง
    rec.onend = () => {
        if (Swal.isVisible() && Swal.getTitle()?.textContent === '🎙️ ฟังอยู่...') Swal.close();
    };

    // ประมวลผลผลลัพธ์หลังจบการฟัง
    rec.onresult = e => {
        Swal.close();
        const transcript = e.results[0][0].transcript;
        processVoiceCommand(transcript);
    };

    try {
        rec.start(); // Start แบบ Sync เพื่อแก้บั๊ก iOS Safari

        // แสดง UI แจ้งเตือนว่ากำลังฟัง
        Swal.fire({
            title: '🎙️ ฟังอยู่...',
            html: 'พูดชื่อคนที่ลงสนาม หรือเบอร์ลูก<br><span class="text-xs text-gray-500 font-bold mt-1 block">ตัวอย่าง: "ก้อง แทน หมู แมน ลูก 1"</span><span class="text-xs text-indigo-500 block mt-1"><i class="fas fa-magic"></i> พูด "ล้างกระดาน" หรือ "ยืนยัน" เพื่อสั่งงานได้</span>',
            showConfirmButton: true,
            confirmButtonText: '<i class="fas fa-stop-circle"></i> พูดจบแล้ว',
            showCancelButton: true,
            allowOutsideClick: false
        }).then(r => {
            if (r.isConfirmed) rec.stop();
            else if (r.isDismissed) rec.abort();
        });
    } catch (err) {
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเปิดไมค์ได้: ' + err.message, 'error');
    }
}
// --- VOICE COMMAND: Helper Functions ---

/**
 * ดึงเบอร์ลูกจากข้อความเสียง
 * ตัวอย่าง: "ลูก 7 5" → [7, 5]
 */
function extractBallNumbers(text) {
    let balls = [];
    const thMap = { 'หนึ่ง': '1', 'สอง': '2', 'สาม': '3', 'สี่': '4', 'ห้า': '5', 'หก': '6', 'เจ็ด': '7', 'แปด': '8', 'เก้า': '9', 'สิบ': '10', 'สิบเอ็ด': '11', 'สิบสอง': '12' };

    // ค้นหาแบบ "ลูก X", "เบอร์ X", "ใช้ลูก X"
    let numRegex = /(?:ลูก|เบอร์|ใช้ลูก|ลูกที่)\s*(\d+|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบเอ็ด|สิบสอง|สิบ)/g;
    let match;
    while ((match = numRegex.exec(text)) !== null) {
        let val = match[1];
        if (thMap[val]) val = thMap[val];
        if (!balls.includes(val)) balls.push(val);
    }
    text = text.replace(numRegex, ' ');

    // ค้นหาตัวเลขโดดๆ ที่เหลือ
    let pureNumbers = text.split(/\s+/).filter(w => /^\d+$/.test(w));
    pureNumbers.forEach(n => {
        if (!balls.includes(n)) balls.push(n);
    });

    return balls;
}

/**
 * ดึงชื่อผู้เล่นจากข้อความ พร้อม auto-correct ตามชื่อที่มีอยู่
 */
function extractPlayerNames(text) {
    // สร้าง alias list สำหรับจับคู่ชื่อ
    let aliases = [];
    state.masterPlayerList.forEach(n => {
        aliases.push(n); // ชื่อเต็ม (e.g., "ตากฟ้า: สมชาย")
        if (n.includes(': ')) {
            aliases.push(n.split(': ')[1]); // ชื่อย่อ (e.g., "สมชาย")
            aliases.push(n.replace(': ', ' ')); // ชื่อเต็มเว้นวรรค
            aliases.push(n.replace(': ', '')); // ชื่อเต็มติดกัน (e.g., "ตากฟ้าสมชาย")
        }
    });

    // เพิ่ม auto-correct mapping (แกน→แทน, หนู→หมู, เป็นต้น)
    const autoMap = { 'แกน': 'แทน', 'หนู': 'หมู', 'เบน': 'แมน', 'สากล': 'สากดา', 'พี่ปุ้ย': 'พี่ปุ๋ย' };
    Object.keys(autoMap).forEach(k => aliases.push(k));
    Object.values(autoMap).forEach(v => aliases.push(v));

    // เรียงลำดับตามความยาวเพื่อให้ match ชื่อยาวก่อน
    aliases = [...new Set(aliases)].sort((a, b) => b.length - a.length);
    let found = [];
    let t = text;

    // ค้นหาชื่อที่ตรงเป๊ะจากซ้ายไปขวา
    aliases.forEach(a => {
        let i = t.indexOf(a);
        while (i !== -1) {
            found.push({ name: a, i });
            t = t.substring(0, i) + ' '.repeat(a.length) + t.substring(i + a.length);
            i = t.indexOf(a);
        }
    });

    // ค้นหาคำคงเหลือ
    let stopWords = /ทีม\s*[12]|ทีม\s*[ab]|ทีมหนึ่ง|ทีมสอง|ทีมเอ|ทีมบี|คู่กับ|และ|กับ|คู่|เจอ|ปะทะ|ฝั่ง|ทาง|ครับ|ค่ะ|จ้ะ|จ้า|เอ่อ|อ่า|อืม|คือ|แบบว่า|เอา|ลง|เล่น|ตี|จัด|ขอ|หน่อย|คน|ชื่อ/ig;
    let left = t.replace(stopWords, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);

    let searchBase = text;
    left.forEach(w => {
        if (w.length >= 2) {
            let idx = searchBase.indexOf(w);
            if (idx !== -1) {
                found.push({ name: w, i: idx });
                searchBase = searchBase.substring(0, idx) + ' '.repeat(w.length) + searchBase.substring(idx + w.length);
            } else {
                found.push({ name: w, i: 999 });
            }
        }
    });

    // เรียง found ตามตำแหน่งเดิมในข้อความ
    found.sort((a, b) => a.i - b.i);

    // Map กลับเป็นชื่อเต็มใน masterPlayerList หรือชื่อเดิมถ้าไม่มี
    // ใช้ filter แทน find เพื่อตรวจว่า match กี่คน รวม prefix match (เช่น "พี่หนุ่ม" vs "พี่หนุ่มผมยาว")
    return found.map(x => {
        let name = x.name;
        let actual = Object.keys(autoMap).find(k => autoMap[k] === name) ? autoMap[name] || name : name;
        let masters = state.masterPlayerList.filter(m =>
            m === actual ||
            m.replace(': ', ' ') === actual ||
            m.replace(': ', '') === actual ||
            m.endsWith(': ' + actual) ||
            (m.includes(': ') && m.split(': ')[1].toLowerCase().startsWith(actual.toLowerCase()))
        );
        if (masters.length === 1) return masters[0];   // เจอแค่คนเดียว → resolve ได้เลย
        if (masters.length > 1) return actual;          // เจอหลายคน (ambiguous) → คืน short name ให้ scanPenInput จัดการ
        return actual;                                  // ไม่เจอ → คืนเดิม
    });
}

/**
 * ประมวลผลคำสั่งแบบด่วน (shortcuts)
 * คืน true ถ้าประมวลผลแล้ว, false ถ้าต้องประมวลผลต่อ
 */
function handleVoiceShortcuts(cleanText) {
    // ล้างกระดาน
    if (/^(ล้างกระดาน|เริ่มใหม่|เคลียร์|ลบใหม่|เอาใหม่|ล้างข้อมูล|ล้าง)$/.test(cleanText)) {
        PEN_FIELDS.forEach(id => {
            const el = $(id);
            el.value = '';
            el.dataset.confirmed = '';
            el.className = 'court-input';
        });
        document.querySelectorAll('.ball-btn').forEach(b => b.classList.remove('active'));
        currentPenMatchedBalls = [];
        scanPenInput();
        speakText('ล้างกระดานเรียบร้อยแล้ว');
        Swal.fire({ icon: 'info', title: '🧹 ล้างกระดานแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        return true;
    }

    // ยืนยันการเลือก
    if (/^(ยืนยัน|ตกลง|บันทึก|บันทึกทีม|ลงสนาม|เรียบร้อย|โอเค)$/.test(cleanText)) {
        let allG = PEN_FIELDS.every(id => $(id).className.includes('status-green'));
        let hasBalls = currentPenMatchedBalls.length > 0;
        if (allG && hasBalls) {
            speakText('ลงสนามสำเร็จ');
            confirmPenData();
        } else {
            speakText('ข้อมูลยังไม่สมบูรณ์ โปรดตรวจสอบชื่อและเบอร์ลูก');
            Swal.fire({
                icon: 'error',
                title: 'ยังยืนยันไม่ได้',
                text: 'โปรดจัดชื่อให้ครบ 4 คน (สีเขียว) และเลือกเบอร์ลูกก่อน',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }
        return true;
    }

    return false;
}

// --- VOICE COMMAND: Main Processing ---

function processVoiceCommand(transcript) {
    let cleanText = transcript.replace(/\s/g, '').replace(/(ครับ|ค่ะ|นะคะ|นะ|จ้ะ|จ้า)$/g, '');
    let text = transcript.replace(/(ครับ|ค่ะ|นะคะ|นะ|จ้ะ|จ้า)$/g, '').trim();

    // [0] ตรวจสอบคำสั่งแบบด่วนก่อน
    if (handleVoiceShortcuts(cleanText)) return;

    // [1] ดึงเบอร์ลูก
    currentPenMatchedBalls = extractBallNumbers(text);

    // ล้าง text หลังจากดึงตัวเลขออกมา
    let numRegex = /(?:ลูก|เบอร์|ใช้ลูก|ลูกที่)\s*(\d+)/g;
    text = text.replace(numRegex, ' ');
    text = text.replace(/\b\d+\b/g, ' ');

    // [2] ดึงชื่อผู้เล่น
    let playerNames = extractPlayerNames(text);

    // [3] อัปเดต UI ของเบอร์ลูกแบด
    currentPenMatchedBalls.sort((a, b) => a - b);
    document.querySelectorAll('.ball-btn').forEach(btn => {
        if (currentPenMatchedBalls.includes(btn.innerText)) btn.classList.add('active');
    });

    // [4] เติมชื่อลงในช่องที่ยังว่างอยู่ (ไม่ล้างของเดิม)
    let availableFields = PEN_FIELDS.filter(id => !$(id).value.trim());
    playerNames.forEach((name, idx) => {
        if (availableFields[idx]) $(availableFields[idx]).value = name;
    });

    // ตรวจสอบความถูกต้องและแสดง UI ผล
    scanPenInput();

    // ตรวจว่ามี field ที่ yellow เพราะชื่อ match หลายคน (ambiguous prefix)
    let ambiguousFields = PEN_FIELDS.filter(id => {
        let el = $(id);
        if (!el.className.includes('status-yellow')) return false;
        let v = el.value.trim().toLowerCase();
        let prefixCount = state.masterPlayerList.filter(m => {
            let sh = m.includes(': ') ? m.split(': ')[1].toLowerCase() : m.toLowerCase();
            return sh === v || sh.startsWith(v);
        }).length;
        return prefixCount > 1;
    });

    let isWarning = PEN_FIELDS.some(id => {
        let cls = $(id).className;
        return cls.includes('status-yellow') || cls.includes('status-red') || !$(id).value.trim();
    });

    // [5] แสดงผลลัพธ์
    if (ambiguousFields.length > 0) {
        // กรณีชื่อคลุมเครือ: match หลายคน → แจ้งให้จิ้มเลือกจาก QuickPad
        Swal.fire({
            icon: 'warning',
            title: '🔍 ชื่อตรงกับหลายคน',
            text: 'จิ้มเลือกชื่อที่ถูกต้องจากกระดานด้านล่าง',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000
        });
    } else if (isWarning || (playerNames.length > 0 && currentPenMatchedBalls.length === 0)) {
        Swal.fire({
            icon: 'warning',
            title: 'ประมวลผลเสียง',
            text: `ได้ยินว่า: "${transcript}"\nโปรดตรวจสอบหรือจิ้มแก้ชื่อให้เป็นสีเขียว`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000
        });
    } else if (playerNames.length > 0 || currentPenMatchedBalls.length > 0) {
        Swal.fire({
            icon: 'success',
            title: 'รับคำสั่งเสียง!',
            text: `"${transcript}"`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500
        });
    }
}

function toggleShuttlecockSpeed(btn, speed) {
    btn.classList.toggle('active');
    const speedStr = String(speed);
    if (btn.classList.contains('active')) {
        if (!currentGameShuttlecockSpeeds.includes(speedStr)) {
            currentGameShuttlecockSpeeds.push(speedStr);
        }
    } else {
        currentGameShuttlecockSpeeds = currentGameShuttlecockSpeeds.filter(s => s !== speedStr);
    }
    updateShuttlecockDisplay();
}

function updateShuttlecockDisplay() {
    currentGameShuttlecockSpeeds.sort((a, b) => parseInt(a) - parseInt(b));
    $('shuttlecockSpeeds').value = currentGameShuttlecockSpeeds.join(', ');

    const display = $('shuttlecockSpeedsDisplay');
    if (!display) return;

    if (currentGameShuttlecockSpeeds.length === 0) {
        display.innerHTML = '<span class="text-gray-400 text-sm">คลิกเลือกเบอร์ลูกด้านล่าง</span>';
    } else {
        display.innerHTML = currentGameShuttlecockSpeeds.map(s => `<span class="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-sm font-bold px-3 py-1 rounded-full">${s}</span>`).join('');
    }
}

function getGlobalLastShuttlecockSpeeds() {
    const dd = getCurrentDailyData();
    if (dd.games && dd.games.length > 0) {
        const lg = dd.games[dd.games.length - 1];
        if (lg.shuttlecockSpeeds && lg.shuttlecockSpeeds.length > 0) return lg.shuttlecockSpeeds;
    }
    const dates = Object.keys(state.dailyData).sort().reverse();
    for (const d of dates) {
        if (d === currentDailyDate) continue;
        const pGames = state.dailyData[d].games;
        if (pGames && pGames.length > 0) {
            const plg = pGames[pGames.length - 1];
            if (plg.shuttlecockSpeeds && plg.shuttlecockSpeeds.length > 0) return plg.shuttlecockSpeeds;
        }
    }
    return null;
}

function renderShuttlecockSelector() {
    const container = $('shuttlecockSpeedButtons');
    if (!container) return;

    let buttonsHtml = '';
    for (let i = 1; i <= 12; i++) {
        const isActive = currentGameShuttlecockSpeeds.includes(String(i));
        buttonsHtml += `<button onclick="toggleShuttlecockSpeed(this, ${i})" class="shuttle-speed-btn ${isActive ? 'active' : ''}">${i}</button>`;
    }
    container.innerHTML = buttonsHtml;

    const indicator = $('lastShuttlecockIndicator');
    if (!indicator) return;
    indicator.innerHTML = '';
    const lastSpeeds = getGlobalLastShuttlecockSpeeds();
    if (lastSpeeds) {
        const lastUsed = Math.max(...lastSpeeds.map(s => parseInt(s, 10)).filter(n => !isNaN(n)));
        if (isFinite(lastUsed)) {
            indicator.innerHTML = `ลูกล่าสุด: <b class="text-indigo-600 dark:text-indigo-400">${lastUsed}</b>`;
        }
    }
}

// --- RECORD GAME ---
function recordGame() {
    const p = PLAYER_FIELDS.map(id => $(id).value).filter(Boolean);
    if (new Set(p).size !== 4) { Swal.fire('ผิดพลาด', 'เลือก 4 คนไม่ซ้ำกัน', 'error'); return; }
    const pr = Math.max(0, parseFloat($('shuttlecockPrice').value) || state.settings.shuttlecockPrice || 0);
    const sp = $('shuttlecockSpeeds').value.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    if (!sp.length) { Swal.fire('ผิดพลาด', 'ใส่เบอร์ลูก', 'error'); return; }
    _isDailyDirty = true; state.settings.shuttlecockPrice = pr;

    const dd = getCurrentDailyData();
    if (_editGameId !== null) {
        let g = dd.games.find(x => x.id === _editGameId);
        if (g) { g.players = p; g.shuttlecocksUsed = sp.length; g.shuttlecockPrice = pr; g.shuttlecockSpeeds = sp; }
        cancelEditGame();
        Swal.fire({ icon: 'success', title: 'อัปเดตเกมสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } else {
        dd.games.push({ id: ++_gameIdCounter, players: p, shuttlecocksUsed: sp.length, shuttlecockPrice: pr, shuttlecockSpeeds: sp });
        $('shuttlecockSpeeds').value = '';
        currentGameShuttlecockSpeeds = [];
        currentGameSelection = { player1: '', player2: '', player3: '', player4: '' };
    }
    updateAndRender();
}

function editGame(id) {
    const dd = getCurrentDailyData();
    const g = dd.games.find(x => x.id === id);
    if (!g) return;
    _editGameId = id;

    // ตรวจสอบและดึงตัวผู้เล่นที่อาจจะถูกซ่อน (absent) กลับมาในรายชื่อ (Dropdown) ก่อนแก้ไข
    let needRender = false;
    g.players.forEach(name => {
        if (name) {
            let p = dd.players.find(x => x.name === name);
            if (!p) { dd.players.push({ name: name, paid: false, present: true }); needRender = true; }
            else if (!p.present) { p.present = true; needRender = true; }
        }
    });

    PLAYER_FIELDS.forEach((pid, i) => { currentGameSelection[pid] = g.players[i] || ''; });

    if (needRender) updateAndRender();
    else PLAYER_FIELDS.forEach((pid, i) => { $(pid).value = g.players[i] || ''; });

    $('shuttlecockSpeeds').value = (g.shuttlecockSpeeds || []).join(', ');
    currentGameShuttlecockSpeeds = [...(g.shuttlecockSpeeds || [])].map(String);
    $('shuttlecockPrice').value = g.shuttlecockPrice || state.settings.shuttlecockPrice || 0;
    renderShuttlecockSelector(); // ซิงค์ active state ของปุ่มเบอร์ลูกให้ตรงกับข้อมูลที่ load มา

    const btn = $('btnRecordGame');
    btn.innerHTML = '<i class="fas fa-save"></i> อัปเดตเกม'; btn.classList.replace('btn-success', 'btn-warning');
    $('btnCancelEditGame').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEditGame() {
    _editGameId = null; $('shuttlecockSpeeds').value = ''; currentGameSelection = { player1: '', player2: '', player3: '', player4: '' };
    currentGameShuttlecockSpeeds = [];
    PLAYER_FIELDS.forEach(id => { $(id).value = ''; });
    const btn = $('btnRecordGame');
    btn.innerHTML = '<i class="fas fa-plus-circle"></i>บันทึกเกมนี้'; btn.classList.replace('btn-warning', 'btn-success');
    $('btnCancelEditGame').classList.add('hidden'); updateAndRender();
}

function moveGame(idx, dir) {
    const dd = getCurrentDailyData();
    if (dir === -1 && idx > 0) { let t = dd.games[idx]; dd.games[idx] = dd.games[idx - 1]; dd.games[idx - 1] = t; }
    else if (dir === 1 && idx < dd.games.length - 1) { let t = dd.games[idx]; dd.games[idx] = dd.games[idx + 1]; dd.games[idx + 1] = t; }
    updateAndRender();
}

function deleteGame(idx) {
    const dd = getCurrentDailyData(); if (_editGameId === dd.games[idx].id) cancelEditGame();
    dd.games.splice(idx, 1);
    updateAndRender();
}

// --- RENDER LOGIC ---
function syncAllDailyToAccount() {
    // 1. ล้างรายการที่มาจากระบบรายวันทั้งหมดทิ้ง (เก็บไว้เฉพาะหนี้ที่ตั้งมือ)
    state.allTransactions = state.allTransactions.filter(t => t.isAutoDaily !== true);
    state.allPayments = state.allPayments.filter(p => p.isAutoDaily !== true);
    
    // 2. คำนวณใหม่จากทุกวันใน dailyData
    Object.keys(state.dailyData).forEach(date => {
        if (!date || date === 'undefined' || date === 'null') return;
        const dd = state.dailyData[date]; 
        if (!dd.players || !dd.games) return;
        
        let det = {}; 
        
        // กวาดผู้เล่นจากทั้ง dd.players และ g.players เพื่อป้องกันการตกหล่น
        dd.players.forEach(p => det[p.name] = { cost: (p.extraCost || 0), isPaid: p.paid });
        dd.games.forEach(g => { 
            let c = (g.shuttlecocksUsed * (g.shuttlecockPrice || 0)) / 4; 
            g.players.forEach(p => { 
                if (!det[p]) { 
                    let px = dd.players.find(x => x.name === p); 
                    det[p] = { cost: (px ? px.extraCost || 0 : 0), isPaid: (px ? px.paid : false) }; 
                } 
                det[p].cost += c; 
            }); 
        });
        
        Object.keys(det).forEach(name => { 
            if (det[name].cost > TOLERANCE) {
                // สร้าง Transaction สำหรับทุกคนที่มี cost > 0
                state.allTransactions.push({ 
                    id: Date.now() + Math.random(), 
                    date: date, 
                    name: name, 
                    totalCost: det[name].cost, 
                    isAutoDaily: true 
                });
                
                // ถ้าระบุว่าจ่ายแล้ว ให้สร้าง Payment หักล้างทันที (ป้องกัน Bug บัญชีรวมค้าง แต่รายวันจ่ายแล้ว)
                if (det[name].isPaid) {
                    state.allPayments.push({ 
                        id: Date.now() + Math.random(), 
                        date: date, 
                        name: name, 
                        amount: det[name].cost, 
                        isAutoDaily: true 
                    });
                }
            }
        });
    });
}


function updateAndRender(skipSave = false) { syncAllDailyToAccount(); if (skipSave !== true) saveToStorage(); renderDaily(); renderAccount(); renderHistory(); updateShuttlecockDisplay(); }
function switchTab(name) { document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden')); document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); document.getElementById(`tab-${name}`).classList.remove('hidden'); document.querySelector(`[data-tab="${name}"]`).classList.add('active'); }

function renderDaily() {
    renderPrefixDropdowns();
    const dd = getCurrentDailyData();
    const searchQuery = (document.getElementById('searchDailyPlayer').value || '').toLowerCase();

    // 1. Players
    let pList = [...new Set([...state.masterPlayerList, ...dd.players.map(x => x.name)])].sort((a, b) => a.localeCompare(b, 'th'));
    if (searchQuery) pList = pList.filter(n => n.toLowerCase().includes(searchQuery));

    document.getElementById('playerList').innerHTML = pList.map(n => {
        let isP = dd.players.find(x => x.name === n)?.present; let col = getPlayerColor(n);
        let sh = n.includes(': ') ? n.split(': ')[1] : n; let px = n.includes(': ') ? n.split(': ')[0] : '';
        let nEscaped = escapeHtml(escapeJsString(n));
        return `<div class="player-chip ${isP ? '' : 'absent'}" style="${isP ? `background:${col.bg};border-color:${col.border};color:${col.text}` : ''}" onclick="if(!event.target.closest('button')) togglePlayer('${nEscaped}')">
            <div class="flex gap-1 overflow-hidden"><i class="fas ${isP ? 'fa-user-check' : 'fa-user'} text-xs mt-1"></i><div><div class="text-[10px] opacity-70">${escapeHtml(px)}</div><div class="text-sm font-bold">${escapeHtml(sh)}</div></div></div>
            <div class="chip-actions"><button onclick="document.getElementById('rename-old-name').value='${nEscaped}'; document.getElementById('rename-new-name').value='${nEscaped}'; document.getElementById('rename-modal').classList.remove('hidden');" class="btn btn-ghost p-1"><i class="fas fa-edit"></i></button><button onclick="deletePlayer('${nEscaped}')" class="btn btn-ghost text-red-500 p-1"><i class="fas fa-trash-alt"></i></button></div>
        </div>`;
    }).join('');

    // 2. Dropdowns
    const prs = dd.players.filter(p => p.present).sort((a, b) => a.name.localeCompare(b.name, 'th'));
    const opts = '<option value="">-- เลือก --</option>' + prs.map(p => {
        let n = p.name; let sh = n.includes(': ') ? n.split(': ')[1] : n; let px = n.includes(': ') ? n.split(': ')[0] : '';
        let display = px ? `${sh} (${px})` : sh;
        return `<option value="${escapeHtml(n)}">${escapeHtml(display)}</option>`;
    }).join('');
    ['player1', 'player2', 'player3', 'player4'].forEach(id => { const el = document.getElementById(id); el.innerHTML = opts; el.value = currentGameSelection[id] || ''; });

    renderShuttlecockSelector();

    // 3 & 4. Games & Summary
    let totalB = dd.games.reduce((s, g) => s + (g.shuttlecocksUsed || 0), 0);
    document.getElementById('shuttlecockSpeedSummary').innerHTML = `รวมเกม: ${dd.games.length} | รวมลูก: ${totalB}`;
    if (dd.games.length === 0) {
        document.getElementById('gamesList').innerHTML = `
            <div class="col-span-full py-10 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                <div class="w-16 h-16 bg-white dark:bg-slate-800 shadow-sm rounded-full flex items-center justify-center mb-3 text-gray-300 dark:text-gray-500">
                    <i class="fas fa-table-tennis text-3xl"></i>
                </div>
                <h3 class="text-gray-600 dark:text-gray-300 font-bold text-base mb-1">ยังไม่มีเกมที่บันทึก</h3>
                <p class="text-gray-400 dark:text-gray-500 text-sm max-w-xs px-2">เพิ่มผู้เล่นลงสนามแล้วกด <span class="font-semibold text-green-600 dark:text-green-500">บันทึกเกมนี้</span> หรือใช้ <span class="font-semibold text-indigo-500">กระดานจัดทัพ</span> เพื่อเริ่มเกมแรก</p>
            </div>
        `;
    } else {
        document.getElementById('gamesList').innerHTML = dd.games.map((g, i) => {
            let c = ((g.shuttlecocksUsed || 0) * (g.shuttlecockPrice || 0) / 4).toFixed(2);
            let fN = n => { if (!n) return '-'; let sh = n.includes(': ') ? n.split(': ')[1] : n; let px = n.includes(': ') ? n.split(': ')[0] : ''; return px ? `${sh}(${px})` : sh; };

            return `<div class="game-card flex flex-col p-3 transition-shadow hover:shadow-md ${g.id === _editGameId ? 'border-yellow-400 bg-yellow-50 shadow-md ring-1 ring-yellow-400' : 'bg-white dark:bg-slate-800'}">
                <div class="flex flex-wrap justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-slate-700">
                    <span class="font-bold text-gray-800 dark:text-gray-200"><i class="fas fa-flag-checkered text-indigo-500 mr-1"></i> เกม ${i + 1}</span>
                    <div class="flex gap-1 bg-gray-50 dark:bg-slate-700 rounded-md p-0.5">
                        <button onclick="moveGame(${i}, -1)" class="btn-ghost px-2 py-1 text-gray-500 hover:text-indigo-600 rounded" title="เลื่อนขึ้น" ${i === 0 ? 'disabled style="opacity:0.3"' : ''}><i class="fas fa-arrow-up text-xs"></i></button>
                        <button onclick="moveGame(${i}, 1)" class="btn-ghost px-2 py-1 text-gray-500 hover:text-indigo-600 rounded" title="เลื่อนลง" ${i === dd.games.length - 1 ? 'disabled style="opacity:0.3"' : ''}><i class="fas fa-arrow-down text-xs"></i></button>
                        <div class="w-px bg-gray-200 dark:bg-slate-600 my-1"></div>
                        <button onclick="editGame(${g.id})" class="btn-ghost px-2 py-1 text-blue-500 hover:text-blue-700 rounded" title="แก้ไข"><i class="fas fa-edit text-xs"></i></button>
                        <button onclick="deleteGame(${i})" class="btn-ghost px-2 py-1 text-red-500 hover:text-red-700 rounded" title="ลบ"><i class="fas fa-trash-alt text-xs"></i></button>
                    </div>
                </div>
                <div class="space-y-1.5 flex-1">
                    <div class="flex items-start gap-2"><span class="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 mt-0.5 shrink-0">ทีม A</span><span class="text-sm text-gray-700 dark:text-gray-300 font-medium leading-tight">${escapeHtml(fN(g.players[0]))}, ${escapeHtml(fN(g.players[1]))}</span></div>
                    <div class="flex items-start gap-2"><span class="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800 mt-0.5 shrink-0">ทีม B</span><span class="text-sm text-gray-700 dark:text-gray-300 font-medium leading-tight">${escapeHtml(fN(g.players[2]))}, ${escapeHtml(fN(g.players[3]))}</span></div>
                </div>
                <div class="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-xs">
                    <div class="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><div class="bg-gray-100 dark:bg-slate-700 rounded-full w-5 h-5 flex items-center justify-center"><i class="fas fa-circle-dot text-[10px] text-gray-400"></i></div><span class="truncate max-w-[120px]" title="${g.shuttlecockSpeeds.join(',')}">ลูก ${g.shuttlecockSpeeds.join(',')}</span></div>
                    <div class="font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-md">${c} บ./คน</div>
                </div>
            </div>`;
        }).join('');
    }

    // 5. Cost Table
    let details = {};
    dd.players.forEach(p => details[p.name] = { n: p.name, cost: (p.extraCost || 0), extraCost: (p.extraCost || 0), p: p.paid, games: 0, speeds: [] });

    dd.games.forEach(game => {
        let costPerPlayer = (game.shuttlecocksUsed * (game.shuttlecockPrice || 0)) / 4;
        game.players.forEach(playerName => {
            if (!details[playerName]) {
                let px = dd.players.find(x => x.name === playerName);
                details[playerName] = { n: playerName, cost: (px ? px.extraCost || 0 : 0), extraCost: (px ? px.extraCost || 0 : 0), p: false, games: 0, speeds: [] };
            }
            details[playerName].cost += costPerPlayer;
            details[playerName].games++;
            if (game.shuttlecockSpeeds) details[playerName].speeds.push(...game.shuttlecockSpeeds);
        });
    });
    let un = '', pd = '', grand = 0;
    const sum = calculateOverallBalances();
    Object.values(details).filter(x => x.cost > 0).sort((a, b) => a.n.localeCompare(b.n, 'th')).forEach(d => {
        grand += d.cost;
        let b = sum[d.n] ? sum[d.n].d - sum[d.n].p : 0;
        let isPaidToday = d.p || (b <= TOLERANCE);

        let statusBadge = '';
        if (d.p) {
            statusBadge = '<span class="text-green-600 font-bold">จ่ายแล้ว</span>';
        } else if (isPaidToday) {
            let remainingCredit = -b;
            let creditText = remainingCredit % 1 === 0 ? remainingCredit.toFixed(0) : remainingCredit.toFixed(2);
            statusBadge = `<span class="text-blue-600 font-bold" title="หักลบจากเครดิตคงเหลือในบัญชีอัตโนมัติ">จ่ายแล้ว (เครดิต: ฿${creditText})</span>`;
        } else {
            let debtText = b % 1 === 0 ? b.toFixed(0) : b.toFixed(2);
            if (b > d.cost + TOLERANCE) {
                statusBadge = `<span class="text-red-600 font-bold" title="ยอดค้างชำระสะสมทั้งหมดในบัญชี">ค้างชำระ (สะสม: ฿${debtText})</span>`;
            } else if (b < d.cost - TOLERANCE) {
                statusBadge = `<span class="text-red-600 font-bold" title="ยอดค้างชำระสุทธิหลังหักลบเครดิตเดิม">ค้างชำระ (สุทธิ: ฿${debtText})</span>`;
            } else {
                statusBadge = '<span class="text-red-600 font-bold">ค้างชำระ</span>';
            }
        }

        let spds = [...new Set(d.speeds)].join(', ') || '-';
        let nameJsEscaped = escapeHtml(escapeJsString(d.n));
        let qrBtn = (!isPaidToday && state.settings.promptpayId && b > TOLERANCE) ? `<button onclick="showDailyQR('${nameJsEscaped}', ${b}, ${d.cost})" class="btn btn-sm btn-indigo" title="สแกน QR Code"><i class="fas fa-qrcode"></i></button>` : '';
        let costDisplay = `<div class="flex items-center justify-center gap-1 cursor-pointer group" onclick="addExtraCost('${nameJsEscaped}')" title="คลิกเพื่อบวกค่าจิปาถะ">
            ${d.extraCost > 0 ? `<span class="text-[10px] text-indigo-500 bg-indigo-50 px-1 rounded border border-indigo-100">+${d.extraCost.toFixed(0)}</span>` : ''}
            <span>${d.cost.toFixed(2)}</span>
            <i class="fas fa-plus-circle ${d.extraCost > 0 ? 'text-indigo-500' : 'text-gray-300 group-hover:text-indigo-500'} transition-colors"></i>
        </div>`;
        // Phase 1: "จ่าย" เรียก openPaymentModal (ยอดสุทธิรวมหนี้สะสม + autoReconcile)
        //          "ยกเลิก" เรียก togglePlayerPaidStatus เหมือนเดิม (undo flag เฉพาะวัน)
        let payBtn = d.p
            ? `<button onclick="togglePlayerPaidStatus('${nameJsEscaped}')" class="btn btn-sm btn-secondary">ยกเลิก</button>`
            : `<button onclick="openPaymentModal('${nameJsEscaped}')" class="btn btn-sm btn-warning">จ่าย</button>`;
        let row = `<tr><td class="sticky-col">${escapeHtml(d.n)}</td><td class="text-center">${d.games}</td><td class="text-center text-xs text-gray-500">${escapeHtml(spds)}</td><td class="text-center font-bold">${costDisplay}</td><td class="text-center">${statusBadge}</td><td class="text-center"><div class="flex justify-center items-center gap-1">${payBtn}${qrBtn}</div></td></tr>`;
        if (isPaidToday) pd += row; else un += row;
    });
    document.getElementById('summaryTableUnpaid').innerHTML = un; document.getElementById('summaryTablePaid').innerHTML = pd; document.getElementById('grandTotal').innerText = grand.toFixed(2);

}

function showDailyQR(name, totalAmount, dailyCost) {
    const ppId = state.settings.promptpayId;
    const ppName = state.settings.promptpayName ? `<div class="text-sm font-bold text-indigo-700 mt-1">${escapeHtml(state.settings.promptpayName)}</div>` : '';
    if (!ppId) return Swal.fire('ผิดพลาด', 'กรุณาตั้งค่าเบอร์พร้อมเพย์ในแท็บตั้งค่าระบบก่อน', 'warning');

    let breakdownHtml = '';
    if (totalAmount > dailyCost + TOLERANCE) {
        let prevDebt = totalAmount - dailyCost;
        breakdownHtml = `
            <div class="text-sm text-gray-500 mt-2 border-t pt-2 space-y-1">
                <div class="flex justify-between"><span>ยอดเล่นวันนี้:</span> <span class="font-medium">฿${dailyCost.toFixed(2)}</span></div>
                <div class="flex justify-between"><span>ยอดค้างเก่าสะสม:</span> <span class="font-medium text-red-500">+฿${prevDebt.toFixed(2)}</span></div>
            </div>
        `;
    } else if (totalAmount < dailyCost - TOLERANCE) {
        let creditOffset = dailyCost - totalAmount;
        breakdownHtml = `
            <div class="text-sm text-gray-500 mt-2 border-t pt-2 space-y-1">
                <div class="flex justify-between"><span>ยอดเล่นวันนี้:</span> <span class="font-medium">฿${dailyCost.toFixed(2)}</span></div>
                <div class="flex justify-between"><span>หักเครดิตเก่า:</span> <span class="font-medium text-blue-500">-฿${creditOffset.toFixed(2)}</span></div>
            </div>
        `;
    }

    Swal.fire({
        title: 'สแกนเพื่อชำระเงิน',
        html: `
            <div class="text-lg mb-2"><b>${name}</b></div>
            <div class="text-base text-gray-600 dark:text-gray-400">ยอดต้องชำระสุทธิ: <span class="text-red-600 font-bold text-xl">฿${totalAmount.toFixed(2)}</span></div>
            ${breakdownHtml}
            ${ppName}
        `,
        imageUrl: `https://promptpay.io/${ppId}/${totalAmount.toFixed(2)}?t=${Date.now()}`,
        imageWidth: 220,
        imageHeight: 220,
        imageAlt: 'PromptPay QR',
        confirmButtonText: 'ปิด'
    });
}

function openDailyGroupBillModal() {
    const dd = getCurrentDailyData();
    let details = {};
    dd.players.forEach(p => details[p.name] = { cost: (p.extraCost || 0), p: p.paid });
    dd.games.forEach(game => {
        let costPerPlayer = (game.shuttlecocksUsed * (game.shuttlecockPrice || 0)) / 4;
        game.players.forEach(playerName => {
            if (!details[playerName]) { let px = dd.players.find(x => x.name === playerName); details[playerName] = { cost: (px ? px.extraCost || 0 : 0), p: false }; }
            details[playerName].cost += costPerPlayer;
        });
    });

    // คัดเฉพาะคนที่มียอดต้องจ่ายในวันนี้ และยังไม่ได้จ่าย
    const unpaid = Object.keys(details)
        .map(name => ({ n: name, cost: details[name].cost, p: details[name].p }))
        .filter(x => x.cost > TOLERANCE && !x.p)
        .sort((a, b) => a.n.localeCompare(b.n, 'th'));

    if (unpaid.length < 2) return Swal.fire('ข้อมูลไม่พอ', 'ต้องมีผู้ค้างชำระของวันนี้อย่างน้อย 2 คนจึงจะรวมบิลได้', 'info');

    let html = '<div class="text-left space-y-2 max-h-[50vh] overflow-y-auto p-2">';
    unpaid.forEach((x) => {
        html += `<label class="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer transition-colors">
            <input type="checkbox" class="w-5 h-5 daily-group-bill-cb accent-indigo-600 rounded" value="${escapeHtml(x.n)}" data-debt="${x.cost}">
            <span class="flex-1 font-bold text-gray-800 dark:text-gray-200">${escapeHtml(x.n)}</span>
            <span class="text-red-600 font-bold">฿${x.cost.toFixed(2)}</span>
        </label>`;
    });
    html += '</div>';

    Swal.fire({
        title: 'เลือกรวมบิลกลุ่ม (ประจำวัน)',
        html: html,
        showCancelButton: true,
        confirmButtonText: 'รวมบิล',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#8b5cf6',
        preConfirm: () => {
            const selected = Array.from(document.querySelectorAll('.daily-group-bill-cb:checked'));
            if (selected.length < 2) { Swal.showValidationMessage('กรุณาเลือกอย่างน้อย 2 คน'); return false; }
            return selected.map(cb => ({ name: cb.value, debt: parseFloat(cb.dataset.debt) }));
        }
    }).then(res => { if (res.isConfirmed) showGroupBillResult(res.value, true); });
}

function showGlobalQR() {
    const ppId = state.settings.promptpayId;
    const ppName = state.settings.promptpayName ? `<div class="text-sm font-bold text-indigo-700 mt-1">${escapeHtml(state.settings.promptpayName)}</div>` : '';
    if (!ppId) return Swal.fire('ผิดพลาด', 'กรุณาตั้งค่าเบอร์พร้อมเพย์ในแท็บตั้งค่าระบบก่อน', 'warning');
    Swal.fire({
        title: 'สแกนเพื่อโอนเงิน',
        html: `<div class="text-sm text-gray-500 mb-2">พร้อมเพย์: ${ppId}</div>${ppName}<div class="text-xs text-gray-400 mt-1">สแกนแล้วระบุยอดเงินด้วยตนเอง</div>`,
        imageUrl: `https://promptpay.io/${ppId}.png?t=${Date.now()}`,
        imageWidth: 220,
        imageHeight: 220,
        imageAlt: 'PromptPay QR',
        confirmButtonText: 'ปิด'
    });
}

function showAccountQR(name, amount) {
    const ppId = state.settings.promptpayId;
    const ppName = state.settings.promptpayName ? `<div class="text-sm font-bold text-indigo-700 mt-1">${escapeHtml(state.settings.promptpayName)}</div>` : '';
    if (!ppId) return Swal.fire('ผิดพลาด', 'กรุณาตั้งค่าเบอร์พร้อมเพย์ในแท็บตั้งค่าระบบก่อน', 'warning');
    Swal.fire({
        title: 'สแกนเพื่อชำระเงิน',
        html: `<div class="text-lg mb-2"><b>${name}</b></div>ยอดค้างชำระ: <span class="text-red-600 font-bold text-xl">฿${amount.toFixed(2)}</span>${ppName}`,
        imageUrl: `https://promptpay.io/${ppId}/${amount.toFixed(2)}`,
        imageWidth: 220,
        imageHeight: 220,
        imageAlt: 'PromptPay QR',
        confirmButtonText: 'ปิด'
    });
}

function calculateOverallBalances() {
    const sum = {};
    // 1. รวบรวมรายชื่อผู้เล่นทั้งหมดจากทุกธุรกรรมและการชำระเงินเพื่อให้ไม่ตกหล่น
    const allPlayerNames = new Set([
        ...state.masterPlayerList,
        ...state.allTransactions.map(t => t.name),
        ...state.allPayments.map(p => p.name)
    ]);

    // 2. สร้าง object เริ่มต้นสำหรับผู้เล่นทุกคน
    allPlayerNames.forEach(name => {
        if (name) { // ป้องกันชื่อที่เป็นค่าว่าง
            sum[name] = { n: name, d: 0, p: 0 };
        }
    });

    // 3. วนลูปเพื่อบวกยอดหนี้และยอดชำระ
    state.allTransactions.forEach(t => { if (sum[t.name]) sum[t.name].d += t.totalCost; });
    state.allPayments.forEach(p => { if (sum[p.name]) sum[p.name].p += p.amount; });

    return sum;
}

function renderAccount() {
    const searchQuery = (document.getElementById('searchAccountInput').value || '').toLowerCase();
    const sum = calculateOverallBalances();
    let un = '', cr = '', pf = '', tu = 0, tc = 0;

    let sortedPlayers = Object.values(sum).sort((a, b) => a.n.localeCompare(b.n, 'th'));

    sortedPlayers.forEach(x => {
        if (searchQuery && !x.n.toLowerCase().includes(searchQuery)) return;

        let b = x.d - x.p;
        let nameHtml = escapeHtml(x.n);
        let nameJsEscaped = escapeHtml(escapeJsString(x.n));
        let displayChar = nameHtml.includes(': ') ? nameHtml.split(': ')[1].charAt(0) : nameHtml.charAt(0);
        let avatarChar = displayChar.toUpperCase();

        if (b > TOLERANCE) {
            tu += b;
            let qrBtn = state.settings.promptpayId ? `<button onclick="showAccountQR('${nameJsEscaped}', ${b})" class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400 transition-colors shrink-0" title="สแกน QR Code"><i class="fas fa-qrcode"></i></button>` : '';
            un += `<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-white dark:bg-slate-800 border-l-4 border-red-500 border border-gray-100 dark:border-slate-700 shadow-sm rounded-r-xl gap-3 transition-all hover:shadow-md">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center font-bold text-lg shrink-0">${avatarChar}</div>
                    <div class="cursor-pointer group" onclick="showDebtDetails('${nameJsEscaped}', ${b})" title="คลิกเพื่อดูรายละเอียด">
                        <div class="font-bold text-gray-800 dark:text-gray-200 break-all leading-tight group-hover:text-indigo-600 transition-colors">${nameHtml} <i class="fas fa-info-circle text-[10px] text-gray-400 group-hover:text-indigo-500 ml-1"></i></div>
                        <div class="text-red-500 font-bold text-xs mt-0.5">ค้าง ${b.toFixed(2)}</div>
                    </div>
                </div>
                <div class="flex gap-1.5 w-full sm:w-auto justify-end">
                    ${qrBtn}
                    <button onclick="generatePersonalSlip('${nameJsEscaped}', ${b})" class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center bg-teal-100 text-teal-600 hover:bg-teal-200 dark:bg-teal-900/40 dark:text-teal-400 transition-colors shrink-0" title="แชร์/บันทึกใบเสร็จ"><i class="fas fa-file-invoice-dollar"></i></button>
                    <button onclick="sendPersonalLineReminder('${nameJsEscaped}', ${b})" class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400 transition-colors shrink-0" title="คัดลอกข้อความ LINE"><i class="fab fa-line"></i></button>
                    <button class="btn btn-sm btn-success px-3 sm:px-4 shadow-sm shrink-0 ml-1" onclick="openPaymentModal('${nameJsEscaped}')"><i class="fas fa-hand-holding-usd"></i> จ่าย</button>
                </div>
            </div>`;
        }
        else if (b < -TOLERANCE) {
            tc -= b;
            cr += `<div class="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border-l-4 border-blue-500 border border-gray-100 dark:border-slate-700 shadow-sm rounded-r-xl gap-2 transition-all hover:shadow-md">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">${avatarChar}</div>
                    <div class="font-bold text-gray-800 dark:text-gray-200 break-all leading-tight">${nameHtml}</div>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full text-xs whitespace-nowrap">เครดิต ${(-b).toFixed(2)}</span>
                    <button class="btn btn-sm btn-success px-2.5 py-1 shadow-sm shrink-0" onclick="openPaymentModal('${nameJsEscaped}')" title="เติมเงินล่วงหน้า"><i class="fas fa-plus"></i> เติมเงิน</button>
                </div>
            </div>`;
        }
        else {
            pf += `<div class="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border-l-4 border-green-500 border border-gray-100 dark:border-slate-700 shadow-sm rounded-r-xl gap-2 opacity-75 hover:opacity-100 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center font-bold text-lg shrink-0">${avatarChar}</div>
                    <div class="font-bold text-gray-800 dark:text-gray-200 break-all leading-tight">${nameHtml}</div>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-green-600 font-bold text-xs whitespace-nowrap"><i class="fas fa-check-circle mr-1"></i>ไม่มีค้างชำระ</span>
                    <button class="btn btn-sm btn-success px-2.5 py-1 shadow-sm shrink-0" onclick="openPaymentModal('${nameJsEscaped}')" title="เติมเงินล่วงหน้า"><i class="fas fa-plus"></i> เติมเงิน</button>
                </div>
            </div>`;
        }
    });

    document.getElementById('unpaid-list-overall').innerHTML = un || '<div class="text-sm text-gray-400 col-span-full text-center py-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">ไม่มีผู้ค้างชำระ 🎉</div>';
    document.getElementById('credit-list-overall').innerHTML = cr || '<div class="text-sm text-gray-400 col-span-full text-center py-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">ไม่มีผู้มีเครดิต</div>';
    document.getElementById('paid-in-full-list-overall').innerHTML = pf || '<div class="text-sm text-gray-400 col-span-full text-center py-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">ไม่มีผู้ที่ชำระครบแล้ว</div>';
    document.getElementById('total-unpaid-overall').innerText = '฿' + tu.toFixed(2);
    document.getElementById('total-credit-overall').innerText = '฿' + tc.toFixed(2);
}

function showDebtDetails(name, amount) {
    let txsByDate = {};
    state.allTransactions.filter(t => t.name === name).forEach(t => {
        if (!txsByDate[t.date]) txsByDate[t.date] = 0;
        txsByDate[t.date] += t.totalCost;
    });
    let sortedDates = Object.keys(txsByDate).sort((a, b) => a.localeCompare(b));
    let totalPaid = state.allPayments.filter(p => p.name === name).reduce((sum, p) => sum + p.amount, 0);

    let detailsHTML = '<div class="text-left space-y-3 mt-2">';
    let hasDetails = false;
    sortedDates.forEach(date => {
        let cost = txsByDate[date];
        if (totalPaid >= cost - TOLERANCE) { totalPaid -= cost; }
        else {
            let remain = cost - totalPaid;
            if (remain > TOLERANCE) {
                hasDetails = true;
                let shuttlesCount = 0, gamesCount = 0;
                if (state.dailyData[date] && state.dailyData[date].games) {
                    state.dailyData[date].games.forEach(g => {
                        if (g.players.includes(name)) { shuttlesCount += (g.shuttlecocksUsed || 0); gamesCount++; }
                    });
                }
                let pData = state.dailyData[date]?.players?.find(p => p.name === name);
                let extra = pData ? (pData.extraCost || 0) : 0;
                let extraStr = extra > 0 ? ` <span class="text-indigo-500 font-bold">+ จิปาถะ ${extra} บ.</span>` : '';
                let ext = gamesCount > 0 ? `<div class="text-xs text-gray-500 mt-0.5">ตี ${gamesCount} เกม (ลูกรวมกลุ่ม ${shuttlesCount} ลูก)${extraStr}</div>` : (extra > 0 ? `<div class="text-xs text-gray-500 mt-0.5"><span class="text-indigo-500 font-bold">ค่าจิปาถะ ${extra} บ.</span></div>` : '');

                detailsHTML += `
                <div class="flex justify-between items-start p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                    <div>
                        <div class="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><div class="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 w-6 h-6 rounded flex items-center justify-center"><i class="fas fa-calendar-day text-[10px]"></i></div> ${date}</div>
                        ${ext}
                    </div>
                    <div class="font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">฿${remain.toFixed(2)}</div>
                </div>`;
            }
            totalPaid = 0;
        }
    });
    detailsHTML += '</div>';

    if (!hasDetails) detailsHTML = '<div class="text-gray-500 py-4 text-center">ไม่พบรายละเอียดที่มาของยอดค้าง<br><span class="text-xs">(อาจเป็นยอดยกมา หรือชำระครบแล้ว)</span></div>';

    Swal.fire({
        title: `รายละเอียดค้างชำระ`,
        html: `<div class="text-lg font-bold text-indigo-700 dark:text-indigo-400 mb-1">${escapeHtml(name)}</div>
               <div class="text-sm text-gray-600 dark:text-gray-400 mb-2 border-b border-gray-200 dark:border-slate-700 pb-2">ยอดค้างรวม: <span class="text-red-600 font-bold text-lg ml-1">฿${amount.toFixed(2)}</span></div>
               <div class="max-h-[50vh] overflow-y-auto px-1">${detailsHTML}</div>`,
        showConfirmButton: true,
        confirmButtonText: 'ปิดหน้าต่าง',
        confirmButtonColor: '#64748b'
    });
}

function generatePersonalSlip(name, amount) {
    const ppId = state.settings.promptpayId;
    if (ppId) {
        Swal.fire({
            title: 'ตัวเลือกใบเสร็จ',
            text: 'ต้องการแสดงเบอร์พร้อมเพย์ในใบเสร็จด้วยหรือไม่?',
            icon: 'question',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '✅ แสดง',
            denyButtonText: '❌ ซ่อน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#10b981',
            denyButtonColor: '#64748b'
        }).then((result) => {
            if (result.isConfirmed) _doGeneratePersonalSlip(name, amount, true);
            else if (result.isDenied) _doGeneratePersonalSlip(name, amount, false);
        });
    } else {
        _doGeneratePersonalSlip(name, amount, false);
    }
}

function _doGeneratePersonalSlip(name, amount, showPP) {
    const slip = $('slip-template');
    $('slip-date').innerText = `วันที่ออกบิล: ${getTodayString()}`;
    $('slip-name').innerText = `คุณ: ${name}`;
    $('slip-total').innerText = `฿${amount.toFixed(2)}`;

    let txsByDate = {};
    state.allTransactions.filter(t => t.name === name).forEach(t => {
        if (!txsByDate[t.date]) txsByDate[t.date] = 0;
        txsByDate[t.date] += t.totalCost;
    });
    let sortedDates = Object.keys(txsByDate).sort((a, b) => a.localeCompare(b));
    let totalPaid = state.allPayments.filter(p => p.name === name).reduce((sum, p) => sum + p.amount, 0);

    let detailsHTML = '';
    sortedDates.forEach(date => {
        let cost = txsByDate[date];
        if (totalPaid >= cost - TOLERANCE) { totalPaid -= cost; }
        else {
            let remain = cost - totalPaid;
            if (remain > TOLERANCE) {
                let shuttlesCount = 0, gamesCount = 0;
                if (state.dailyData[date] && state.dailyData[date].games) {
                    state.dailyData[date].games.forEach(g => {
                        if (g.players.includes(name)) { shuttlesCount += (g.shuttlecocksUsed || 0); gamesCount++; }
                    });
                }
                let pData = state.dailyData[date]?.players?.find(p => p.name === name);
                let extra = pData ? (pData.extraCost || 0) : 0;
                let extraStr = extra > 0 ? ` + จิปาถะ ${extra} บ.` : '';
                let ext = gamesCount > 0 ? `<div style="font-size:11px; color:#94a3b8; margin-top:2px;">ตี ${gamesCount} เกม (ลูกรวมกลุ่ม ${shuttlesCount} ลูก)${extraStr}</div>` : (extra > 0 ? `<div style="font-size:11px; color:#94a3b8; margin-top:2px;">ค่าจิปาถะ ${extra} บ.</div>` : '');
                detailsHTML += `<div style="display:flex; justify-content:space-between; align-items:flex-start; font-size:14px; margin-bottom:8px;"><div><span style="color:#475569; font-weight:bold;">${date}</span>${ext}</div><span style="font-weight:bold;">฿${remain.toFixed(2)}</span></div>`;
            }
            totalPaid = 0;
        }
    });
    $('slip-details').innerHTML = detailsHTML || '<div style="font-size:14px; color:#94a3b8;">ยอดยกมา</div>';

    const ppId = state.settings.promptpayId;
    const ppContainer = $('slip-promptpay');
    const ppNumberEl = $('slip-promptpay-number');
    const ppNameEl = $('slip-promptpay-name');
    if (showPP && ppId && ppContainer && ppNumberEl) {
        ppNumberEl.innerText = ppId;
        if (state.settings.promptpayName && ppNameEl) {
            ppNameEl.innerText = state.settings.promptpayName;
            ppNameEl.style.display = 'block';
        } else if (ppNameEl) { ppNameEl.style.display = 'none'; }
        ppContainer.style.display = 'block';
    } else if (ppContainer) {
        ppContainer.style.display = 'none';
    }

    const shareText = (showPP && ppId) ? `รบกวนชำระค่าแบดมินตันครับ/ค่ะ\nยอด ${amount.toFixed(2)} บาท 🏸\nโอนพร้อมเพย์: ${ppId}` : `รบกวนชำระค่าแบดมินตันครับ/ค่ะ ยอด ${amount.toFixed(2)} บาท 🏸`;

    Swal.fire({ title: 'กำลังสร้างใบเสร็จ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    // ลบการรอรูป QR Code ออก เพื่อให้สร้างใบเสร็จได้รวดเร็วทันใจ 100%
    setTimeout(() => {
        html2canvas(slip, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(canvas => {
            Swal.close();
            shareOrDownloadCanvas(canvas, `receipt-${name}.png`, `ใบเสร็จค่าแบดมินตัน - ${name}`);
        }).catch(err => {
            console.error(err); Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างใบเสร็จได้', 'error');
        });
    }, 100);
}

function renderHistory() {
    let start = $('summaryStartDate').value;
    let end = $('summaryEndDate').value;
    let searchName = $('summarySearchName').value.trim().toLowerCase();
    let h = [...state.allTransactions.map(t => ({ ...t, type: 'เกม' })), ...state.allPayments.map(p => ({ ...p, type: 'ชำระเงิน' }))];
    if (start) h = h.filter(x => x.date >= start);
    if (end) h = h.filter(x => x.date <= end);
    if (searchName) h = h.filter(x => x.name.toLowerCase().includes(searchName));
    h.sort((a, b) => new Date(b.date) - new Date(a.date));

    const sumBox = $('history-summary-box');
    if (!h.length) {
        $('overall-summary-content').innerHTML = `<div class="py-10 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-gray-200 dark:border-slate-700"><div class="w-14 h-14 bg-white dark:bg-slate-800 shadow-sm rounded-full flex items-center justify-center mb-3 text-gray-300 dark:text-gray-500"><i class="fas fa-box-open text-2xl"></i></div><h3 class="text-gray-500 dark:text-gray-400 font-bold text-sm">ไม่มีข้อมูลประวัติในช่วงเวลานี้</h3></div>`;
        sumBox.classList.add('hidden');
        $('monthly-summary-container').classList.add('hidden');
        return;
    }

    let tC = 0, tP = 0; h.forEach(x => { if (x.type === 'เกม') tC += x.totalCost; else tP += x.amount; });
    $('history-total-cost').innerText = '฿' + tC.toFixed(2); $('history-total-paid').innerText = '฿' + tP.toFixed(2);
    sumBox.classList.remove('hidden');

    let monthlyData = {};
    h.forEach(x => {
        let mKey = x.date.substring(0, 7);
        if (!monthlyData[mKey]) monthlyData[mKey] = { cost: 0, paid: 0 };
        if (x.type === 'เกม') monthlyData[mKey].cost += x.totalCost;
        else monthlyData[mKey].paid += x.amount;
    });
    const mNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    $('monthly-summary-container').innerHTML = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a)).map(m => {
        let [yy, mm] = m.split('-'); let d = monthlyData[m]; let net = d.paid - d.cost;
        let netSign = net > 0 ? '+' : (net < 0 ? '-' : '');
        return `<div class="bg-indigo-50 border border-indigo-100 p-2 rounded-lg flex flex-wrap justify-between items-center text-sm shadow-sm gap-2">
            <div class="font-bold text-indigo-800"><i class="far fa-calendar-alt mr-1"></i> ${mNames[parseInt(mm, 10) - 1]} ${yy}</div>
            <div class="flex gap-3 text-xs w-full sm:w-auto justify-between sm:justify-end"><div><span class="text-gray-500">ใช้:</span> <span class="font-bold text-red-600">฿${d.cost.toFixed(2)}</span></div><div><span class="text-gray-500">จ่าย:</span> <span class="font-bold text-green-600">฿${d.paid.toFixed(2)}</span></div><div class="border-l border-indigo-200 pl-3"><span class="text-gray-500">สุทธิ:</span> <span class="font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}">${netSign}฿${Math.abs(net).toFixed(2)}</span></div></div>
        </div>`;
    }).join('');
    $('monthly-summary-container').classList.remove('hidden');

    // จัดกลุ่มข้อมูลตามวันที่
    let grouped = {};
    h.forEach(x => { if (!grouped[x.date]) grouped[x.date] = []; grouped[x.date].push(x); });

    // สร้าง HTML แบบใบเสร็จ (Receipt Layout)
    let html = '';
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach(date => {
        let dailyTotal = 0;
        grouped[date].forEach(x => { dailyTotal += (x.type === 'ชำระเงิน' ? x.amount : -(x.totalCost || 0)); });
        let dailyColor = dailyTotal >= 0 ? 'text-green-600' : 'text-red-500';
        let dailySign = dailyTotal > 0 ? '+' : (dailyTotal < 0 ? '-' : '');

        html += `<div class="mb-5 bg-gray-50/50 dark:bg-slate-800/30 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
            <div class="p-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <div class="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2"><div class="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center"><i class="fas fa-calendar-day"></i></div> ${date}</div>
                <div class="text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-2.5 py-1 rounded-full">${grouped[date].length} รายการ</div>
            </div>
            <div class="p-3 sm:p-4 space-y-3">`;

        grouped[date].forEach(x => {
            let isPaid = x.type === 'ชำระเงิน';
            let color = isPaid ? 'text-green-600' : 'text-red-500';
            let sign = isPaid ? '+' : '-';

            let nameHtml = escapeHtml(x.name);
            let displayChar = nameHtml.includes(': ') ? nameHtml.split(': ')[1].charAt(0) : nameHtml.charAt(0);
            let avatarChar = displayChar.toUpperCase();
            let borderColor = isPaid ? 'border-green-500' : 'border-red-500';
            let avatarBg = isPaid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30';
            let avatarColor = isPaid ? 'text-green-600' : 'text-red-600';
            let iconHtml = isPaid ? '<i class="fas fa-hand-holding-usd mr-1 text-[10px]"></i>' : '<i class="fas fa-shuttlecock mr-1 text-[10px]"></i>';

            html += `<div class="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border-l-4 ${borderColor} border border-gray-100 dark:border-slate-700 shadow-sm rounded-r-xl gap-2 transition-all hover:shadow-md">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${avatarBg} ${avatarColor} flex items-center justify-center font-bold text-lg shrink-0">${avatarChar}</div>
                    <div>
                        <div class="font-bold text-gray-800 dark:text-gray-200 leading-tight break-all">${nameHtml}</div>
                        <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">${iconHtml}${x.type}</div>
                    </div>
                </div>
                <div class="font-bold ${color} text-base whitespace-nowrap bg-gray-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">${sign}฿${(x.totalCost || x.amount).toFixed(2)}</div>
            </div>`;
        });

        html += `</div>
            <div class="p-3 sm:px-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <div class="font-bold text-gray-600 dark:text-gray-400 text-sm">ยอดสุทธิประจำวัน</div>
                <div class="font-bold ${dailyColor} text-lg">${dailySign}฿${Math.abs(dailyTotal).toFixed(2)}</div>
            </div>
        </div>`;
    });
    $('overall-summary-content').innerHTML = html;
}

// --- ACTIONS & EXPORT ---
function waitForImages(element) {
    const images = Array.from(element.querySelectorAll('img'));
    return Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => { img.onload = res; img.onerror = res; });
    }));
}

function shareOrDownloadCanvas(canvas, fileName, defaultTitle = 'สรุปค่าใช้จ่าย') {
    canvas.toBlob(async blob => {
        try {
            const file = new File([blob], fileName, { type: 'image/png' });

            // Check if Web Share API is supported for files
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: defaultTitle,
                        files: [file]
                    });
                    return; // Share successful
                } catch (shareError) {
                    // AbortError is when user cancels the share sheet
                    if (shareError.name === 'AbortError') return;
                    console.log('Share failed, falling back to download', shareError);
                }
            }

            // Fallback to Download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = fileName;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            Swal.fire({ icon: 'success', title: 'โหลดรูปลงเครื่องแล้ว', text: 'สามารถนำไปส่งใน LINE ได้เลยครับ', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } catch (e) {
            console.error('Export failed', e);
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกหรือแชร์รูปได้ (ลองใช้เบราว์เซอร์อื่น)', 'error');
        }
    }, 'image/png');
}

function exportGamesImg() {
    const el = document.getElementById('gamesList');
    if (!el.innerHTML.trim()) return Swal.fire('ไม่มีข้อมูล', 'ไม่มีเกมให้ส่งออก', 'info');
    Swal.fire({ title: 'กำลังสร้างรูป...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    waitForImages(el).then(() => {
        html2canvas(el, { scale: 2, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#f8fafc', scrollX: 0, scrollY: -window.scrollY, windowWidth: document.documentElement.offsetWidth }).then(canvas => {
            Swal.close();
            shareOrDownloadCanvas(canvas, `games-${selectedDate}.png`, 'สรุปเกมการเล่น');
        }).catch(err => {
            console.error(err); Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างรูปได้', 'error');
        });
    });
}
function exportSummaryImg() {
    const el = document.getElementById('summaryTableContainer');
    if (!document.getElementById('summaryTableUnpaid').innerHTML.trim() && !document.getElementById('summaryTablePaid').innerHTML.trim()) return Swal.fire('ไม่มีข้อมูล', 'ไม่มีข้อมูลให้ส่งออก', 'info');
    
    // Add watermark
    const originalPos = el.style.position;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const watermark = document.createElement('div');
    watermark.innerText = selectedDate;
    watermark.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) rotate(-15deg); opacity:0.06; font-size:120px; font-weight:900; color:#475569; white-space:nowrap; pointer-events:none; z-index:0; text-align:center; user-select:none;';
    el.appendChild(watermark);

    Swal.fire({ title: 'กำลังสร้างรูป...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    waitForImages(el).then(() => {
        html2canvas(el, { scale: 2, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff', scrollX: 0, scrollY: -window.scrollY, windowWidth: document.documentElement.offsetWidth }).then(canvas => {
            el.removeChild(watermark);
            el.style.position = originalPos;
            Swal.close();
            shareOrDownloadCanvas(canvas, `summary-${selectedDate}.png`, 'สรุปยอดค่าใช้จ่าย');
        }).catch(err => {
            if (el.contains(watermark)) el.removeChild(watermark);
            el.style.position = originalPos;
            console.error(err); Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างรูปได้', 'error');
        });
    });
}

function exportAccountImg() {
    const el = document.getElementById('accountExportArea');
    const paidContainer = document.getElementById('paid-section-container');
    const dateDisplay = document.getElementById('account-export-date');

    // ซ่อนคนจ่ายครบ และแสดงวันที่ ก่อนถ่ายรูป
    if (paidContainer) paidContainer.style.display = 'none';
    if (dateDisplay) {
        dateDisplay.innerText = `สรุปยอด ณ วันที่: ${getTodayString()}`;
        dateDisplay.classList.remove('hidden');
    }

    Swal.fire({ title: 'กำลังสร้างรูป...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    waitForImages(el).then(() => {
        html2canvas(el, { scale: 2, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff', scrollX: 0, scrollY: -window.scrollY, windowWidth: document.documentElement.offsetWidth }).then(canvas => {
            Swal.close();
            // คืนค่าการแสดงผลกลับมาหลังถ่ายเสร็จ
            if (paidContainer) paidContainer.style.display = 'block';
            if (dateDisplay) dateDisplay.classList.add('hidden');

            shareOrDownloadCanvas(canvas, `account-${getTodayString()}.png`, 'สรุปยอดบัญชีรวม');
        }).catch(err => {
            if (paidContainer) paidContainer.style.display = 'block';
            if (dateDisplay) dateDisplay.classList.add('hidden');
            console.error(err); Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างรูปได้', 'error');
        });
    });
}

function exportHistoryCSV() {
    let start = $('summaryStartDate').value; let end = $('summaryEndDate').value;
    let searchName = $('summarySearchName').value.trim().toLowerCase();
    let h = [...state.allTransactions.map(t => ({ ...t, type: 'เกม' })), ...state.allPayments.map(p => ({ ...p, type: 'ชำระเงิน' }))];
    if (start) h = h.filter(x => x.date >= start); if (end) h = h.filter(x => x.date <= end);
    if (searchName) h = h.filter(x => x.name.toLowerCase().includes(searchName));
    h.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!h.length) return Swal.fire('ไม่มีข้อมูล', 'ไม่มีข้อมูลประวัติให้ส่งออกในช่วงเวลานี้', 'info');

    let csv = "\uFEFFวันที่,ประเภท,ชื่อ,ยอดเงิน (บาท)\n"; // ใส่ BOM (\uFEFF) เพื่อให้ Excel อ่านภาษาไทยได้
    h.forEach(x => { let amt = (x.totalCost || x.amount).toFixed(2); let name = `"${x.name.replace(/"/g, '""')}"`; csv += `${x.date},${x.type},${name},${amt}\n`; });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `history-${getTodayString()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function confirmSaveToAccount() {
    const dd = getCurrentDailyData();
    if (!dd.games || dd.games.length === 0) return Swal.fire('ไม่มีข้อมูล', 'ไม่มีเกมให้ปิดยอดในวันนี้', 'info');

    let grand = 0;
    let details = {};
    dd.players.forEach(p => details[p.name] = { cost: (p.extraCost || 0) });
    dd.games.forEach(g => {
        let c = (g.shuttlecocksUsed * (g.shuttlecockPrice || 0)) / 4;
        g.players.forEach(p => { if (!details[p]) { let px = dd.players.find(x => x.name === p); details[p] = { cost: (px ? px.extraCost || 0 : 0) }; } details[p].cost += c; });
    });
    Object.values(details).forEach(d => { grand += d.cost; });

    Swal.fire({
        title: `ปิดยอดวันที่ ${selectedDate}`,
        html: `ยอดรวมทั้งหมดของวันนี้คือ <span class="text-teal-600 font-bold text-xl">฿${grand.toFixed(2)}</span><br><br><span class="text-sm text-gray-500">ระบบซิงก์ข้อมูลบัญชีอัตโนมัติอยู่แล้ว<br>การปิดยอดเพื่อยืนยันว่าตรวจสอบครบถ้วน</span>`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-lock"></i> ยืนยันปิดยอด',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#1d4ed8'
    }).then(r => {
        if (r.isConfirmed) {
            dd.isClosed = true;
            updateAndRender();
            Swal.fire({ icon: 'success', title: 'ปิดยอดสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        }
    });
}

function openDraftModal() {
    let drafts = [];
    Object.keys(state.dailyData).forEach(date => {
        if (!date || date === 'undefined' || date === 'null') return;
        const dd = state.dailyData[date];
        if (dd.games && dd.games.length > 0 && !dd.isClosed) drafts.push(date);
    });
    drafts.sort((a, b) => b.localeCompare(a)); // เรียงจากล่าสุดไปเก่า

    let html = drafts.length === 0 ? '<div class="text-center text-gray-500 py-4">ไม่มีวันที่ค้างปิดยอด</div>' : drafts.map(d => {
        let g = state.dailyData[d].games.length;
        return `<div class="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg"><div class="font-bold text-yellow-800">${d} <span class="text-xs font-normal text-yellow-600 ml-1">(${g} เกม)</span></div><button class="btn btn-sm btn-warning" onclick="jumpToDraft('${d}')">ตรวจสอบ</button></div>`;
    }).join('');

    $('draft-list-container').innerHTML = html;
    $('draft-modal').classList.remove('hidden');
}

function jumpToDraft(date) {
    $('draft-modal').classList.add('hidden');
    $('workingDate').value = date;
    $('workingDate').dispatchEvent(new Event('change'));
    switchTab('daily');
}

function exportAccountText() {
    const sum = calculateOverallBalances();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    let txt = `สรุปยอดบัญชีแบดมินตัน\n(ข้อมูล ณ วันที่ ${getTodayString()} เวลา ${timeStr} น.)\n\n`;
    let unpaid = '';
    let credit = '';

    Object.values(sum).sort((a, b) => a.n.localeCompare(b.n, 'th')).forEach(x => {
        let b = x.d - x.p;
        if (b > TOLERANCE) unpaid += `- ${x.n}: ${b.toFixed(2)} บาท\n`;
        else if (b < -TOLERANCE) credit += `- ${x.n}: ${(-b).toFixed(2)} บาท\n`;
    });

    if (unpaid) {
        txt += '🔴 ค้างชำระ:\n' + unpaid;
    } else {
        txt += '🔴 ค้างชำระ: ไม่มี\n';
    }

    if (credit) {
        txt += '\n🟢 มีเครดิต:\n' + credit;
    }

    navigator.clipboard.writeText(txt).then(() => Swal.fire({ icon: 'success', title: 'คัดลอกลง Clipboard แล้ว', text: 'สามารถนำไปวางใน LINE ได้เลย' }));
}

function sendPersonalLineReminder(name, amount) {
    // ดึงรายการหนี้ทั้งหมดของคนนี้มาจัดกลุ่มตามวันที่
    let txsByDate = {};
    state.allTransactions.filter(t => t.name === name).forEach(t => {
        if (!txsByDate[t.date]) txsByDate[t.date] = 0;
        txsByDate[t.date] += t.totalCost;
    });

    let sortedDates = Object.keys(txsByDate).sort((a, b) => a.localeCompare(b));
    let totalPaid = state.allPayments.filter(p => p.name === name).reduce((sum, p) => sum + p.amount, 0);

    let unpaidDetails = [];
    sortedDates.forEach(date => {
        let cost = txsByDate[date];
        if (totalPaid >= cost - TOLERANCE) { totalPaid -= cost; } // หักยอดที่จ่ายแล้วออกไป
        else {
            let remain = cost - totalPaid;
            if (remain > TOLERANCE) {
                let gamesCount = 0;
                let ballsCount = 0;
                const dd = state.dailyData[date];
                if (dd && dd.games) {
                    dd.games.forEach(g => {
                        if (g.players.includes(name)) {
                            gamesCount++;
                            ballsCount += (g.shuttlecocksUsed || 0);
                        }
                    });
                }
                let countInfo = '';
                if (ballsCount > 0) {
                    countInfo = ` (${ballsCount} ลูก)`;
                }
                unpaidDetails.push(`${date}: ${remain.toFixed(2)} บ.${countInfo}`);
            }
            totalPaid = 0;
        }
    });

    let detailsText = unpaidDetails.length > 0 ? `\nรายละเอียดที่ค้าง:\n- ${unpaidDetails.join('\n- ')}\n` : '';
    let ppText = state.settings.promptpayId ? `\nโอนผ่านพร้อมเพย์: ${state.settings.promptpayId}` : '';
    if (state.settings.promptpayName) ppText += `\n(ชื่อบัญชี: ${state.settings.promptpayName})`;
    const txt = `รบกวนชำระค่าแบดมินตันครับ/ค่ะ 🏸\n\nชื่อ: ${name}\nยอดค้างชำระ: ${amount.toFixed(2)} บาท\n${detailsText}${ppText}\n\nขอบคุณครับ 🙏`;
    navigator.clipboard.writeText(txt).then(() => {
        Swal.fire({
            icon: 'success', title: 'คัดลอกข้อความทวงหนี้แล้ว', text: 'นำไปวางในแชท LINE ส่วนตัวได้เลยครับ',
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2500
        });
    }).catch(() => Swal.fire('ข้อผิดพลาด', 'ไม่สามารถคัดลอกข้อความได้', 'error'));
}

function openGroupBillModal() {
    const sum = calculateOverallBalances();
    const unpaid = Object.values(sum).filter(x => x.d - x.p > TOLERANCE).sort((a, b) => a.n.localeCompare(b.n, 'th'));

    if (unpaid.length < 2) return Swal.fire('ข้อมูลไม่พอ', 'ต้องมีผู้ค้างชำระอย่างน้อย 2 คนจึงจะรวมบิลได้', 'info');

    let html = '<div class="text-left space-y-2 max-h-[50vh] overflow-y-auto p-2">';
    unpaid.forEach((x) => {
        let b = x.d - x.p;
        html += `<label class="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer transition-colors">
            <input type="checkbox" class="w-5 h-5 group-bill-cb accent-indigo-600 rounded" value="${escapeHtml(x.n)}" data-debt="${b}">
            <span class="flex-1 font-bold text-gray-800 dark:text-gray-200">${escapeHtml(x.n)}</span>
            <span class="text-red-600 font-bold">฿${b.toFixed(2)}</span>
        </label>`;
    });
    html += '</div>';

    Swal.fire({
        title: 'เลือกรวมบิลกลุ่ม',
        html: html,
        showCancelButton: true,
        confirmButtonText: 'รวมบิล',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#8b5cf6',
        preConfirm: () => {
            const selected = Array.from(document.querySelectorAll('.group-bill-cb:checked'));
            if (selected.length < 2) { Swal.showValidationMessage('กรุณาเลือกอย่างน้อย 2 คน'); return false; }
            return selected.map(cb => ({ name: cb.value, debt: parseFloat(cb.dataset.debt) }));
        }
    }).then(res => { if (res.isConfirmed) showGroupBillResult(res.value, false); });
}

function showGroupBillResult(members, isDaily = false) {
    const totalAmount = members.reduce((sum, m) => sum + m.debt, 0);
    const namesList = members.map(m => m.name).join(', ');
    const ppId = state.settings.promptpayId;
    const ppName = state.settings.promptpayName ? `<div class="text-sm font-bold text-indigo-700 mt-1">${escapeHtml(state.settings.promptpayName)}</div>` : '';

    if (!ppId) return Swal.fire('ผิดพลาด', 'กรุณาตั้งค่าเบอร์พร้อมเพย์ในแท็บตั้งค่าระบบก่อน', 'warning');

    let detailsHtml = '<div class="mt-3 mb-3 text-left bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 text-sm w-full">';
    members.forEach(m => {
        detailsHtml += `<div class="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700 last:border-0"><span class="text-gray-700 dark:text-gray-300">${escapeHtml(m.name)}</span><span class="font-bold text-red-500">฿${m.debt.toFixed(2)}</span></div>`;
    });
    detailsHtml += '</div>';

    Swal.fire({
        title: 'สแกนเพื่อชำระเงิน',
        html: `<div class="text-sm text-gray-600 dark:text-gray-400 mb-1">สำหรับ: <b>${escapeHtml(namesList)}</b></div>
               ${detailsHtml}
               <div class="text-lg mt-1 mb-2">ยอดรวมทั้งหมด: <span class="text-red-600 font-bold text-2xl ml-1">฿${totalAmount.toFixed(2)}</span></div>
               <button id="btnCopyGroupLine" class="btn btn-sm btn-indigo w-full py-2 mb-2 text-sm shadow-sm"><i class="fab fa-line text-lg mr-1"></i> คัดลอกข้อความส่ง LINE</button>
               ${ppName}`,
        imageUrl: `https://promptpay.io/${ppId}/${totalAmount.toFixed(2)}`,
        imageWidth: 220,
        imageHeight: 220,
        imageAlt: 'PromptPay QR',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-check-circle"></i> บันทึกว่าจ่ายแล้ว',
        cancelButtonText: 'ปิด',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        didOpen: () => {
            const btn = document.getElementById('btnCopyGroupLine');
            if (btn) {
                btn.addEventListener('click', () => {
                    let txt = `รบกวนชำระค่าแบดมินตัน (รวมบิลกลุ่ม) ครับ/ค่ะ 🏸\n\nสำหรับ: ${namesList}\nยอดรวมทั้งหมด: ${totalAmount.toFixed(2)} บาท\n\nรายละเอียดที่ค้าง:\n`;
                    members.forEach(m => { txt += `- ${m.name}: ${m.debt.toFixed(2)} บ.\n`; });
                    txt += `\nโอนผ่านพร้อมเพย์: ${ppId}`;
                    if (state.settings.promptpayName) txt += `\n(ชื่อบัญชี: ${state.settings.promptpayName})`;
                    txt += `\n\nขอบคุณครับ 🙏`;

                    navigator.clipboard.writeText(txt).then(() => {
                        const oldHtml = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-check"></i> คัดลอกสำเร็จ!';
                        btn.classList.replace('btn-indigo', 'btn-success');
                        setTimeout(() => {
                            btn.innerHTML = oldHtml;
                            btn.classList.replace('btn-success', 'btn-indigo');
                        }, 2000);
                    }).catch(() => {
                        btn.innerHTML = '<i class="fas fa-times"></i> คัดลอกไม่สำเร็จ';
                        btn.classList.replace('btn-indigo', 'btn-danger');
                    });
                });
            }
        }
    }).then(res => {
        if (res.isConfirmed) {
            if (isDaily) {
                const dd = getCurrentDailyData();
                members.forEach(m => {
                    let p = dd.players.find(x => x.name === m.name);
                    if (p) p.paid = true;
                    else dd.players.push({ name: m.name, paid: true, present: true });
                });
            } else {
                members.forEach(m => {
                    state.allPayments.push({ id: Date.now() + Math.random(), date: getTodayString(), name: m.name, amount: m.debt, isAutoDaily: false });
                });
            }
            updateAndRender();
            Swal.fire({ icon: 'success', title: 'บันทึกชำระเงินเรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        }
    });
}


// --- MODAL PAYMENT ---
function openPaymentModal(name) {
    document.getElementById('payment-name').innerText = `ชำระเงินของ: ${name}`;
    document.getElementById('payment-hidden-name').value = name;
    const sum = calculateOverallBalances();
    const debt = sum[name] ? sum[name].d - sum[name].p : 0;
    const paymentAmountInput = document.getElementById('payment-amount');
    paymentAmountInput.value = debt > TOLERANCE ? debt.toFixed(2) : '';
    document.getElementById('payment-modal').classList.remove('hidden');
}
function submitPayment() {
    const name = document.getElementById('payment-hidden-name').value;
    const amt = parseFloat(document.getElementById('payment-amount').value);
    if (!name || isNaN(amt) || amt <= 0) return;
    state.allPayments.push({ id: Date.now(), date: getTodayString(), name: name, amount: amt, isAutoDaily: false });
    document.getElementById('payment-modal').classList.add('hidden');
    const affectedDates = autoReconcileDailyDebts(name);
    updateAndRender();
    // แสดง Undo Toast ถ้ามีการ reconcile วันเก่า
    if (affectedDates && affectedDates.length > 0) {
        showPaymentUndoToast(name, affectedDates);
    } else {
        Swal.fire({ icon: 'success', title: 'บันทึกชำระเงินแล้ว', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
    }
}

// Phase 2: แสดง Toast พร้อมปุ่ม "ยกเลิก" 5 วินาทีหลังจ่าย
function showPaymentUndoToast(playerName, affectedDates) {
    Swal.fire({
        icon: 'success',
        title: 'บันทึกชำระเงินแล้ว',
        html: `เคลียร์ยอด ${affectedDates.length} วัน &nbsp;<button id="undoPayBtn" style="font-size:11px;padding:2px 10px;border-radius:6px;background:#f1f5f9;border:1px solid #cbd5e1;cursor:pointer;font-family:'Sarabun',sans-serif;">↩ ยกเลิก</button>`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        didOpen: (toast) => {
            const btn = document.getElementById('undoPayBtn');
            if (btn) btn.addEventListener('click', () => { Swal.close(); undoDailyPayment(playerName, affectedDates); });
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });
}

// Phase 2: ยกเลิกการชำระเงิน — toggle วันที่ถูก reconcile ทั้งหมดกลับเป็น unpaid
function undoDailyPayment(playerName, affectedDates) {
    affectedDates.forEach(date => {
        const dd = state.dailyData[date];
        if (!dd || !dd.players) return;
        const player = dd.players.find(p => p.name === playerName);
        if (player) player.paid = false;
    });
    updateAndRender();
    Swal.fire({ icon: 'info', title: 'ยกเลิกการชำระเงินแล้ว', text: `คืนยอดค้าง ${affectedDates.length} วัน`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
}

function openGlobalPaymentModal() {
    const opts = state.masterPlayerList.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    Swal.fire({
        title: 'รับเงิน / เติมเงินล่วงหน้า',
        html: `
            <div style="text-align: left; margin-bottom: 6px;"><label class="swal2-label" style="font-weight: 600; font-size: 14px; color: #64748b;">ชื่อผู้เล่น</label></div>
            <select id="global-payment-name" class="swal2-select" style="margin: 0 0 15px 0; width: 100%; display: block; box-sizing: border-box; font-family: 'Sarabun', sans-serif;">
                ${opts}
            </select>
            <div style="text-align: left; margin-bottom: 6px;"><label class="swal2-label" style="font-weight: 600; font-size: 14px; color: #64748b;">จำนวนเงิน (บาท)</label></div>
            <input type="number" id="global-payment-amount" class="swal2-input" style="margin: 0; width: 100%; display: block; box-sizing: border-box; font-family: 'Sarabun', sans-serif;" placeholder="0.00" min="0" step="any">
        `,
        showCancelButton: true,
        confirmButtonText: 'บันทึกการชำระเงิน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        preConfirm: () => {
            const name = document.getElementById('global-payment-name').value;
            const amount = parseFloat(document.getElementById('global-payment-amount').value);
            if (!name) { Swal.showValidationMessage('กรุณาเลือกผู้เล่น'); return false; }
            if (isNaN(amount) || amount <= 0) { Swal.showValidationMessage('กรุณากรอกจำนวนเงินที่ถูกต้อง'); return false; }
            return { name, amount };
        }
    }).then(res => {
        if (res.isConfirmed) {
            state.allPayments.push({ id: Date.now(), date: getTodayString(), name: res.value.name, amount: res.value.amount, isAutoDaily: false });
            autoReconcileDailyDebts(res.value.name);
            updateAndRender();
            Swal.fire({ icon: 'success', title: 'บันทึกชำระเงินเรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        }
    });
}

function autoReconcileDailyDebts(playerName) {
    let manualPaymentsTotal = state.allPayments.filter(p => p.name === playerName && !p.isAutoDaily).reduce((sum, p) => sum + p.amount, 0);
    let manualDebtsTotal = state.allTransactions.filter(t => t.name === playerName && !t.isAutoDaily).reduce((sum, t) => sum + t.totalCost, 0);

    let availableCredit = manualPaymentsTotal - manualDebtsTotal;
    if (availableCredit <= TOLERANCE) return [];

    let unpaidDaily = [];
    Object.keys(state.dailyData).forEach(date => {
        if (!date || date === 'undefined' || date === 'null') return;
        const dd = state.dailyData[date];
        if (!dd.players || !dd.games) return;

        let pData = dd.players.find(x => x.name === playerName);
        if (pData && !pData.paid) {
            let cost = pData.extraCost || 0;
            dd.games.forEach(g => {
                if (g.players.includes(playerName)) {
                    cost += (g.shuttlecocksUsed * (g.shuttlecockPrice || 0)) / 4;
                }
            });
            if (cost > TOLERANCE) {
                unpaidDaily.push({ date: date, cost: cost });
            }
        }
    });

    unpaidDaily.sort((a, b) => a.date.localeCompare(b.date));

    let madeChanges = false;
    let affectedDates = []; // เก็บวันที่ที่ถูก reconcile เพื่อรองรับ Undo
    for (let record of unpaidDaily) {
        if (availableCredit >= record.cost - TOLERANCE) {
            let dd = state.dailyData[record.date];
            let pData = dd.players.find(x => x.name === playerName);
            pData.paid = true;
            availableCredit -= record.cost;
            madeChanges = true;
            affectedDates.push(record.date); // บันทึกวันที่เพื่อ Undo

            let amountToRemove = record.cost;
            for (let i = 0; i < state.allPayments.length; i++) {
                let p = state.allPayments[i];
                if (p.name === playerName && !p.isAutoDaily) {
                    if (p.amount >= amountToRemove) {
                        p.amount -= amountToRemove;
                        amountToRemove = 0;
                        break;
                    } else {
                        amountToRemove -= p.amount;
                        p.amount = 0;
                    }
                }
            }
        } else {
            break;
        }
    }

    if (madeChanges) {
        state.allPayments = state.allPayments.filter(p => p.isAutoDaily || p.amount > TOLERANCE);
        syncAllDailyToAccount();
    }
    return affectedDates; // คืนรายการวันที่สำหรับ Undo Toast
}

// --- THEME MGMT ---
function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    const btn = $('btnToggleTheme');
    if (!btn) return;
    if (isDark) btn.innerHTML = '<i class="fas fa-sun text-yellow-400"></i>';
    else btn.innerHTML = '<i class="fas fa-moon text-gray-500"></i>';
}
function toggleTheme() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
    updateThemeIcon();
}

function calcSellerPrice() {
    let tc = parseFloat($('settingTubeCost').value) || 0;
    let ta = parseFloat($('settingTubeAmount').value) || 12;
    let tp = parseFloat($('settingTargetProfit').value) || 0;
    let costPerBall = ta > 0 ? tc / ta : 0;
    let rec = costPerBall + tp;
    $('displayCostPerBall').innerText = costPerBall.toFixed(2);
    let finalPrice = Math.ceil(rec);
    $('displayRecommendedPrice').innerText = '฿' + finalPrice.toFixed(2);
    return finalPrice;
}

// ============================================================
// AUTO TRANSFER LISTENER (ระบบดักฟังยอดโอน LINE KTB)
// ============================================================

/**
 * เริ่มโหมดดักฟังยอดโอนเงิน (3 นาที)
 * - เปิด Firebase listener ที่ path: rooms/{roomId}/incoming_transfers
 * - เริ่มนับถอยหลัง 3 นาที แล้วปิดอัตโนมัติ
 */
function startTransferListener() {
    if (_transferListenerRef) {
        // ถ้ากดอีกครั้งขณะกำลังทำงาน ให้ปิด
        stopTransferListener();
        return;
    }

    const roomId = state.settings.syncRoomId || 'badminton_default';
    const path = 'rooms/' + roomId + '/incoming_transfers';
    _transferListenerRef = db.ref(path);
    _transferSecondsLeft = 3 * 60; // 3 นาที = 180 วินาที

    // ดักฟัง child_added เฉพาะข้อมูลที่เข้ามาใหม่หลังจากนี้
    _transferListenerRef.on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const transferId = snapshot.key;
        // ลบข้อมูลออกจาก Firebase ทันทีเพื่อไม่ให้เครื่องอื่นรับซ้ำ
        snapshot.ref.remove();

        const amount = parseFloat(data.amount);
        if (isNaN(amount) || amount <= 0) return;

        // ต้องอยู่ในช่วงเวลาดักฟังเท่านั้น
        if (_transferSecondsLeft <= 0) return;

        // Deduplication: เช็คว่าเพิ่งรับ transferId นี้ไปหรือยังภายใน 1 นาที
        const oneMinuteAgo = Date.now() - 60000;
        const isDuplicate = state.transferLogs.some(log => log.id === transferId || (log.amount === amount && log.timestamp > oneMinuteAgo));
        if (isDuplicate) return;

        processIncomingTransfer(amount, transferId);
    });

    // เริ่มนับถอยหลัง
    updateTransferListenerUI();
    _transferCountdownInterval = setInterval(() => {
        _transferSecondsLeft--;
        updateTransferListenerUI();
        if (_transferSecondsLeft <= 0) {
            stopTransferListener();
        }
    }, 1000);

    Swal.fire({
        icon: 'info',
        title: '📡 เปิดโหมดรับเงินแล้ว',
        text: 'กำลังดักฟังยอดโอนจาก LINE KTB เป็นเวลา 3 นาที',
        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
    });
}

/**
 * หยุดโหมดดักฟัง ปิด Firebase listener และล้าง timer
 */
function stopTransferListener() {
    if (_transferListenerRef) {
        _transferListenerRef.off();
        _transferListenerRef = null;
    }
    if (_transferCountdownInterval) {
        clearInterval(_transferCountdownInterval);
        _transferCountdownInterval = null;
    }
    _transferSecondsLeft = 0;
    updateTransferListenerUI();
}

/**
 * อัปเดต UI ของปุ่มดักฟังและ timer
 */
function updateTransferListenerUI() {
    const btn = $('btnTransferListener');
    const timerEl = $('transferListenerTimer');
    if (!btn) return;

    const isListening = _transferSecondsLeft > 0;
    const simBtn = $('btnSimulateTransfer');

    if (isListening) {
        const mins = Math.floor(_transferSecondsLeft / 60);
        const secs = String(_transferSecondsLeft % 60).padStart(2, '0');
        btn.innerHTML = `<i class="fas fa-circle text-red-400 animate-pulse"></i> ดักฟังอยู่... (กดเพื่อปิด)`;
        btn.className = 'btn btn-sm btn-danger';
        if (timerEl) {
            timerEl.textContent = `${mins}:${secs}`;
            timerEl.classList.remove('hidden');
        }
        if (simBtn) simBtn.classList.remove('hidden');
    } else {
        btn.innerHTML = `<i class="fas fa-satellite-dish"></i> เปิดรับยอดโอน LINE`;
        btn.className = 'btn btn-sm';
        btn.style.background = '#059669';
        btn.style.color = 'white';
        if (timerEl) timerEl.classList.add('hidden');
        if (simBtn) simBtn.classList.add('hidden');
    }
    const histBtn = $('btnTransferHistory');
    if (histBtn) histBtn.classList.remove('hidden'); // โชว์ปุ่มประวัติตลอด
    updateTransferBadge();
}

function updateTransferBadge() {
    const badge = $('transferBadge');
    if (!badge) return;
    const todayStr = getTodayString();

    // ล้างประวัติที่ข้ามวัน และจำกัดแค่ 50 รายการล่าสุด
    state.transferLogs = state.transferLogs.filter(log => log.date === todayStr);
    if (state.transferLogs.length > 50) {
        state.transferLogs = state.transferLogs.slice(-50);
    }

    const unmatchedCount = state.transferLogs.filter(log => log.status === 'unmatched').length;
    if (unmatchedCount > 0) {
        badge.textContent = unmatchedCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

/**
 * จำลองยอดโอนเข้า (ใช้ทดสอบโดยไม่ต้องใช้มือถือ Android)
 * เปิด Prompt ให้พิมพ์ยอดเงิน แล้วส่งต่อเข้า processIncomingTransfer โดยตรง
 */
function simulateTransfer() {
    if (_transferSecondsLeft <= 0) {
        Swal.fire({ icon: 'warning', title: 'โหมดดักฟังยังไม่เปิด', text: 'กรุณากดปุ่ม "เปิดรับยอดโอน LINE" ก่อน', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return;
    }
    Swal.fire({
        title: '🧪 จำลองยอดโอนเข้า',
        html: `
            <p class="text-sm text-gray-500 mb-3">พิมพ์ยอดเงินที่ต้องการทดสอบ (บาท)<br><span class="text-xs text-amber-600">จะถูกประมวลผลเหมือนมีเงินโอนเข้าจริง</span></p>
            <input id="swal-sim-amount" type="number" class="swal2-input" placeholder="เช่น 150" min="1" step="0.01">
        `,
        confirmButtonText: '<i class="fas fa-play"></i> ทดสอบ',
        confirmButtonColor: '#f59e0b',
        showCancelButton: true,
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const val = parseFloat(document.getElementById('swal-sim-amount').value);
            if (isNaN(val) || val <= 0) { Swal.showValidationMessage('กรุณาใส่ยอดเงินที่ถูกต้อง'); return false; }
            return val;
        }
    }).then(r => {
        if (r.isConfirmed) {
            processIncomingTransfer(r.value, 'sim_' + Date.now());
        }
    });
}

/**
 * ประมวลผลยอดเงินที่รับมาจาก Firebase
 * @param {number} amount - ยอดเงินที่โอนเข้า (บาท)
 * @param {string} transferId - รหัสจาก Firebase
 */
function processIncomingTransfer(amount, transferId = null) {
    const sum = calculateOverallBalances();
    const tid = transferId || ('tx_' + Date.now());

    // หาผู้เล่นที่ยอดค้างชำระตรงกับยอดที่โอนมา (±1 สตางค์ เผื่อทศนิยม)
    const matches = Object.values(sum).filter(x => {
        const balance = x.d - x.p;
        return balance > TOLERANCE && Math.abs(balance - amount) < 0.5;
    });

    let newLog = {
        id: tid,
        date: getTodayString(),
        timestamp: Date.now(),
        amount: amount,
        status: 'unmatched',
        matchedTo: null
    };

    if (matches.length === 0) {
        // ไม่เจอใครเลย
        state.transferLogs.push(newLog);
        Swal.fire({
            icon: 'warning',
            title: `💸 มียอดโอนเข้า ฿${amount.toFixed(2)}`,
            text: 'ไม่พบผู้ค้างชำระตรงกับยอดนี้ โปรดตรวจสอบที่ปุ่มประวัติ',
            toast: true, position: 'top-start', showConfirmButton: false, timer: 6000
        });
        saveToStorage();
        updateTransferBadge();
    } else if (matches.length === 1) {
        // เจอ 1 คน ตัดบิลอัตโนมัติเลย
        newLog.status = 'matched';
        newLog.matchedTo = matches[0].n;
        state.transferLogs.push(newLog);
        executeAutoPay(matches[0].n, amount);
        updateTransferBadge();
    } else {
        // เจอหลายคน → ให้แอดมินเลือก
        state.transferLogs.push(newLog);
        resolveTransferCollision(matches, amount, newLog.id);
    }
}

/**
 * แสดง Popup ให้แอดมินเลือกว่ายอดโอนนี้เป็นของใคร
 * @param {Array} matches - รายชื่อผู้เล่นที่ยอดตรงกัน
 * @param {number} amount - ยอดเงินที่โอนเข้า
 * @param {string} logId - รหัสประวัติ
 */
function resolveTransferCollision(matches, amount, logId) {
    const optionsHtml = matches.map(x => {
        const balance = (x.d - x.p).toFixed(2);
        const col = getPlayerColor(x.n);
        const sh = x.n.includes(': ') ? x.n.split(': ')[1] : x.n;
        return `
        <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-indigo-400 bg-white dark:bg-slate-800"
               style="border-color: ${col.border}; background: ${col.bg}20;"
               onclick="this.parentElement.querySelectorAll('label').forEach(l=>l.style.outline=''); this.style.outline='3px solid ${col.tag}'">
            <input type="radio" name="collision_pick" value="${escapeHtml(x.n)}" class="accent-indigo-600 w-4 h-4">
            <div>
                <div class="font-bold text-gray-800" style="color:${col.text}">${escapeHtml(sh)}</div>
                <div class="text-xs text-gray-500">ยอดค้าง <span class="font-bold text-red-500">฿${balance}</span></div>
            </div>
        </label>`;
    }).join('');

    Swal.fire({
        title: `💸 มียอดโอนเข้า ฿${amount.toFixed(2)}`,
        html: `
            <p class="text-sm text-gray-500 mb-4">พบผู้ค้างชำระยอดนี้หลายคน โปรดเลือกว่าเป็นของใคร:</p>
            <div class="space-y-2 text-left">${optionsHtml}</div>`,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-check-circle"></i> ยืนยัน',
        cancelButtonText: 'ข้ามไป (ปล่อยค้าง)',
        confirmButtonColor: '#059669',
        preConfirm: () => {
            const picked = document.querySelector('input[name="collision_pick"]:checked');
            if (!picked) { Swal.showValidationMessage('กรุณาเลือกชื่อก่อน'); return false; }
            return picked.value;
        }
    }).then(r => {
        if (r.isConfirmed && r.value) {
            let log = state.transferLogs.find(l => l.id === logId);
            if (log) {
                log.status = 'matched';
                log.matchedTo = r.value;
            }
            executeAutoPay(r.value, amount);
            updateTransferBadge();
        }
    });
}

/**
 * บันทึกการชำระเงินอัตโนมัติและอัปเดต UI
 * @param {string} name - ชื่อผู้เล่น
 * @param {number} amount - ยอดเงิน
 */
function executeAutoPay(name, amount) {
    state.allPayments.push({
        id: Date.now() + Math.random(),
        date: getTodayString(),
        name: name,
        amount: amount,
        isAutoDaily: false
    });
    autoReconcileDailyDebts(name);
    updateAndRender();

    const sh = name.includes(': ') ? name.split(': ')[1] : name;
    Swal.fire({
        icon: 'success',
        title: `✅ รับยอดโอนสำเร็จ!`,
        html: `<span class="font-bold text-green-700">${escapeHtml(sh)}</span> ชำระ <span class="font-bold text-green-700">฿${amount.toFixed(2)}</span> เรียบร้อยแล้ว`,
        toast: true, position: 'top-end', showConfirmButton: false, timer: 4000
    });
}

// ============================================================
function bindEvents() {
    document.addEventListener('change', handlePrefixChange);
    document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    $('btnAddPlayer').addEventListener('click', addPlayer);
    $('btnQuickAddPlayer').addEventListener('click', quickAddPlayer);
    $('btnRecordGame').addEventListener('click', recordGame);
    $('btnOpenPenInput').addEventListener('click', openPenInputModal);
    $('btnClosePenInput').addEventListener('click', closePenInputModal);
    $('btnCancelPenInput').addEventListener('click', closePenInputModal);
    $('btnScanPen').addEventListener('click', scanPenInput);
    $('btnConfirmPenInput').addEventListener('click', confirmPenData);
    ['penP1', 'penP2', 'penP3', 'penP4'].forEach(id => { const el = $(id); el.addEventListener('focus', e => focusedFieldId = e.target.id); el.addEventListener('input', e => e.target.dataset.confirmed = ''); el.addEventListener('change', scanPenInput); });
    $('btnVoiceCommand').addEventListener('click', startVoiceCommand);
    $('btnSave').addEventListener('click', saveToFile);
    $('loadFile').addEventListener('change', loadFromFile);
    $('btnUseLastTeam').addEventListener('click', () => { const dd = getCurrentDailyData(); if (dd.games.length) { let p = dd.games[dd.games.length - 1].players;['player1', 'player2', 'player3', 'player4'].forEach((id, i) => currentGameSelection[id] = p[i]); updateAndRender(); } });
    $('btnToggleTheme').addEventListener('click', toggleTheme);
    if ($('btnTransferListener')) $('btnTransferListener').addEventListener('click', startTransferListener);
    if ($('btnSimulateTransfer')) $('btnSimulateTransfer').addEventListener('click', simulateTransfer);


    $('workingDate').addEventListener('change', (e) => {
        if (!e.target.value) { e.target.value = getTodayString(); }
        selectedDate = e.target.value;
        updateAndRender();
    });

    $('searchDailyPlayer').addEventListener('input', debounce(renderDaily, 300));
    $('searchAccountInput').addEventListener('input', debounce(renderAccount, 300));

    $('btnSubmitRename').addEventListener('click', submitRename);
    ['btnCloseRename', 'btnCancelRename'].forEach(id => $(id).addEventListener('click', () => $('rename-modal').classList.add('hidden')));
    ['btnClosePayment', 'btnCancelPayment'].forEach(id => $(id).addEventListener('click', () => $('payment-modal').classList.add('hidden')));
    $('btnSubmitPayment').addEventListener('click', submitPayment);

    $('btnClearTodayPlayers').addEventListener('click', () => {
        if (getCurrentDailyData().games.length > 0) return Swal.fire('ล้างไม่ได้!', 'มีการบันทึกเกมไปแล้วในวันนี้<br>โปรดเคลียร์เกมออกก่อนเพื่อป้องกันยอดเงินสูญหาย', 'error');
        Swal.fire({ title: 'ล้างรายชื่อวันนี้?', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) { getCurrentDailyData().players = []; updateAndRender(); } })
    });
    $('btnClearAllPlayers').addEventListener('click', () => { Swal.fire({ title: 'ล้างรายชื่อทั้งหมด?', text: 'ล้างผู้เล่นในระบบทั้งหมด', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) { state.masterPlayerList = []; Object.values(state.dailyData).forEach(d => d.players = []); updateAndRender(); } }) });
    $('btnClearToday').addEventListener('click', () => { Swal.fire({ title: 'ล้างข้อมูลวันนี้?', text: 'เกมและรายชื่อวันนี้จะหายไป', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) { state.dailyData[selectedDate] = { players: [], games: [] }; updateAndRender(); } }) });

    $('btnExportGamesImg').addEventListener('click', exportGamesImg);
    $('btnExportSummaryImg').addEventListener('click', exportSummaryImg);
    $('btnDailyGroupBill').addEventListener('click', openDailyGroupBillModal);
    $('btnExportAccountImg').addEventListener('click', exportAccountImg);
    $('btnAddDebt').addEventListener('click', () => {
        $('debt-name').value = ''; $('debt-amount').value = '';
        $('debt-player-list').innerHTML = state.masterPlayerList.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
        $('debt-modal').classList.remove('hidden');
    });
    $('btnReceivePayment').addEventListener('click', openGlobalPaymentModal);
    ['btnCloseDebt', 'btnCancelDebt'].forEach(id => $(id).addEventListener('click', () => $('debt-modal').classList.add('hidden')));
    $('btnSubmitDebt').addEventListener('click', () => {
        const name = $('debt-name').value.trim(); const amt = parseFloat($('debt-amount').value);
        if (!name || isNaN(amt) || amt <= 0) return;
        if (!state.masterPlayerList.includes(name)) state.masterPlayerList.push(name);
        state.allTransactions.push({ id: Date.now(), date: getTodayString(), name: name, totalCost: amt, isAutoDaily: false });
        $('debt-modal').classList.add('hidden'); updateAndRender();
        Swal.fire({ icon: 'success', title: 'ตั้งหนี้สำเร็จ', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
    });

    $('btnExportAccountText').addEventListener('click', exportAccountText);
    $('btnGroupBill').addEventListener('click', openGroupBillModal);

    $('btnFilterHistory').addEventListener('click', renderHistory);
    $('btnExportHistoryCSV').addEventListener('click', exportHistoryCSV);
    $('summarySearchName').addEventListener('input', debounce(renderHistory, 300));

    $('settingDefaultPrice').addEventListener('change', (e) => {
        state.settings.shuttlecockPrice = parseFloat(e.target.value) || 0;
        $('shuttlecockPrice').value = state.settings.shuttlecockPrice;
        saveToStorage(); Swal.fire({ icon: 'success', title: 'บันทึกการตั้งค่าแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    });
    const settingPromptPay = $('settingPromptPay');
    if (settingPromptPay) {
        settingPromptPay.addEventListener('change', (e) => {
            state.settings.promptpayId = e.target.value.trim().replace(/-/g, ''); // ตัดขีดออกอัตโนมัติ
            saveToStorage();
            updateAndRender(); // อัปเดต UI ทันทีเพื่อให้ปุ่ม QR Code โผล่
            Swal.fire({ icon: 'success', title: 'บันทึกเบอร์พร้อมเพย์แล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        });
    }
    const settingPromptPayName = $('settingPromptPayName');
    if (settingPromptPayName) {
        settingPromptPayName.addEventListener('change', (e) => {
            state.settings.promptpayName = e.target.value.trim();
            saveToStorage();
            updateAndRender();
            Swal.fire({ icon: 'success', title: 'บันทึกชื่อบัญชีแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        });
    }

    ['settingTubeCost', 'settingTubeAmount', 'settingTargetProfit'].forEach(id => {
        const el = $(id);
        if (el) { el.addEventListener('input', () => { state.settings[id] = parseFloat(el.value) || 0; calcSellerPrice(); saveToStorage(); }); }
    });
    $('btnApplyRecommendedPrice').addEventListener('click', () => {
        let rec = calcSellerPrice();
        $('settingDefaultPrice').value = rec;
        $('settingDefaultPrice').dispatchEvent(new Event('change'));
    });

    const roomInput = $('settingSyncRoomId');
    if (roomInput) {
        roomInput.addEventListener('change', (e) => {
            const sanitized = e.target.value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
            state.settings.syncRoomId = sanitized || 'badminton_default';
            e.target.value = state.settings.syncRoomId;
            saveToStorage();
            initFirebaseListener(); // รีเซ็ตตัวดักฟังให้ไปเกาะกลุ่มใหม่
            Swal.fire({ icon: 'success', title: 'เปลี่ยนรหัสกลุ่มเรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        });
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // --- FIREBASE CLEANUP ON UNLOAD ---
    // ปิด Firebase listener อย่างเหมาะสมเมื่อปิดหน้าเพื่อป้องกัน memory leak
    window.addEventListener('beforeunload', () => {
        if (firebaseListenerRef) {
            firebaseListenerRef.off(); // ยกเลิกการดักฟังการเปลี่ยนแปลงข้อมูล
            firebaseListenerRef = null;
        }
        if (!window.Cypress) {
            saveToStorage(); // บันทึกข้อมูลล่าสุดก่อนปิด
        }
    });

    $('btnForceUpdateApp').addEventListener('click', () => {
        if ('caches' in window) {
            caches.keys().then(names => {
                Promise.all(names.map(name => caches.delete(name))).then(() => {
                    Swal.fire('อัปเดตสำเร็จ', 'ล้างแคชและอัปเดตเป็นเวอร์ชันล่าสุดแล้ว', 'success').then(() => {
                        window.location.reload(true);
                    });
                });
            });
        } else { window.location.reload(true); }
    });

    document.getElementById('btnFactoryReset').addEventListener('click', () => {
        Swal.fire({ title: 'ล้างข้อมูลทั้งหมด?', text: 'ข้อมูลผู้เล่น เกม และประวัติบัญชีทั้งหมดจะหายไป ไม่สามารถกู้คืนได้!', icon: 'error', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'ล้างข้อมูลเลย' }).then(r => {
            if (r.isConfirmed) {
                state = createDefaultState(); updateAndRender();
                document.getElementById('shuttlecockPrice').value = 0; document.getElementById('settingDefaultPrice').value = 0;
                if (document.getElementById('settingSyncRoomId')) document.getElementById('settingSyncRoomId').value = state.settings.syncRoomId || 'badminton_default';
                Swal.fire('ล้างข้อมูลสำเร็จ', 'ระบบกลับคืนสู่ค่าเริ่มต้น', 'success');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    loadFromStorage();

    // โอนย้ายเบอร์พร้อมเพย์จากเวอร์ชันเก่า (ถ้ามี)
    if (!state.settings.promptpayId) {
        try {
            const oldPP = localStorage.getItem('badminton_promptpay');
            if (oldPP) { const p = JSON.parse(oldPP); if (p.number) state.settings.promptpayId = p.number.replace(/-/g, ''); }
        } catch (e) { }
    }

    ensureIntegrity();
    document.getElementById('workingDate').value = selectedDate;
    document.getElementById('shuttlecockPrice').value = state.settings.shuttlecockPrice || 0;
    document.getElementById('settingDefaultPrice').value = state.settings.shuttlecockPrice || 0;

    const settingPromptPay = document.getElementById('settingPromptPay');
    if (settingPromptPay) settingPromptPay.value = state.settings.promptpayId || '';

    const settingPromptPayName = document.getElementById('settingPromptPayName');
    if (settingPromptPayName) settingPromptPayName.value = state.settings.promptpayName || '';

    $('settingTubeCost').value = state.settings.settingTubeCost || '';
    $('settingTubeAmount').value = state.settings.settingTubeAmount || 12;
    $('settingTargetProfit').value = state.settings.settingTargetProfit || 12;
    calcSellerPrice();

    const settingSyncRoomId = document.getElementById('settingSyncRoomId');
    if (settingSyncRoomId) settingSyncRoomId.value = state.settings.syncRoomId || '';

    updateAndRender(true);
    updateThemeIcon();
    updateNetworkStatus();

    // เริ่มทำงานระบบ Real-time Sync ของ Firebase ทันที
    initFirebaseListener();

    // PWA Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => { reg.update(); }).catch(err => console.log(err));
    }

    // ผูก Event ให้ปุ่มประวัติโอน
    const btnHist = $('btnTransferHistory');
    if (btnHist) {
        btnHist.addEventListener('click', showTransferHistory);
    }

    updateTransferBadge();
});

// ============================================================
// TRANSFER HISTORY (ประวัติโอน)
// ============================================================
function showTransferHistory() {
    const sortedLogs = [...state.transferLogs].reverse(); // ใหม่ล่าสุดขึ้นก่อน

    if (sortedLogs.length === 0) {
        Swal.fire({ title: 'ประวัติโอน', text: 'ยังไม่มีประวัติโอนเข้าของวันนี้', icon: 'info' });
        return;
    }

    let html = '<div class="space-y-2 max-h-[60vh] overflow-y-auto px-1">';
    sortedLogs.forEach(log => {
        let isUnmatched = log.status === 'unmatched';
        let bg = isUnmatched ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200';
        let icon = isUnmatched ? '<i class="fas fa-exclamation-circle text-amber-500"></i>' : '<i class="fas fa-check-circle text-green-500"></i>';
        let statusText = isUnmatched ? '<span class="text-amber-600 font-bold text-xs">ยังไม่จัดการ</span>' : `<span class="text-green-600 font-bold text-xs">ตัดบิล: ${escapeHtml(log.matchedTo)}</span>`;

        let dateObj = new Date(log.timestamp);
        let timeStr = dateObj.getHours().toString().padStart(2, '0') + ':' + dateObj.getMinutes().toString().padStart(2, '0');

        html += `
        <div class="flex flex-col p-3 rounded-xl border ${bg}">
            <div class="flex justify-between items-center mb-1">
                <div class="flex items-center gap-2">
                    ${icon} <span class="text-sm font-bold text-gray-700">฿${parseFloat(log.amount).toFixed(2)}</span>
                </div>
                <div class="text-xs text-gray-500">${timeStr}</div>
            </div>
            <div class="flex justify-between items-center mt-1">
                ${statusText}
                <div class="flex gap-1">
                    ${isUnmatched ? `<button class="btn btn-sm btn-indigo px-2 py-1 text-xs" onclick="resolveUnmatchedTransfer('${log.id}')">จัดการ</button>` : ''}
                    <button class="btn btn-sm btn-danger px-2 py-1 text-xs" onclick="deleteTransferLog('${log.id}')">ลบ</button>
                </div>
            </div>
        </div>`;
    });
    html += '</div>';

    Swal.fire({
        title: 'ประวัติโอนวันนี้',
        html: html,
        showConfirmButton: true,
        confirmButtonText: 'ปิดหน้าต่าง'
    });
}

window.resolveUnmatchedTransfer = function (logId) {
    let log = state.transferLogs.find(l => l.id === logId);
    if (!log) return;

    // แสดงตัวเลือกผู้เล่นทุกคนให้แอดมินเลือก
    let allPlayers = state.masterPlayerList;
    if (allPlayers.length === 0) {
        Swal.fire('ไม่มีข้อมูล', 'โปรดเพิ่มชื่อผู้เล่นเข้าระบบก่อน', 'error');
        return;
    }

    let optionsHtml = allPlayers.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');

    Swal.fire({
        title: `เติมเงินให้ใคร? (฿${log.amount.toFixed(2)})`,
        html: `
            <div class="text-left text-sm text-gray-600 mb-3">เลือกลูกค้าที่คุณต้องการนำยอด <b>${log.amount.toFixed(2)}</b> บาท นี้ไปหักหนี้ (ถ้าเหลือจะกลายเป็นเครดิต)</div>
            <select id="swal-resolve-player" class="swal2-select w-full" style="display:flex;">
                <option value="" disabled selected>-- เลือกชื่อลูกค้า --</option>
                ${optionsHtml}
            </select>
        `,
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const select = document.getElementById('swal-resolve-player');
            if (!select.value) {
                Swal.showValidationMessage('กรุณาเลือกชื่อก่อน');
                return false;
            }
            return select.value;
        }
    }).then(r => {
        if (r.isConfirmed) {
            log.status = 'matched';
            log.matchedTo = r.value;
            executeAutoPay(r.value, log.amount);
            updateTransferBadge();
            saveToStorage();

            // เปิดหน้าประวัติโอนอีกครั้งเพื่อให้เห็นการอัปเดต
            setTimeout(showTransferHistory, 400);
        }
    });
}

window.deleteTransferLog = function (logId) {
    Swal.fire({
        title: 'ลบประวัตินี้?',
        text: 'ประวัติยอดนี้จะหายไป (แต่ไม่มีผลกับยอดเงินที่เคยเติมไปแล้ว)',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'ลบเลย'
    }).then(r => {
        if (r.isConfirmed) {
            state.transferLogs = state.transferLogs.filter(l => l.id !== logId);
            updateTransferBadge();
            saveToStorage();
            setTimeout(showTransferHistory, 400);
        }
    });
}

