# Gemma 4 on Cloudflare Workers AI — verification 2026-11-09

## Real model calls

Model: `@cf/google/gemma-4-26b-a4b-it`. Invoked through authenticated Cloudflare REST API via the connected Cloudflare plugin, without provider mocks or personal Gemini keys. Inputs and outputs are retained in `tests/fixtures/live-ai-20261109.json`; replay tests are explicitly recorded-response tests, not fresh inference on every `npm test`.

| Input | Observed result after short-reference ranking | Master check |
|---|---|---|
| Pulse oximeter image; no product name in query | เครื่องวัดออกซิเจนปลายนิ้ว → MEQ9000144 | C03030200, L0 C, CAPEX/OPEX |
| Wheelchair image; no product name in query | รถเข็นวีลแชร์ → MEQ9000115 | C02060100, L0 C, CAPEX/OPEX |
| อยากได้ถุงมือใส่ตรวจคนไข้ | Asks sterile/non-sterile; no arbitrary code | No unsafe random glove choice |
| ถุงมือไนไตรล์ไม่ปราศเชื้อ ขนาด M สำหรับตรวจคนไข้ | 42132203000013 | Nitrile exam #M, B01031011, L0 B, OPEX |

Before short-reference ranking, live model tests exposed missing zeros in long IDs and irrelevant brand alternatives. The implementation now supplies r1/r2 references, a JSON schema enum, server-side mapping, one result per group, and browser whitelist checks. Never assume the model can safely reproduce SAP codes from memory.

Images used only for QA and not bundled into the website:
- Pulse oximeter: https://www.shop-beurer.com/products/beurer-pulse-oximeter-po30 (official product photo, resized to 640px for the test)
- Wheelchair: https://commons.wikimedia.org/wiki/File:Man_in_wheelchair_with_AFO_braces_and_crutches_b.jpg (resized to 640px)

This is a small task-specific sample, not a general accuracy benchmark. Image recognition does not verify brand/model equivalence, sterility, dimensions or plant Catalog availability. Candidate retrieval is lexical with model-expanded terms and group diversity, not a full semantic/vector index.

## Automated regression

- `npm run check`: JS syntax for browser and Worker modules.
- `npm test`: 17 tests, including candidate/reference validation, real-output replay, source exclusions, accounting types, quota/invalid response fail-closed behavior, hostname/action verification, request/image bounds and no paid fallback.
- `npm run test:ui`: backend/Turnstile mocks; covers pending/ready config, consent, text and resized image flow, short results, copy code, detail dialog, clarification, quota, cancel, group search, type counts, mobile widths and loading retries.
- Axe-core WCAG tests in home, facets, details, AI and mobile states: zero violations in tested tags.
- Wrangler dry-run: AI binding and rate limiter recognized; no credentials in source/bundle.

## Production checks

Production frontend: https://bdms-bss.github.io/material-finder/
Backend: https://bdms-material-gemini.bdms-material-finder.workers.dev

Real Turnstile remains mandatory on both AI stages. Never use test keys or disable verification on production to make automated tests pass. Automated cloud browsers can be challenged; UI regression mocks and authenticated live model checks above are separate evidence, not a claim that CAPTCHA was bypassed.

Deployment-specific health/CORS/invalid-token and production-browser results are added after deployment. A successful `/api/health` checks configuration only, not model quota or inference quality.

## Deployment checks after Workers AI migration

- Worker deployment `816a1935f3cf42099811093e4b5eb78e`; frontend deployed from `9c6b507` before the last presentation polish.
- Production `/api/health`: service bdms-ai, configured true, model @cf/google/gemma-4-26b-a4b-it.
- Production invalid Turnstile token: HTTP 403 HUMAN_CHECK_FAILED; wrong Origin: HTTP 403 ORIGIN_NOT_ALLOWED.
- Live browser found a loader issue introduced by using turnstile.ready() with an async script. Fixed by resolving on script.onload and bounding script load to 15 seconds. A new browser run had zero application JS errors and displayed the real interactive verification checkbox. No CAPTCHA bypass or test keys were added to production.
- Full public-site inference remains pending human-verification approval in the test browser; no claim of complete public CAPTCHA-to-inference automation.
- `npm run test:ai-replay`: actual Worker handler and browser render recorded real model outputs, verifying pulse image → MEQ9000144, nitrile M → 42132203000013, L0/accounting, copy and mobile layout. Provider/Turnstile are replay mocks in this test. Set PULSE_TEST_IMAGE to a local image to exercise image resize with that file; otherwise a small PNG tests the upload path only. CHROMIUM_PATH selects the installed browser.
