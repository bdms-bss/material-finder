# BDMS Material Master

เว็บอ้างอิง Material code / Material group จาก Material Master สำหรับเตรียมการจัดซื้อและวางแผนงบประมาณ พร้อม Taxonomy L0–L4, GL แยก Department type และ Asset class จาก master จริง รองรับภาษาไทยด้วยคำพ้องที่กำหนดไว้และ Gemini Cloud ผ่าน backend

## เปิดเว็บ

GitHub Settings → Pages → Deploy from a branch → main → /docs. URL: https://bdms-bss.github.io/material-finder/

สำหรับ local: `python -m http.server 8000 --directory docs`

## Gemini Cloud ผ่าน Cloudflare Worker

เปลี่ยนเป็น Gemini API ผ่าน backend เพื่อใช้โมเดล cloud ตีความข้อความ/ภาพ และตรวจเลือกจาก Material Master จริง. ไม่ดาวน์โหลดโมเดลใน browser และไม่ใช้บัญชี Puter/OpenRouter. Gemini key เก็บใน Cloudflare Worker secret เท่านั้น.

**สถานะ:** พร้อม deploy และทดสอบโค้ดแล้วด้วย mocks/dry-run แต่ยังรอผู้ดูแลสร้าง Worker/ตั้ง secrets จึงยังไม่ได้เรียก Gemini จริง. ดู [ขั้นตอน Deploy และเชื่อมต่อ](backend/README.md). Frontend config เก็บเฉพาะ Worker URL และ public Turnstile Site Key ใน `docs/ai-config.json`.

ผู้ใช้ยืนยันส่งคำค้น/ภาพ/รายการ candidate ไป Cloudflare และ Google ก่อนเรียก. หนึ่งคำถามใช้ได้สูงสุด 2 Gemini calls; โควตาและค่าใช้จ่ายตาม Google project ไม่ใช่ฟรีไม่จำกัด. AI เลือกได้เฉพาะ Material codes ใน candidate; เมื่อสเปกไม่ชัดสามารถถามเพิ่มแทนเดารหัส. GL/Asset/Taxonomy และการจัดประเภทใช้ข้อมูล Master เดิม.

อ่าน [ภาพรวม AI](AI_LOGIN.md) และ [ข้อจำกัดการทดสอบ](TESTING.md). คำตอบจริง/ความแม่นยำต้องทดสอบอีกครั้งหลัง backend พร้อม credentials.

## ข้อมูลและหลักเกณฑ์

ข้อมูลนำเข้าจาก `H BDMS DCT-PRD-DataTaxonomy(20261030).xlsx`. เผยแพร่เฉพาะฟิลด์ catalog ที่จำเป็น ไม่รวม Created By, Changed By, ชื่อผู้รับผิดชอบ และข้อมูลราคา. การเป็น public repo ทำให้ catalog ที่นำเข้าเป็นข้อมูลสาธารณะตามคำขอ.

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
