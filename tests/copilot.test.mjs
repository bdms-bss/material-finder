import test from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig} from '../docs/copilot.js';
const valid={tenantId:'11111111-1111-1111-1111-111111111111',clientId:'22222222-2222-2222-2222-222222222222',tokenEndpoint:'https://test.environment.api.powerplatform.com/test/token',tokenExchangeScope:'api://test/access_as_user'};
test('Copilot refuses missing config and untrusted token destinations',()=>{
 assert.equal(validateConfig(valid),true);
 for(const c of [undefined,{}, {...valid,tenantId:'common'},{...valid,clientId:''},{...valid,tokenExchangeScope:''},{...valid,tokenEndpoint:'http://test.environment.api.powerplatform.com/token'},{...valid,tokenEndpoint:'https://example.org/token'},{...valid,tokenEndpoint:'https://evil.api.powerplatform.com.example.org/token'}])assert.equal(validateConfig(c),false);
});
