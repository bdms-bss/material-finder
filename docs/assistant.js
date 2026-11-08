import {verifiedRanks} from './ai-core.js?v=local-ai-1';
// Remove credentials from the retired cloud integration without requiring storage access.
try{for(const key of ['materialFinder.openrouter.key','materialFinder.openrouter.pkce','materialFinder.query'])sessionStorage.removeItem(key)}catch{}
let worker,busy=false,sequence=0,pending;
const $=id=>document.getElementById(id);
const status=text=>$('assistantStatus').textContent=text;
export const authReady=Promise.resolve();
export function openAssistant(){ $('assistantPanel').hidden=false; }
function resetWorker(reason){worker?.terminate();worker=null;if(pending){clearTimeout(pending.timer);const e=reason||Object.assign(Error('ยกเลิกการประมวลผลแล้ว'),{name:'AbortError'});pending.reject(e);pending=null}}
export function cancelAssistant(){resetWorker();status('ยกเลิกแล้ว กดส่งเพื่อลองใหม่ได้')}
function runAI(payload){if(!worker){worker=new Worker(new URL('./local-ai-worker.js?v=local-ai-1',import.meta.url),{type:'module'});worker.onmessage=({data})=>{if(data.type==='progress'){status(data.text);return}if(pending?.id!==data.id)return;const p=pending;pending=null;clearTimeout(p.timer);data.type==='error'?p.reject(Error(data.error)):p.resolve(data.result)};worker.onerror=()=>{if(pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(Error('โหลดระบบ AI ไม่สำเร็จ'))}worker?.terminate();worker=null}}
 return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{resetWorker(Error('ดาวน์โหลดหรือประมวลผลนานเกินไป'))},300000);pending={id,resolve,reject,timer};worker.postMessage({id,...payload})})}
function paragraph(text){const p=document.createElement('p');p.textContent=text;return p}
function showCards(records,openRecord,label){for(const {record,score}of records){const card=document.createElement('div');card.className='aiRecommendation';const b=document.createElement('button');b.textContent=(record.materialCode||'Group '+record.materialGroup)+' · '+record.description;b.onclick=()=>openRecord(record.id);const l0=record.taxonomy[0];card.append(b,paragraph(`L0: ${l0?l0[0]+' · '+l0[1]:'ไม่พบ mapping'}`),paragraph(`Group: ${record.materialGroup} · ${record.budgetLabel}`),paragraph(label));$('assistantOutput').append(card)}}
export async function suggest(query,image,retrieve,openRecord){openAssistant();if(busy)return;if(!query.trim()&&!image){status('กรุณาพิมพ์สิ่งที่ต้องการ หรือเพิ่มรูปภาพ');return}
 busy=true;$('sendContext').disabled=true;$('cancelAI').hidden=false;$('assistantOutput').replaceChildren();
 try{
  const topics=await runAI({task:'topics',query,image});
  const best=topics[0];
  if(!best||(!image&&best.score<0.18)){status('AI ยังตีความรายการไม่ชัดเจน');$('assistantOutput').append(paragraph('ลองระบุชื่อสินค้า ประเภท หรือวัตถุประสงค์การใช้งานเพิ่มเติม'));return}
  const terms=[query,...best.terms];
  let candidates=retrieve(terms,best.terms);
  if(!candidates.length)candidates=retrieve([query,...topics.slice(0,3).flatMap(t=>t.terms)],topics.slice(0,3).flatMap(t=>t.terms));
  $('assistantOutput').append(paragraph('AI เข้าใจว่าใกล้เคียง: '+best.th),paragraph('คำค้นเพิ่มเติม: '+best.terms.join(' / ')));
  if(!candidates.length){status('ไม่พบรหัสใน master ที่ตรงกับสิ่งที่ AI เข้าใจ');return}
  const ranked=await runAI({task:'rank',query:query+' '+best.th+' '+best.en,image,candidates});
  const generic=image?candidates.find(c=>!c.materialCode&&best.terms.some(t=>c.groupName.toLowerCase()===t.toLowerCase())):null;
  const ordered=generic?[{id:generic.id,score:1},...ranked]:ranked;
  const records=verifiedRanks(candidates,ordered);
  showCards(records,openRecord,'ใกล้เคียงจาก AI บนเครื่อง · กรุณาตรวจชนิด ขนาด และการใช้งาน');
  status(`AI แนะนำ ${records.length} รายการ · ฟรี · ประมวลผลบนเครื่อง`);
 }catch(e){if(e.name==='AbortError'){status('ยกเลิกแล้ว กดส่งเพื่อลองใหม่ได้');return}status('AI ยังไม่พร้อม: '+e.message);const candidates=retrieve([query]).slice(0,6);if(candidates.length){$('assistantOutput').append(paragraph('ผลต่อไปนี้เป็นการจับคู่ข้อความจาก master ไม่ใช่ผล AI'));showCards(candidates.map(record=>({record})),openRecord,'ผลค้นหาข้อความ')}else $('assistantOutput').append(paragraph('ตรวจอินเทอร์เน็ตสำหรับดาวน์โหลดโมเดล แล้วกดส่งอีกครั้ง หรือค้นด้วยชื่อทั่วไปภาษาไทย/อังกฤษ'));
 }finally{busy=false;$('sendContext').disabled=false;$('cancelAI').hidden=true}
}
