# AI ของผู้ใช้ผ่าน OpenRouter OAuth

## ทำไมเลือกวิธีนี้

OpenRouter เปิด flow OAuth PKCE สำหรับ frontend: ผู้ใช้ login/authorize ที่ `openrouter.ai/auth` แล้วเว็บแลก code เป็น key ที่ผูกกับบัญชีผู้ใช้. ไม่ต้องสร้างแอปใน Microsoft tenant หรือให้ผู้ดูแล Entra อนุมัติ integration. หากอุปกรณ์/เครือข่ายองค์กรบล็อก OpenRouter เว็บนี้ไม่ข้ามข้อจำกัดเหล่านั้น.

ผู้ใช้ต้องมี **บัญชี OpenRouter**; การ login นี้ไม่ได้ดึง token จากบัญชี ChatGPT/Claude/Gemini/Copilot หรือใช้แพ็กเกจสมาชิกเดิม. ใช้เครดิต OpenRouter ตามราคา/วงเงินของบัญชี ไม่รับประกันใช้ฟรีไม่จำกัด. ผู้ใช้สามารถกำหนดวงเงินบนหน้า authorize/key settings ของ OpenRouter.

## วิธีใช้

1. เปิดหน้าเว็บ กด “เชื่อมบัญชี AI” → “Login ด้วย OpenRouter”.
2. Login และตรวจสิทธิ์/วงเงินบน OpenRouter จากนั้น authorize เพื่อกลับเว็บ.
3. เลือกโมเดล และยืนยันการส่งข้อมูลออกไปยังบริการภายนอก.
4. พิมพ์คำค้นหรือเพิ่มภาพ แล้วกด “ถาม AI”. ถ้าหน้าถูก redirect ระหว่าง login ให้แนบภาพอีกครั้ง (ไม่เก็บภาพใน sessionStorage).
5. AI วิเคราะห์คำค้นก่อน เว็บค้นจาก master จริงและส่ง top 35 candidates ให้ AI เลือก. คลิกการ์ดที่ตรวจรหัสแล้วเพื่อดู GL/Asset/Taxonomy จาก master.
6. ตัดการเชื่อมต่อเมื่อเลิกใช้. หากต้องการเพิกถอนสิทธิ์ key ที่ OpenRouter ด้วย ให้ใช้ “จัดการ key / วงเงิน” แล้วลบ key ที่เกี่ยวข้อง.

## การจัดการ credential

- สร้าง verifier และ state ด้วย Web Crypto, ใช้ challenge S256.
- ตรวจ callback state และอายุ 10 นาที ก่อนแลก code; ลบ code/state/error จาก address bar ทันที.
- callback ไปที่ origin+path ปัจจุบัน ไม่กำหนด secret และไม่ต้องใช้ backend.
- key เก็บใน sessionStorage ของแท็บ; ไม่ log, ไม่ส่งเป็น query string และส่ง Authorization header เฉพาะ OpenRouter API.
- no-referrer ป้องกันส่ง callback URL ไปเป็น referrer ของทรัพยากรภายนอก.
- ตัดการเชื่อมต่อจะยกเลิกคำขอที่ค้าง ลบ key และล้างคำตอบใน panel. การ abort ไม่รับประกันว่าคำขอที่ provider รับไปแล้วจะไม่ถูกคิดเงิน.
- สิทธิ์ key เป็นของผู้ใช้ ไม่แชร์ key ของผู้พัฒนา. ปิดแท็บเพื่อลบ session storage ตาม browser session semantics; browser restore/duplicate tab อาจคง session ไว้ได้ ให้กดตัดการเชื่อมต่อถ้าใช้เครื่องร่วมกัน.

## ข้อมูลที่ส่ง

รอบ 1: คำค้นและภาพ (ถ้ามี) เพื่อหา generic search terms.
รอบ 2: คำค้น, คำที่ AI สรุป, และ top 35 candidates พร้อม Material code, Group, Taxonomy, GL, Asset, Budget; ไม่ส่ง master ทั้งหมด. เว็บค้น candidate ใน browser จาก catalog ทั้งหมด โดยไม่รวม Material ที่ deletion flag. การส่งออกนี้แยกจากระบบ AI ขององค์กรเดิม ผู้ใช้เห็นข้อความยืนยันก่อนส่ง.

คำขอกำหนด `provider.data_collection: deny` ตาม API routing ของ OpenRouter และไม่มี fallback ไป provider ที่ไม่ตรงเงื่อนไขอย่างเงียบ ๆ; นี่ไม่ใช่การยืนยันว่าองค์กรอนุมัติบริการหรือว่าข้อมูลไม่ถูกประมวลผลภายนอก. ตรวจ [OpenRouter privacy](https://openrouter.ai/privacy) และเงื่อนไขของโมเดลที่เลือก.

## ทดสอบกับบัญชีจริงก่อนใช้งาน

- login ด้วย OpenRouter, ตรวจวงเงินที่อนุญาต, กลับเว็บสำเร็จ
- ยกเลิก login / ปลอม state / callback หมดอายุไม่เชื่อมบัญชี
- ทดลองคำค้นถุงมือ, เครื่องวัดความดัน และภาพสินค้า โดยตรวจ GL/Asset/Taxonomy กับ master
- ชื่อที่ไม่พบไม่สร้างรหัสใหม่; คำตอบที่เสนอ id นอก candidate ไม่ถูกแสดงเป็นการ์ด
- หมดเครดิต/โมเดลไม่พร้อม/timeout แสดง error โดยไม่ fallback หรือเรียกซ้ำอัตโนมัติ
- ตัดการเชื่อมต่อแล้วไม่สามารถส่ง AI request ต่อ และลบ key บน OpenRouter ได้

## เอกสารทางการ

- [OAuth PKCE](https://openrouter.ai/docs/guides/overview/auth/oauth)
- [Models API](https://openrouter.ai/api/v1/models)
- [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)

ทดสอบ OAuth/API ด้วย mocks และทดสอบหน้าเว็บใน Chromium; การ authorize และ inference จริงต้องใช้บัญชีผู้ใช้ ไม่มีการแอบใช้ credential ของระบบพัฒนา.
