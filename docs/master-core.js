export function excludedGroupCode(code){const value=String(code??'').trim().toUpperCase();return value==='Z00000000'||value.startsWith('M')}
export function isDirectPay(code){const value=String(code??'').trim().toUpperCase();return value.startsWith('Z')&&!excludedGroupCode(value)}
export function resultCategory(item){
 if(isDirectPay(item.g.code))return {key:'direct-pay',name:'Direct Pay',label:'Direct Pay · Z*',note:'ประเภทการจ่าย ไม่ใช่ Taxonomy L0'};
 const level=item.g.levels?.[0];
 if(level?.[0])return {key:level[0],name:level[1]||level[0],label:level[0]+' · '+(level[1]||level[0]),note:'Commodity · L0'};
 return {key:'unmapped',name:'ยังไม่มี L0',label:'ยังไม่มีข้อมูล L0',note:'ไม่พบ Taxonomy L0 ใน Master'};
}
export function summarizeResults(items){
 const buckets=new Map();
 for(const item of items){const category=resultCategory(item);if(!buckets.has(category.key))buckets.set(category.key,{...category,materials:0,groups:0,total:0});const bucket=buckets.get(category.key);bucket[item.kind==='materials'?'materials':'groups']++;bucket.total++}
 return [...buckets.values()].sort((a,b)=>b.total-a.total||a.key.localeCompare(b.key));
}
