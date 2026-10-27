import { aspects } from './data/aspects.js';
const valid = new Set(aspects.map(a => a.id));
export function quarterRange(quarter) {
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter || '');
  if (!match) return null;
  const year=match[1], q=Number(match[2]);
  return [`${year}-${String(q*3-2).padStart(2,'0')}`,`${year}-${String(q*3).padStart(2,'0')}`];
}
export function relateTopic(topic, evidence, aspect = 'overall') {
  const examples = (topic.examples || []).map(example => ({example, aspects:[...(evidence.rows.get(String(example.corpus_id)) || [])]}));
  const ids = [...new Set(examples.flatMap(item => item.aspects))];
  const matches = examples.filter(item => aspect === 'overall' ? item.aspects.length : item.aspects.includes(aspect));
  return { ids, matches:matches.length, examples };
}
export function createTopicEvidence(api) {
  const cache = new Map();
  return async function load(start, end) {
    const key = `${start}/${end}`;
    if (cache.has(key)) return cache.get(key);
    const task = (async () => {
      const rows = new Map();
      let cursor = {}, complete = false, count = 0;
      for (let page=0;page<10;page++) {
        const result = await api.getFacts({start_date:start,end_date:end,dimension:'overall',sentiment:'all',limit:1000,...cursor});
        if (!Array.isArray(result.items)) throw new Error('明细数据格式不正确');
        for (const row of result.items) {
          if (!valid.has(row.aspect) || !row.corpus_id) continue;
          if (!rows.has(String(row.corpus_id))) rows.set(String(row.corpus_id),new Set());
          rows.get(String(row.corpus_id)).add(row.aspect);
        }
        count += result.items.length;
        if (!result.next_cursor) {complete=true;break;}
        const next=result.next_cursor;
        if (next.after_corpus_id === cursor.after_corpus_id && next.after_aspect === cursor.after_aspect) throw new Error('明细游标未推进');
        cursor=next;
      }
      return {rows,complete,count};
    })();
    cache.set(key,task);
    try {const result=await task;if(cache.size>8)cache.delete(cache.keys().next().value);return result;}
    catch(error){cache.delete(key);throw error;}
  };
}
