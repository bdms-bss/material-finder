# AI ฟรีบน browser

AI รุ่นนี้ไม่ใช้ login, token, API key, เครดิต OpenRouter หรือ Copilot Studio. ประมวลผลด้วย Transformers.js / ONNX Runtime Web ภายใน Web Worker ของ browser ผ่าน CPU/WASM จึงไม่ต้องมี WebGPU และไม่ทำให้หน้าค้นหาค้างระหว่างคำนวณ.

## วิธีใช้

1. พิมพ์สิ่งที่ต้องการ หรือแนบภาพ JPEG/PNG/WebP ไม่เกิน 5 MB.
2. กด “ถาม AI” หรือ “AI ฟรีบนเครื่อง” → “วิเคราะห์คำค้น / รูปด้วย AI ฟรี”.
3. ครั้งแรก browser ดาวน์โหลดโมเดลภาษา ~118 MB สำหรับข้อความ หรือโมเดลภาพ ~154 MB สำหรับภาพ พร้อม tokenizer/runtime; มีแถบข้อความความคืบหน้าและปุ่มยกเลิก. ไฟล์จะ cache ตามที่ browser อนุญาต.
4. AI เลือกแนวคิดสินค้าใกล้เคียงจากชุดคำศัพท์จัดซื้อไทย/อังกฤษ แล้วเว็บค้น candidate ใน master ที่ผ่านกฎ exclusion. AI เทียบ candidate อีกครั้งและแสดงได้สูงสุด 6 รายการ.
5. คลิกการ์ดเพื่อดูรหัส, L0-L4, GL, Asset class และ CAPEX/OPEX จาก master จริง.

## ขอบเขต

- นี่คือ semantic retrieval และ image similarity ไม่ใช่ generative chat. ข้อความตอบประกอบสร้างจากข้อมูล master และ template ที่ควบคุมได้.
- โมเดลไม่ได้รู้รหัส SAP; รหัสและ accounting mapping มาจาก master เท่านั้น.
- รูปสินค้าอาจบอกชนิดได้ แต่ไม่สามารถยืนยันรุ่น ขนาด สเปก หรือชนิดยา/ปริมาณยาได้. ผลอันดับแรกเป็นเพียงรายการใกล้เคียง.
- มีชุดแนวคิดจัดซื้อที่กำหนดไว้ใน `docs/ai-topics.js`; รายการนอกขอบเขตอาจแนะนำไม่ได้. ขยายคำศัพท์ได้ตามผล UAT.
- ไม่ส่งคำค้น รูป หรือ candidate ไป AI server. มีการเชื่อม CDN/Hugging Face เพื่อดาวน์โหลด runtime และโมเดล จึงต้องใช้อินเทอร์เน็ตครั้งแรก.
- ไม่คิดค่า inference/API และไม่เปิดหน้าเติมเครดิต. ยังมีค่าอินเทอร์เน็ตและใช้ CPU/RAM ของอุปกรณ์ตามปกติ.
- เครื่องช้า มือถือ RAM น้อย หรือเครือข่ายที่บล็อก CDN/Hugging Face อาจใช้ไม่ได้. กรณีโหลดโมเดลไม่สำเร็จ แสดงข้อความผิดพลาดและผลจับคู่ข้อความแยกชัดเจนว่าไม่ใช่ผล AI.
- การค้นหาธรรมดาไม่ต้องโหลดโมเดลและยังทำงานได้ตามปกติ. ตัวกรองของหน้าค้นหาปกติไม่จำกัด candidate ของ AI.

## Models / runtime

- [Transformers.js 3.0.2](https://github.com/huggingface/transformers.js/tree/3.0.2)
- [Multilingual MiniLM](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2): feature extraction / cosine similarity สำหรับข้อความไทยและอังกฤษ (quantized)
- [CLIP ViT-B/32](https://huggingface.co/Xenova/clip-vit-base-patch32): zero-shot image classification และ image/text similarity (quantized)

โมเดลโหลดจากเจ้าของเดิม ไม่รวม weights ใน repository นี้. ดู license/model card ที่ลิงก์ต้นทาง. อุปกรณ์ผู้ใช้จะดาวน์โหลดจากแหล่งเดิมเมื่อกดใช้ AI.
