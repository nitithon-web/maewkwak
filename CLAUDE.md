# แมวกวัก (แอปเงิน) — คู่มือสำหรับ Claude

แอปเงินส่วนตัวของคุณนิติธร สีดำ (เริ่มแยกจาก "จดครบ" เมื่อ 25 พ.ย. 2569 · ตอนนี้เป็นระบบของตัวเอง ไม่มีโค้ดหรือการเชื่อมต่อกับจดครบแล้ว)
คุยกับเจ้าของเป็น **ภาษาไทย** เสมอ · รีโปนี้ **เปิดสาธารณะ** ห้ามใส่ token / key / เลขบัญชี / เลขพร้อมเพย์ / ข้อมูลส่วนตัวลงไฟล์
ในแอปและข้อความ LINE ไม่พูดถึงจดครบ/EZP BOT

| ส่วน | อยู่ที่ไหน |
|---|---|
| หน้าเว็บ (PWA) | รีโปนี้ → GitHub Pages `https://nitithon-web.github.io/maewkwak/` |
| หลังบ้าน | Apps Script โปรเจกต์ **"แมวกวัก"** บัญชี nitithon.see@gmail.com · deployment `AKfycbwzD8Bffxcrd4Md…` (ห้ามสร้าง deployment ใหม่ ใช้ "เวอร์ชันใหม่" ของอันเดิม) |
| โค้ดหลังบ้าน | **`apps-script/` ในรีโปนี้คือต้นฉบับ** · ในโปรเจกต์ Apps Script รวมเป็น `รหัส.gs` ไฟล์เดียว ตามลำดับ `Code Slip Money Chat Owe Ai Group Line` |
| ฐานข้อมูล | Google Sheet "จดครบ เงิน" (nitithon.see) แท็บ `Money` `Owe` `Group` `HkUsers` `Vault2` `AiSamples` |
| LINE | OA **แมวกวัก** `@912spdex` (Messaging API channel 2012792290, provider PM) webhook = deployment ข้างบน · แอปเล็ก LIFF `2012774388-IyXrJ3Zn` endpoint `hk.html` |

## หน้าเว็บ
- `money.html` (รายรับรายจ่าย + `#owe` ค้างกัน) `split.html` (หารกัน) `vault.html` (ตู้รหัสส่วนตัว ตู้เดียว) · `index.html` → money.html
- `hub.js` ป้ายซิงก์ กล่องรอส่ง ตั้งค่า ไมค์ · เก็บลิงก์ส่วนตัวที่ LS `m:cfg` · เครื่องที่ยังไม่มี key หรือ key เก่า ขึ้นหน้าต่างเชื่อมเครื่อง `hubConnect` (ปุ่มขอลิงก์ในแชท / วางลิงก์ — iPhone ที่เปิดจากไอคอนหน้าจอโฮมเก็บข้อมูลแยกจาก LINE)
- `mcore.js` `money.js` `owe.js` `vault.js` `qrcode.js` `style.css` — ของรีโปนี้เอง (แก้ที่นี่)
- `scat.js` (หน้าหารกัน โหลดหลัง owe.js · owe.js เรียกผ่าน `typeof` ทุกจุด): 🏷 หมวดของบิล `sp.cat` (`SCATS`: วิธีหารเริ่มต้น + รายการแนะนำ + หมวดรายจ่ายของส่วนเรา `scatMoney`) · วิธีหาร `unit` = ตามชั่วโมง/ชิ้น (`b.lines[]` {name, price, unit, rate ราคาต่อหน่วย, step, def, u{คน:จำนวน}} → `unitShares`) · 🪙 ปัดยอดโอน `sp.round` (`roundTransfers`) · 🤖 เดาหมวดจากใบเสร็จ `scatGuess` (คำในชื่อร้าน/รายการ ไม่แตะ prompt AI) · 💾 ชุดของกลุ่ม = เอกสาร Owe `kind:'tpl'` (`#tDlg`, `openFromTpl`, บิลที่สร้างจากชุดมี `tplId`) · 🗓 ชุดหารทุกเดือน `monthly` (วันที่) → หลังบ้าน `splitMonthly_` เตือน LINE เดือนละครั้ง (`lastRemind`) ลิงก์ `split.html?tpl=<id>` + แถบ "ถึงรอบหาร" ในหน้า · 📊 สรุปเดือน `#spMonth` แยกหมวด/กลุ่ม
- `hk.html` `hk.js` + `jod*.png` — แอปเล็กหารในกลุ่ม LINE (ไม่โหลด hub.js)
- `sw.js` (CACHE `ngoen-vNN`) · `manifest.json`

