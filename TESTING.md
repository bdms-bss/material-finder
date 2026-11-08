# Verification of free local AI

ทดสอบใน Chromium บน Linux ก่อนเผยแพร่ โดยใช้โมเดลจริงจาก Hugging Face ผ่าน CPU/WASM (ไม่มี token, API key หรือ mocked AI response):

| Input | Observed result |
|---|---|
| `อยากได้ถุงมือใส่ตรวจคนไข้` | เข้าใจว่าใกล้เคียงถุงมือตรวจโรค และเสนอ actual master codes เช่น `42132205000229`, `42132203000013`, `MSP0004873` พร้อม L0 `B · MEDICAL SUPPLY & INSTRUMENT` |
| ภาพรถเข็นผู้ป่วยจาก Wikimedia | CLIP ระบุแนวคิด `hospital wheelchair` และคืน candidate กลุ่มรถเข็น/Material ที่มีจริง เช่น `C02060000`, `42192210000059` พร้อม L0 `C · MEDICAL EQUIPMENT` |

ข้อสังเกตจากการทดสอบและการแก้ไข:

- ไลบรารีรุ่นแรกมี bare module dependency ที่ browser resolve ไม่ได้ → เปลี่ยนเป็น Transformers.js 3.0.2 ที่ bundle runtime ได้
- การค้นแบบ OR ของคำ `surgical` ทำให้มี gowns ปน → จำกัด candidate ให้มี concept anchor ในชื่อ Material/Group และใช้คำไทยช่วยแยก exam/surgical gloves
- การจัดอันดับจากภาพมี wheelchair แบบเฉพาะทางปน → แสดงกลุ่มทั่วไปที่ตรงแนวคิดก่อน เมื่อภาพไม่ได้ยืนยันรายละเอียดสเปก
- เพิ่ม version query ใน app/assistant/worker imports เพื่อลดปัญหา JS เก่า/ใหม่ปนกันหลัง deploy

ทดสอบ UI/error handling ด้วย Worker จำลองแยกจากการทดสอบโมเดลจริง:

- ปิด sessionStorage แล้วยังเปิดเว็บ/AI panel ได้ ไม่มี JavaScript exception
- ทุก card ในหน้าค้นหาแสดง L0 ชัดเจน
- ดาวน์โหลดโมเดลไม่สำเร็จ → แสดง error และ fallback ที่ระบุว่าเป็นผลค้นหาข้อความ ไม่ใช่ AI
- กดยกเลิกแล้ว worker หยุดและปุ่มส่งกลับมาใช้งานได้
- viewport มือถือ 390 px ไม่มี horizontal overflow

`npm test` ตรวจรหัส candidate, vocabulary consistency, CAPEX/OPEX business rules และการ exclude deleted/inactive records. Catalog reconciliation กับ source workbook ผ่านในการอัปเดต exclusion ก่อนหน้า.

ภาพทดสอบ: [Wikimedia Commons source](https://commons.wikimedia.org/wiki/File:Man_in_wheelchair_with_AFO_braces_and_crutches_b.jpg). ใช้เฉพาะใน local QA ไม่ได้รวมรูปใน repo หรือส่งไป AI cloud.

ผลทดสอบนี้ไม่ใช่การรับรองความแม่นยำของทุกสินค้า/ภาพ. ต้องตรวจรายละเอียดชนิด รุ่น ขนาด และสเปกก่อนเปิด PR.
