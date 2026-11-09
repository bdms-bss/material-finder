# Material Finder — UX/UI redesign

## Product goal and assumptions

ช่วยผู้ใช้ที่ไม่รู้รหัสค้นหาสิ่งที่ต้องจัดซื้อ ตรวจสอบ mapping และนำรหัสไปใช้กับ PR/งบประมาณได้โดยไม่สับสนระหว่างสินค้าและกลุ่มสินค้า. ครอบคลุมผู้ขอซื้อทั่วไป Procurement และผู้วางแผนงบประมาณ. นี่เป็นการออกแบบจากความต้องการและ heuristic review ยังไม่มีการสัมภาษณ์หรือ usability study กับผู้ใช้จริง จึงต้องทำ UAT ต่อกับตัวแทนงานแต่ละกลุ่ม.

## Design basis

- [ISO 9241-210: human-centred design](https://www.iso.org/standard/77520.html): ใช้บริบทงาน → task flow → prototype → evaluate/iterate เป็นแนวทางกระบวนการ ไม่ใช่ claim ว่าผลิตภัณฑ์ได้รับ certification.
- [Nielsen's 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/): system visibility, recognition over recall, user control, error prevention, consistency, recovery และ contextual help.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): ใช้ระดับ AA เป็นเป้าหมายการออกแบบ และตรวจด้วย keyboard, semantic HTML และ axe-core. ผลอัตโนมัติไม่ใช่การรับรอง conformance ทุก success criterion.

## Decisions across dimensions

| Dimension | Implementation and reason |
|---|---|
| Information architecture | Search → identify candidate → inspect finance/taxonomy → copy. หน้าแรกเป็น guided discovery แทนการเท 20–30 รายการที่ไม่เกี่ยวข้อง |
| Learnability | ตัวอย่างคำค้นภาษาไทย, category discovery ที่กรอง L0 จริง, วิธีใช้ 3 ขั้น และ shortcut `/` ที่มองเห็นได้ |
| Accuracy / error prevention | แยกป้าย Material code กับ Material group พร้อมแจ้งในรายละเอียดว่ากลุ่มไม่ใช่รหัสสินค้า ไม่คัดลอก Group โดยติดป้ายว่า Material code |
| Decision support | L0 และ budget label เห็นบน card; GL/Asset และคำอธิบายเต็มเปิดใน detail; ไม่ใช้สีเป็นวิธีสื่อความหมายเพียงอย่างเดียว |
| Efficiency | ตัวกรองที่ล้างได้ทีละตัว, reset, sort, copy code / copy summary, load more และการกลับ focus หลัง modal |
| Cognitive load | ใช้ progressive disclosure กับ account mapping, taxonomy, CAPEX/OPEX explanation และรายละเอียด download ของ AI |
| Trust / provenance | Snapshot/source, mapping ที่ไม่มีข้อมูลระบุอย่างตรงไปตรงมา, exclude X/INACTIVE/CANCEL ก่อนโหลด, คำแนะนำ AI ไม่ใช่การยืนยัน spec |
| Gemini Cloud | Drawer มีช่องอธิบาย, สถานะการตั้งค่า backend, consent ส่งข้อมูล, Turnstile, progress/cancel, quota error และคำถามขอรายละเอียดเพิ่ม ไม่ fallback ไป local model |
| Accessibility | Native buttons/select/dialog, labelled controls, tab keyboard behavior, focus-visible, skip link, reduced motion, status/alert announcements, copy feedback ภายใน dialog |
| Responsive design | Mobile ยุบตัวกรอง, cards เป็น single column, touch controls ใหญ่ขึ้น, AI drawer เต็มจอ และ modal scroll แยกจากพื้นหลัง |
| Performance | ไม่ sort catalog ทั้งหมดก่อนผู้ใช้เริ่มค้นหา, แสดง 20 รายการต่อครั้ง, เรียก Gemini เฉพาะเมื่อผู้ใช้ยืนยันและกดวิเคราะห์, ไม่โหลดโมเดลใน browser |
| Recovery | Loading skeleton, disabled submit ระหว่างโหลด, data retry, clear query, no-result suggestions, persistent image validation error, clipboard fallback |
| Maintainability | Design tokens, reusable card/dialog states, versioned entry modules, ไม่เปลี่ยนกติกา accounting หรือ source exclusions |

## Visual system

สีหลักน้ำเงิน BDMS และแดง accent ตามโลโก้ พร้อมสีปุ่มที่เข้มพอให้ contrast กับ white; พื้นหลัง off-white และ border บาง. Hierarchy เน้นชื่อรายการ → code → L0/budget → supporting mapping. ใช้ Noto Sans Thai พร้อม system fallback และ monospace เฉพาะรหัส. ข้อความสำคัญไม่ถูกตัดด้วย ellipsis; group description บน card เป็น preview และมีคำอธิบายเต็มใน detail.

## Verified before publishing

- Desktop 1440 px / mobile 390 px: guided discovery, filters, search, zero-result recovery, sorting, copy, finance detail, group-vs-material distinction, help, keyboard tabs and Escape, AI drawer and cancellation.
- Clipboard code/summary ได้ค่าจริง และ summary มี L0 / GL / Asset / budget.
- axe-core 4.10.3: checked WCAG 2 A/AA, 2.1 AA, 2.2 AA tags on home, detail, AI and mobile results; no violations in those tested states at initial QA.
- UI tests ใช้ simulated Worker สำหรับ deterministic state coverage; model correctness มีการทดสอบ inference จริงแยกต่างหากในรอบ local AI ก่อนหน้า และตรวจ regression หลัง redesign.
- `npm test`: accounting rules, excluded catalog และ candidate/vocabulary integrity.

## Recommended user UAT

ให้ตัวแทนผู้ขอซื้อ Procurement และ budget owner ลองหาสินค้า 3–5 แบบ เช่น ชื่อไทย, รหัสตรง, ชื่อไม่ตรงระบบ และภาพ. วัด task completion, wrong-code selection, เวลาใช้ค้นหา, ความเข้าใจ CAPEX/OPEX และความเข้าใจว่า Group ไม่ใช่ Material code. ตรวจ browser/อุปกรณ์จริงขององค์กร รวมถึง zoom, screen reader และเครื่อง RAM ต่ำก่อนสรุปการเข้าถึงครบถ้วน.

## Material Master clarification and branding update

ใช้ชื่อและข้อความกลาง ๆ “ค้นหาข้อมูล Material Master” พร้อมโลโก้ BDMS จริงแบบเวกเตอร์. หลีกเลี่ยงการสื่อว่าเป็น Catalog หรือพร้อมคีย์ PR: Catalog เป็นข้อมูลระดับ Plant ซึ่งไม่ได้รวมในเว็บนี้ และไม่ทราบสถานะ availability.

Result category cards เป็น faceted navigation: แยกยอด Material codes/Groups; เปลี่ยนหมวดได้โดยคง counts ของหมวดอื่นตามคำค้น. แยก Direct Pay (Group Z*) ออกจาก Taxonomy L0; ไม่สร้าง L0 ขึ้นแทนข้อมูลที่ไม่มี. Exclude Z00000000 และ M* ตั้งแต่ import และมี frontend guard เพิ่มเติม.

## Material-code-first refinement

เป้าหมายการใช้งานเลือก PR เปลี่ยนให้ผลลัพธ์และ AI เป็น Material code เท่านั้น โดยข้อมูล Group ยังคงเป็น searchable metadata. ลบตัวเลือกแสดง Group cards เพื่อไม่เพิ่มขั้นตอนให้ผู้ใช้ต้องค้นหารหัสสินค้าซ้ำ. หาก Group ไม่มีรหัสสินค้าที่ตรงกับคำค้น/ตัวกรอง ให้แสดงบริบทแทนการเสนอ Group เป็นสินค้า.

ย่อ summary เป็นแถวปุ่มชนิดเดียว ไม่เป็น grid/card ใหญ่และไม่แสดงก่อนค้นคำ; หน้าเริ่มต้นไม่มี category cards. Summary แบ่งตามประเภทหลัก OPEX / CAPEX / both / Direct Pay / unknown และนับรหัสสินค้า ไม่ใช่จำนวน Group. Direct Pay ใช้ Z* ก่อนจัดประเภทบัญชีเพื่อไม่ซ้ำยอด แต่เก็บข้อมูล GL/Asset และ CAPEX/OPEX ตามต้นฉบับไว้ใน detail. มือถือใช้ horizontal scrolling ภายในแถว ไม่ทำให้ทั้งหน้าล้น.

## Gemini Cloud migration

AI รุ่นปัจจุบันเรียก Gemini ผ่าน Cloudflare backend ไม่โหลดโมเดล local แล้ว. UI แจ้งสถานะรอ backend อย่างตรงไปตรงมา มี consent ส่งข้อมูลออก, human verification, progress, cancel, quota errors และถามข้อมูลเพิ่มเมื่อระบุรหัสไม่ได้. การทดสอบ UI ใช้ backend mocks; ยังต้องวัดความแม่นยำจริงหลังตั้ง credentials.
