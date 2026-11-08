# BDMS Material Finder

เว็บค้นหา Material code / Material group สำหรับ PR และวางแผนงบประมาณ พร้อม Taxonomy L0–L4, GL แยก Department type และ Asset class จาก master จริง รองรับภาษาไทยด้วยคำพ้องที่กำหนดไว้และ AI บนเครื่องผู้ใช้

## เปิดเว็บ

GitHub Settings → Pages → Deploy from a branch → main → /docs. URL: https://bdms-bss.github.io/material-finder/

สำหรับ local: `python -m http.server 8000 --directory docs`

## AI ฟรี ไม่ต้อง login

ใช้โมเดล AI บนเครื่องผู้ใช้ผ่าน Transformers.js + ONNX Runtime Web (CPU/WASM). ไม่มี API key, backend AI, OpenRouter login, tenant registration หรือค่า inference. เลือกแนวคิดสินค้าด้วย multilingual semantic embeddings สำหรับข้อความไทย/อังกฤษ หรือ CLIP สำหรับภาพ แล้วค้น/จัดอันดับ candidate จาก master จริง. ไม่สร้างรหัสใหม่.

กด **ถาม AI** เพื่อเริ่มดาวน์โหลดโมเดลครั้งแรก: ภาษา ~118 MB หรือภาพ ~154 MB พร้อม runtime/tokenizer แล้ว browser cache ไว้ตามสิทธิ์ของอุปกรณ์. คำค้น ภาพ และ candidate ไม่ถูกส่งไปยัง AI cloud. คอมพิวเตอร์/มือถือที่ RAM น้อยหรือโหลด CDN ไม่ได้อาจประมวลผลไม่สำเร็จ; มีปุ่มยกเลิกและผลค้นข้อความสำรองที่ระบุว่าไม่ใช่ AI.

ผลเป็นรายการใกล้เคียง ไม่ใช่การยืนยันชนิด รุ่น ขนาด สเปกหรือยา. มีชุดแนวคิดจัดซื้อใน `docs/ai-topics.js` และแสดง L0 ชัดเจนทั้งการ์ดผลค้นหาและการ์ด AI. คลิกรายการเพื่อดู mapping จาก master.

ดู [วิธีใช้และขอบเขต AI](AI_LOGIN.md). การค้นหาข้อความธรรมดาไม่ต้องดาวน์โหลดโมเดล.

## ข้อมูลและหลักเกณฑ์

ข้อมูลนำเข้าจาก `H BDMS DCT-PRD-DataTaxonomy(20261030).xlsx`. เผยแพร่เฉพาะฟิลด์ catalog ที่จำเป็น ไม่รวม Created By, Changed By, ชื่อผู้รับผิดชอบ และข้อมูลราคา. การเป็น public repo ทำให้ catalog ที่นำเข้าเป็นข้อมูลสาธารณะตามคำขอ.

- Join ด้วย Material Group; GL ใช้ `sap_MaterialGroup_GL` และเก็บทุก Department type แยกกัน
- Asset mapping ใช้ `sap_MaterialGroup_Asset`; GL/Asset descriptions จาก master โดยตรง
- Taxonomy ใช้ `Master_DataTaxonomy`; ไม่ apply แผ่น `New_Edit` ซึ่งเป็นรายการขอแก้ไข
- ตัด Material ที่ `Deletion at Client Level = X` ออกจากข้อมูลที่เผยแพร่
- ตัด Material groups ที่ description ขึ้นต้น `INACTIVE` และ Materials ที่ผูกกับกลุ่มเหล่านี้หรือมี Material Group Description ขึ้นต้น `INACTIVE` (trim และไม่แยกตัวพิมพ์เล็กใหญ่)
- ตัดชื่อ Material Description หรือ Material Group Description ที่ขึ้นต้น `(CANCEL)` และ Material ที่ผูกกับกลุ่มดังกล่าวตั้งแต่ก่อนสร้างไฟล์ข้อมูลเว็บ (trim และไม่แยกตัวพิมพ์เล็กใหญ่)
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