## หลังบ้าน (`apps-script/`)
- `Code.gs` — `doPost`: รับเฉพาะคำสั่งใน `MONEY_ACTIONS` (money_* owe_* vault_* hk_setup ai_* status backup_now) + `hk_*` ของแอปเล็ก (ยืนยันด้วย ID token ของ LINE) + LINE webhook · `checkReminders` (ทุก 15 นาที: เตือนหารในกลุ่ม + สำรองชีต) · `morningSummary` = `moneyMorning_` · ตู้รหัส `vs_()` = แท็บ `Vault2`
- `Slip.gs` — รูปสลิป/ใบเสร็จจาก LINE → โฟลเดอร์ รอจัด → ปุ่ม 💸 จ่าย / 💰 รับ / 💵 คืนจาก… / 🗑
- `Money.gs` — รายรับรายจ่าย หมวด งบ รายการประจำ เป้าออม (`MONEY_CFG`)
- `Chat.gs` — จดเงินจากข้อความ (`saveAs_`) + ปุ่ม ↔ รับ/จ่าย
- `Owe.gs` — ค้างกัน (เอกสาร debt / split / tpl) + `splitMonthly_` (เรียกใน checkReminders) · `Group.gs` — หารในกลุ่ม LINE + API แอปเล็ก `hk_*` · `Line.gs` — คำสั่งพิมพ์ใน OA (`moneyLineText_`, `MONEY_HELP`) + สรุปเช้า
- `Ai.gs` — Gemini อ่านใบเสร็จ/สลิป/เสียง · ชุดใบตัวอย่าง `ai_flag` / `ai_regress` (แก้ prompt/รุ่น AI ให้รัน ai_regress ก่อนและหลัง)
  · ส่วนลด `discounts[]` = {name, amount, kind: item|combo|bill|pay, item, items[]} → `aiNormalize_` ผูกเข้าเมนู (combo หารตามราคาเมนูที่ร่วมโปร) · pay (เหรียญ ALL member/แต้ม/บัตรกำนัล) ไม่ใช่ส่วนลด → `payList` ยอดบิลนับรวม
  · ยอดที่ AI ให้มาเท่ายอดก่อนลด (เซเว่น) → ใช้ส่วนลดแบบรายการเสมอ แล้วตั้งยอด = ก่อนลด − ส่วนลด (ถ้าเลือกด้วยการเทียบยอด แบบที่ขาดส่วนลดจะชนะ)
  · `aiMulti_` อ่านพร้อมกัน 3 รอบ (fetchAll) อุณหภูมิ 0/0.5/0.9 (0 เหมือนกันหมด = พลาดพร้อมกัน) เลือกผลที่ตรงยอด > ส่วนลดมากสุด > รายการมากสุด · ใช้กับ หารกัน/แอปเล็ก/regress/`ai_reread {fileId}`
  · หน้าหารกัน: ส่วนลดท้ายบิลติ๊กเลือกหลายเมนูได้ (`moveBillDisc`) · แถบ `.sp-fix` → `fixOldDiscounts` อ่านใบเสร็จบิลเก่าซ้ำแล้วย้ายส่วนลดเข้าเมนู (ตั้ง `discFixed`) ข้ามบิลที่ยอดไม่ตรงเกิน 0.5

## อัปขึ้นระบบ
- หน้าเว็บ: เพิ่ม `?v=NN` ทุกไฟล์ html + `CACHE` ใน sw.js → commit + push `main`
- หลังบ้าน: แก้ `apps-script/*.gs` → เพิ่ม `BACKEND_VER` → รวมไฟล์ตามลำดับข้างบน → วางทับ `รหัส.gs` ในโปรเจกต์แมวกวัก (Chrome ล็อกอิน `/u/3/` = nitithon.see) → บันทึก → การทำให้ใช้งานได้ → จัดการ → ✏️ → เวอร์ชันใหม่
- ค่าลับ (`LINE_TOKEN`, `GEMINI_API_KEY`, `API_KEY`) อยู่ใน Script Properties เท่านั้น เจ้าของใส่เอง

## ทดสอบ
- `node --check` ทุกไฟล์ js · รวม `apps-script/*.gs` เป็นไฟล์เดียวแล้ว `node --check`
- หน้าเว็บ: Playwright เปิดไฟล์ในเครื่อง ขนาดจอ 390×844 · ตั้ง LS `m:cfg` = `{key:'k', url:'https://x.test/exec'}` แล้ว mock คำขอ

## หลักบัญชี
- ให้ยืม / รับคืน **ไม่นับ** เป็นรายจ่าย/รายรับ · หารกัน → จดรายจ่ายเฉพาะส่วนของเรา ที่เหลือเป็นค้างกัน
- "ไม่ทวงแล้ว" → ยอดที่เหลือเป็นรายจ่าย (หมวด อื่นๆ) · LINE: ข้อความที่มียอดเงินแต่ไม่บอกจ่าย/รับ (เช่น `ข้าว 60`) = รายจ่าย
