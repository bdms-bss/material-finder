import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHandler} from '../backend/worker.mjs';
import {MODEL} from '../backend/inference.mjs';
const evidence=JSON.parse(fs.readFileSync(new URL('./fixtures/live-ai-20261109.json',import.meta.url)));
const db=JSON.parse(fs.readFileSync(new URL('../docs/data.json',import.meta.url))),master=new Map(db.materials.map(m=>[m[0],m]));
test('recorded real-model outputs resolve short references to exact Master codes through the handler',async()=>{
 assert.equal(evidence.model,MODEL);
 for(const c of evidence.cases){
  const handler=createHandler(async()=>Response.json({success:true,hostname:'bdms-bss.github.io',action:'material-rank'}));
  const env={ALLOWED_ORIGIN:'https://bdms-bss.github.io',TURNSTILE_HOSTNAME:'bdms-bss.github.io',TURNSTILE_SECRET_KEY:'test',AI_RATE_LIMITER:{limit:async()=>({success:true})},AI:{run:async(model,payload)=>{assert.equal(model,MODEL);assert.ok(!JSON.stringify(payload.messages).includes('materials:'));assert.equal(payload.response_format.type,'json_schema');return {choices:[{finish_reason:'stop',message:{content:JSON.stringify(c.rank)}}]}}}};
  const r=await handler(new Request('https://worker.example/api/rank',{method:'POST',headers:{Origin:'https://bdms-bss.github.io','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({query:c.query,intent:c.intent,candidates:c.candidates,turnstileToken:'recorded-response-test-token'})}),env);
  assert.equal(r.status,200,c.id);const result=await r.json(),codes=result.suggestions.map(s=>s.id.slice('materials:'.length));assert.deepEqual(codes,c.expected,c.id);
  for(const code of codes){assert.ok(master.has(code));assert.ok(c.candidates.some(v=>v.materialCode===code));}
  if(c.id==='thai-glove')assert.match(result.clarificationQuestion,/ปราศเชื้อ|sterile/);
 }
});
