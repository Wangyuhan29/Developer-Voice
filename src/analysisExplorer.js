import { toggleAspectSelection } from "./aspectSelection.js";
import { aspects, sentiments } from './data/aspects.js';

// Navigation groups organize the existing labels; they are not model classes.
export const aspectGroups = [
  { name: '语言机制', ids: ['ownership', 'type_system', 'safety', 'api_extensibility'] },
  { name: '工程工具', ids: ['package_manager', 'tooling_documentation', 'diagnostics_debugging', 'readability_maintainability'] },
  { name: '性能效率', ids: ['runtime_performance', 'compile_time'] },
  { name: '生态协作', ids: ['libraries_frameworks', 'learning_curve', 'community'] }
];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = n => Number(n || 0).toLocaleString('zh-CN');

export function createAnalysisExplorer({ onAspect, onSelection, onRestore, onReset, onJump }) {
  const root = document.querySelector('#analysisExplorer');
  const tree = root.querySelector('#aspectTree');
  const query = root.querySelector('#aspectSearch');
  let view = null;
  if (matchMedia("(max-width: 700px)").matches) root.querySelector(".explorer-tree-panel").open = false;
  const openGroups = new Set([aspectGroups[0].name]);
  let lastAspect = null;
  function renderTree() {
    if (!view) return;
    const text = query.value.trim().toLowerCase();
    const categories = view.categories;
    const all = categories.reduce((sum, c) => sum + c.total, 0);
    let hits = 0;
    tree.innerHTML = `<div class="aspect-selection-actions"><button data-all-aspects>全选</button><button data-no-aspects>清空</button><small>已选 ${view.selectedAspects.length} / 13</small></div><button class="aspect-all${view.aspect === 'overall' ? ' is-selected' : ''}" data-aspect="overall" aria-pressed="${view.aspect === 'overall'}"><span>全部方面</span><small>13 类</small></button>` + aspectGroups.map(group => {
      const children = group.ids.map(id => aspects.find(a => a.id === id)).filter(a => `${a.name} ${a.id} ${group.name}`.toLowerCase().includes(text));
      hits += children.length;
      if (!children.length) return '';
      return `<details data-group="${group.name}" ${text || openGroups.has(group.name) ? 'open' : ''}><summary><span>${group.name}</span><small>${children.length}</small></summary><div class="aspect-branches"><button class="aspect-group-toggle" data-select-group="${group.name}">${group.ids.every(id=>view.selectedAspects.includes(id)) ? "取消本组" : "选择本组"}</button>${children.map(a => {
        const row = categories.find(c => c.id === a.id);
        return `<button data-aspect="${a.id}" class="aspect-leaf${view.selectedAspects.includes(a.id) ? ' is-selected' : ''}${view.relatedAspects?.includes(a.id) ? ' is-topic-related' : ''}" aria-pressed="${view.selectedAspects.includes(a.id)}"><span>${a.name}</span><small>${all && row ? (row.total / all * 100).toFixed(1) + '%' : '—'}</small></button>`;
      }).join('')}</div></details>`;
    }).join('') + (!hits ? '<p class="explorer-empty">没有匹配的方面，试试“性能”或“工具”。</p>' : '');
    tree.querySelectorAll('details').forEach(el => el.addEventListener('toggle', () => { if (!query.value.trim()) { if (el.open) openGroups.add(el.dataset.group); else openGroups.delete(el.dataset.group); } }));
  }
  root.addEventListener('click', event => {
    const aspect = event.target.closest('[data-aspect]');
    if (aspect) {
      const id=aspect.dataset.aspect;
      onSelection(id === "overall" ? aspects.map(a=>a.id) : toggleAspectSelection(view.selectedAspects,id,aspects.map(a=>a.id)));
    }
    if(event.target.closest('[data-all-aspects]')) onSelection(aspects.map(a=>a.id));
    if(event.target.closest('[data-no-aspects]')) onSelection([]);
    const groupButton=event.target.closest('[data-select-group]');
    if(groupButton){const group=aspectGroups.find(g=>g.name===groupButton.dataset.selectGroup);onSelection(group.ids.every(id=>view.selectedAspects.includes(id)) ? view.selectedAspects.filter(id=>!group.ids.includes(id)) : [...new Set([...view.selectedAspects,...group.ids])]);}
    const jump = event.target.closest('[data-analysis-jump]');
    if (jump) onJump(jump.dataset.analysisJump);
  });
  document.querySelector('#clearAnalysisAspect').addEventListener('click', () => onAspect('overall'));
  document.querySelector('#resetAnalysis').addEventListener('click', onReset);
  document.querySelector('#restoreAnalysisRange').addEventListener('click', onRestore);
  query.addEventListener('input', renderTree);
  return {
    render(next) {
      view = next;
      if (view.aspect !== lastAspect) {
        const selectedGroup = aspectGroups.find(g => g.ids.includes(view.aspect));
        if (selectedGroup) openGroups.add(selectedGroup.name);
        lastAspect = view.aspect;
      }
      const item = aspects.find(a => a.id === view.aspect);
      const group = aspectGroups.find(g => g.ids.includes(view.aspect));
      document.querySelector('#analysisPeriod').textContent = `${view.start} — ${view.end}`;
      document.querySelector('#analysisAspectPath').textContent = item ? `${group.name} / ${item.name}` : view.selectedAspects.length===13 ? '全部方面' : view.selectedAspects.length ? `自由组合：${aspects.filter(a=>view.selectedAspects.includes(a.id)).map(a=>a.name).join('、')}` : '未选择方面';
      document.querySelector('#clearAnalysisAspect').hidden = view.selectedAspects.length===13;
      document.querySelector('#restoreAnalysisRange').hidden = !view.canRestore;
      root.setAttribute('aria-busy', String(view.loading));
      const counts = item ? view.categories.find(c => c.id === item.id) : view.categories.filter(c=>view.selectedAspects.includes(c.id)).reduce((sum, c) => {
        for (const key of ['total', 'positive', 'neutral', 'negative']) sum[key] += c[key] || 0;
        return sum;
      }, {total:0,positive:0,neutral:0,negative:0});
      root.querySelector('#explorerTitle').textContent = item?.name || (view.selectedAspects.length===13 ? '当前时间范围的方面概览' : `自由组合 · ${view.selectedAspects.length} 个方面`);
      root.querySelector('#explorerSubtitle').textContent = item ? '与 02 同步选择；下方优先展示代表语料命中的主题。' : '左侧可叠加多个方面；主题按命中任一所选方面的代表语料关联。';
      root.querySelector('#explorerTotal').textContent = view.loading ? '同步中…' : counts ? `${number(counts.total)} 次` : '暂无数据';
      const score = counts?.total ? (counts.positive-counts.negative)/counts.total : null;
      root.querySelector('#explorerScore').textContent = view.loading ? '—' : score === null ? '—' : score.toFixed(2);
      root.querySelector('#explorerSentiments').innerHTML = sentiments.map(s => {
        const count = counts?.[s.key] || 0, share = counts?.total ? count/counts.total*100 : 0;
        return `<div class="explorer-sentiment"><div><span><i style="background:${s.color}"></i>${s.name}</span><strong>${view.loading ? '—' : number(count)}</strong><small>${view.loading ? '—' : share.toFixed(1)+'%'}</small></div><div class="explorer-bar"><i style="width:${view.loading ? 0 : share}%;background:${s.color}"></i></div></div>`;
      }).join('');
      renderTree();
    }
  };
}
