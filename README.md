# BDMS Material Finder

เว็บค้นหา Material code / Material group สำหรับ PR และวางแผนงบประมาณ พร้อม Taxonomy L0–L4, GL แยก Department type และ Asset class จาก master จริง รองรับภาษาไทยด้วยคำพ้องที่กำหนดไว้และ AI backend เสริม

## เปิดเว็บ

GitHub Settings → Pages → Deploy from a branch → main → /docs. URL: https://bdms-bss.github.io/material-finder/

สำหรับ local: `python -m http.server 8000 --directory docs`

## AI และรูปภาพ

GitHub Pages ให้บริการ static frontend เท่านั้น ต้อง deploy `api/server.mjs` บน Node 22+ service ที่รองรับ HTTPS แล้วตั้ง environment variables ในระบบ hosting:

- `OPENAI_API_KEY` (server secret เท่านั้น)
- `ALLOWED_ORIGIN=https://bdms-bss.github.io`
- `OPENAI_MODEL=gpt-4.1-mini` (optional)
- `PORT=8787` (optional)

รัน `npm start` จาก project root แล้วกด AI connection ในเว็บ ใส่ `https://your-service/api/suggest`. รูปภาพจะส่งไป backend และ OpenAI เมื่อผู้ใช้กดค้นหา/AI เท่านั้น ไม่บันทึกภาพใน repository. AI ระบุสินค้าและสร้าง search terms ก่อน retrieve กลุ่มจาก master แล้วเสนอเฉพาะรหัสที่มีอยู่จริง; กดกลุ่มเพื่อดู mapping และค้นหา Material code ที่เกี่ยวข้อง ห้ามใช้ API key ใน browser.

ก่อนเปิด AI endpoint สู่สาธารณะให้ติดตั้ง authentication, rate limiting และ spending limit ที่ API gateway; CORS ไม่ใช่ระบบ authentication. Backend ใน repo เป็น integration starter ยังไม่ได้ deploy และยังไม่ได้ทดสอบเรียก AI จริงเนื่องจากไม่มี key.

## ข้อมูลและหลักเกณฑ์

ข้อมูลนำเข้าจาก `H BDMS DCT-PRD-DataTaxonomy(20261030).xlsx`. เผยแพร่เฉพาะฟิลด์ catalog ที่จำเป็น ไม่รวม Created By, Changed By, ชื่อผู้รับผิดชอบ และข้อมูลราคา. การเป็น public repo ทำให้ catalog ที่นำเข้าเป็นข้อมูลสาธารณะตามคำขอ.

- Join ด้วย Material Group; GL ใช้ `sap_MaterialGroup_GL` และเก็บทุก Department type แยกกัน
- Asset mapping ใช้ `sap_MaterialGroup_Asset`; GL/Asset descriptions จาก master โดยตรง
- Taxonomy ใช้ `Master_DataTaxonomy`; ไม่ apply แผ่น `New_Edit` ซึ่งเป็นรายการขอแก้ไข
- Material ที่มี deletion flag ถูกซ่อนโดยค่าเริ่มต้น; group INACTIVE ยังอาจพบได้ตามชื่อใน master ให้ตรวจสอบก่อนใช้
- กติกา BDMS BSS: มี Asset class → CAPEX; มี GL-A (Admin expense) หรือ GL-C (Cost) → OPEX; มีทั้งสองประเภท mapping → CAPEX/OPEX
- ไม่มีทั้งสอง mapping → ไม่พบข้อมูลจัดประเภท; GL-S เพียงอย่างเดียวไม่ใช้สรุป OPEX
- ใช้กติกานี้ทั้ง Material และ Material group โดยอ้างอิง group mapping; ไม่ใช้การอยู่ในแผ่น MaterialCAPEX มา override กติกา
- กรณี CAPEX/OPEX ให้เลือกตามวัตถุประสงค์ PR และนโยบายบัญชี
- วันที่บนหน้าจอเป็นวันที่ snapshot ของไฟล์ แต่วันที่ปรับปรุงแต่ละ sheet แตกต่างกัน

## อัปเดต master

ติดตั้ง Python `openpyxl` แล้วรัน:

`python scripts/import_data.py /path/to/master.xlsx`

commit `docs/data.json` ใหม่แล้ว deploy Pages. ไม่ commit workbook ต้นฉบับและ secrets. ตรวจ `npm run check` และค้นหาตัวอย่างก่อนเผยแพร่.
