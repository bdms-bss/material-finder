import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudConfig,verifiedCloudSuggestions,cloudSearch,cloudCall} from '../docs/cloud-ai.js';
const config={backendUrl:'https://worker.example.workers.dev',turnstileSiteKey:'public-site-key-example'};
const candidate={id:'materials:123',materialCode:'123',materialGroup:'B01031011',description:'Glove exam nitrile'};
test('cloud configuration uses an HTTPS backend without credentials or query strings',()=>{
 assert.equal(validateCloudConfig(config),true);
 for(const value of [null,{...config,backendUrl:'http://example.org'},{...config,backendUrl:'https://x:y@example.org'},{...config,backendUrl:'https://example.org?key=bad'},{...config,turnstileSiteKey:''}])assert.equal(validateCloudConfig(value),false);
});
test('cloud suggestions must be unique material codes actually in the master candidates',()=>{
 const result=verifiedCloudSuggestions([candidate,{id:'groups:G1',materialCode:null}],[{id:'invented',reason:'bad'},{id:candidate.id,reason:'fit'},{id:candidate.id},{id:'groups:G1'}]);
 assert.deepEqual(result,[{record:candidate,reason:'fit'}]);
});
test('cloud flow interprets, retrieves and ranks with separate human-verification tokens',async()=>{
 const calls=[],actions=[],progress=[];
 const result=await cloudSearch({config,query:'ถุงมือตรวจ',image:null,signal:new AbortController().signal,progress:value=>progress.push(value),getToken:async action=>{actions.push(action);return action+'-token'},retrieve:terms=>{assert.ok(terms.includes('nitrile glove'));return[candidate]},fetcher:async(url,options)=>{const body=JSON.parse(options.body);calls.push(body);return Response.json(String(url).endsWith('/intent')?{item:'ถุงมือตรวจ',searchTerms:['nitrile glove'],requiredFeatures:[]}:{suggestions:[{id:candidate.id,reason:'ตรงประเภท'},{id:'fake'}],clarificationQuestion:'ขนาดใด?'})}});
 assert.deepEqual(actions,['material-intent','material-rank']);assert.equal(calls.length,2);assert.equal(result.records.length,1);assert.equal(result.question,'ขนาดใด?');assert.equal(progress.length,2);
});
test('no match skips the second paid request and quota errors are not silently retried',async()=>{
 let calls=0;
 const result=await cloudSearch({config,query:'unknown',image:null,signal:new AbortController().signal,progress:()=>{},getToken:async()=> 'token',retrieve:()=>[],fetcher:async()=>{calls++;return Response.json({item:'unknown',searchTerms:[]})}});
 assert.equal(result.records.length,0);assert.equal(calls,1);
 await assert.rejects(()=>cloudCall(config,'/api/intent',{},new AbortController().signal,async()=>{calls++;return Response.json({message:'โควตาเต็ม'},{status:429})}),/โควตาเต็ม/);assert.equal(calls,2);
});
