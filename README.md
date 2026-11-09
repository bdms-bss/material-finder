# BDMS Material Master

เว็บอ้างอิง Material code / Material group จาก Material Master สำหรับเตรียมการจัดซื้อและวางแผนงบประมาณ พร้อม Taxonomy L0–L4, GL แยก Department type และ Asset class จาก master จริง รองรับภาษาไทยด้วยคำพ้องที่กำหนดไว้และ Gemma 4 บน Cloudflare Workers AI

## เปิดเว็บ

GitHub Settings → Pages → Deploy from a branch → main → /docs. URL: https://bdms-bss.github.io/material-finder/

สำหรับ local: `python -m http.server 8000 --directory docs`

## AI สำหรับข้อความและภาพ

ใช้ **Gemma 4 26B A4B บน Cloudflare Workers AI** ผ่าน Worker เดิม. ไม่ดาวน์โหลดโมเดลลงเครื่อง ไม่ใช้ Gemini key ส่วนตัว และไม่ต้องตั้ง Copilot Studio หรือ Microsoft Entra เพื่อค้นหา.

การค้นข้อความปกติค้นใน Master ก่อน ถ้าไม่มี Material ตรงคำค้นทั้ง Master จึงเปิดผู้ช่วย AI ต่ออัตโนมัติ (ไม่เรียกเพิ่มหากเพียงตัวกรองซ่อนรายการ). ยืนยันส่งข้อมูลครั้งแรกสำหรับโหมดข้อความแล้วระบบทำต่อได้ทันที. ข้อความและรูปภาพแยกคำอธิบาย รูป ผลลัพธ์ สถานะ และ consent คนละชุดในหน่วยความจำของแท็บ ไม่ส่งรูปที่ค้างอยู่ไปกับการค้นข้อความ. เปลี่ยนโหมดหรือปิดผู้ช่วยระหว่างค้นหาจะยกเลิกคำขอฝั่ง browser. คำค้นเดิมที่สำเร็จแล้วใช้ผลเดิมเมื่อ fallback อัตโนมัติ; ปุ่มค้น AI ยังใช้ลองใหม่ได้.

ขั้นตอน: ตีความคำค้น/ภาพ → ค้น Material Master ใน browser (สูงสุด 40 candidates กระจายตาม Group) → AI เลือกตัวอ้างอิงสั้น r1/r2 → server แปลงกลับเป็น Material Code จริง → browser ตรวจ whitelist ซ้ำ. คืนไม่เกิน 3 รายการ พร้อมคัดลอกรหัส/ดูรายละเอียด. ข้อมูลบัญชีและประเภทใช้ Master โดยตรง.

ผู้ใช้ยืนยันส่งคำค้น ภาพ และรายการอ้างอิงไป Cloudflare ก่อนวิเคราะห์. มี Turnstile, การตรวจ hostname/action, CORS และ rate limit. เรียกโมเดลสูงสุดสองครั้งต่อการค้นหา ไม่มีการสลับไปโมเดลเสียเงินอัตโนมัติ. Workers AI มีโควตาฟรีรายวัน; ไม่ใช่ใช้ฟรีไม่จำกัด และต้องคงบัญชี Workers Free หากต้องการให้เกินโควตาแล้วหยุดแทนคิดเงิน. ไม่เปิดแพ็กเกจ Paid ในงานนี้.

ทดสอบ inference จริงผ่าน Cloudflare API แล้วทั้งภาพ pulse oximeter, ภาพ wheelchair, คำค้นถุงมือที่ขาดสเปก และถุงมือไนไตรล์ขนาด M. รายละเอียดและขอบเขตอยู่ใน [TESTING.md](TESTING.md). ผลตัวอย่างไม่ใช่การรับประกันความถูกต้องของทุกสินค้า.

Backend URL เดิมคงชื่อ `bdms-material-gemini` เพื่อไม่เปลี่ยนที่อยู่ แต่โค้ดปัจจุบันใช้ Workers AI เท่านั้น. Gemini secret เดิมถ้ายังมีอยู่ไม่ได้ใช้งาน. ดู [คู่มือ backend](backend/README.md) และ [ภาพรวม AI](AI_LOGIN.md).

## ข้อมูลและหลักเกณฑ์

ข้อมูลนำเข้าจาก `H BDMS DCT-PRD-DataTaxonomy(20261030).xlsx`. เผยแพร่เฉพาะฟิลด์ Material Master ที่จำเป็น ไม่รวม Created By, Changed By, ชื่อผู้รับผิดชอบ และข้อมูลราคา. การเป็น public repo ทำให้ Material Master ที่นำเข้าเป็นข้อมูลสาธารณะตามคำขอ.

