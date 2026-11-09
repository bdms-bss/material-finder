import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,sanitizeCandidates} from '../backend/worker.mjs';
const origin='https://bdms-bss.github.io';
const env={ALLOWED_ORIGIN:origin,TURNSTILE_HOSTNAME:'bdms-bss.github.io',GEMINI_API_KEY:'test-server-only-secret',TURNSTILE_SECRET_KEY:'test-turnstile-secret',AI_RATE_LIMITER:{limit:async()=>({success:true})},GEMINI_MODEL:'gemini-2.5-flash'};
const candidate={id:'materials:123',materialCode:'123',materialGroup:'B01031011',description:'Nitrile glove',groupName:'NITRILE GLOVES',taxonomy:[['B','SUPPLY']]};
const request=(path,body,other={})=>new Request('https://worker.example'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...other},body:JSON.stringify(body)});
function providerMock(action,output,requests=[]){return async(url,options)=>{
 requests.push({url:String(url),options});
 if(String(url).includes('siteverify'))return Response.json({success:true,hostname:'bdms-bss.github.io',action});
 return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]});
}}
test('intent securely calls Gemini with structured output and server-only key',async()=>{
 const requests=[];const handler=createHandler(providerMock('material-intent',{item:'ถุงมือ',searchTerms:['glove'],requiredFeatures:['nitrile'],clarificationQuestion:'ขนาดใด?'},requests));
 const response=await handler(request('/api/intent',{query:'ถุงมือ',image:'data:image/png;base64,aGVsbG8=',turnstileToken:'token'}),env);
 assert.equal(response.status,200);assert.equal((await response.json()).item,'ถุงมือ');assert.equal(requests.length,2);
 const call=requests[1];assert.ok(call.url.endsWith('gemini-2.5-flash:generateContent'));assert.ok(!call.url.includes(env.GEMINI_API_KEY));assert.equal(call.options.headers['x-goog-api-key'],env.GEMINI_API_KEY);
 const payload=JSON.parse(call.options.body);assert.equal(payload.generationConfig.responseMimeType,'application/json');assert.equal(payload.contents[0].parts[1].inlineData.mimeType,'image/png');
});
test('rank filters invented IDs and duplicate recommendations',async()=>{
 const handler=createHandler(providerMock('material-rank',{suggestions:[{id:'fake',reason:'bad'},{id:candidate.id,reason:'ตรงชนิด'},{id:candidate.id}],clarificationQuestion:''}));
 const response=await handler(request('/api/rank',{query:'glove',intent:{item:'glove'},candidates:[candidate],turnstileToken:'token'}),env);
 assert.equal(response.status,200);assert.deepEqual((await response.json()).suggestions,[{id:candidate.id,reason:'ตรงชนิด'}]);
});
test('unconfigured backend, bad origin and rate limit fail before upstream inference',async()=>{
 let calls=0;const handler=createHandler(async()=>{calls++;throw Error('must not call')});
 assert.equal((await handler(request('/api/intent',{query:'glove'}),{})).status,503);
 assert.equal((await handler(request('/api/intent',{query:'glove'},{Origin:'https://evil.example'}),env)).status,403);
 assert.equal((await handler(request('/api/intent',{query:'glove'}),{...env,AI_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
 assert.equal(calls,0);
});
test('human verification must match expected hostname and stage; secret is never echoed',async()=>{
 let googleCalls=0;const handler=createHandler(async url=>{if(String(url).includes('siteverify'))return Response.json({success:true,hostname:'evil.example',action:'material-intent'});googleCalls++;throw Error()});
 const response=await handler(request('/api/intent',{query:'glove',turnstileToken:'token'}),env);assert.equal(response.status,403);assert.equal(googleCalls,0);
 const errorHandler=createHandler(async url=>String(url).includes('siteverify')?Response.json({success:true,hostname:'bdms-bss.github.io',action:'material-intent'}):new Response(env.GEMINI_API_KEY,{status:403}));
 const error=await errorHandler(request('/api/intent',{query:'glove',turnstileToken:'token'}),env);assert.equal(error.status,502);assert.ok(!(await error.text()).includes(env.GEMINI_API_KEY));
});
test('body/image/candidate validation rejects malformed, excluded and group-only records',async()=>{
 for(const value of [[{...candidate,id:'groups:B01',materialCode:null}],[{...candidate,materialGroup:'M001'}],[{...candidate,materialGroup:'Z00000000'}],[{...candidate,description:'(CANCEL) glove'}],[candidate,candidate]])assert.throws(()=>sanitizeCandidates(value));
 const handler=createHandler(async()=>{throw Error('must not call')});
 assert.equal((await handler(request('/api/intent',{query:'glove',image:'https://remote.example/a.png'}),env)).status,400);
 assert.equal((await handler(request('/api/intent',{query:'x'.repeat(2001)}),env)).status,400);
 const preflight=await handler(new Request('https://worker.example/api/intent',{method:'OPTIONS',headers:{Origin:origin}}),env);assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
});
