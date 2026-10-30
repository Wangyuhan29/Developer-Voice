import test from 'node:test';
import assert from 'node:assert/strict';
import {adviceRequest,adviceScopeLabel} from '../src/adviceScope.js';
test('04 默认提交整个时间范围，单月环比入口单独提交月份',()=>{
 const selection={start:'2025-01',end:'2026-10',ids:['ownership']};
 assert.deepEqual(adviceRequest(selection),{start_date:'2025-01',end_date:'2026-10',aspects:['ownership'],refresh:false});
 assert.deepEqual(adviceRequest({...selection,month:'2026-08'},true),{month:'2026-08',aspects:['ownership'],refresh:true});
 assert.match(adviceScopeLabel({start_date:'2025-01',end_date:'2026-10'}),/区间分析/);
 assert.match(adviceScopeLabel({month:'2026-08'}),/月度环比/);
});
