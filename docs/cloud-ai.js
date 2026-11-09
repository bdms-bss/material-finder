export function validateCloudConfig(config){
 if(!config||typeof config.turnstileSiteKey!=='string'||!/^[A-Za-z0-9_-]{10,100}$/.test(config.turnstileSiteKey))return false;
 try{const url=new URL(config.backendUrl);return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/' }catch{return false}
}
export function verifiedCloudSuggestions(candidates,suggestions){
 const allowed=new Map(candidates.filter(c=>c.materialCode&&c.id==='materials:'+c.materialCode).map(c=>[c.id,c]));const seen=new Set();
 return (Array.isArray(suggestions)?suggestions:[]).filter(s=>allowed.has(s?.id)&&!seen.has(s.id)&&seen.add(s.id)).slice(0,6).map(s=>({record:allowed.get(s.id),reason:typeof s.reason==='string'?s.reason.slice(0,900):''}));
}
export async function cloudCall(config,path,body,signal,fetcher=fetch){
 if(!validateCloudConfig(config)||!['/api/intent','/api/rank'].includes(path))throw Error('ยังไม่ได้ตั้งค่า Gemini backend ของระบบ');
 const response=await fetcher(new URL(path,config.backendUrl),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal,credentials:'omit'});
 let data;try{data=await response.json()}catch{throw Error('backend ไม่ส่งคำตอบ JSON กรุณาตรวจ URL และการ deploy')}
 if(!response.ok)throw Error(data.message||'เรียก Gemini backend ไม่สำเร็จ');return data;
}
export async function cloudSearch({config,query,image,getToken,retrieve,signal,progress,fetcher=fetch}){
 const token=await getToken('material-intent',signal);
 progress('1/2 · Gemini กำลังทำความเข้าใจคำอธิบายและภาพ…');
 const intent=await cloudCall(config,'/api/intent',{query,image,turnstileToken:token},signal,fetcher);
 const terms=(Array.isArray(intent.searchTerms)?intent.searchTerms:[]).filter(t=>typeof t==='string').slice(0,10);
 const candidates=retrieve([query,...terms]);
 if(!candidates.length)return {intent,records:[],question:intent.clarificationQuestion||'ไม่พบรหัสใน Master ลองเพิ่มประเภทสินค้า ชื่อทั่วไป หรือวัตถุประสงค์การใช้'};
 const rankToken=await getToken('material-rank',signal);
 progress('2/2 · Gemini กำลังตรวจเทียบ Material codes จาก Master…');
 const result=await cloudCall(config,'/api/rank',{query,intent:{item:intent.item,requiredFeatures:intent.requiredFeatures},candidates,turnstileToken:rankToken},signal,fetcher);
 return {intent,records:verifiedCloudSuggestions(candidates,result.suggestions),question:result.clarificationQuestion||''};
}
export async function prepareCloudImage(dataUrl){
 if(!dataUrl)return null;
 const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('อ่านรูปภาพไม่สำเร็จ'));img.src=dataUrl});
 const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 const context=canvas.getContext('2d');if(!context)throw Error('browser ไม่รองรับการเตรียมภาพ');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
 let prepared=canvas.toDataURL('image/jpeg',.86);if(prepared.length>2500000)prepared=canvas.toDataURL('image/jpeg',.67);
 if(prepared.length>2800000)throw Error('รูปยังมีขนาดใหญ่เกินไป ลองใช้ภาพที่เล็กลง');return prepared;
}
