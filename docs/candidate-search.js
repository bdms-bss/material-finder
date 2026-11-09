import {classifyBudget,budgetLabels} from './classification.js';
import {isDirectPay} from './master-core.js';
const normalize=value=>String(value??'').toLowerCase().normalize('NFKC');
export function retrieveCandidates(items,terms){
 const phrases=[...new Set(terms.map(t=>normalize(t).trim()).filter(Boolean))];
 const stop=new Set(['the','for','and','with','from','used','use','เครื่อง','อุปกรณ์','ต้องการ']);
 const words=[...new Set(phrases.flatMap(t=>t.split(/[\s/(),._-]+/)).filter(t=>t.length>2&&!stop.has(t)))];
 const ranked=items.map(i=>{
  const name=normalize(i.name),group=normalize(i.g.name);let score=0;
  for(const phrase of phrases){if(normalize(i.code)===phrase)score+=1000;if(normalize(i.g.code)===phrase)score+=500;if(name.includes(phrase))score+=25;if(group.includes(phrase))score+=30;}
  for(const word of words){if(name.includes(word))score+=8;if(group.includes(word))score+=7;else if(i.text.includes(word))score+=2;}
  return {i,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.i.code.localeCompare(b.i.code));
 const selected=[],counts=new Map(),seen=new Set();
 for(const entry of ranked){const group=entry.i.g.code;if((counts.get(group)||0)>=8)continue;selected.push(entry);seen.add(entry.i.code);counts.set(group,(counts.get(group)||0)+1);if(selected.length===40)break}
 for(const entry of ranked){if(selected.length===40)break;if(!seen.has(entry.i.code)){selected.push(entry);seen.add(entry.i.code)}}
 return selected.map(({i})=>({id:'materials:'+i.code,materialCode:i.m[0],description:i.name,materialGroup:i.g.code,groupName:i.g.name,taxonomy:i.g.levels,gl:i.g.gl,assetClasses:i.g.assets,budget:classifyBudget(i.g),budgetLabel:budgetLabels[classifyBudget(i.g)],directPay:isDirectPay(i.g.code)}));
}

