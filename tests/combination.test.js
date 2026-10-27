import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeFacts,createCombinationSummary} from '../src/combinationSummary.js';
import {relateTopic} from '../src/topicEvidence.js';
import {selectRangeQuarters} from '../src/topicsRangeView.js';
test('组合按语料去重，同时保留多方面标注与正负交集',()=>{
 assert.deepEqual(summarizeFacts([{corpus_id:1,aspect:'a',sentiment:'positive'},{corpus_id:1,aspect:'b',sentiment:'negative'},{corpus_id:1,aspect:'b',sentiment:'negative'},{corpus_id:2,aspect:'b',sentiment:'neutral'}]),{total_count:2,aspect_count:3,positive_count:1,negative_count:1});
});
test('多方面关联命中任一所选方面，空选择不命中',()=>{
 const topic={examples:[{corpus_id:1},{corpus_id:2}]},e={rows:new Map([['1',new Set(['ownership','safety'])],['2',new Set(['community'])]])};
 assert.equal(relateTopic(topic,e,['safety','community']).matches,2);assert.equal(relateTopic(topic,e,[]).matches,0);
});
test('只展开与自由时间段相交的独立季度',()=>{
 assert.deepEqual(selectRangeQuarters(['2026-Q1','2026-Q2','2026-Q3'].map(quarter=>({quarter})),['2026-03','2026-04']).map(q=>q.quarter),['2026-Q2','2026-Q1']);
});
test('组合汇总读取完整分页，并复用方面缓存',async()=>{
 let calls=0;const load=createCombinationSummary({async getFacts(f){calls++;return {items:[{corpus_id:1,aspect:f.dimension,sentiment:'positive'}],next_cursor:f.after_corpus_id?null:{after_corpus_id:1,after_aspect:f.dimension}};}});
 const result=await load('2026-01','2026-03',['a','b']);assert.equal(result.total_count,1);assert.equal(result.aspect_count,2);await load('2026-01','2026-03',['a','b']);assert.equal(calls,4);
});
