import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,sanitizeCandidates} from '../backend/worker.mjs';
import {MODEL,inferencePayload,parseInference} from '../backend/inference.mjs';
const origin='https://bdms-bss.github.io';
const candidate={id:'materials:123',materialCode:'123',materialGroup:'B01031011',description:'Nitrile glove',groupName:'NITRILE GLOVES',taxonomy:[['B','SUPPLY']]};
const env={ALLOWED_ORIGIN:origin,TURNSTILE_HOSTNAME:'bdms-bss.github.io',TURNSTILE_SECRET_KEY:'test-server-only-secret',AI_MODEL:MODEL,AI_RATE_LIMITER:{limit:async()=>({success:true})}};
const request=(path,body,other={})=>new Request('https://worker.example'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...other},body:JSON.stringify(body)});
function setup(action,output){const calls=[];return {calls,env:{...env,AI:{run:async(model,payload)=>{calls.push({model,payload});return {choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]}}}},handler:createHandler(async(url,options)=>{assert.ok(String(url).includes('siteverify'));assert.equal(new URLSearchParams(options.body).get('secret'),env.TURNSTILE_SECRET_KEY);return Response.json({success:true,hostname:'bdms-bss.github.io',action})})}}
test('real binding contract sends inline vision input and JSON response format without personal keys',async()=>{
 const s=setup('material-intent',{item:'ถุงมือ',searchTerms:['glove'],requiredFeatures:[],clarificationQuestion:''});
 const response=await s.handler(request('/api/intent',{query:'ถุงมือ',image:'data:image/png;base64,aGVsbG8=',turnstileToken:'token'}),s.env);
 assert.equal(response.status,200);assert.equal((await response.json()).item,'ถุงมือ');assert.equal(s.calls.length,1);
 assert.equal(s.calls[0].model,MODEL);const p=s.calls[0].payload;assert.equal(p.response_format.type,'json_object');assert.equal(p.messages[1].content[1].image_url.url,'data:image/png;base64,aGVsbG8=');assert.equal(p.chat_template_kwargs.enable_thinking,false);assert.ok(!JSON.stringify(p).includes(env.TURNSTILE_SECRET_KEY));
});
test('rank filters invented/duplicate IDs, returns at most three, and sends no account mappings',async()=>{
 const s=setup('material-rank',{suggestions:[{ref:'invented',reason:'bad'},{ref:'r1',reason:'ตรงชนิด'},{ref:'r1'}],clarificationQuestion:''});
 const response=await s.handler(request('/api/rank',{query:'glove',intent:{item:'glove'},candidates:[{...candidate,gl:{A:'PRIVATE_GL'},assetClasses:['PRIVATE_ASSET']}],turnstileToken:'token'}),s.env);
 assert.equal(response.status,200);assert.deepEqual((await response.json()).suggestions,[{id:candidate.id,reason:'ตรงชนิด'}]);assert.ok(!JSON.stringify(s.calls[0].payload).includes('PRIVATE_'));
});
test('unconfigured binding, bad origin, wrong model and rate limit fail closed',async()=>{
 let calls=0;const handler=createHandler(async()=>{calls++;throw Error('must not call')});
 assert.equal((await handler(request('/api/intent',{query:'glove'}),{})).status,503);
 assert.equal((await handler(request('/api/intent',{query:'glove'},{Origin:'https://evil.example'}),{...env,AI:{}})).status,403);
 assert.equal((await handler(request('/api/intent',{query:'glove'}),{...env,AI:{},AI_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);assert.equal(calls,0);
 const s=setup('material-intent',{});assert.equal((await s.handler(request('/api/intent',{query:'glove',turnstileToken:'token'}),{...s.env,AI_MODEL:'paid-unreviewed-model'})).status,503);assert.equal(s.calls.length,0);
});
test('human verification matches hostname and stage before inference; errors never echo secrets',async()=>{
 let calls=0;const ai={run:async()=>{calls++;throw Error(env.TURNSTILE_SECRET_KEY)}};
 for(const result of [{success:false},{success:true,hostname:'evil.example',action:'material-intent'},{success:true,hostname:'bdms-bss.github.io',action:'material-rank'}]){
  const h=createHandler(async()=>Response.json(result));assert.equal((await h(request('/api/intent',{query:'glove',turnstileToken:'token'}),{...env,AI:ai})).status,403);
 }assert.equal(calls,0);
 const h=createHandler(async()=>Response.json({success:true,hostname:'bdms-bss.github.io',action:'material-intent'}));const r=await h(request('/api/intent',{query:'glove',turnstileToken:'token'}),{...env,AI:ai});assert.equal(r.status,502);assert.ok(!(await r.text()).includes(env.TURNSTILE_SECRET_KEY));
});
test('provider quota and invalid output do not silently retry or switch provider',async()=>{
 const s=setup('material-intent',{});let calls=0;const e={...s.env,AI:{run:async()=>{calls++;throw Error('daily neurons quota exceeded')}}};const r=await s.handler(request('/api/intent',{query:'glove',turnstileToken:'token'}),e);assert.equal(r.status,429);assert.equal(calls,1);
 const broken={...s.env,AI:{run:async()=>({choices:[{finish_reason:'length',message:{content:'{}'}}]})}};assert.equal((await s.handler(request('/api/intent',{query:'glove',turnstileToken:'token'}),broken)).status,502);
});
test('body/image/candidate validation rejects malformed, excluded and group-only records',async()=>{
 for(const value of [[{...candidate,id:'groups:B01',materialCode:null}],[{...candidate,materialGroup:'M001'}],[{...candidate,materialGroup:'Z00000000'}],[{...candidate,description:'(CANCEL) glove'}],[candidate,candidate]])assert.throws(()=>sanitizeCandidates(value));
 const s=setup('material-intent',{});
 assert.equal((await s.handler(request('/api/intent',{query:'glove',image:'https://remote.example/a.png'}),s.env)).status,400);assert.equal((await s.handler(request('/api/intent',{query:'x'.repeat(2001)}),s.env)).status,400);
 const p=await s.handler(new Request('https://worker.example/api/intent',{method:'OPTIONS',headers:{Origin:origin}}),s.env);assert.equal(p.status,204);assert.equal(p.headers.get('Access-Control-Allow-Origin'),origin);
});
test('inference parser handles binding response shapes but rejects malformed/incomplete JSON',()=>{
 assert.deepEqual(parseInference({response:'```json\n{"item":"ภาพ"}\n```'}),{item:'ภาพ'});assert.throws(()=>parseInference({response:'plain text'}));assert.throws(()=>parseInference({choices:[{finish_reason:'length',message:{content:'{}'}}]}));
 assert.equal(inferencePayload('system',[{text:'สินค้า'}]).store,false);
});
