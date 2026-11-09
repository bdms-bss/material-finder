import {MODEL,INTENT_SYSTEM,RANK_SYSTEM,inferencePayload,parseInference,selectionSchema} from './inference.mjs';
const VERIFY='https://challenges.cloudflare.com/turnstile/v0/siteverify';
const LIMIT=3*1024*1024;
class ApiError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}
const fail=(status,code,message)=>{throw new ApiError(status,code,message)};
const text=(value,max=1000)=>typeof value==='string'?value.trim().slice(0,max):'';
const list=(value,max=12)=>Array.isArray(value)?value.filter(v=>typeof v==='string').map(v=>text(v,120)).filter(Boolean).slice(0,max):[];
export function sanitizeCandidates(value){
 if(!Array.isArray(value)||value.length>60)fail(400,'INVALID_CANDIDATES','รายการอ้างอิงไม่ถูกต้อง');
 const seen=new Set();
 return value.map(c=>{
  if(!c||typeof c!=='object')fail(400,'INVALID_CANDIDATES','รายการอ้างอิงไม่ถูกต้อง');
  const code=text(c.materialCode,40),group=text(c.materialGroup,40),id=text(c.id,60),description=text(c.description,300),groupName=text(c.groupName,300);
  if(!/^[A-Za-z0-9_-]+$/.test(code)||!/^[A-Za-z0-9_-]+$/.test(group)||id!=='materials:'+code||seen.has(id)||!description||/^M/i.test(group)||group.toUpperCase()==='Z00000000'||/^(INACTIVE|\(CANCEL\))/i.test(groupName)||/^\(CANCEL\)/i.test(description))fail(400,'INVALID_CANDIDATES','รายการอ้างอิงไม่ถูกต้อง');
  seen.add(id);return{id,materialCode:code,description,materialGroup:group,groupName,taxonomy:Array.isArray(c.taxonomy)?c.taxonomy.slice(0,5).map(l=>Array.isArray(l)?l.slice(0,2).map(v=>text(v,200)):[]):[]};
 });
}
async function readBody(request){
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))fail(415,'INVALID_CONTENT_TYPE','ใช้ JSON request เท่านั้น');
 if(Number(request.headers.get('content-length'))>LIMIT)fail(413,'TOO_LARGE','ข้อมูลหรือรูปภาพใหญ่เกินไป');
 const reader=request.body?.getReader();if(!reader)fail(400,'INVALID_BODY','ไม่พบข้อมูลคำถาม');
 const chunks=[];let bytes=0;
 while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>LIMIT){await reader.cancel();fail(413,'TOO_LARGE','ข้อมูลหรือรูปภาพใหญ่เกินไป')}chunks.push(value)}
 const body=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength}
 try{const parsed=JSON.parse(new TextDecoder().decode(body));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();return parsed}catch{fail(400,'INVALID_BODY','ข้อมูล JSON ไม่ถูกต้อง')}
}
async function verifyHuman(token,action,request,env,fetcher){
 if(typeof token!=='string'||!token||token.length>2048)fail(403,'HUMAN_CHECK_REQUIRED','กรุณายืนยันการใช้งานก่อนเรียก AI');
 const form=new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token});
 const ip=request.headers.get('CF-Connecting-IP');if(ip)form.set('remoteip',ip);
 let result;try{const response=await fetcher(VERIFY,{method:'POST',body:form,signal:AbortSignal.timeout(12000)});result=await response.json()}catch{fail(503,'HUMAN_CHECK_UNAVAILABLE','ระบบยืนยันการใช้งานไม่พร้อม กรุณาลองใหม่')}
 if(!result.success||result.hostname!==env.TURNSTILE_HOSTNAME||result.action!==action)fail(403,'HUMAN_CHECK_FAILED','การยืนยันไม่สำเร็จหรือหมดอายุ กรุณาลองอีกครั้ง');
}
async function infer(system,parts,env,signal,schema){
 if(env.AI_MODEL&&env.AI_MODEL!==MODEL)fail(503,'MODEL_NOT_CONFIGURED','โมเดลที่ตั้งไว้ไม่ตรงกับรุ่นที่ระบบทดสอบแล้ว');
 signal?.throwIfAborted();
 let result,timer;
 try{result=await Promise.race([env.AI.run(MODEL,inferencePayload(system,parts,schema)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('AI_TIMEOUT')),60000)})])}
 catch(error){
  const message=String(error?.message||'');
  if(/quota|rate.?limit|neurons|daily|exceeded|429|3042/i.test(message))fail(429,'AI_QUOTA','โควตา AI ฟรีหรือจำนวนคำขอถึงขีดจำกัดแล้ว กรุณาลองใหม่ภายหลัง');
  if(/AI_TIMEOUT/.test(message))fail(504,'AI_TIMEOUT','AI ใช้เวลานานหรือเชื่อมต่อไม่ได้ กรุณาลองใหม่');
  fail(502,'AI_UNAVAILABLE','บริการ AI ไม่พร้อมชั่วคราว คุณยังค้นหาด้วยข้อความได้');
 }finally{clearTimeout(timer)}
 try{return parseInference(result)}catch{fail(502,'INVALID_AI_RESPONSE','AI ยังไม่ส่งคำตอบที่ตรวจสอบได้ กรุณาเพิ่มรายละเอียดแล้วลองใหม่')}
}
export function createHandler(fetcher=fetch){return async(request,env)=>{
 const origin=request.headers.get('Origin'),allowed=env.ALLOWED_ORIGIN||'https://bdms-bss.github.io';
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origin===allowed)Object.assign(headers,{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'});
 const send=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 try{
  const path=new URL(request.url).pathname;
  if(request.method==='GET'&&path==='/api/health')return send(200,{service:'bdms-ai',configured:Boolean(env.AI&&env.TURNSTILE_SECRET_KEY&&env.TURNSTILE_HOSTNAME&&env.AI_RATE_LIMITER),model:MODEL,provider:'Cloudflare Workers AI'});
  if(origin!==allowed)fail(403,'ORIGIN_NOT_ALLOWED','ไม่อนุญาต origin นี้');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST'||!['/api/intent','/api/rank'].includes(path))fail(404,'NOT_FOUND','ไม่พบ endpoint');
  if(!env.AI||!env.TURNSTILE_SECRET_KEY||!env.TURNSTILE_HOSTNAME||!env.AI_RATE_LIMITER)fail(503,'BACKEND_NOT_CONFIGURED','ผู้ดูแลยังตั้งค่า AI backend ไม่ครบ');
  const ip=request.headers.get('CF-Connecting-IP');if(!ip)fail(403,'MISSING_CLIENT_IP','ไม่พบข้อมูล client สำหรับจำกัดการใช้งาน');
  const {success}=await env.AI_RATE_LIMITER.limit({key:'material-ai:'+ip});if(!success)fail(429,'RATE_LIMIT','เรียก AI ถี่เกินไป กรุณารอสักครู่');
  const body=await readBody(request);
  if(typeof body.query!=='string'||body.query.length>2000)fail(400,'INVALID_QUERY','คำค้นยาวเกินไปหรือไม่ถูกต้อง');
  const query=text(body.query,2000);
  if(path==='/api/intent'){
   let imagePart;
   if(body.image!=null){const match=typeof body.image==='string'&&body.image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match||match[2].length>2800000)fail(400,'INVALID_IMAGE','รูปภาพไม่ถูกต้องหรือใหญ่เกินไป');imagePart={inlineData:{mimeType:'image/'+match[1],data:match[2]}}}
   if(!query&&!imagePart)fail(400,'EMPTY_QUERY','กรุณาใส่คำอธิบายหรือภาพสินค้า');
   await verifyHuman(body.turnstileToken,'material-intent',request,env,fetcher);
   const parts=[{text:query||'Identify the procurement item in the attached image.'}];if(imagePart)parts.push(imagePart);
   const result=await infer(INTENT_SYSTEM,parts,env,request.signal);
   return send(200,{item:text(result.item,600),searchTerms:list(result.searchTerms,10),requiredFeatures:list(result.requiredFeatures,10),clarificationQuestion:text(result.clarificationQuestion,600)});
  }
  const candidates=sanitizeCandidates(body.candidates);if(!candidates.length)fail(400,'EMPTY_CANDIDATES','ไม่พบ Material code สำหรับเปรียบเทียบ');
  const intent={item:text(body.intent?.item,600),requiredFeatures:list(body.intent?.requiredFeatures,10)};
  await verifyHuman(body.turnstileToken,'material-rank',request,env,fetcher);
  const references=candidates.map((c,i)=>({ref:'r'+(i+1),description:c.description,materialGroup:c.materialGroup,groupName:c.groupName,l0:c.taxonomy[0]}));
  const result=await infer(RANK_SYSTEM,[{text:JSON.stringify({query,intent,candidates:references})}],env,request.signal,selectionSchema(references.map(c=>c.ref)));
  const byRef=new Map(references.map((r,i)=>[r.ref,candidates[i]])),seen=new Set(),seenGroups=new Set();
  const suggestions=(Array.isArray(result.suggestions)?result.suggestions:[]).filter(s=>byRef.has(s?.ref)&&!seen.has(s.ref)&&seen.add(s.ref)).filter(s=>{const group=byRef.get(s.ref).materialGroup;if(seenGroups.has(group))return false;seenGroups.add(group);return true}).slice(0,3).map(s=>({id:byRef.get(s.ref).id,reason:text(s.reason,900)}));
  return send(200,{suggestions,clarificationQuestion:text(result.clarificationQuestion,600)});
 }catch(error){return send(error instanceof ApiError?error.status:500,{error:error instanceof ApiError?error.code:'SERVER_ERROR',message:error instanceof ApiError?error.message:'ระบบไม่พร้อม กรุณาลองใหม่'})}
}}
export default {fetch:createHandler()};
