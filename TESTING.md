# Current: Gemini Cloud integration

ปัจจุบันใช้ Gemini backend. Tests ด้านล่างที่กล่าวถึง local inference เป็นประวัติเวอร์ชันเก่า ไม่ใช่ผลทดสอบโมเดล cloud. **ยังไม่ได้เรียก Gemini จริง เนื่องจากยังรอเจ้าของใส่ Gemini key และยืนยัน Free tier/Billing. Worker deploy แล้วที่ `https://bdms-material-gemini.bdms-material-finder.workers.dev`; ตรวจจริงแล้วว่า health ตอบ `configured:false`, AI endpoint ปฏิเสธด้วย 503 เมื่อขาด key และ origin อื่นถูกปฏิเสธด้วย 403. การทดสอบนี้ไม่เรียกโมเดล.**

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

## UX/UI redesign regression

ทดสอบโมเดลจริงอีกครั้งกับ UI ใหม่ก่อนเผยแพร่ โดยรัน source ใหม่บน browser context เดิมที่มี cache ของโมเดล:

- ข้อความภาษาไทย → ได้ candidate ถุงมือตรวจโรค และแสดง L0 จาก master
- ภาพรถเข็น → ได้กลุ่มทั่วไป `C02060000 · WHEELCHAIR` ก่อนกลุ่มเฉพาะทาง พร้อม L0 / CAPEX-OPEX
- progress, completed state, modal interaction ทำงาน และไม่พบ JavaScript errors หรือ network POST requests

ทดสอบ deterministic UI ด้วย `scripts/check-ui.cjs`: category → L0 filter, query, sort, load more, copy code/summary, group-vs-code warning, no results, AI drawer, cancel/fallback, keyboard tabs/Escape, invalid image, data error/retry, mobile 390/320 px และไม่แสดงผล AI เก่าหลังเปลี่ยนคำค้น. axe-core ไม่พบ violations ในสถานะที่ระบุใน [UX_DESIGN.md](UX_DESIGN.md); ไม่ใช่การรับรอง WCAG conformance ครบทุกข้อ.

## BDMS branding / Material Master / category drilldown

- ยืนยัน export ก่อนและหลังปรับ: ตัดเพิ่ม 13,326 Material codes และ 107 Groups เฉพาะ Material group `Z00000000` และ `M*`; รหัส Material เช่น `MSP...` ที่อยู่ในกลุ่มปกติยังอยู่
- ข้อมูลหลังคัดกรอง: 59,172 Material codes / 11,367 Material groups; Direct Pay = 1 Material code / 183 Groups
- การ์ดสรุปยอดแยก Material codes/Groups รวมตรงกับ export และไม่เปลี่ยนยอดของหมวดอื่นเมื่อ drilldown
- เลือก Direct Pay แล้ว sidebar, aria-pressed, focus และรายการด้านล่างตรงกัน; กดซ้ำเพื่อล้างหมวดได้
- โหลดโลโก้ SVG สำเร็จ และ headline เป็นข้อความกลาง ๆ Material Master
- คำว่า Catalog ใช้เฉพาะอธิบายขอบเขต/การตรวจ Plant ไม่ใช้เป็นชื่อผลค้นหา
- ตรวจ axe เพิ่มใน summary-facet state รวมถึง home/detail/AI/mobile results: 0 violations ในชุดตรวจ WCAG ที่ใช้อยู่

## Material-code-only / compact type row

- หน้าแรกและ browse โดยไม่มีคำค้นไม่แสดง summary; ส่งคำค้นจึงแสดงปุ่มประเภทหนึ่งแถว สูงไม่เกิน 48 px
- ผลลัพธ์และ AI candidates ทุกตัวมี Material code ไม่มี Group-only cards
- ค้นด้วย Group `B01031011` ได้จำนวน Material codes ตรงกับ master; ค้นด้วย Group description ได้รหัสสินค้าเช่นกัน
- Group ที่ไม่มี Material code แสดง context notice และไม่มีการ์ด Group ให้เลือก
- Direct Pay อยู่ในตัวกรองประเภท, summary, badge และเก็บ GL/Asset accounting เดิมใน detail
- ยอด summary ไม่ซ้ำระหว่าง OPEX กับ Direct Pay และผลรวมเท่ากับ Material codes ที่พบ
- ตรวจ Desktop และ mobile 390/320 px: strip อยู่แถวเดียว มือถือเลื่อนภายในแถว ไม่มี page overflow; axe ไม่พบ violations ในสถานะที่ตรวจ

## Gemini / Cloudflare backend integration

- Node tests ตรวจ intent/rank schemas, server-only x-goog-api-key, Turnstile action/hostname, CORS, rate limit, excluded/group-only candidates และไม่ echo secret/provider error
- Cloud orchestration tests ตรวจสองขั้นพร้อม tokens แยก, skip rank เมื่อไม่มี candidate, ไม่ retry เมื่อ quota เต็ม, และ reject IDs ที่ AI แต่งขึ้น
- Browser tests ใช้ backend/Turnstile mocks: setup pending, consent, material-only recommendations, clarification, quota/cancel, ไม่มี local model fallback พร้อม regression UI/filters/copy/mobile/accessibility
- Wrangler deploy --dry-run ผ่าน; bundle gzip ประมาณ 5 KB, ไม่มี Master dataset หรือ key รวมใน bundle
- ไม่ได้ deploy Cloudflare จริง และไม่ได้ทดสอบ model quality/Google quota/real Turnstile challenge; ต้องทำหลังผู้ดูแลตั้ง backend แล้ว
