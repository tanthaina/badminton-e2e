# 🏸 โปรแกรมคำนวณค่าลูกแบดมินตัน (Badminton Bill Calculator)

## 📌 ภาพรวมโปรเจกต์ (Project Overview)
แอปพลิเคชันเว็บ (PWA) สำหรับบันทึกเกมการเล่นแบดมินตัน คำนวณค่าใช้จ่ายรายวัน และจัดการระบบบัญชี/หนี้สินแบบกลุ่ม ทำงานแบบ Offline-first (ไม่ต้องใช้ Database ภายนอก)

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend:** HTML5, Vanilla JavaScript (ES6), Tailwind CSS (ผ่าน CDN)
- **Storage:** `localStorage` (เก็บข้อมูลทั้งหมดในรูปแบบ JSON)
- **Testing:** Cypress (E2E Testing จำนวน 12 ไฟล์ ครอบคลุม Logic ทั้งหมด)
- **PWA:** Service Worker (`sw.js`) และ `manifest.json` เพื่อรองรับการใช้งานออฟไลน์
- **Libraries:** 
  - `SweetAlert2` (UI Popups / Modals)
  - `html2canvas` (สำหรับถ่ายภาพหน้าจอส่งออกเป็นรูปใบเสร็จ)
  - `FontAwesome` (Icons)

## 📁 โครงสร้างไฟล์หลัก (Architecture)
เดิมทีโปรเจกต์ถูกเขียนรวมในไฟล์เดียว ปัจจุบันได้ทำ **Separation of Concerns** แยกไฟล์สำเร็จแล้ว:
- `index.html`: โครงสร้าง UI และ DOM ล้วนๆ
- `styles.css`: Custom CSS, การปรับแต่ง Tailwind และ Dark Mode
- `app.js`: Business Logic, State Management, และ Event Listeners
- `cypress/e2e/*.cy.js`: ชุดทดสอบอัตโนมัติ (ใช้ `cy.seedSessionState` เพื่อความรวดเร็ว)

## ✨ ฟีเจอร์หลักที่มีในปัจจุบัน (Key Features)
1. **คิดเงินรายวัน (Daily Tab):** 
   - บันทึกผู้เล่น 4 คน/เกม, ระบุเบอร์ลูกที่ใช้, คำนวณยอดเงินหาร 4 อัตโนมัติ
   - มีกระดาน S-Pen (Smart Board) และระบบสั่งงานด้วยเสียง (Voice Command) เพื่อจัดทีมรวดเร็ว
   - **(ใหม่)** เพิ่มค่าใช้จ่ายจิปาถะ (ค่าน้ำ, ค่ากริป) รายบุคคลได้
2. **บัญชีรวม (Account Tab):**
   - ระบบค้างชำระ (Unpaid) และ ระบบเครดิตจ่ายเกิน (Credit Auto-Offset)
   - ทวงบิลเดี่ยว และ ทวงบิลกลุ่ม พร้อมสร้าง QR Code พร้อมเพย์ตามยอดสุทธิ
   - **(ใหม่)** คลิกดูรายละเอียดที่มาของยอดค้างชำระได้
3. **การส่งออก (Export & Share):**
   - สร้างรูปภาพใบเสร็จส่วนตัว, สรุปยอดรายวัน, สรุปบัญชีรวม 
   - ระบบบันทึกรูปภาพลงเครื่องโดยตรง (Direct Download)
   - ปุ่มคัดลอกข้อความทวงหนี้พร้อมแจกแจงรายละเอียด เพื่อนำไปวางใน LINE
4. **ประวัติและอื่นๆ:**
   - สรุปยอดการใช้งานรายเดือน และ Export ประวัติเป็น CSV
   - ระบบเครื่องมือคำนวณต้นทุน/กำไร สำหรับผู้ขายลูกแบด
5. **ระบบคลาวด์แบบเรียลไทม์ (Firebase Realtime Sync):**
   - **(ใหม่)** ระบบซิงก์ข้อมูลระหว่างอุปกรณ์แบบ Real-time ผ่าน Firebase Realtime Database
   - **(ใหม่)** รองรับการใช้งานหลายกลุ่มด้วยระบบ "รหัสกลุ่ม (Room ID)"
   - **(ใหม่)** อัปเดตข้อมูลบนหน้าจออัตโนมัติทันทีที่มีการเปลี่ยนแปลงจากเครื่องอื่น โดยไม่ต้องกดปุ่มดึงข้อมูล

