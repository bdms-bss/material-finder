import {classifyBudget} from './classification.js';
export function excludedGroupCode(code){const value=String(code??'').trim().toUpperCase();return value==='Z00000000'||value.startsWith('M')}
export function isDirectPay(code){const value=String(code??'').trim().toUpperCase();return value.startsWith('Z')&&!excludedGroupCode(value)}
export const groupTypeLabels={opex:'OPEX',capex:'CAPEX',both:'CAPEX / OPEX','direct-pay':'Direct Pay',unknown:'ไม่ระบุประเภท'};
// Payment route takes precedence in the primary group filter; accounting mappings remain unchanged.
export function materialGroupType(group){return isDirectPay(group.code)?'direct-pay':classifyBudget(group)}
export function resultCategory(item){
 const level=item.g.levels?.[0];
 if(level?.[0])return {key:level[0],name:level[1]||level[0],label:level[0]+' · '+(level[1]||level[0])};
 return {key:'unmapped',name:'ยังไม่มี L0',label:'ยังไม่มีข้อมูล L0'};
}
export function summarizeMaterialTypes(items){
 const counts=new Map(Object.entries(groupTypeLabels).map(([key,name])=>[key,{key,name,total:0}]));
 for(const item of items)if(item.kind==='materials')counts.get(materialGroupType(item.g)).total++;
 return [...counts.values()];
}
