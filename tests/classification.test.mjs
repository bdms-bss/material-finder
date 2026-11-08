import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBudget } from '../docs/classification.js';
test('BDMS budget rules use asset and GL-A/C mappings independently', () => {
  for (const [group, expected] of [
    [{assets:['MEDE'],gl:{}},'capex'],
    [{assets:[],gl:{A:'61101001'}},'opex'],
    [{assets:[],gl:{C:'61101001'}},'opex'],
    [{assets:['MEDE'],gl:{A:'61203002'}},'both'],
    [{assets:['MEDE'],gl:{C:'61203002'}},'both'],
    [{assets:[],gl:{S:'61203002'}},'unknown'],
    [{assets:[],gl:{}},'unknown'],
  ]) assert.equal(classifyBudget(group),expected);
});
