import {validateCloudConfig,cloudSearch,prepareCloudImage} from './cloud-ai.js?v=cloud-8';
let busy=false,controller,lastQuery='',lastImage=null,config,configPromise,scriptPromise;
const $=id=>document.getElementById(id);
let backendReady=false;
function status(value){$('assistantStatus').textContent=value;$('aiProgress').removeAttribute('value')}
function paragraph(value){const p=document.createElement('p');p.textContent=value;return p}
export function openAssistant(){
 const panel=$('assistantPanel');if(panel.open)return;
 const activeImage=$('imageTab')?.getAttribute('aria-selected')==='true';const query=$(activeImage?'imageQuery':'query')?.value||'';
 const image=activeImage?$('preview')?.getAttribute('src')||null:null;
 if(!busy&&(query!==lastQuery||image!==lastImage)){$('assistantOutput').replaceChildren();status('ตรวจคำอธิบาย แล้วกดวิเคราะห์ผ่าน Gemma 4 · Cloud AI')}
 $('assistantQuery').value=busy?lastQuery:query;$('assistantImageNote').hidden=busy?!lastImage:!image;
 panel.hidden=false;panel.showModal();$('assistantQuery').focus();loadConfig();
}
async function loadConfig(){
 configPromise??=fetch('ai-config.json?v=cloud-8',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).catch(()=>{configPromise=null;return null});
 config=await configPromise;backendReady=false;
 if(validateCloudConfig(config)){
  try{const r=await fetch(config.backendUrl+'/api/health',{cache:'no-store',signal:AbortSignal.timeout(10000)});const health=await r.json();backendReady=r.ok&&health.service==='bdms-ai'&&health.configured===true}catch{}
 }
 $('backendSetup').hidden=backendReady;
 $('cloudConnection').textContent=backendReady?'Gemma 4 · พร้อมช่วยค้นหาจากข้อความและภาพ':'ยังเชื่อมต่อผู้ช่วยไม่ได้ · ลองใหม่อีกครั้งภายหลัง';
 return config;
}

function loadTurnstile(){
 if(window.turnstile)return Promise.resolve();
 if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;const timer=setTimeout(()=>{script.remove();scriptPromise=null;reject(Error('โหลดระบบยืนยันนานเกินไป กรุณาลองใหม่'))},15000);script.onload=()=>{clearTimeout(timer);window.turnstile?resolve():reject(Error('โหลดระบบยืนยันไม่สำเร็จ'))};script.onerror=()=>{clearTimeout(timer);script.remove();scriptPromise=null;reject(Error('เชื่อมระบบยืนยัน Cloudflare ไม่ได้'))};document.head.append(script)});
 return scriptPromise;
}
async function getToken(action,signal){
 await loadTurnstile();signal.throwIfAborted();status('กำลังยืนยันการใช้งานก่อนเรียก AI…');
 return new Promise((resolve,reject)=>{
  let widget;let complete=false;
  const finish=(error,token)=>{if(complete)return;complete=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(widget!==undefined)window.turnstile.remove(widget);error?reject(error):resolve(token)};
  const abort=()=>finish(Object.assign(Error('ยกเลิกแล้ว'),{name:'AbortError'}));
  const timer=setTimeout(()=>finish(Error('ยืนยันการใช้งานหมดเวลา กรุณาตรวจช่องยืนยัน Cloudflare แล้วลองใหม่')),75000);
  signal.addEventListener('abort',abort,{once:true});
  try{widget=window.turnstile.render($('turnstileWidget'),{sitekey:config.turnstileSiteKey,action,theme:'light',execution:'execute',appearance:'always',callback:token=>finish(null,token),'error-callback':()=>finish(Error('การยืนยันไม่สำเร็จ ลองใหม่หรือเปิดเว็บในเบราว์เซอร์ปกติ')),'expired-callback':()=>finish(Error('การยืนยันหมดอายุ กรุณาลองอีกครั้ง'))});window.turnstile.execute(widget)}catch{finish(Error('เริ่มระบบยืนยันไม่สำเร็จ'))}
 });
}
export function cancelAssistant(){controller?.abort();status('ยกเลิกแล้ว คำขอที่ส่งถึง AI ไปแล้วอาจยังถูกนับโควตา')}
function showCards(records,openRecord){
 for(const {record,reason}of records){
  const card=document.createElement('article');card.className='aiRecommendation';
  const title=document.createElement('h3');title.textContent=record.description;
  const identity=document.createElement('div');identity.className='ai-code-line';const label=document.createElement('span');label.textContent='Material Code';const code=document.createElement('strong');code.textContent=record.materialCode;identity.append(label,code);
  const meta=document.createElement('dl');meta.className='ai-meta';
  const l0=record.taxonomy[0];
  for(const [key,value]of [['Material Group',record.materialGroup],['L0',l0?.some(Boolean)?l0.filter(Boolean).join(' · '):'ยังไม่มีข้อมูล'],['ประเภท',record.directPay?'Direct Pay · '+record.budgetLabel:record.budgetLabel]]){const block=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;block.append(dt,dd);meta.append(block)}
  const why=paragraph(reason);why.className='ai-reason';
  const actions=document.createElement('div');actions.className='ai-actions';const detail=document.createElement('button');detail.textContent='ดูรายละเอียด';detail.onclick=()=>openRecord(record.id);
  const copy=document.createElement('button');copy.textContent='คัดลอกรหัส';copy.onclick=async()=>{try{await navigator.clipboard.writeText(record.materialCode);copy.textContent='คัดลอกแล้ว ✓';setTimeout(()=>{if(copy.isConnected)copy.textContent='คัดลอกรหัส'},2000)}catch{status('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกรหัสแล้วคัดลอก')}};
  actions.append(detail,copy);card.append(identity,title,meta,why,actions);$('assistantOutput').append(card);
 }
}

