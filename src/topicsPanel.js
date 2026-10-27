const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const number = value => Number(value).toLocaleString("zh-CN");
const percent = value => `${(value * 100).toFixed(1)}%`;
const quarterLabel = value => `${value.slice(0, 4)} 年 · 第 ${value.at(-1)} 季度`;
const dateLabel = value => value.slice(0, 10).replaceAll("-", ".");
const safeGithubUrl = value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password
      ? url.href : null;
  } catch { return null; }
};

export function createTopicsPanel(api, { onFocusQuarter = () => {}, onFocusMonth = () => {} } = {}) {
  const root = document.querySelector("#topicsPanel");
  const $ = id => root.querySelector(`#${id}`);
  const select = $("topicQuarter");
  const search = $("topicSearch");
  let index = null;
  let range = [];
  let available = [];
  let selected = null;
  let detail = null;
  let requestVersion = 0;
  let loadingIndex = false;
  let pendingQuarter = null;
  let context = {aspect:"全部方面",isFiltered:false};

  function holdLayout() {
    const body = $("topicBody");
    body.style.minHeight = `${Math.ceil(body.getBoundingClientRect().height)}px`;
  }

  function releaseLayout() {
    $("topicBody").style.minHeight = "";
  }

  function showMessage(title, retry = false) {
    $("topicSummary").hidden = true;
    $("topicTools").hidden = true;
    $("topicCards").innerHTML = `<div class="topic-empty"><h3>${escape(title)}</h3>${retry ? '<button class="tool-button" data-topic-retry>重新加载</button>' : ""}</div>`;
  }

  function renderContext() {
    const partial = selected && range.length === 2 && (() => {const [year,q]=selected.split("-Q").map(Number);const start=`${year}-${String((q-1)*3+1).padStart(2,"0")}`,end=`${year}-${String(q*3).padStart(2,"0")}`;return range[0]>start || range[1]<end;})();
    $("topicLinkContext").textContent = `分析范围：${range.join(" — ")}。${selected ? `当前主题：${quarterLabel(selected)}。` : ""}${partial ? "主题按完整季度统计，未裁剪到所选月份。" : ""}${context.isFiltered ? `当前方面为“${context.aspect}”；季度主题覆盖全部方面，不按方面筛选。` : "季度主题独立聚类，不等同于方面分类。"}`;
    $("focusTopicQuarter").disabled = !selected;
  }
  function navigation() {
    renderContext();
    const position = available.findIndex(q => q.quarter === selected);
    $("topicPrevious").disabled = position < 0 || position === available.length - 1;
    $("topicNext").disabled = position <= 0;
    select.disabled = !available.length;
  }

  function renderCards() {
    const query = search.value.trim().toLowerCase();
    const topics = detail.topics.filter(topic =>
      `${topic.name} ${topic.keywords.map(k => k.term).join(" ")}`.toLowerCase().includes(query)
    );
    $("topicCards").innerHTML = topics.length ? topics.map(topic => {
      const examples = topic.examples.map(example => {
        const url = safeGithubUrl(example.github_url);
        return `<li><div class="topic-example-meta"><span>${escape(example.repository)} · ${escape(example.source_type)}</span><button class="example-month-link" data-example-month="${escape(example.created_at.slice(0,7))}" aria-label="在时间线查看 ${escape(example.created_at.slice(0,7))}">${dateLabel(example.created_at)} ↗</button></div><p>${escape(example.text)}</p>${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">GitHub 原文 ↗</a>` : ""}</li>`;
      }).join("");
      return `<article class="quarter-topic-card">
        <div class="quarter-topic-top"><span class="quarter-topic-id">主题 ${String(topic.topic_id + 1).padStart(2, "0")}</span><span>${number(topic.document_count)} 条 · ${percent(topic.share_within_quarter)}</span></div>
        <h3>${escape(topic.name)}</h3>
        <div class="quarter-topic-bar" aria-hidden="true"><i style="width:${Math.min(100, Math.max(0, topic.share_within_quarter * 100))}%"></i></div>
        <ul class="quarter-topic-keywords" aria-label="主题关键词">${topic.keywords.slice(0, 8).map(k => `<li>${escape(k.term)}</li>`).join("")}</ul>
        ${examples ? `<details class="topic-examples"><summary>查看代表语料 <span>${topic.examples.length} 条</span></summary><ul>${examples}</ul></details>` : '<p class="topic-muted">暂无代表语料</p>'}
      </article>`;
    }).join("") : '<div class="topic-empty"><h3>没有匹配的主题</h3><button class="tool-button" data-topic-clear>清空搜索</button></div>';
  }

  function renderDetail() {
    const count = detail.document_count;
    const stats = [
      ["语料数", number(count)],
      ["主题数", number(detail.topic_count)],
      ["已归类", number(detail.assigned_count)],
      ["未归类", number(detail.outlier_count)]
    ];
    $("topicSummary").innerHTML = stats.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    $("topicSummary").hidden = false;
    if (detail.status === "insufficient" || detail.status === "no_topics") {
      showMessage(detail.status === "insufficient" ? "样本不足" : "暂无主题");
      $("topicSummary").hidden = false;
      return;
    }
    $("topicTools").hidden = false;
    renderCards();
  }

  async function loadQuarter() {
    const version = ++requestVersion;
    holdLayout();
    detail = null;
    search.value = "";
    navigation();
    $("topicCards").setAttribute("aria-busy", "true");
    showMessage("加载中…");
    try {
      const result = await api.getQuarterTopics(selected, index.run_name);
      if (version !== requestVersion) return;
      if (result.source !== "bertopic_quarterly" || result.run_name !== index.run_name || result.quarter !== selected) throw new Error("主题结果与所选季度不一致");
      detail = result;
      renderDetail();
    } catch (error) {
      if (version !== requestVersion) return;
      showMessage("加载失败", true);
    } finally {
      if (version === requestVersion) {
        $("topicCards").setAttribute("aria-busy", "false");
        releaseLayout();
      }
    }
  }

  function applyRange(force = false) {
    if (!index || range.length !== 2) return;
    available = index.quarters.filter(q => q.start_utc.slice(0, 7) <= range[1] && q.end_utc_exclusive.slice(0, 7) > range[0]);
    select.replaceChildren(...available.map(q => new Option(`${quarterLabel(q.quarter)}${q.status === "insufficient" ? " · 样本不足" : q.status === "no_topics" ? " · 无主题" : ""}`, q.quarter)));
    if (!available.length) {
      ++requestVersion;
      selected = null;
      detail = null;
      select.add(new Option("该范围暂无季度", ""));
      navigation();
      $("topicCards").setAttribute("aria-busy", "false");
      showMessage("暂无季度数据");
      releaseLayout();
      return;
    }
    const next = available.some(q => q.quarter === pendingQuarter) ? pendingQuarter : available.some(q => q.quarter === selected) ? selected : available[0].quarter;
    pendingQuarter = null;
    const changed = next !== selected;
    selected = next;
    select.value = selected;
    navigation();
    if (changed || force) return loadQuarter();
  }

  async function refresh() {
    const version = ++requestVersion;
    holdLayout();
    loadingIndex = true;
    select.disabled = true;
    $("topicPrevious").disabled = true;
    $("topicNext").disabled = true;
    $("topicCards").setAttribute("aria-busy", "true");
    showMessage("加载中…");
    try {
      const result = await api.getTopicQuarters();
      if (version !== requestVersion) return;
      if (result.source !== "bertopic_quarterly") throw new Error("未获取到真实季度主题结果");
      index = result;
      loadingIndex = false;
      await applyRange(true);
    } catch (error) {
      if (version !== requestVersion) return;
      index = null;
      showMessage("加载失败", true);
      $("topicCards").setAttribute("aria-busy", "false");
      releaseLayout();
    } finally {
      loadingIndex = false;
    }
  }

  select.addEventListener("change", () => { selected = select.value; loadQuarter(); });
  for (const [id, step] of [["topicPrevious", 1], ["topicNext", -1]]) {
    $(id).addEventListener("click", () => {
      const next = available[available.findIndex(q => q.quarter === selected) + step];
      if (next) { selected = next.quarter; select.value = selected; loadQuarter(); }
    });
  }
  $("focusTopicQuarter").addEventListener("click", () => { if (selected) onFocusQuarter(selected); });
  search.addEventListener("input", () => { if (detail) renderCards(); });
  root.addEventListener("click", event => {
    const month = event.target.closest("[data-example-month]");
    if (month && /^\d{4}-\d{2}$/.test(month.dataset.exampleMonth)) onFocusMonth(month.dataset.exampleMonth);
    if (event.target.closest("[data-topic-retry]")) refresh();
    if (event.target.closest("[data-topic-clear]")) { search.value = ""; renderCards(); search.focus(); }
  });
  return {
    setRange(start, end) {
      if (range[0] === start && range[1] === end) return;
      range = [start, end].sort();
      if (loadingIndex) return;
      if (index) applyRange();
      else if (!loadingIndex) refresh();
    },
    setContext(next) { context = next; renderContext(); },
    async revealMonth(month) {
      const [year,m] = month.split("-").map(Number);
      pendingQuarter = `${year}-Q${Math.ceil(m/3)}`;
      if (index) await applyRange();
      else if (!loadingIndex) await refresh();
    },
    refresh
  };
}
