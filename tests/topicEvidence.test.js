import test from 'node:test';
import assert from 'node:assert/strict';
import { createTopicEvidence, quarterRange, relateTopic } from '../src/topicEvidence.js';

test('主题只关联实际命中的语料，不根据关键词猜测', () => {
  const evidence = { rows: new Map([['7', new Set(['ownership','type_system'])]]) };
  const topic = { examples:[{corpus_id:7,text:'Cargo'},{corpus_id:99,text:'borrow lifetime'}] };
  assert.equal(relateTopic(topic,evidence,'ownership').matches,1);
  assert.equal(relateTopic(topic,evidence,'package_manager').matches,0);
  assert.deepEqual(relateTopic(topic,evidence).ids,['ownership','type_system']);
});
test('同一语料的多方面跨页合并并复用时间范围缓存', async () => {
  let calls=0;
  const load=createTopicEvidence({getFacts:async()=> ++calls===1
    ? {items:[{corpus_id:1,aspect:'ownership'}],next_cursor:{after_corpus_id:1,after_aspect:'ownership'}}
    : {items:[{corpus_id:1,aspect:'type_system'}],next_cursor:null}});
  const evidence=await load('2026-07','2026-09');
  assert.deepEqual([...evidence.rows.get('1')],['ownership','type_system']);
  assert.equal(evidence.complete,true);
  await load('2026-07','2026-09');assert.equal(calls,2);
});
test('游标未推进时报错，失败请求不会留在缓存', async () => {
  let calls=0;
  const load=createTopicEvidence({getFacts:async()=>{calls++;return {items:[],next_cursor:{after_corpus_id:1,after_aspect:'ownership'}};}});
  await assert.rejects(load('2026-01','2026-03'),/未推进/);
  await assert.rejects(load('2026-01','2026-03'),/未推进/);
  assert.equal(calls,4);
});
test('查询受限时保留不完整标志，不将未命中判定为无关联', async () => {
  let cursor=0;
  const load=createTopicEvidence({getFacts:async()=>({items:[],next_cursor:{after_corpus_id:++cursor,after_aspect:'community'}})});
  const evidence=await load('2026-01','2026-03');
  assert.equal(evidence.complete,false);assert.equal(cursor,10);
});
test('季度边界与无效输入', () => {
  assert.deepEqual(quarterRange('2026-Q4'),['2026-10','2026-12']);
  assert.equal(quarterRange('2026-Q5'),null);
});
