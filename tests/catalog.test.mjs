import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync(new URL('../docs/data.json',import.meta.url)));
test('published search and AI catalog contains no deleted materials or inactive groups',()=>{
 const groups=new Map(catalog.groups.map(g=>[g.code,g]));
 assert.ok(groups.size>0);
 for(const g of catalog.groups)assert.equal(g.name.trim().toUpperCase().startsWith('INACTIVE'),false,`Inactive group ${g.code}`);
 for(const m of catalog.materials){assert.equal(m[5],false,`Deleted material ${m[0]}`);assert.ok(groups.has(m[2]),`Material ${m[0]} references an excluded group`)}
 assert.equal(catalog.materials.some(m=>m[0]==='42161608000024'),false,'Known X-flagged material must be excluded');
});
