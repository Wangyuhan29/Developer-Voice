import {aspects} from './data/aspects.js';
import {score} from './changeAnalysis.js';
export function createAspectPreview({getView,onFocus,onToggle}) {
  const root=document.querySelector('#aspectPreview');
  let active=null,timer=null,origin=null;
  function paint(){
    const view=getView(),item=view.categories.find(c=>c.id===active),name=aspects.find(a=>a.id===active)?.name;
    document.querySelectorAll('[data-preview-aspect]').forEach(el=>{
      el.classList.toggle('is-aspect-preview',!!active&&el.dataset.previewAspect===active);
      el.classList.toggle('is-preview-muted',!!active&&el.dataset.previewAspect!==active);
    });
    document.querySelectorAll('.aspect-leaf').forEach(el=>el.classList.toggle('is-aspect-preview',el.dataset.aspect===active));
    const cards=[...document.querySelectorAll('[data-topic-aspects]')];
    let matches=0;
    cards.forEach(el=>{const matched=el.dataset.topicAspects.split(' ').includes(active);if(matched&&el.getClientRects().length)matches++;el.classList.toggle('is-preview-match',!!active&&matched);el.classList.toggle('is-preview-muted',!!active&&!matched);});
    root.classList.toggle('has-preview',!!active);
    root.querySelector('#previewAspectTitle').textContent=active?`临时预览 · ${name}`:'先预览，再决定关注哪些方面';
    root.querySelector('#previewAspectSummary').textContent=active?`${item?`${item.total.toLocaleString()} 次标注 · 评分 ${score(item)?.toFixed(2)??'—'}`:'暂无统计'} · 已显示主题中 ${matches} 个有代表语料命中。预览不改变筛选。`:'鼠标经过分类可预览关联；触屏点一下预览，再选择聚焦或加入组合。';
    root.querySelector('#previewFocusAspect').disabled=!active;
    const button=root.querySelector('#previewToggleAspect');button.disabled=!active;
    button.textContent=view.ids.length===aspects.length?'只选此方面':active&&view.ids.includes(active)?'从组合移除':'加入当前组合';
    root.querySelector('#closeAspectPreview').disabled=!active;
    // This compact note also appears next to the themes while browsing the tree.
    const note=document.querySelector('#topicPreviewNote');
    note.hidden=!active;
    note.textContent=active?`临时预览：${name}。已显示主题中 ${matches} 个命中代表语料；移开恢复，点击方面可固定选择。`:'';
  }
  function clear(){clearTimeout(timer);active=null;origin=null;paint();}
  function show(id,source=null){if(!aspects.some(a=>a.id===id))return;clearTimeout(timer);active=id;origin=source;paint();}
  function target(el){return el.closest?.('[data-preview-aspect],.aspect-leaf');}
  document.addEventListener('pointerover',e=>{
    if(e.pointerType!=='mouse')return;
    if(e.target.closest('#aspectPreview')){clearTimeout(timer);return;}
    const el=target(e.target);if(el)show(el.dataset.previewAspect||el.dataset.aspect,el);
  });
  document.addEventListener('pointerout',e=>{
    if(e.pointerType!=='mouse')return;
    if(!target(e.target)&&!e.target.closest('#aspectPreview'))return;
    if(e.relatedTarget?.closest?.('#aspectPreview')||target(e.relatedTarget||{}))return;
    clearTimeout(timer);timer=setTimeout(clear,180);
  });
  document.addEventListener('focusin',e=>{const el=target(e.target);if(el)show(el.dataset.previewAspect||el.dataset.aspect,el);});
  document.addEventListener('focusout',e=>{if(target(e.target)&&!e.relatedTarget?.closest?.('#aspectPreview')&&!target(e.relatedTarget||{})){clearTimeout(timer);timer=setTimeout(clear,180);}});
  root.querySelector('#closeAspectPreview').addEventListener('click',()=>{const previous=origin;clear();previous?.focus({preventScroll:true});clear();});
  root.querySelector('#previewFocusAspect').addEventListener('click',()=>{const id=active;clear();if(id)onFocus(id);});
  root.querySelector('#previewToggleAspect').addEventListener('click',()=>{const id=active;clear();if(id)onToggle(id);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)clear();});
  const observer=new MutationObserver(()=>{if(active)paint();});
  for(const id of ['topicCards','topicRangeView','aspectTree']){const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,subtree:true});}
  return {show,clear,refresh:paint};
}
