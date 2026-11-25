# แมวกวัก (แอปเงิน) — คู่มือสำหรับ Claude

แอปเงินส่วนตัวของคุณนิติธร สีดำ แยกออกมาจาก "จดครบ" (รีโป `tibdglobal/jodngan`) เมื่อ 25 พ.ย. 2569
คุยกับเจ้าของเป็น **ภาษาไทย** เสมอ · รีโปนี้ **เปิดสาธารณะ** ห้ามใส่ token / key / เลขบัญชี / เลขพร้อมเพย์ / ข้อมูลส่วนตัวลงไฟล์

| ส่วน | อยู่ที่ไหน |
|---|---|
| หน้าเว็บ (PWA) | รีโปนี้ → GitHub Pages `https://nitithon-web.github.io/maewkwak/` |
| หลังบ้าน | Apps Script โปรเจกต์ **"แมวกวัก"** บัญชี nitithon.see@gmail.com (ROLE=money) · deployment `AKfycbwzD8Bffxcrd4Md…` (ห้ามสร้าง deployment ใหม่ ใช้ "เวอร์ชันใหม่" ของอันเดิม) |
| โค้ดหลังบ้าน | **ต้นฉบับอยู่ที่ `tibdglobal/jodngan` โฟลเดอร์ `apps-script/`** (โค้ดชุดเดียวกับระบบงาน ต่างกันที่ Script Property `ROLE`) · ในโปรเจกต์แมวกวักรวมทุกไฟล์เป็น `รหัส.gs` ไฟล์เดียว (Code Bills Money Inbox Owe Ai Meet Mail Group Split ตามลำดับ) |
| ฐานข้อมูล | Google Sheet "จดครบ เงิน" (nitithon.see) แท็บ `Money` `Owe` `Group` `HkUsers` `Vault2` `AiSamples` |
| LINE | OA **แมวกวัก** `@912spdex` (Messaging API channel 2012792290, provider PM) webhook = deployment ข้างบน · แอปเล็ก LIFF `2012774388-IyXrJ3Zn` endpoint `hk.html` |

## ไฟล์
- `money.html` `split.html` `vault.html` (ตู้รหัสส่วนตัวเท่านั้น) · `index.html` → money.html
- `hub.js` `style.css` `mcore.js` `money.js` `owe.js` `vault.js` `qrcode.js` — **คัดลอกจาก `tibdglobal/jodngan`** แก้ที่นั่นก่อนแล้วคัดลอกมา (hub.js รู้ว่าเป็นแอปเงินจากชื่อ `maewkwak` ใน URL → `window.JK_APP = 'money'` + `JK_MONEY_API`)
- `hk.html` `hk.js` + `jod*.png` — แอปเล็กหารในกลุ่ม LINE
- `sw.js` (CACHE `ngoen-vNN`) · `manifest.json`

## อัปขึ้นระบบ
- หน้าเว็บ: เพิ่ม `?v=NN` ทุกไฟล์ html + `CACHE` ใน sw.js → commit + push `main`
- หลังบ้าน: แก้ใน `tibdglobal/jodngan/apps-script/` → รวมไฟล์ → วางทับ `รหัส.gs` ในโปรเจกต์แมวกวัก (Chrome ล็อกอิน `/u/3/` = nitithon.see) → บันทึก → การทำให้ใช้งานได้ → จัดการ → ✏️ → เวอร์ชันใหม่
- ค่าลับ (`LINE_TOKEN`, `GEMINI_API_KEY`, `API_KEY`, `PEER_KEY`) อยู่ใน Script Properties เท่านั้น เจ้าของใส่เอง
