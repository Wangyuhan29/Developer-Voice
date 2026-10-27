// Union corpus identities rather than adding per-aspect corpus counts.
export function summarizeFacts(rows) {
  const corpora=new Map(), labels=new Set();
  for(const row of rows){
    if(row.corpus_id==null)continue;
    const id=String(row.corpus_id);labels.add(`${id}/${row.aspect}`);
    if(!corpora.has(id))corpora.set(id,new Set());
    corpora.get(id).add(row.sentiment);
  }
  return {total_count:corpora.size,aspect_count:labels.size,positive_count:[...corpora.values()].filter(s=>s.has('positive')).length,negative_count:[...corpora.values()].filter(s=>s.has('negative')).length};
}
export function createCombinationSummary(api) {
  const cache=new Map();
  function load(start,end,aspect){
    const key=`${start}/${end}/${aspect}`;
    if(cache.has(key))return cache.get(key);
    const task=(async()=>{
      const rows=[];let cursor={};
      for(let page=0;page<100;page++){
        const result=await api.getFacts({start_date:start,end_date:end,dimension:aspect,sentiment:'all',limit:1000,...cursor});
        if(!Array.isArray(result.items))throw new Error('明细格式不正确');
        rows.push(...result.items.filter(row=>row.aspect===aspect));
        if(!result.next_cursor)return rows;
        const next=result.next_cursor;
        if(next.after_corpus_id===cursor.after_corpus_id&&next.after_aspect===cursor.after_aspect)throw new Error('明细游标未推进');
        cursor=next;
      }
      throw new Error('明细尚未完整读取');
    })();
    cache.set(key,task);task.catch(()=>cache.delete(key));
    if(cache.size>52)cache.delete(cache.keys().next().value);
    return task;
  }
  return async(start,end,ids)=>{
    const rows=[];let position=0;
    await Promise.all(Array.from({length:Math.min(3,ids.length)},async()=>{while(position<ids.length){const id=ids[position++];rows.push(...await load(start,end,id));}}));
    return summarizeFacts(rows);
  };
}
