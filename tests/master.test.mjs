import test from 'node:test';
import assert from 'node:assert/strict';
import {excludedGroupCode,isDirectPay,resultCategory,materialGroupType,summarizeMaterialTypes} from '../docs/master-core.js';
import {classifyBudget} from '../docs/classification.js';
const item=(code,kind='materials',levels=[],assets=[],gl={})=>({kind,g:{code,levels,assets,gl}});
test('group exclusions apply to codes before Direct Pay classification',()=>{
 for(const code of ['Z00000000',' M0101 ','m1','M'])assert.equal(excludedGroupCode(code),true);
 assert.equal(excludedGroupCode('Z01010000'),false);assert.equal(isDirectPay('Z00000000'),false);assert.equal(isDirectPay('Z01010000'),true);
});
test('Direct Pay is a primary group type and does not overwrite accounting or L0',()=>{
 const z=item('Z01010000','materials',[],[],{A:'71010102'});
 assert.equal(materialGroupType(z.g),'direct-pay');assert.equal(classifyBudget(z.g),'opex');assert.equal(resultCategory(z).key,'unmapped');assert.deepEqual(z.g.levels,[]);
 assert.equal(materialGroupType(item('B01','materials',[],['MEDE'],{}).g),'capex');
 assert.equal(materialGroupType(item('B02','materials',[],['MEDE'],{C:'1'}).g),'both');
});
test('type counts are exclusive material-code counts, ignoring standalone group records',()=>{
 const counts=summarizeMaterialTypes([item('B01','materials',[],[],{A:'1'}),item('B01','groups',[],[],{A:'1'}),item('Z01010000','materials',[],[],{A:'1'}),item('C01','materials',[],['MEDE'],{})]);
 assert.equal(counts.find(b=>b.key==='opex').total,1);assert.equal(counts.find(b=>b.key==='direct-pay').total,1);assert.equal(counts.find(b=>b.key==='capex').total,1);
 assert.equal(counts.reduce((n,b)=>n+b.total,0),3);assert.equal(counts.find(b=>b.key==='unknown').total,0);
});
