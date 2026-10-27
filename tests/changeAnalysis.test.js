import test from 'node:test';
import assert from 'node:assert/strict';
import {findChanges,aspectChanges,matchExamples} from '../src/changeAnalysis.js';
const row=(month,p,n,total=p+n)=>({month,categories:{a:{total,positive:p,negative:n,neutral:total-p-n}}});
test('变化探针只比较连续且有样本的月份，并按幅度排序',()=>{
 const changes=findChanges([row('2025-12',1,9),row('2026-01',9,1),row('2026-03',1,9),row('2026-04',0,0),row('2026-05',9,1)],['a']);
 assert.equal(changes.length,1);assert.equal(changes[0].month,'2026-01');assert.equal(changes[0].delta,1.6);assert.equal(changes[0].lowSample,true);
 assert.equal(findChanges([row('2026-01',1,9),row('2026-02',9,1)],[]).length,0);
});
test('方面数量差值与组合评分分别计算，不把数量差值解释为评分贡献',()=>{
 const c=findChanges([row('2026-01',2,8),row('2026-02',5,5)],['a'])[0];
 const parts=aspectChanges(c,['a']);assert.equal(parts[0].positiveDelta,3);assert.equal(parts[0].negativeDelta,-3);assert.ok(Math.abs(c.delta-.6)<1e-10);
});
test('语料必须同时匹配语料 ID、月份、方面和情感，跨主题去重',()=>{
 const example={corpus_id:1,created_at:'2026-01-15T00:00:00Z'},other={corpus_id:2,created_at:'2026-02-01T00:00:00Z'};
 const topics=[{name:'t',topic_id:0,examples:[example,other]},{name:'u',topic_id:1,examples:[example]}];
 const facts=[{...example,aspect:'a',sentiment:'negative'},{...example,aspect:'b',sentiment:'positive'},{...other,aspect:'a',sentiment:'negative'}];
 assert.equal(matchExamples(topics,facts,'2026-01',['a'],'negative').length,1);
 assert.equal(matchExamples(topics,facts,'2026-01',['a'],'positive').length,0);
 assert.equal(matchExamples(topics,facts,'2026-01',[]).length,0);
});
