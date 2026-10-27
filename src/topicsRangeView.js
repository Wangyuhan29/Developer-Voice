import { createTopicEvidence, quarterRange, relateTopic } from './topicEvidence.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function selectRangeQuarters(quarters, range) {
  return quarters.filter(q=>{const r=quarterRange(q.quarter);return r && r[0]<=range[1] && r[1]>=range[0];}).sort((a,b)=>b.quarter.localeCompare(a.quarter));
}
export function createTopicsRangeView(api,{onFocusQuarter,onFocusMonth,onSelectTopic}) {
  const root=document.querySelector('#topicRangeView'), loadEvidence=createTopicEvidence(api);
  let index=null,range=[],context={aspectIds:[],aspect:'全部方面'},active=false,version=0,entries=new Map(),opened=new Set(),selectedTopic=null,query='';
  function cards(entry) {
    if (!entry.result) return entry.error ? '<p>此季度加载失败。<button data-retry-range>重试</button></p>' : '<p>正在加载此季度主题…</p>';
    const evidence=entry.evidence || {rows:new Map()}, wanted=context.aspectIds;
    const topics=entry.result.topics.filter(t=>`${t.name} ${t.keywords.map(k=>k.term).join(' ')}`.toLowerCase().includes(query));
    if (!topics.length) return `<p class="topic-muted">${entry.result.status==='insufficient'?'该季度样本不足':query?'没有匹配的主题':'该季度暂无主题'}</p>`;
    return topics.map(topic=>{
      const link=relateTopic(topic,evidence,wanted),key=`${entry.quarter}:${topic.topic_id}`;
      return `<article data-topic-aspects="${link.ids.join(' ')}" class="quarter-topic-card${link.matches?' has-related-evidence':''}${key===selectedTopic?' is-linked-topic':''}"><div class="quarter-topic-top"><span>${entry.quarter} / 主题 ${topic.topic_id+1}</span><span>${topic.document_count.toLocaleString()} 条 · ${(topic.share_within_quarter*100).toFixed(1)}%</span></div><h3>${escape(topic.name)}</h3>${link.matches && wanted.length<13?`<div class="topic-relation-badge">${link.matches} 条代表语料命中所选方面</div>`:''}<ul class="quarter-topic-keywords">${topic.keywords.slice(0,8).map(k=>`<li>${escape(k.term)}</li>`).join('')}</ul><button class="topic-profile-link" data-range-topic="${key}" ${!link.ids.length?'disabled':''}>在 02 突出相关方面（${link.ids.length} 类）</button><details class="topic-examples"><summary>查看代表语料（${topic.examples.length} 条）</summary><ul>${topic.examples.map(ex=>{let url=null;try{const u=new URL(ex.github_url);if(u.protocol==='https:'&&u.hostname==='github.com'&&!u.username&&!u.password)url=u.href;}catch{}return `<li><div class="topic-example-meta"><span>${escape(ex.repository)}</span><button class="example-month-link" data-range-month="${escape(ex.created_at.slice(0,7))}">${escape(ex.created_at.slice(0,10))} ↗</button></div><p>${escape(ex.text)}</p>${url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">GitHub 原文 ↗</a>`:''}</li>`;}).join('')}</ul></details></article>`;
    }).join('');
  }
  function updateEntry(entry) {
    const body=root.querySelector(`[data-quarter-body="${entry.quarter}"]`);
    if(body)body.innerHTML=`<p class="range-quarter-note">${entry.partial?'所选范围只覆盖此季度的一部分。':''}主题数量、占比和关键词来自完整季度，不是对选定月份重新聚类。${entry.evidenceError?'代表语料关联暂不可用。':entry.evidence && !entry.evidence.complete?'代表语料明细覆盖不完整。':''}</p><div class="range-quarter-cards">${cards(entry)}</div>`;
  }
  async function load(quarter) {
    if(!active || !index)return;
    let entry=entries.get(quarter);
    if(entry?.loading || entry?.result){if(entry)updateEntry(entry);return;}
    const q=quarterRange(quarter),token=version;
    entry={quarter,loading:true,partial:range[0]>q[0]||range[1]<q[1]};entries.set(quarter,entry);updateEntry(entry);
    try {
      const result=await api.getQuarterTopics(quarter,index.run_name);
      if(token!==version)return;
      if(result.source!=='bertopic_quarterly'||result.quarter!==quarter||result.run_name!==index.run_name)throw Error('季度快照不一致');
      entry.result=result;updateEntry(entry);
      if(result.status==='ready')try{entry.evidence=await loadEvidence(range[0]>q[0]?range[0]:q[0],range[1]<q[1]?range[1]:q[1]);}catch{entry.evidenceError=true;}
    }catch{entry.error=true;}
    finally{if(token===version){entry.loading=false;updateEntry(entry);}}
  }
  function render() {
    if(!active)return;
    if(!index){root.innerHTML='<p class="topic-empty">正在获取季度索引；加载失败时请使用顶部“刷新数据”重试。</p>';return;}
    const quarters=selectRangeQuarters(index.quarters,range);
    if(!quarters.length){root.innerHTML='<p class="topic-empty">该时间段暂无季度主题数据。</p>';return;}
    if(!opened.size)opened.add(quarters[0].quarter);
    root.innerHTML=`<div class="range-view-intro"><strong>${range.join(' — ')} · ${quarters.length} 个季度</strong><p>按时间段集中浏览，保留各季度独立主题；跨季度编号不合并，边界季度仍按完整季度统计。展开季度可加载其主题与关联语料。</p></div><label class="range-topic-search"><span class="sr-only">搜索已展开季度主题</span><input id="rangeTopicSearch" type="search" placeholder="搜索已展开季度的主题与关键词" value="${escape(query)}"></label>${quarters.map(q=>`<details class="range-quarter" data-range-quarter="${q.quarter}" ${opened.has(q.quarter)?'open':''}><summary><strong>${q.quarter.replace('-Q',' 年 · 第 ')} 季度</strong><span>${q.document_count?.toLocaleString() || 0} 条季度语料 · ${q.topic_count || 0} 个主题</span></summary><div data-quarter-body="${q.quarter}"></div><button class="range-quarter-focus tool-button" data-range-focus="${q.quarter}">时间线聚焦此季度</button></details>`).join('')}`;
    root.querySelector('#rangeTopicSearch').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();for(const entry of entries.values())updateEntry(entry);});
    for(const q of quarters)if(opened.has(q.quarter))load(q.quarter);
  }
  root.addEventListener('toggle',event=>{const el=event.target;if(!el.matches?.('.range-quarter'))return;const q=el.dataset.rangeQuarter;if(el.open){opened.add(q);load(q);}else opened.delete(q);},true);
  root.addEventListener('click',event=>{
    const focus=event.target.closest('[data-range-focus]');if(focus)onFocusQuarter(focus.dataset.rangeFocus);
    const month=event.target.closest('[data-range-month]');if(month)onFocusMonth(month.dataset.rangeMonth);
    const retry=event.target.closest('[data-retry-range]');if(retry){const q=retry.closest('[data-range-quarter]').dataset.rangeQuarter;entries.delete(q);load(q);}
    const button=event.target.closest('[data-range-topic]');if(button){const key=button.dataset.rangeTopic,[quarter,id]=key.split(':'),entry=entries.get(quarter),topic=entry?.result?.topics.find(t=>String(t.topic_id)===id);if(topic&&entry.evidence){selectedTopic=key;onSelectTopic({id:key,name:`${quarter} ${topic.name}`,aspects:relateTopic(topic,entry.evidence,context.aspectIds).ids});for(const e of entries.values())updateEntry(e);}}
  });
  return {
    setActive(value){active=value;root.hidden=!value;if(active)render();},
    setIndex(value){index=value;version++;entries.clear();if(active)render();},
    setRange(start,end){if(range[0]===start&&range[1]===end)return;range=[start,end];version++;entries.clear();opened.clear();selectedTopic=null;if(active)render();},
    setContext(next){const changed=JSON.stringify(next.aspectIds)!==JSON.stringify(context.aspectIds);context=next;if(changed&&active)for(const entry of entries.values())updateEntry(entry);},
    clearTopicSelection(){selectedTopic=null;if(active)for(const e of entries.values())updateEntry(e);}
  };
}
