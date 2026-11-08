import test from 'node:test';
import assert from 'node:assert/strict';
import {excludedGroupCode,isDirectPay,resultCategory,summarizeResults} from '../docs/master-core.js';
const item=(code,kind='groups',levels=[])=>({kind,g:{code,levels}});
test('group exclusions apply to codes, with Z dummy excluded before Direct Pay classification',()=>{
 for(const code of ['Z00000000',' M0101 ','m1','M'])assert.equal(excludedGroupCode(code),true);
 for(const code of ['Z01010000','A01010201',''])assert.equal(excludedGroupCode(code),false);
 assert.equal(isDirectPay('Z00000000'),false);assert.equal(isDirectPay('Z01010000'),true);assert.equal(isDirectPay('M1'),false);
});
test('Direct Pay is distinct from L0 and preserves missing source taxonomy',()=>{
 const z=item('Z01010000');assert.equal(resultCategory(z).key,'direct-pay');assert.deepEqual(z.g.levels,[]);
 assert.equal(resultCategory(item('B01','materials',[['B','MEDICAL SUPPLY']])).key,'B');
 assert.equal(resultCategory(item('P01')).key,'unmapped');
});
test('summary facets count material codes and groups separately without losing zero counts',()=>{
 const buckets=summarizeResults([item('B01','materials',[['B','MEDICAL SUPPLY']]),item('B01','groups',[['B','MEDICAL SUPPLY']]),item('Z01010000'),item('Z02010000')]);
 const b=buckets.find(b=>b.key==='B'),z=buckets.find(b=>b.key==='direct-pay');
 assert.equal(b.materials,1);assert.equal(b.groups,1);assert.equal(b.total,2);
 assert.equal(z.materials,0);assert.equal(z.groups,2);assert.equal(buckets.reduce((n,b)=>n+b.total,0),4);
});
