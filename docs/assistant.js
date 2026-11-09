import {validateCloudConfig,cloudSearch,prepareCloudImage} from './cloud-ai.js?v=gemini-5';
let busy=false,controller,lastQuery='',lastImage=null,config,configPromise,scriptPromise;
const $=id=>document.getElementById(id);
function status(value){$('assistantStatus').textContent=value;$('aiProgress').removeAttribute('value')}
function paragraph(value){const p=document.createElement('p');p.textContent=value;return p}
export function openAssistant(){
 const panel=$('assistantPanel');if(panel.open)return;
 const activeImage=$('imageTab')?.getAttribute('aria-selected')==='true';const query=$(activeImage?'imageQuery':'query')?.value||'';
 const image=activeImage?$('preview')?.getAttribute('src')||null:null;
 if(!busy&&(query!==lastQuery||image!==lastImage)){$('assistantOutput').replaceChildren();status('ตรวจคำอธิบาย แล้วกดวิเคราะห์ผ่าน Gemini Cloud')}
 $('assistantQuery').value=busy?lastQuery:query;$('assistantImageNote').hidden=busy?!lastImage:!image;
 panel.hidden=false;panel.showModal();$('assistantQuery').focus();loadConfig();
}
async function loadConfig(){
 configPromise??=fetch('ai-config.json?v=gemini-5',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).catch(()=>{configPromise=null;return null});
 config=await configPromise;
 $('backendSetup').hidden=validateCloudConfig(config);
 $('cloudConnection').textContent=validateCloudConfig(config)?'Gemini Cloud · ผ่าน Cloudflare backend':'Gemini Cloud · รอตั้งค่า backend';
 return config;
}
function loadTurnstile(){
 if(window.turnstile)return Promise.resolve();
 if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=()=>window.turnstile?resolve():reject(Error('โหลดระบบยืนยันไม่สำเร็จ'));script.onerror=()=>{script.remove();scriptPromise=null;reject(Error('เชื่อมระบบยืนยัน Cloudflare ไม่ได้'))};document.head.append(script)});
 return scriptPromise;
}
async function getToken(action,signal){
 await loadTurnstile();signal.throwIfAborted();status('กำลังยืนยันการใช้งานก่อนเรียก Gemini…');
 return new Promise((resolve,reject)=>{
  let widget;let complete=false;
  const finish=(error,token)=>{if(complete)return;complete=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(widget!==undefined)window.turnstile.remove(widget);error?reject(error):resolve(token)};
  const abort=()=>finish(Object.assign(Error('ยกเลิกแล้ว'),{name:'AbortError'}));
  const timer=setTimeout(()=>finish(Error('ยืนยันการใช้งานหมดเวลา ลองใหม่อีกครั้ง')),75000);
  signal.addEventListener('abort',abort,{once:true});
  try{widget=window.turnstile.render($('turnstileWidget'),{sitekey:config.turnstileSiteKey,action,theme:'light',execution:'execute',appearance:'interaction-only',callback:token=>finish(null,token),'error-callback':()=>finish(Error('การยืนยันไม่สำเร็จ กรุณาลองอีกครั้ง')),'expired-callback':()=>finish(Error('การยืนยันหมดอายุ กรุณาลองอีกครั้ง'))});window.turnstile.execute(widget)}catch{finish(Error('เริ่มระบบยืนยันไม่สำเร็จ'))}
 });
}
export function cancelAssistant(){controller?.abort();status('ยกเลิกแล้ว คำขอที่ส่งถึง Gemini ไปแล้วอาจยังถูกนับโควตา')}
function showCards(records,openRecord){
 for(const {record,reason}of records){const card=document.createElement('div');card.className='aiRecommendation';
  const button=document.createElement('button');button.textContent=record.materialCode+' · '+record.description;button.onclick=()=>openRecord(record.id);
  const l0=record.taxonomy[0];card.append(button,paragraph(reason),paragraph('L0: '+(l0?.some(Boolean)?l0.filter(Boolean).join(' · '):'ยังไม่มีข้อมูล L0')),paragraph(`Group: ${record.materialGroup}${record.directPay?' · Direct Pay':''} · ${record.budgetLabel}`),paragraph('ข้อมูลจาก Material Master · ตรวจ Catalog ของ Plant และรายละเอียดสินค้าก่อนใช้'));
  $('assistantOutput').append(card);
 }
}
export async function suggest(query,image,retrieve,openRecord){
 openAssistant();if(busy)return;
 if(!query.trim()&&!image){status('กรุณาพิมพ์สิ่งที่ต้องการหรือแนบภาพ');return}
 const activeConfig=await loadConfig();if(busy)return;if(!validateCloudConfig(activeConfig)){status('ยังเรียก Gemini ไม่ได้: ผู้ดูแลต้อง deploy backend และตั้งค่า public URL / Turnstile site key ก่อน');return}
 if(!$('cloudConsent').checked){status('กรุณายืนยันการส่งคำค้น ภาพ และ candidate ไปยัง Cloudflare และ Google Gemini ก่อน');$('cloudConsent').focus();return}
 busy=true;lastQuery=query;lastImage=image;controller=new AbortController();const signal=controller.signal;
 const timeout=setTimeout(()=>controller?.abort(),180000);
 $('assistantQuery').disabled=true;$('sendContext').disabled=true;$('cancelAI').hidden=false;$('aiProgress').hidden=false;$('assistantOutput').setAttribute('aria-busy','true');$('assistantOutput').replaceChildren();
 try{
  status('กำลังเตรียมข้อมูลสำหรับ Gemini Cloud…');
  const prepared=await prepareCloudImage(image);signal.throwIfAborted();
  const result=await cloudSearch({config:activeConfig,query,image:prepared,retrieve,getToken,signal,progress:status});
  signal.throwIfAborted();
  $('assistantOutput').append(paragraph('สิ่งที่ Gemini เข้าใจ: '+String(result.intent.item||query).slice(0,600)));
  if(result.intent.requiredFeatures?.length)$('assistantOutput').append(paragraph('รายละเอียดที่ระบุ: '+result.intent.requiredFeatures.join(' · ')));
  if(result.question){const question=document.createElement('div');question.className='ai-question';question.append(paragraph(result.question));const edit=document.createElement('button');edit.textContent='เพิ่มรายละเอียดในคำอธิบาย';edit.onclick=()=>$('assistantQuery').focus();question.append(edit);$('assistantOutput').append(question)}
  showCards(result.records,openRecord);
  if(!result.records.length&&!result.question)$('assistantOutput').append(paragraph('ยังไม่พบรหัสที่เหมาะสมจาก Master ลองระบุประเภท ขนาด หรือการใช้งานเพิ่มเติม'));
  status(result.records.length?`Gemini แนะนำ ${result.records.length} Material codes ที่ตรวจรหัสกับ Master แล้ว`:'Gemini ยังไม่เลือกรหัสสินค้า กรุณาเพิ่มรายละเอียดตามคำถาม');
 }catch(error){
  if(error.name==='AbortError')status('ยกเลิกหรือหมดเวลาแล้ว คำขอที่ส่งถึง Gemini อาจยังถูกนับโควตา');
  else{status(error.message||'เชื่อม Gemini ไม่สำเร็จ กรุณาลองใหม่');$('assistantOutput').append(paragraph('ไม่มีการสลับไปใช้โมเดลในเครื่องหรือสรุปผล AI ปลอม คุณยังค้นหาจากข้อความในหน้าหลักได้'))}
 }finally{clearTimeout(timeout);controller=null;busy=false;$('assistantQuery').disabled=false;$('sendContext').disabled=false;$('cancelAI').hidden=true;$('aiProgress').hidden=true;$('assistantOutput').setAttribute('aria-busy','false')}
}
