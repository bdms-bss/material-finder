import test from 'node:test';
import assert from 'node:assert/strict';
import {pkceChallenge,validCallback,verifiedRecommendations,parseJson} from '../docs/ai-core.js';
test('PKCE matches RFC 7636 S256 test vector',async()=>{assert.equal(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')});
test('callback requires matching state and recent verifier',()=>{const p={verifier:'a'.repeat(64),state:'expected',created:1000};assert.equal(validCallback(p,'expected',2000),true);for(const [value,state,time]of [[p,'wrong',2000],[null,'expected',2000],[p,'expected',601001],[p,'expected',999],[{...p,verifier:''},'expected',2000]])assert.equal(validCallback(value,state,time),false)});
test('only unique candidate IDs can become recommendation cards',()=>{const candidates=[{id:'materials:123',materialGroup:'G1'}];assert.deepEqual(verifiedRecommendations({suggestions:[{id:'invented'},{id:'materials:123',reason:'matched'},{id:'materials:123',reason:'duplicate'}]},candidates),[{record:candidates[0],reason:'matched'}]);assert.deepEqual(verifiedRecommendations({suggestions:'bad'},candidates),[])});
test('JSON decoder handles fences and rejects prose',()=>{assert.deepEqual(parseJson('```json\n{"suggestions":[]}\n```'),{suggestions:[]});assert.throws(()=>parseJson('not json'))});
