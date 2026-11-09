# Gemini backend บน Cloudflare Workers

**สถานะ:** โค้ด backend พร้อม deploy และผ่าน unit/integration tests ด้วย upstream mocks รวมถึง Wrangler dry-run แล้ว. ยังไม่มี Worker URL, Turnstile keys หรือ Gemini secret ในระบบพัฒนา จึงยังไม่ได้เรียก Gemini จริงหรือวัดความแม่นยำของคำตอบจริง.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fbdms-bss%2Fmaterial-finder%2Ftree%2Fmain%2Fbackend)

## ตั้งค่าผ่าน Dashboard (ไม่ต้องใช้ IT admin ของ Microsoft)

### 1. สร้าง Turnstile widget

เข้า [Cloudflare Dashboard](https://dash.cloudflare.com/) ด้วยบัญชีของคุณ → Turnstile → Add widget:

- Widget name: `BDMS Material Master`
- Widget mode: **Managed**
- Hostname: **`bdms-bss.github.io`** (ไม่ใส่ protocol หรือ path)
- เก็บ **Site Key** (public) ไว้ใช้ในหน้าเว็บ และ **Secret Key** ไว้ใส่ Worker secret

Turnstile ป้องกันการเรียก AI endpoint แบบอัตโนมัติบางส่วน และ backend มี rate-limit binding. ไม่ใช่ระบบบัญชีองค์กรหรือ hard billing cap.

### 2. Deploy Worker

กดปุ่ม **Deploy to Cloudflare** ด้านบน แล้วเลือกบัญชี Cloudflare ของคุณ. Template แยกอยู่ใน `backend/` และไม่ต้อง build หน้าเว็บ GitHub Pages ใหม่.

Cloudflare อาจให้เชื่อม GitHub และสร้าง repo สำเนาของ backend ในบัญชีที่คุณเลือกตามขั้นตอน template. หาก root directory ไม่ถูกเลือกอัตโนมัติ ให้เลือก `backend` (หรือใช้ CLI ด้านล่าง).

ชื่อ Worker ที่แนะนำ: `bdms-material-gemini`.

ค่าธรรมดา (public environment variables) ตาม `wrangler.jsonc`:

| Name | Value |
|---|---|
| `ALLOWED_ORIGIN` | `https://bdms-bss.github.io` — ไม่มี path หรือ slash ต่อท้าย |
| `TURNSTILE_HOSTNAME` | `bdms-bss.github.io` |
| `GEMINI_MODEL` | `gemini-2.5-flash` หรือ model ID ที่ Google project ของคุณรองรับ |

ใส่ค่าต่อไปนี้เป็น **Secrets** ในหน้าติดตั้ง template หรือ Worker → Settings → Variables and Secrets:

| Secret | ใส่อะไร |
|---|---|
| `GEMINI_API_KEY` | key จาก Google AI Studio ของคุณ |
| `TURNSTILE_SECRET_KEY` | Secret Key ของ widget ในขั้นตอน 1 |

**ห้ามใส่ Gemini key ลง GitHub, `docs/ai-config.json`, frontend JavaScript หรือส่งในแชต.** Template ใช้ `.dev.vars.example` ระบุชื่อ secret เท่านั้น.

ตรวจว่ามี binding `AI_RATE_LIMITER` ตาม config: 20 calls / 60 seconds ต่อ IP ในแต่ละ Cloudflare location (หนึ่งการค้นหาใช้ได้สูงสุด 2 calls). Wrangler/template จะสร้าง binding นี้ตาม `wrangler.jsonc`. หากใช้ namespace id เดียวกับโปรเจ็กต์อื่นในบัญชี ให้เปลี่ยนเป็นเลขที่ยังไม่ใช้.

### 3. ตรวจ backend และเชื่อมหน้าเว็บ

หลัง deploy จะได้ URL ลักษณะ `https://bdms-material-gemini.<your-subdomain>.workers.dev`.

เปิด `<Worker URL>/api/health` แล้วตรวจ `configured: true`. ค่านี้ยืนยันว่ามี secrets/bindings ครบ **ยังไม่ยืนยันว่า Gemini key ใช้ได้ โควตาพอ หรือโมเดลพร้อม** — ต้องทดสอบคำถามจริงอีกครั้ง.

ส่งกลับมาเฉพาะ:

1. **Worker base URL**
2. **Turnstile Site Key (public)**

แล้วผมจะใส่ใน `docs/ai-config.json` ให้. คุณแก้เองได้เช่นกัน:

```json
{
  "backendUrl": "https://bdms-material-gemini.your-subdomain.workers.dev",
  "turnstileSiteKey": "YOUR_PUBLIC_TURNSTILE_SITE_KEY"
}
```

ไม่ใส่ `/api/intent` ต่อท้าย URL. Frontend จะเรียก endpoints ให้เอง. Site Key เป็น public configuration; **ไม่ใช่ Turnstile Secret Key**.

### 4. ทดลองใช้งานจริง

เปิด [Material Master](https://bdms-bss.github.io/material-finder/) → AI → อธิบายสินค้า → ยืนยันส่งข้อมูลออกไปยัง Cloudflare/Google → วิเคราะห์.

- Turnstile อาจให้ยืนยันการใช้งานก่อนเรียกแต่ละขั้น
- ไม่ต้อง login Gemini ฝั่งผู้ใช้; backend ใช้ key/โควตาของเจ้าของ Google project
- ไม่ดาวน์โหลดโมเดลลงเครื่อง และไม่มี silent fallback ไป local AI
- ทดสอบอย่างน้อย: ถุงมือตรวจ vs ผ่าตัด, เครื่องวัดความดัน, ภาพรถเข็น, สินค้าที่ไม่มีใน Master และคำถามที่ขาดขนาด/สเปก
- ถ้าเลือกไม่ได้อย่างมั่นใจ ให้ถามเพิ่มได้ ไม่บังคับเสนอ Material code

## ทางเลือก CLI

จาก repo หลัก:

```sh
cd backend
npm ci
npx wrangler login
npm run deploy
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
```

ใส่ค่าผ่าน prompt ของ CLI เท่านั้น ไม่ใช้ key เป็น shell argument. ทดสอบ local ให้ copy `.dev.vars.example` เป็น `.dev.vars` และกรอกในไฟล์ที่ถูก ignore. Local requests ต้องมี Origin/CF-Connecting-IP และใช้ widget hostname ที่ถูกต้อง; unit tests ใช้ mocked verification แทนการปิดการป้องกันในโค้ด production.

## Data flow และ grounding

1. Browser ย่อภาพ JPEG สูงสุดด้านละ 1600 px ตามสัดส่วน แล้วส่งคำค้น/ภาพไป `/api/intent`.
2. Worker ตรวจ Origin, rate limit, Turnstile hostname/action แล้วเรียก Gemini ให้สร้าง generic search terms และระบุสเปกที่ผู้ใช้ให้มาจริง.
3. Browser ค้น candidate ใน Material Master จริง ไม่จำกัด vocabulary แบบโมเดล local เดิม และส่งได้สูงสุด 60 Material codes ไป `/api/rank`.
4. Worker คัดเฉพาะชื่อ/รหัส/กลุ่ม/Taxonomy ของ candidate เพื่อให้ Gemini เลือกหรือถามข้อมูลเพิ่ม.
5. ทั้ง Worker และ browser กรอง id ที่ไม่อยู่ใน candidate ออก. GL, Asset class, L0 และ CAPEX/OPEX/Direct Pay ที่แสดงยังมาจาก Master ไม่ให้ AI สร้างเอง.

ไม่มีฐานข้อมูลภาพหรือ chat log ในโค้ด Worker. แต่ข้อมูลถูกประมวลผลผ่าน Cloudflare และ Google; เงื่อนไขข้อมูลของ Gemini ขึ้นกับ Google project/tier. การย่อภาพอาจลดความชัดของตัวหนังสือเล็ก ควรพิมพ์ยี่ห้อ/รุ่น/ขนาดเพิ่มเมื่อจำเป็น.

## Cost / quota / production limits

Workers มี free plan แต่ Gemini API และโควตาขึ้นกับบัญชี Google. **ไม่รับประกันใช้ฟรีไม่จำกัดหรือแม่นยำกว่าโดยยังไม่ทำ benchmark.** ก่อนเปิดใช้สาธารณะให้ตั้ง API restrictions และ quota ใน Google project ตามวงเงินที่ต้องการ. Budget alert อย่างเดียวไม่ใช่ hard spending cap.

CORS ไม่ใช่ authentication. Turnstile และ rate limit ลดการใช้งานผิดประเภท แต่ rate-limit API เป็น approximate/per-location ไม่ใช่ hard quota ทั่วโลก. หากต้องการสิทธิ์เฉพาะพนักงาน ให้เพิ่ม authentication ของระบบองค์กรในเฟสถัดไป.

## Sources

- [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Cloudflare Deploy buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/)
- [Worker rate-limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
