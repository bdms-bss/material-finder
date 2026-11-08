# BDMS Material Finder

เว็บค้นหา Material code / Material group สำหรับ PR และวางแผนงบประมาณ พร้อม Taxonomy L0–L4, GL แยก Department type และ Asset class จาก master จริง รองรับภาษาไทยด้วยคำพ้องที่กำหนดไว้และ AI backend เสริม

## เปิดเว็บ

GitHub Settings → Pages → Deploy from a branch → main → /docs. URL: https://bdms-bss.github.io/material-finder/

สำหรับ local: `python -m http.server 8000 --directory docs`

## Microsoft Copilot ขององค์กร

ฝังแชต Copilot Studio ผ่าน Microsoft Web Chat และลงชื่อเข้าใช้บัญชีองค์กรด้วย Microsoft Entra ID. ไม่มีการใช้ OpenAI API key อีกต่อไป.

**สถานะ:** เตรียม integration แล้ว แต่ยังไม่เชื่อม tenant/agent จริง ต้องให้ผู้ดูแลตั้งค่าใน `docs/copilot-config.json` ตาม [คู่มือติดตั้ง](COPILOT_SETUP.md). เมื่อไม่มี configuration ปุ่ม login จะปิดและแสดงสถานะอย่างชัดเจน.

ผู้ใช้กด “Copilot องค์กร” → “ลงชื่อเข้าใช้ด้วย Microsoft” → ค้นหาสินค้า → “ถาม Copilot”. เว็บส่งคำค้น, รูปที่เลือก (ถ้ามี), และ candidate 25 รายการแรกตามตัวกรองปัจจุบัน พร้อม GL, Asset และ Taxonomy ไปยัง agent. แชตไม่เห็น master ทั้งหมดโดยอัตโนมัติ. หากไม่พบ candidate ให้ agent ขอข้อมูลเพิ่มและเสนอคำค้นใหม่; ต้องเพิ่ม knowledge/tool ฝั่งองค์กรหากต้องการให้ agent ค้น master ทั้งหมดเอง.

ภาพแนบผ่าน message attachment; การวิเคราะห์ภาพขึ้นกับความสามารถและการตั้งค่า agent/channel ขององค์กร ต้องทดสอบกับ agent จริงก่อนประกาศว่าใช้งานได้. ยังไม่ได้ทดสอบ login, token exchange หรือคำตอบ AI จริง เนื่องจากยังไม่มี tenant/agent configuration.

การ login ควบคุมการเข้าถึง agent เท่านั้น หน้า GitHub Pages และ catalog ยังคงเป็น public. ต้องตั้ง agent ให้ require sign-in และกำหนดสิทธิ์ฝั่ง Copilot Studio/Entra; การปิดปุ่มในเว็บไม่ใช่การป้องกัน agent. ไม่ใส่ client secret, Direct Line secret หรือ access token ใน repo. MSAL จัดการ user session ใน sessionStorage ของ browser.

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
