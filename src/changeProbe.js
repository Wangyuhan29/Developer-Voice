import {aspects} from './data/aspects.js';
import {findChanges,aspectChanges,score,matchExamples} from './changeAnalysis.js';
const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toLocaleString('zh-CN');
const signed=(n,digits=0)=>`${n>0?'+':''}${n.toFixed(digits)}`;
const name=id=>aspects.find(a=>a.id===id)?.name||id;
export function createChangeProbe(api,{onAddAspect,onFocusTopic,onClearPreview}) {
  const root=document.querySelector('#changeProbe'),drawer=document.querySelector('#changeEvidence');
  const toggle=document.querySelector('#toggleChangeProbe'),list=document.querySelector('#changeProbePoints');
  let active=false,view=null,changes=[],selected=null,version=0,loaded=null,error=null,loading=false,sentiment='all',shown=3;
  const cache=new Map();
  async function evidence(month) {
    if(cache.has(month))return cache.get(month);
    const task=(async()=>{
      const [year,m]=month.split('-').map(Number),quarter=`${year}-Q${Math.ceil(m/3)}`;
      const index=await api.getTopicQuarters();
      if(index.source!=='bertopic_quarterly')throw Error('季度来源不匹配');
      const quarterExists=index.quarters.some(q=>q.quarter===quarter);
      const topicTask=quarterExists?api.getQuarterTopics(quarter,index.run_name).then(result=>{
        if(result.source!=='bertopic_quarterly'||result.quarter!==quarter||result.run_name!==index.run_name)throw Error('季度快照不匹配');return result;
      }):Promise.resolve({topics:[],quarter});
      topicTask.catch(()=>{});
      let cursor={},facts=[],complete=false;
      // Bound reads and disclose incomplete evidence. This is never used for total counts.
      try{
        for(let page=0;page<10;page++) {
          const result=await api.getFacts({start_date:month,end_date:month,dimension:'overall',sentiment:'all',limit:1000,...cursor});
          if(!Array.isArray(result.items))throw Error('明细格式不正确');facts.push(...result.items);
          if(!result.next_cursor){complete=true;break;}
          const next=result.next_cursor;
          if(next.after_corpus_id===cursor.after_corpus_id&&next.after_aspect===cursor.after_aspect)throw Error('明细游标未推进');
          cursor=next;
        }
      }catch(err){await topicTask.catch(()=>{});throw err;}
      return {facts,complete,topic:await topicTask};
    })();
    cache.set(month,task);task.catch(()=>cache.delete(month));if(cache.size>8)cache.delete(cache.keys().next().value);return task;
  }
  function renderList(){
    toggle.setAttribute('aria-pressed',String(active));toggle.textContent=active?'收起变化探针':'发现变化';
    root.classList.toggle('is-active',active);list.hidden=!active;
    document.querySelectorAll('.change-marker').forEach(el=>{el.style.display=active?'':'none';});
    list.innerHTML=changes.length ? `<p>当前范围内评分环比变化最大的 ${changes.length} 个月 · 按变化幅度排序，不代表统计显著性</p><div class="change-month-list">${changes.map(c=>`<button data-probe-month="${c.month}" aria-pressed="${selected?.month===c.month}"><span>${c.month}</span><strong class="${c.delta>0?'change-up':'change-down'}">${signed(c.delta,3)}</strong>${c.lowSample?'<small>低样本</small>':''}</button>`).join('')}</div>` : '<p>当前范围内暂无可比较的连续月份，请扩大时间范围或选择有数据的方面。</p>';
  }
  function close(returnFocus=false){++version;selected=null;loaded=null;drawer.hidden=true;renderList();if(returnFocus)toggle.focus({preventScroll:true});}
  function renderEvidence(){
    if(!selected)return;
    const focused=document.activeElement;
    const focusSelector=drawer.contains(focused) ? focused.id==='probeTitle'?'#probeTitle':focused.dataset.probeSentiment?`[data-probe-sentiment="${focused.dataset.probeSentiment}"]`:focused.hasAttribute('data-probe-more')?'[data-probe-more]':null : null;
    const c=selected;
    drawer.hidden=false;
    const rows=aspectChanges(c,view.ids).slice(0,5);
    const examples=loaded?matchExamples(loaded.topic.topics,loaded.facts,c.month,view.ids,sentiment):[];
    drawer.innerHTML=`<div class="change-evidence-head"><div><span class="probe-eyebrow">变化证据</span><h3 tabindex="-1" id="probeTitle">${c.previousMonth} → ${c.month}</h3><p>${escape(view.label)} · 数据口径：方面标注次数</p></div><button class="probe-close" data-probe-close aria-label="关闭变化证据">×</button></div><div class="probe-comparison"><div><span>上月评分</span><strong>${score(c.before).toFixed(3)}</strong><small>${num(c.before.total)} 次标注</small></div><div class="probe-delta ${c.delta>0?'change-up':'change-down'}"><span>环比变化</span><strong>${signed(c.delta,3)}</strong></div><div><span>本月评分</span><strong>${score(c.current).toFixed(3)}</strong><small>${num(c.current.total)} 次标注</small></div></div>${c.lowSample?'<p class="probe-caution">其中至少一个月份少于 30 次标注，评分容易受少量讨论影响，请结合样本量判断。</p>':''}<p class="probe-disclaimer">以下为同期数据线索，不能据此认定 Rust 事件导致了情感变化。各方面数量变化也不等同于对总评分变化的贡献。</p><div class="probe-aspect-heading"><h4>哪些方面的数量变动较大</h4><small>仅比较所选方面 · 最多展示 5 类</small></div><div class="probe-aspect-list">${rows.map(r=>`<div class="probe-aspect-row" data-preview-aspect="${r.id}"><span>${escape(name(r.id))}</span><span>正面 <b>${signed(r.positiveDelta)}</b></span><span>负面 <b>${signed(r.negativeDelta)}</b></span><button data-probe-add="${r.id}" ${view.ids.length===1?'disabled':''}>只看此方面</button></div>`).join('')}</div><div class="probe-source-head"><div><h4>核对当月代表语料</h4><p>仅展示季度主题中，日期和方面标注均命中本月的示例，并非当月全部语料。</p></div><div class="probe-sentiment-filter" role="group" aria-label="代表语料情感筛选">${[['all','全部'],['positive','正面'],['neutral','中性'],['negative','负面']].map(([key,label])=>`<button data-probe-sentiment="${key}" aria-pressed="${sentiment===key}">${label}</button>`).join('')}</div></div><div class="probe-source-list" aria-live="polite" aria-busy="${loading}">${loading?'<p class="probe-empty">正在核对季度代表语料和真实方面标注…</p>':error?'<p class="probe-empty">关联证据加载失败，评分与数量统计仍来自月度数据。<button data-probe-retry>重新核对</button></p>':examples.length?examples.slice(0,shown).map(ex=>{
      let url=null;try{const u=new URL(ex.github_url);if(u.protocol==='https:'&&u.hostname==='github.com'&&!u.username&&!u.password)url=u.href;}catch{}
      return `<article class="probe-source"><div><span>${escape(ex.repository)} · ${escape(ex.created_at.slice(0,10))}</span><button data-probe-topic="${ex.topicId}">查看所在季度主题</button></div><p>${escape(ex.text.slice(0,240))}${ex.text.length>240?'…':''}</p>${ex.text.length>240?`<details class="probe-full-text"><summary>展开语料预览</summary><p>${escape(ex.text)}</p></details>`:''}<div class="probe-labels">${ex.labels.map(label=>`<span>${escape(name(label.aspect))} / ${{positive:'正面',negative:'负面',neutral:'中性'}[label.sentiment]||'未识别'}</span>`).join('')}</div>${url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">GitHub 原文 ↗</a>`:''}</article>`;
    }).join(''):'<p class="probe-empty">本月暂未匹配到符合条件的季度代表语料；这不表示本月没有相关讨论。可切换情感，或前往 03 查看完整季度线索。</p>'}</div>${examples.length>shown?`<button class="probe-show-more" data-probe-more>再显示 3 条（已展示 ${Math.min(shown,examples.length)} / ${examples.length}）</button>`:''}${loaded&&!loaded.complete?'<p class="probe-caution">本次只核对了前 10,000 条明细，证据覆盖不完整。</p>':''}<button class="probe-quarter-link" data-probe-quarter>到 03 继续追踪本季度主题</button>`;
    if(focusSelector)drawer.querySelector(focusSelector)?.focus({preventScroll:true});
  }
  async function open(month,{scroll=true}={}){
    const change=changes.find(c=>c.month===month);if(!change)return;
    onClearPreview();selected=change;sentiment='all';shown=3;loaded=null;error=null;loading=true;
    const token=++version;renderList();renderEvidence();
    if(scroll){drawer.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});drawer.querySelector('#probeTitle').focus({preventScroll:true});}
    try{const result=await evidence(month);if(token!==version)return;loaded=result;}
    catch(err){if(token!==version)return;error=err;}
    finally{if(token===version){loading=false;renderEvidence();}}
  }
  toggle.addEventListener('click',()=>{active=!active;if(!active)close();renderList();});
  list.addEventListener('click',e=>{const b=e.target.closest('[data-probe-month]');if(b)open(b.dataset.probeMonth);});
  drawer.addEventListener('click',e=>{
    if(e.target.closest('[data-probe-close]'))close(true);
    if(e.target.closest('[data-probe-retry]')&&selected)open(selected.month,{scroll:false});
    const filter=e.target.closest('[data-probe-sentiment]');if(filter){sentiment=filter.dataset.probeSentiment;shown=3;renderEvidence();}
    if(e.target.closest('[data-probe-more]')){shown+=3;renderEvidence();}
    const add=e.target.closest('[data-probe-add]');if(add)onAddAspect(add.dataset.probeAdd);
    if(e.target.closest('[data-probe-quarter],[data-probe-topic]')&&selected)onFocusTopic(selected.month,e.target.closest('[data-probe-topic]')?.dataset.probeTopic);
  });
  drawer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(true);}});
  return {
    setContext(next){const changed=view?.key!==next.key;view=next;changes=findChanges(next.trend,next.ids);if(changed)close();renderList();},
    invalidate(){cache.clear();close();},
    get changes(){return changes;},get active(){return active;},open
  };
}