export async function suggest(query,image,retrieve,openRecord){
 openAssistant();if(busy)return;
 if(!query.trim()&&!image){status('กรุณาพิมพ์สิ่งที่ต้องการหรือแนบภาพ');return}
 const activeConfig=await loadConfig();if(busy)return;if(!validateCloudConfig(activeConfig)||!backendReady){status('ยังเรียก AI ไม่ได้: บริการยังไม่พร้อม กรุณาลองใหม่ภายหลัง');return}
 if(!$('cloudConsent').checked){status('กรุณายืนยันการส่งคำค้น ภาพ และรายการอ้างอิงจาก Master ไปยัง Cloudflare Workers AI ก่อน');$('cloudConsent').focus();return}
 busy=true;lastQuery=query;lastImage=image;controller=new AbortController();const signal=controller.signal;
 const timeout=setTimeout(()=>controller?.abort(),180000);
 $('assistantQuery').disabled=true;$('sendContext').disabled=true;$('cancelAI').hidden=false;$('aiProgress').hidden=false;$('assistantOutput').setAttribute('aria-busy','true');$('assistantOutput').replaceChildren();
 try{
  status('กำลังเตรียมข้อมูลสำหรับ Gemma 4 · Cloud AI…');
  const prepared=await prepareCloudImage(image);signal.throwIfAborted();
  const result=await cloudSearch({config:activeConfig,query,image:prepared,retrieve,getToken,signal,progress:status});
  signal.throwIfAborted();
  const understood=paragraph((lastImage?'จากภาพ น่าจะเป็น: ':'กำลังมองหา: ')+String(result.intent.item||query).slice(0,600));understood.className='ai-understood';$('assistantOutput').append(understood);
  if(result.intent.requiredFeatures?.length)$('assistantOutput').append(paragraph('รายละเอียดที่ระบุ: '+result.intent.requiredFeatures.join(' · ')));
  if(result.question){const question=document.createElement('div');question.className='ai-question';question.append(paragraph(result.question));const edit=document.createElement('button');edit.textContent='เพิ่มรายละเอียดในคำอธิบาย';edit.onclick=()=>$('assistantQuery').focus();question.append(edit);$('assistantOutput').append(question)}
  showCards(result.records,openRecord);
  if(!result.records.length&&!result.question)$('assistantOutput').append(paragraph('ยังไม่พบรหัสที่เหมาะสมจาก Master ลองระบุประเภท ขนาด หรือการใช้งานเพิ่มเติม'));
  status(result.records.length?`AI แนะนำ ${result.records.length} Material codes ที่ตรวจรหัสกับ Master แล้ว`:'AI ยังไม่เลือกรหัสสินค้า กรุณาเพิ่มรายละเอียดตามคำถาม');
 }catch(error){
  if(error.name==='AbortError')status('ยกเลิกหรือหมดเวลาแล้ว คำขอที่ส่งถึง AI อาจยังถูกนับโควตา');
  else{status(error.message||'เชื่อม AI ไม่สำเร็จ กรุณาลองใหม่');$('assistantOutput').append(paragraph('คุณยังค้นหาจากข้อความในหน้าหลักได้ หรือเพิ่มรายละเอียดแล้วลองอีกครั้ง'))}
 }finally{clearTimeout(timeout);controller=null;busy=false;$('assistantQuery').disabled=false;$('sendContext').disabled=false;$('cancelAI').hidden=true;$('aiProgress').hidden=true;$('assistantOutput').setAttribute('aria-busy','false')}
}
