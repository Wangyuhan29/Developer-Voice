const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={total:'标注',positive:'正面',neutral:'中性',negative:'负面'};
const counts=row=>Object.entries(labels).map(([key,label])=>`${label} ${Number(row?.[key]||0).toLocaleString()}`).join('，');
const citationButtons=ids=>(ids||[]).map(id=>`<button class="ai-citation" data-ai-source="${escape(id)}" aria-label="查看证据 ${escape(id)}">[${escape(id)}]</button>`).join('');
function safeGithub(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='github.com'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function sourceMarkup(source){
  if(source.kind==='statistics'){
    const d=source.data;
    return `<div class="ai-source-stat"><p>上月：${escape(counts(d.before))}</p><p>本月：${escape(counts(d.current))}</p>${source.id==='D0'?`<p>评分 ${d.before_score} → ${d.current_score}</p>`:''}</div>`;
  }
  const d=source.data,url=safeGithub(source.url);
  return `<p class="ai-source-meta">${escape(d.repository)} · ${escape(d.date)}</p><p>${escape(d.text)}</p>${url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">GitHub 原文 ↗</a>`:''}`;
}
const pause=(milliseconds,signal)=>new Promise((resolve,reject)=>{
  const cleanup=()=>signal.removeEventListener('abort',abort);
  const timer=setTimeout(()=>{cleanup();resolve();},milliseconds);
  function abort(){clearTimeout(timer);cleanup();reject(new DOMException('Aborted','AbortError'));}
  if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
});
export function createAiAdvicePanel(){
  const root=document.createElement('section');root.className='ai-advice-panel';root.setAttribute('aria-label','AI 分析与改进建议');
  let selection=null,controller=null,busy=false,result=null,error='',stage='',version=0;
  const memory=new Map();
  function render(){
    const focused=root.querySelector(':focus')?.dataset.aiGenerate;
    root.innerHTML=`<div class="ai-advice-heading"><div><span class="ai-model-label">GLM-5.3</span><h4>AI 分析与改进建议</h4><p>依据这个月的变化与所选方面，给出供项目维护者参考的行动建议。</p></div><button class="ai-generate" data-ai-generate="${result?'refresh':'generate'}" ${busy?'disabled':''}>${busy?'正在生成…':result?'重新生成':'生成建议'}</button></div><p class="ai-advice-caption">点击后才调用 AI；只提交该变化的数据与代表样例，不包含模拟事件。建议不等同于已确认的问题或因果结论。</p><div class="ai-advice-status" role="status" aria-live="polite">${busy?`<i class="ai-working-dot"></i>${escape(stage)}，完成后会显示在这里。${result?'当前保留上次结果。':''}`:error?`<span class="ai-error">${escape(error)}</span>`:result?`${result.cached?'复用缓存':'已生成'} · ${escape(result.month)} · ${escape(result.model)} · ${escape(new Date(result.generated_at).toLocaleString('zh-CN',{hour12:false}))}`:'尚未生成；不会因滚动或切换情感筛选自动调用。'}</div>${result?`<div class="ai-analysis-summary"><h5>变化解读</h5><p>${escape(result.analysis.summary.text)} ${citationButtons(result.analysis.summary.citations)}</p></div><div class="ai-recommendations">${result.analysis.suggestions.map((item,i)=>`<article><span class="ai-recommendation-index">${String(i+1).padStart(2,'0')}</span><div><h5>${escape(item.title)}</h5><p>${escape(item.action)} ${citationButtons(item.citations)}</p><div class="ai-verification"><strong>如何验证</strong><p>${escape(item.verification)}</p></div></div></article>`).join('')}</div>${result.analysis.limitations.length?`<div class="ai-limitations"><strong>解读边界</strong><ul>${result.analysis.limitations.map(item=>`<li>${escape(item)}</li>`).join('')}</ul></div>`:''}<details class="ai-evidence"><summary>核对 AI 使用的证据 <span>${result.sources.length} 项</span></summary><div>${result.sources.map(source=>`<article id="ai-source-${escape(source.id)}"><h5><span>${escape(source.id)}</span> ${escape(source.label)}</h5>${sourceMarkup(source)}</article>`).join('')}</div></details>`:''}`;
    if(focused)root.querySelector('[data-ai-generate]')?.focus({preventScroll:true});
  }
  async function request(path,options,signal){
    const response=await fetch('/ai-advice/'+path,{...options,signal,headers:{'Content-Type':'application/json',...options?.headers}});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw Error(data?.detail||`建议服务暂不可用（${response.status}）`);
    if(!data)throw Error('建议服务未返回有效数据');return data;
  }
  async function generate(refresh){
    if(!selection||busy)return;
    controller?.abort();controller=new AbortController();const signal=controller.signal,token=++version;
    busy=true;error='';stage='正在核对当前变化的真实数据';render();
    const deadline=setTimeout(()=>controller?.abort(),210000);
    try{
      const job=await request('jobs',{method:'POST',body:JSON.stringify({month:selection.month,aspects:selection.ids,refresh})},signal);
      while(!signal.aborted){
        const status=await request('jobs/'+encodeURIComponent(job.id),{},signal);
        if(token!==version)return;
        if(status.status==='error')throw Error(status.error||'生成失败，请稍后重试');
        if(status.status==='ready'){
          result=status.result;memory.set(selection.key,result);if(memory.size>10)memory.delete(memory.keys().next().value);break;
        }
        stage=status.stage||'正在生成建议';render();await pause(2000,signal);
      }
    }catch(err){if(token!==version)return;error=err.name==='AbortError'?'等待时间较长，请稍后再点生成；服务器完成后会保留缓存。':err.message;}
    finally{clearTimeout(deadline);if(token===version){busy=false;render();}}
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-ai-generate]');if(button)generate(button.dataset.aiGenerate==='refresh');
    const source=event.target.closest('[data-ai-source]');
    if(source&&/^([DE]\d+)$/.test(source.dataset.aiSource)){
      root.querySelector('.ai-evidence').open=true;
      root.querySelector('#ai-source-'+source.dataset.aiSource)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center'});
    }
  });
  return {
    root,
    setContext(next){if(selection?.key===next.key)return;controller?.abort();version++;selection=next;busy=false;error='';result=memory.get(next.key)||null;render();},
    reset(){controller?.abort();version++;selection=null;busy=false;error='';result=null;},
  };
}