- Join ด้วย Material Group; GL ใช้ `sap_MaterialGroup_GL` และเก็บทุก Department type แยกกัน
- Asset mapping ใช้ `sap_MaterialGroup_Asset`; GL/Asset descriptions จาก master โดยตรง
- Taxonomy ใช้ `Master_DataTaxonomy`; ไม่ apply แผ่น `New_Edit` ซึ่งเป็นรายการขอแก้ไข
- ตัด Material ที่ `Deletion at Client Level = X` ออกจากข้อมูลที่เผยแพร่
- ตัด Material groups ที่ description ขึ้นต้น `INACTIVE` และ Materials ที่ผูกกับกลุ่มเหล่านี้หรือมี Material Group Description ขึ้นต้น `INACTIVE` (trim และไม่แยกตัวพิมพ์เล็กใหญ่)
- ตัดชื่อ Material Description หรือ Material Group Description ที่ขึ้นต้น `(CANCEL)` และ Material ที่ผูกกับกลุ่มดังกล่าวตั้งแต่ก่อนสร้างไฟล์ข้อมูลเว็บ (trim และไม่แยกตัวพิมพ์เล็กใหญ่)
- ตัด Material group `Z00000000` และทุก Group ที่ขึ้นต้น `M` รวมถึง Materials ที่ผูกกับ Group เหล่านี้
- Group `Z*` ที่เหลือจัดเป็น **Direct Pay** ซึ่งเป็นประเภทการจ่าย แยกจาก Taxonomy L0 และไม่เปลี่ยน CAPEX/OPEX mapping
- ใช้ข้อมูลหลังตัดรายการเดียวกันกับผลค้นหา สถิติ และ AI; ไม่มีตัวเลือกเปิดแสดงรายการที่ตัดออก
- กติกา BDMS BSS: มี Asset class → CAPEX; มี GL-A (Admin expense) หรือ GL-C (Cost) → OPEX; มีทั้งสองประเภท mapping → CAPEX/OPEX
- ไม่มีทั้งสอง mapping → ไม่พบข้อมูลจัดประเภท; GL-S เพียงอย่างเดียวไม่ใช้สรุป OPEX
- ใช้กติกานี้ทั้ง Material และ Material group โดยอ้างอิง group mapping; ไม่ใช้การอยู่ในแผ่น MaterialCAPEX มา override กติกา
- กรณี CAPEX/OPEX ให้เลือกตามวัตถุประสงค์ PR และนโยบายบัญชี
- วันที่บนหน้าจอเป็นวันที่ snapshot ของไฟล์ แต่วันที่ปรับปรุงแต่ละ sheet แตกต่างกัน

## อัปเดต master

ติดตั้ง Python `openpyxl` แล้วรัน:

`python scripts/import_data.py /path/to/master.xlsx`

commit `docs/data.json` ใหม่แล้ว deploy Pages. ไม่ commit workbook ต้นฉบับและ secrets. ตรวจ `npm run check` และค้นหาตัวอย่างก่อนเผยแพร่.

## UX/UI

การออกแบบและเกณฑ์ประเมิน: [UX design rationale](UX_DESIGN.md). หน้าแรกช่วยเริ่มค้นหา, แยก Material/Group ชัดเจน, แสดง L0 และงบประมาณบน card, คัดลอกข้อมูลรายการได้ และมี AI drawer พร้อม progress/cancel. รองรับ keyboard, responsive layout, error recovery และตรวจด้วย axe-core ในสถานะที่ระบุในเอกสาร.

ตรวจสอบโค้ดและกติกาข้อมูล: `npm run check` และ `npm test` (ไม่ต้องติดตั้ง dependency).

สำหรับ browser/UI/accessibility regression: ติดตั้ง dev dependencies ด้วย `npm install`, ติดตั้ง browser ด้วย `npx playwright install chromium` แล้วรัน `npm run test:ui`. ใช้ `CHROMIUM_PATH` หากมี Chromium ในเครื่องอยู่แล้ว. ผล screenshot อยู่ใน temporary directory `material-finder-ui` หรือกำหนด `UI_ARTIFACT_DIR` เอง. AI ใน automated UI test ใช้ backend/Turnstile จำลอง; ผลทดสอบโมเดลจริงดู [TESTING.md](TESTING.md).

## Material Master และผลค้นหาแยกหมวด

ระบบนี้แสดง **Material Master ส่วนกลาง ไม่ใช่ Catalog ระดับ Plant**. การมี code ใน Master ไม่ยืนยันว่ามีรายการใน Catalog ของ Plant หรือพร้อมเปิด PR; Catalog แยกตาม Plant และมีจำนวนรายการมาก จึงไม่แสดงในระบบนี้. มีข้อความกำกับในหน้าแรก รายละเอียด และข้อมูลที่คัดลอก.

ผลค้นหาปกติและ AI แสดง **Material code เท่านั้น**. ยังค้นหาได้จาก Material group code หรือ description เพื่อหารหัสสินค้าที่เชื่อมโยง หากพบ Group แต่ไม่มี Material code ตรงกับคำค้น/ตัวกรอง จะแสดงข้อความอธิบาย ไม่แสดง Group ให้เลือกแทนสินค้า.

หลังส่งคำค้น แสดงแถวปุ่มสรุปขนาดเล็กเพียงหนึ่งแถว: ทั้งหมด, OPEX, CAPEX, CAPEX/OPEX, Direct Pay และไม่ระบุประเภท. นับเฉพาะ Material codes โดยคิดตามคำค้นและ L0 ก่อนกรองประเภท จึงเปลี่ยนประเภทได้โดยยอดของประเภทอื่นยังคงอยู่. Group Z* จัดเข้าประเภทหลัก Direct Pay ก่อน ไม่ซ้ำใน OPEX/CAPEX แต่ GL/Asset และการจัดประเภทบัญชีเดิมยังดูได้ในรายละเอียด. แถวสรุปไม่แสดงก่อนค้นหา รวมถึงการ browse โดยไม่มีคำค้น; บนมือถือเลื่อนแถวแนวนอนได้.

ใช้โลโก้ BDMS เวกเตอร์แบบเดียวกับ reference โดยคงสีและสัดส่วนเดิม พร้อมธีมน้ำเงิน–แดง. [Asset provenance](docs/assets/README.md).
