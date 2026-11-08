import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedRanks} from '../docs/ai-core.js';
import {TOPICS} from '../docs/ai-topics.js';
test('only unique master candidate IDs with numeric scores can be recommended',()=>{
 const a={id:'materials:123'},b={id:'groups:G1'};
 assert.deepEqual(verifiedRanks([a,b],[{id:'invented',score:1},{id:a.id,score:.8},{id:a.id,score:.9},{id:b.id,score:NaN},{id:b.id,score:.7}]),[{record:a,score:.8},{record:b,score:.7}]);
});
test('local concept labels are unique and all have retrieval anchors',()=>{
 assert.equal(new Set(TOPICS.map(t=>t.id)).size,TOPICS.length);
 assert.equal(new Set(TOPICS.map(t=>t.en)).size,TOPICS.length);
 for(const topic of TOPICS){assert.ok(topic.th);assert.ok(topic.terms.length);assert.ok(topic.terms.every(t=>typeof t==='string'&&t.trim()))}
});
