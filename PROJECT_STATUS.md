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
2. **บัญชีรวม (Account Tab):**
   - ระบบค้างชำระ (Unpaid) และ ระบบเครดิตจ่ายเกิน (Credit Auto-Offset)
   - ทวงบิลเดี่ยว และ ทวงบิลกลุ่ม พร้อมสร้าง QR Code พร้อมเพย์ตามยอดสุทธิ
3. **การส่งออก (Export & Share):**
   - สร้างรูปภาพใบเสร็จส่วนตัว, สรุปยอดรายวัน, สรุปบัญชีรวม 
   - ระบบบันทึกรูปภาพลงเครื่องโดยตรง (Direct Download)
   - ปุ่มคัดลอกข้อความทวงหนี้พร้อมแจกแจงรายละเอียด เพื่อนำไปวางใน LINE
4. **ประวัติและอื่นๆ:**
   - สรุปยอดการใช้งานรายเดือน และ Export ประวัติเป็น CSV
   - ระบบเครื่องมือคำนวณต้นทุน/กำไร สำหรับผู้ขายลูกแบด

## 🚀 สถานะล่าสุดและการพัฒนา (Recent Updates)
- ย้ายโค้ด JS และ CSS ออกจาก `index.html` เพื่อลด Technical Debt
- เปลี่ยนระบบการแชร์รูป (Web Share API) มาเป็นการโหลดรูปลงเครื่องโดยตรง (Direct Download) เพื่อแก้ปัญหาเซฟรูปไม่ได้ในบางเบราว์เซอร์
- เพิ่มฟีเจอร์ปุ่ม "คัดลอกข้อความส่ง LINE" ในหน้าต่าง QR จ่ายกลุ่ม
- ปรับปรุง Cypress Test Suite ให้รันได้เร็วขึ้นด้วย `cy.seedSessionState` และเพิ่มเข้าสู่ CI/CD ผ่าน GitHub Actions (`.github/workflows/cypress.yml`)

---
**🤖 Note to AI (Gemini Code Assist):**
If you are reading this, please acknowledge the project structure, stack, and current state. 
Maintain Vanilla JS patterns without introducing external bundlers (like Webpack/Vite) unless requested. 
Always ensure that UI updates match Tailwind classes and JavaScript updates maintain `localStorage` integrity.