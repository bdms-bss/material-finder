# Gemini Cloud ผ่าน backend

เวอร์ชันปัจจุบันเปลี่ยนจากโมเดลที่โหลดใน browser เป็น **Google Gemini API ผ่าน Cloudflare Worker** ตามที่ผู้ดูแลเลือก. ไม่ใช้ Puter/OpenRouter และไม่ให้ผู้ใช้วาง API key ในหน้าเว็บ.

ขั้นตอนเปิดใช้: [backend/README.md](backend/README.md).

หน้าเว็บจะยังไม่เรียก Gemini จนกว่าจะตั้ง Worker URL และ public Turnstile Site Key ใน `docs/ai-config.json`. Secret Gemini key และ Turnstile secret อยู่ใน Cloudflare เท่านั้น. การค้นหาข้อความปกติยังใช้ได้โดยไม่เรียก AI.

การวิเคราะห์มีสองขั้น: ทำความเข้าใจสินค้า/สเปก → ค้น candidate จริงใน Master → ให้ Gemini ตรวจเลือกหรือถามเพิ่ม. ไม่ใช้ fixed topic vocabulary หรือ local-model download อีกต่อไป. ผลลัพธ์ยังเป็น Material code เท่านั้น และต้องตรวจ Catalog ระดับ Plant ก่อนนำไปใช้.

ผู้ใช้ต้องยืนยันการส่งคำค้น ภาพ และ candidate ไป Cloudflare/Google ก่อน. มีโควตา/ค่าใช้จ่ายตาม Google project; ไม่รับประกันใช้ฟรีไม่จำกัด. การใช้ cloud model ไม่รับประกันความแม่นยำเอง ต้องวัดกับตัวอย่างจริงหลังตั้ง secret แล้ว.

ทดสอบโค้ดด้วย provider mocks และ Worker dry-run แล้ว แต่ยังไม่ได้ทดสอบคำตอบ Gemini จริงเพราะยังไม่มี Worker ที่ deploy พร้อม credentials. ดู [TESTING.md](TESTING.md) สำหรับขอบเขตการตรวจและประวัติเวอร์ชันก่อนหน้า.
