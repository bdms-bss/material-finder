import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {excludedGroupCode} from '../docs/master-core.js';
const master=JSON.parse(fs.readFileSync(new URL('../docs/data.json',import.meta.url)));
test('published search and AI master contains no deleted materials or inactive/cancelled records',()=>{
 const groups=new Map(master.groups.map(g=>[g.code,g]));
 assert.ok(groups.size>0);
 for(const g of master.groups){assert.equal(excludedGroupCode(g.code),false,`Excluded group code ${g.code}`);assert.equal(/^(INACTIVE|\(CANCEL\))/i.test(g.name.trim()),false,`Excluded group ${g.code}`);}
 for(const m of master.materials){assert.equal(excludedGroupCode(m[2]),false,`Excluded material group ${m[2]}`);assert.equal(/^\(CANCEL\)/i.test(m[1].trim()),false,`Cancelled material ${m[0]}`);assert.equal(m[5],false,`Deleted material ${m[0]}`);assert.ok(groups.has(m[2]),`Material ${m[0]} references an excluded group`)}
 assert.equal(master.materials.some(m=>m[0]==='42161608000024'),false,'Known X-flagged material must be excluded');
});
