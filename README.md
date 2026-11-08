# BDMS Material Finder

เว็บค้นหา Material code / Material group สำหรับ PR และวางแผนงบประมาณ พร้อม Taxonomy L0–L4, GL แยก Department type และ Asset class จาก master จริง รองรับภาษาไทยด้วยคำพ้องที่กำหนดไว้และ AI backend เสริม

## เปิดเว็บ

GitHub Settings → Pages → Deploy from a branch → main → /docs. URL: https://bdms-bss.github.io/material-finder/

สำหรับ local: `python -m http.server 8000 --directory docs`

## AI login โดยไม่ต้องใช้ IT admin

ใช้ [OpenRouter OAuth + PKCE](https://openrouter.ai/docs/guides/overview/auth/oauth) บน GitHub Pages ได้โดยตรง ไม่มี backend, Entra app registration, shared API key หรือ client secret. ผู้ใช้กด **เชื่อมบัญชี AI → Login ด้วย OpenRouter** และอนุญาตเว็บบนหน้า OpenRouter. เว็บได้รับ key ของผู้ใช้จาก OAuth และเก็บไว้ใน sessionStorage ของแท็บ ไม่อยู่ใน repository หรือ URL. สมาชิก ChatGPT/Claude/Copilot ไม่ใช่เครดิต OpenRouter; ผู้ใช้ต้องมีบัญชี OpenRouter และเครดิต/วงเงินที่ใช้ได้.

เลือก OpenAI GPT-4.1 mini, Google Gemini 2.5 Flash หรือ Anthropic Claude Sonnet 4.5. โมเดลและราคาเปลี่ยนแปลงได้ ข้อผิดพลาดจากเครดิต/โมเดลไม่พร้อมจะแสดงในเว็บ ไม่มีการเปลี่ยนโมเดลหรือเติมเงินให้อัตโนมัติ.

ก่อนส่งต้องยืนยันว่าคำค้น รูป และ candidate จะส่งไปยัง OpenRouter และผู้ให้บริการโมเดล ซึ่งเป็นบริการภายนอกองค์กร. การถามหนึ่งครั้งใช้สูงสุดสอง AI calls: (1) ระบุสินค้า/สร้างคำค้นจากข้อความหรือภาพ (2) แนะนำจาก candidate ที่ค้นได้ใน master ทั้งหมดบน browser (ไม่รวม material deletion flag). AI ไม่ถูกจำกัดด้วยตัวกรองผลค้นหาปกติ. ส่งเฉพาะ top 35 candidate ในรอบที่สอง. เมื่อไม่พบ candidate จะไม่เรียก AI รอบที่สองและไม่เสนอรหัส.

แสดงเฉพาะ recommendation ที่ id ตรงกับ candidate จริง ส่วน Material/Group, GL, Asset, Taxonomy และ CAPEX/OPEX บนหน้ารายละเอียดอ้างอิง local master โดยตรง. ข้อความเหตุผลและความเหมาะสมจาก AI ยังต้องให้ผู้ใช้ตรวจสอบ. ภาพใช้ image input ของโมเดล ไม่เก็บภาพใน repository.

**ตัดการเชื่อมต่อ** ลบ key ใน browser และยกเลิกคำขอค้าง แต่ไม่ใช่การ revoke key บน OpenRouter; ใช้ลิงก์ **จัดการ key / วงเงิน** เพื่อตรวจค่าใช้จ่ายหรือยกเลิก key. ไม่ใส่ password, session cookie หรือ token จากบัญชี AI อื่นในเว็บนี้.

ดู [รายละเอียดการเชื่อมต่อและ UAT](AI_LOGIN.md). การทดสอบใน repo ใช้ mock สำหรับ OAuth/API และทดสอบ local browser; ยังไม่มีการอนุญาตบัญชีจริง/เรียกโมเดลแบบคิดค่าใช้จ่ายในการพัฒนา.

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
