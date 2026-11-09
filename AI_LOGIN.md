# AI สำหรับ Material Finder

ใช้ Gemma 4 26B A4B บน Cloudflare Workers AI ผ่าน backend. ผู้ใช้ไม่ต้องมี AI account หรือใส่ API key. ข้อมูลที่ส่งคือคำค้น ภาพ (ย่อก่อนส่ง) และ candidate จาก Master ไม่ส่ง GL/Asset ไปให้โมเดล. ผู้ใช้ยืนยันก่อนส่ง และผ่าน Turnstile.

ไม่เชื่อม Gemini หรือ Copilot ในเส้นทางนี้. การเปลี่ยนเป็น Workers AI แก้ปัญหาโมเดล Gemini เดิมไม่พร้อมใช้งาน และลดการพึ่งบัญชีส่วนตัว. Secret เดิมที่เหลืออยู่ไม่ถูกเรียกใช้.

## ความแม่นยำ

โมเดลเข้าใจความหมายและภาพ ส่วนรหัสและข้อมูลบัญชีมาจาก Master. เลือกด้วย reference r1/r2 แทนการให้โมเดลคัดลอกเลขยาว. Server คืนเฉพาะ reference ที่มีจริง ไม่ซ้ำ Group สูงสุด 3 รายการ. Browser ตรวจ Material ID อีกครั้ง.

คำขอถุงมือที่ขาดรายละเอียดให้ถามเรื่องปราศจากเชื้อก่อน แทนเลือกสุ่มขนาดหรือชนิด. ภาพไม่ได้ยืนยันยี่ห้อ/รุ่นที่เทียบเท่ากัน และไม่ยืนยัน Catalog ของ Plant.

## โควตา

Cloudflare Workers AI มี allocation ฟรี 10,000 Neurons/วันตามเอกสาร ณ วันที่ตรวจ. การค้นหนึ่งครั้งใช้สูงสุด 2 model calls. บัญชี Free หยุดเมื่อเกินขีดจำกัด; Paid อาจคิดเงินส่วนเกิน จึงไม่ควรเปิด Paid โดยไม่ได้อนุญาต. Rate limit ในแอปเป็นแบบประมาณต่อ location ไม่ใช่ hard budget cap. ไม่มี paid-provider fallback.

https://developers.cloudflare.com/workers-ai/platform/pricing/

## การตรวจสอบ

ทดสอบโมเดลจริงด้วยภาพและภาษาไทยผ่าน authenticated Cloudflare API และบันทึกผลใน tests/fixtures/live-ai-20261109.json. UI tests ใช้ provider/Turnstile mocks แยกจากการทดสอบโมเดลจริง. ดู TESTING.md สำหรับขอบเขตการทดสอบหน้า production.
