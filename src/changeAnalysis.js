const zero = () => ({total:0,positive:0,neutral:0,negative:0});
export const score = row => row?.total ? (row.positive-row.negative)/row.total : null;
export function aspectCounts(row, ids) {
  return ids.reduce((sum,id)=>{for(const k of Object.keys(sum))sum[k]+=row?.categories?.[id]?.[k] || 0;return sum;},zero());
}
// Compare adjacent calendar months only; a missing month is never bridged.
export function findChanges(trend, ids, limit=5) {
  const rows=[...trend].sort((a,b)=>a.month.localeCompare(b.month));
  return rows.slice(1).flatMap((row,index)=>{
    const previous=rows[index], [year,month]=previous.month.split('-').map(Number);
    const next=`${month===12?year+1:year}-${String(month===12?1:month+1).padStart(2,'0')}`;
    const current=aspectCounts(row,ids), before=aspectCounts(previous,ids);
    if(next!==row.month || !current.total || !before.total)return [];
    const delta=score(current)-score(before);
    if(Math.abs(delta)<0.0005)return [];
    return [{month:row.month,previousMonth:previous.month,current,before,delta,lowSample:Math.min(current.total,before.total)<30,row,previous}];
  }).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||b.month.localeCompare(a.month)).slice(0,limit);
}
export function aspectChanges(change, ids) {
  return ids.map(id=>{
    const current=change.row.categories?.[id] || zero(),before=change.previous.categories?.[id] || zero();
    return {id,current,before,negativeDelta:current.negative-before.negative,positiveDelta:current.positive-before.positive};
  }).filter(r=>r.current.total||r.before.total).sort((a,b)=>Math.abs(b.negativeDelta)+Math.abs(b.positiveDelta)-Math.abs(a.negativeDelta)-Math.abs(a.positiveDelta));
}
export function matchExamples(topics, facts, month, ids, sentiment='all') {
  const byCorpus=new Map();
  for(const row of facts) {
    if(!ids.includes(row.aspect) || row.created_at?.slice(0,7)!==month || (sentiment!=='all'&&row.sentiment!==sentiment))continue;
    const key=String(row.corpus_id);if(!byCorpus.has(key))byCorpus.set(key,[]);byCorpus.get(key).push(row);
  }
  const seen=new Set();
  return topics.flatMap(topic=>(topic.examples||[]).flatMap(example=>{
    const key=String(example.corpus_id);
    if(seen.has(key)||!byCorpus.has(key)||example.created_at?.slice(0,7)!==month)return [];
    seen.add(key);return [{...example,topicName:topic.name,topicId:topic.topic_id,labels:byCorpus.get(key)}];
  }));
}