## 🚀 สถานะล่าสุดและการพัฒนา (Recent Updates)
- ย้ายโค้ด JS และ CSS ออกจาก `index.html` เพื่อลด Technical Debt
- เปลี่ยนระบบการแชร์รูป (Web Share API) มาเป็นการโหลดรูปลงเครื่องโดยตรง (Direct Download) เพื่อแก้ปัญหาเซฟรูปไม่ได้ในบางเบราว์เซอร์
- เพิ่มฟีเจอร์ปุ่ม "คัดลอกข้อความส่ง LINE" ในหน้าต่าง QR จ่ายกลุ่ม
- ปรับปรุง Cypress Test Suite ให้รันได้เร็วขึ้นด้วย `cy.seedSessionState` และเพิ่มเข้าสู่ CI/CD ผ่าน GitHub Actions (`.github/workflows/cypress.yml`)
- **(ล่าสุด)** เปลี่ยนระบบคลาวด์จาก JSONBin.io เป็น Firebase Realtime Database เพื่อการซิงก์ที่รวดเร็วขึ้นและไม่จำกัดขนาดไฟล์ที่ 100KB
- **(ล่าสุด)** เพิ่มฟีเจอร์จดค่าจิปาถะรายบุคคล (ค่าน้ำ, ค่ากริป) และฟีเจอร์คลิกดูรายละเอียดที่มาของยอดค้างชำระ
- **(ล่าสุด)** ปรับปรุง UI เพิ่ม Loading Screen (Toast) ขณะที่กำลังซิงก์ข้อมูลจากฐานข้อมูล
- **(ล่าสุด)** เพิ่มโค้ดดักจับ `window.Cypress` ใน `app.js` เพื่อป้องกันไม่ให้ข้อมูลขยะจากการรัน E2E Test ถูกส่งขึ้นฐานข้อมูล Firebase จริง
- **(ล่าสุด)** ระบบหักยอดหนี้รายวันอัตโนมัติ (Auto-Reconcile Daily Debts) เมื่อยืนยันชำระเงินในหน้าบัญชีรวม จะไปเคลียร์เครื่องหมาย "จ่ายแล้ว" ในหน้ารายวันให้อัตโนมัติ พร้อมเทสตรวจสอบระบบ
- **(ล่าสุด)** ปรับปรุงระบบทดสอบให้เสถียรขึ้น ป้องกันไม่ให้ `beforeunload` เซฟทับข้อมูลจำลองใน `localStorage` ขณะรัน Cypress
- **(ล่าสุด)** ปรับปรุงระบบประมวลผลเสียงให้แจ้งเตือนเป็น Warning Toast เมื่อจัดทัพผู้เล่นไม่ครบ 4 คน ป้องกันการบันทึกข้อมูลที่ไม่สมบูรณ์และผ่านการทดสอบ E2E ทั้งหมด 100% (109 เคสย่อย)
- **(ล่าสุด)** เพิ่มระบบประเมินและตัดหนี้จากเครดิตสะสมแบบ Real-time บนหน้ารายวัน (Visual Reconcile) แสดงผลเป็น "จ่ายแล้ว (เครดิต: ฿ยอดเงินคงเหลือ)" สีฟ้าทันทีโดยไม่แก้ไข Database ป้องกันเงินหายหากแก้/ลบเกม
- **(ล่าสุด)** เพิ่มปุ่มเติมเงินล่วงหน้า (Top-up Deposit) ทั้งปุ่มหลักด้านบนของหน้าบัญชี และปุ่มย่อยรายบุคคลข้างรายชื่อคนมีเครดิต/ชำระครบแล้ว พร้อมเพิ่มสคริปต์ Cypress ทดสอบครบถ้วน

---
**🤖 Note to AI (Gemini Code Assist):**
If you are reading this, please acknowledge the project structure, stack, and current state. 
Maintain Vanilla JS patterns without introducing external bundlers (like Webpack/Vite) unless requested. 
Always ensure that UI updates match Tailwind classes and JavaScript updates maintain `localStorage` integrity.