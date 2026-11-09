import {validateCloudConfig,cloudSearch,prepareCloudImage} from './cloud-ai.js?v=cloud-10';
const $=id=>document.getElementById(id);
const states=Object.fromEntries(['text','image'].map(mode=>[mode,{query:'',image:null,consent:false,output:document.createElement('div'),status:'พร้อมช่วยค้นหา',busy:false,controller:null,pending:null,completed:null,sequence:0}]));
let activeMode='text',config,configPromise,scriptPromise;
function paragraph(value){const p=document.createElement('p');p.textContent=value;return p}
function updateControls(){const s=states[activeMode];$('assistantStatus').textContent=s.status;$('assistantQuery').disabled=s.busy;$('sendContext').disabled=s.busy;$('cancelAI').hidden=!s.busy;$('aiProgress').hidden=!s.busy;$('assistantOutput').setAttribute('aria-busy',String(s.busy));$('aiProgress').removeAttribute('value')}
function report(mode,value){states[mode].status=value;if(mode===activeMode)updateControls()}
function saveDraft(){const s=states[activeMode];s.query=$('assistantQuery').value;s.consent=$('cloudConsent').checked}
function renderState(){
 const s=states[activeMode],isImage=activeMode==='image';
 $('assistantTitle').textContent=isImage?'ค้นหาด้วย AI จากรูปภาพ':'ค้นหาด้วย AI จากข้อความ';
 $('assistantQuery').value=s.query;$('assistantQuery').placeholder=isImage?'ระบุขนาด วัสดุ หรือการใช้งานเพิ่มเติม (ถ้ามี)':'อธิบายสิ่งที่ต้องการ เช่น เครื่องหนีบนิ้ววัดออกซิเจน';
 $('assistantQueryLabel').textContent=isImage?'รายละเอียดเพิ่มเติมเกี่ยวกับภาพ':'อธิบายสิ่งที่ต้องการ';
 $('assistantImageNote').hidden=!isImage||!s.image;$('assistantPreview').hidden=!isImage||!s.image;
 if(isImage&&s.image)$('assistantPreview').src=s.image;else $('assistantPreview').removeAttribute('src');
 $('cloudConsent').checked=s.consent;$('sendContext').textContent=isImage?'วิเคราะห์ภาพและค้นหารหัส':'ค้นหาด้วย AI จากข้อความ';
 $('assistantOutput').replaceChildren(s.output);updateControls();
}
export function getAssistantMode(){return activeMode}
export function setAssistantContext({mode='text',query='',image=null}={}){
 if(!states[mode])return;
 if($('assistantPanel').open)saveDraft();
 if(mode!==activeMode){const previous=states[activeMode];previous.pending=null;if(previous.busy){previous.controller?.abort();previous.sequence++;previous.controller=null;previous.busy=false;previous.status='หยุดการค้นหาเมื่อเปลี่ยนโหมดแล้ว'}activeMode=mode}
 const s=states[mode],nextImage=mode==='image'?image:null;
 if(query!==s.query||nextImage!==s.image||(s.completed&&(s.completed.query!==query||s.completed.image!==nextImage))){s.controller?.abort();if(s.busy){s.sequence++;s.busy=false;s.controller=null}s.pending=null;s.completed=null;s.output.replaceChildren();s.status=mode==='image'?'ใช้ภาพที่เลือกเพื่อค้นหารหัสใน Master':'ค้นหา Material Master ด้วยความหมายของข้อความ';s.query=query;s.image=nextImage}
 renderState();
}
export function openAssistant(context){
 if(context)setAssistantContext(context);else if(!$('assistantPanel').open)renderState();
 const panel=$('assistantPanel');if(!panel.open){panel.hidden=false;panel.showModal();$('assistantQuery').focus();loadConfig().catch(()=>{})}
}
async function loadConfig(signal){
 configPromise??=fetch('ai-config.json?v=cloud-10',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).catch(()=>{configPromise=null;return null});
 config=await configPromise;let ready=false;
 if(validateCloudConfig(config)){
  try{const r=await fetch(config.backendUrl+'/api/health',{cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});const health=await r.json();ready=r.ok&&health.service==='bdms-ai'&&health.configured===true}catch{}
 }
 $('backendSetup').hidden=ready;$('cloudConnection').textContent=ready?'Gemma 4 · พร้อมช่วยค้นหาจากข้อความและภาพ':'ยังเชื่อมต่อผู้ช่วยไม่ได้ · ลองใหม่อีกครั้งภายหลัง';
 return {config,ready};
}
function loadTurnstile(){
 if(window.turnstile)return Promise.resolve();
 if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;const timer=setTimeout(()=>{script.remove();scriptPromise=null;reject(Error('โหลดระบบยืนยันนานเกินไป กรุณาลองใหม่'))},15000);script.onload=()=>{clearTimeout(timer);if(window.turnstile)resolve();else{scriptPromise=null;reject(Error('โหลดระบบยืนยันไม่สำเร็จ'))}};script.onerror=()=>{clearTimeout(timer);script.remove();scriptPromise=null;reject(Error('เชื่อมระบบยืนยัน Cloudflare ไม่ได้'))};document.head.append(script)});
 return scriptPromise;
}
async function getToken(action,signal,onStatus){
 await loadTurnstile();signal.throwIfAborted();onStatus('กำลังยืนยันการใช้งานก่อนเรียก AI…');
 return new Promise((resolve,reject)=>{
  let widget,complete=false;
  const finish=(error,token)=>{if(complete)return;complete=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(widget!==undefined)window.turnstile.remove(widget);error?reject(error):resolve(token)};
  const abort=()=>finish(Object.assign(Error('ยกเลิกแล้ว'),{name:'AbortError'}));
  const timer=setTimeout(()=>finish(Error('ยืนยันการใช้งานหมดเวลา กรุณาตรวจช่องยืนยัน Cloudflare แล้วลองใหม่')),75000);signal.addEventListener('abort',abort,{once:true});
  try{widget=window.turnstile.render($('turnstileWidget'),{sitekey:config.turnstileSiteKey,action,theme:'light',execution:'execute',appearance:'always',callback:token=>finish(null,token),'error-callback':()=>finish(Error('การยืนยันไม่สำเร็จ ลองใหม่หรือเปิดเว็บในเบราว์เซอร์ปกติ')),'expired-callback':()=>finish(Error('การยืนยันหมดอายุ กรุณาลองอีกครั้ง'))});window.turnstile.execute(widget)}catch{finish(Error('เริ่มระบบยืนยันไม่สำเร็จ'))}
 });
}
export function cancelAssistant(){const s=states[activeMode];s.pending=null;s.controller?.abort();report(activeMode,'ยกเลิกแล้ว คำขอที่ส่งถึง AI ไปแล้วอาจยังถูกนับโควตา')}
function showCards(output,records,openRecord,onStatus){
 for(const {record,reason}of records){
  const card=document.createElement('article');card.className='aiRecommendation';const title=document.createElement('h3');title.textContent=record.description;
  const identity=document.createElement('div');identity.className='ai-code-line';const label=document.createElement('span');label.textContent='Material Code';const code=document.createElement('strong');code.textContent=record.materialCode;identity.append(label,code);
  const meta=document.createElement('dl');meta.className='ai-meta';const l0=record.taxonomy[0];
  for(const [key,value]of [['Material Group',record.materialGroup],['L0',l0?.some(Boolean)?l0.filter(Boolean).join(' · '):'ยังไม่มีข้อมูล'],['ประเภท',record.directPay?'Direct Pay · '+record.budgetLabel:record.budgetLabel]]){const block=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;block.append(dt,dd);meta.append(block)}
  const why=paragraph(reason);why.className='ai-reason';const actions=document.createElement('div');actions.className='ai-actions';const detail=document.createElement('button');detail.textContent='ดูรายละเอียด';detail.onclick=()=>openRecord(record.id);
  const copy=document.createElement('button');copy.textContent='คัดลอกรหัส';copy.onclick=async()=>{try{await navigator.clipboard.writeText(record.materialCode);copy.textContent='คัดลอกแล้ว ✓';setTimeout(()=>{if(copy.isConnected)copy.textContent='คัดลอกรหัส'},2000)}catch{onStatus('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกรหัสแล้วคัดลอก')}};
  actions.append(detail,copy);card.append(identity,title,meta,why,actions);output.append(card);
 }
}
export async function suggest(query,image,retrieve,openRecord,{mode=image?'image':'text',automatic=false}={}){
 const inputImage=mode==='image'?image:null;openAssistant({mode,query,image:inputImage});const s=states[mode];if(s.busy)return;
 if(mode==='image'&&!inputImage){report(mode,'กรุณาเลือกรูปที่แท็บค้นหาจากรูปภาพก่อนเริ่มวิเคราะห์');return}
 if(!query.trim()&&!inputImage){report(mode,'กรุณาพิมพ์สิ่งที่ต้องการ');return}
 if(automatic&&s.completed?.query===query&&s.completed.image===inputImage)return;
 s.consent=$('cloudConsent').checked;
 if(!s.consent){s.pending=automatic?{retrieve,openRecord}:null;report(mode,automatic?'ไม่พบรายการจากข้อความ · ยืนยันส่งข้อมูลครั้งแรก แล้วระบบจะค้นหาด้วย AI ต่อให้อัตโนมัติ':'กรุณายืนยันการส่งคำค้น ภาพ และรายการอ้างอิงจาก Master ไปยัง Cloudflare Workers AI ก่อน');$('cloudConsent').focus();return}
 s.pending=null;s.busy=true;s.query=query;s.image=inputImage;const sequence=++s.sequence;s.controller=new AbortController();const controller=s.controller,signal=controller.signal;const onStatus=value=>{if(s.sequence===sequence)report(mode,value)};
 const timeout=setTimeout(()=>controller.abort(),180000);s.output.replaceChildren();onStatus(automatic?'ไม่พบรายการจากข้อความ · กำลังค้นหาด้วย AI อัตโนมัติ…':'กำลังเตรียมข้อมูลสำหรับค้นหาด้วย AI…');
 try{
  const {config:activeConfig,ready}=await loadConfig(signal);signal.throwIfAborted();
  if(!ready||!validateCloudConfig(activeConfig))throw Error('ยังเรียก AI ไม่ได้: บริการยังไม่พร้อม กรุณาลองใหม่ภายหลัง');
  const prepared=await prepareCloudImage(inputImage);signal.throwIfAborted();
  const result=await cloudSearch({config:activeConfig,query,image:prepared,retrieve,getToken:(action,tokenSignal)=>getToken(action,tokenSignal,onStatus),signal,progress:onStatus});signal.throwIfAborted();
  const understood=paragraph((mode==='image'?'จากภาพ น่าจะเป็น: ':'กำลังมองหา: ')+String(result.intent.item||query).slice(0,600));understood.className='ai-understood';s.output.append(understood);
  if(result.intent.requiredFeatures?.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='ดูเงื่อนไขที่ใช้ค้นหา';details.append(summary,paragraph(result.intent.requiredFeatures.join(' · ')));s.output.append(details)}
  if(result.question){const question=document.createElement('div');question.className='ai-question';question.append(paragraph(result.question));const edit=document.createElement('button');edit.textContent='เพิ่มรายละเอียดในคำอธิบาย';edit.onclick=()=>$('assistantQuery').focus();question.append(edit);s.output.append(question)}
  showCards(s.output,result.records,openRecord,onStatus);s.completed={query,image:inputImage};
  onStatus(result.records.length?`พบรายการแนะนำ ${result.records.length} รายการ · รหัสอ้างอิงจาก Master`:'กรุณาเพิ่มรายละเอียดตามคำถามเพื่อค้นหาต่อ');
  if(activeMode===mode&&$('assistantPanel').open)$('assistantOutput').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 }catch(error){
  if(error.name==='AbortError')onStatus('ยกเลิกหรือหมดเวลาแล้ว คำขอที่ส่งถึง AI อาจยังถูกนับโควตา');
  else{onStatus(error.message||'เชื่อม AI ไม่สำเร็จ กรุณาลองใหม่');s.output.append(paragraph('คุณยังค้นหาจากข้อความในหน้าหลักได้ หรือเพิ่มรายละเอียดแล้วลองอีกครั้ง'))}
 }finally{clearTimeout(timeout);if(s.sequence===sequence){s.controller=null;s.busy=false;if(mode===activeMode)updateControls()}}
}
$('cloudConsent').addEventListener('change',()=>{const mode=activeMode,s=states[mode];s.consent=$('cloudConsent').checked;if(!s.consent&&s.busy)s.controller?.abort();if(s.consent&&s.pending){const pending=s.pending;s.pending=null;suggest(s.query,s.image,pending.retrieve,pending.openRecord,{mode,automatic:true})}});
$('assistantQuery').addEventListener('input',()=>{const s=states[activeMode];s.query=$('assistantQuery').value;if(s.pending){s.pending=null;report(activeMode,'แก้ไขคำค้นแล้ว กดค้นหาด้วย AI เพื่อใช้ข้อความใหม่')}});
$('assistantPanel').addEventListener('close',()=>{saveDraft();const s=states[activeMode];if(s.pending){s.pending=null;s.status='หยุดการค้นหาอัตโนมัติแล้ว กดค้นหาด้วย AI เมื่อต้องการลองใหม่'}if(s.busy)s.controller?.abort()});
