/* CC 工作台 — 工作面板 */

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const DASH_CACHE_KEY = 'cc-dash-cache';

let dashState = {
  viewDate: new Date(),
  selectedDate: null,
  data: null,
  loading: false,
  saving: false,
  summarizing: false,
  historyDates: [],
  activeTab: 'tasks',
};

/* ── LocalStorage cache (backup before server save) ── */
function cacheSave(date) {
  if (!dashState.data) return;
  try {
    localStorage.setItem(DASH_CACHE_KEY + '-' + date, JSON.stringify({
      items: dashState.data.items.map(i => ({ id: i.id, checked: i.checked, note: i.note || '' })),
      ts: Date.now(),
    }));
  } catch (e) {}
}
function cacheRestore(date) {
  try {
    const raw = localStorage.getItem(DASH_CACHE_KEY + '-' + date);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (Date.now() - saved.ts > 86400000) { localStorage.removeItem(DASH_CACHE_KEY + '-' + date); return null; }
    return saved.items;
  } catch (e) { return null; }
}
function cacheClear(date) {
  try { localStorage.removeItem(DASH_CACHE_KEY + '-' + date); } catch (e) {}
}

function dashUrl(path) {
  if (!state.settings) return '';
  return state.settings.apiBase.replace(/\/+$/, '') + path;
}
function dashHeaders() {
  return { Authorization: 'Bearer ' + (state.settings?.appToken || '') };
}
function dashDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function loadDashboard() {
  const body = document.getElementById('dash-body');
  body.innerHTML = '<div class="dash-loading" style="display:flex;flex-direction:column;align-items:center;gap:12px">' + randomBearImg(40, 8) + '<span>加载中…</span></div>';
  dashState.loading = true;
  // Safety timeout: show error if fetch hangs >15s
  const timeoutId = setTimeout(() => {
    if (dashState.loading) {
      body.innerHTML = '<div class="dash-loading" style="color:var(--accent-red)">请求超时，请检查网络或 API 地址</div>';
      dashState.loading = false;
    }
  }, 15000);
  try {
    const fetchOpts = { headers: dashHeaders(), signal: AbortSignal.timeout(12000) };
    const url = dashUrl('/v1/checklist?date=' + dashState.selectedDate);
    if (!url) { clearTimeout(timeoutId); body.innerHTML = '<div class="dash-loading" style="color:var(--accent-red)">配置错误：API 地址未设置</div>'; dashState.loading = false; return; }
    const [checklistResp, historyResp] = await Promise.all([
      fetch(url, fetchOpts),
      fetch(dashUrl('/v1/checklist/history?year=' + dashState.viewDate.getFullYear() + '&month=' + (dashState.viewDate.getMonth() + 1)), fetchOpts),
    ]);
    clearTimeout(timeoutId);
    if (!checklistResp.ok) {
      const errData = await checklistResp.json().catch(() => ({}));
      // Try cache fallback
      const cached = cacheRestore(dashState.selectedDate);
      if (cached) {
        dashState.data = { items: cached, progress: { checked: 0, total: cached.length }, is_today: true };
        renderDashboard();
        showDashNotice('离线模式 — 上次保存的数据', 'warn');
        return;
      }
      body.innerHTML = '<div class="dash-loading" style="color:var(--accent-red)">加载失败：' + (errData.error?.message || checklistResp.statusText) + '</div>';
      return;
    }
    dashState.data = await checklistResp.json();
    // Merge cached notes into server data (cache may have newer unsaved edits)
    const cached = cacheRestore(dashState.selectedDate);
    if (cached && dashState.data.items) {
      const cacheMap = {};
      for (const c of cached) cacheMap[c.id] = c;
      for (const item of dashState.data.items) {
        const cc = cacheMap[item.id];
        if (cc) {
          if (cc.note) item.note = cc.note;
          item.checked = cc.checked;
        }
      }
    }
    if (historyResp.ok) {
      const h = await historyResp.json();
      dashState.historyDates = h.dates || [];
    }
    renderDashboard();
  } catch (e) {
    clearTimeout(timeoutId);
    const msg = e.name === 'AbortError' ? '请求超时' : e.message;
    body.innerHTML = '<div class="dash-loading" style="color:var(--accent-red)">网络错误：' + msg + '</div>';
  } finally {
    dashState.loading = false;
  }
}

function renderDashboard() {
  const body = document.getElementById('dash-body');
  const data = dashState.data;
  if (!data) return;
  body.innerHTML = '';
  body.appendChild(renderGreeting(data));
  renderActiveTabInto(body, data);
}

function renderActiveTabOnly() {
  const body = document.getElementById('dash-body');
  const data = dashState.data;
  if (!data) return;
  const greeting = body.querySelector('.oa-greeting');
  body.innerHTML = '';
  if (greeting) body.appendChild(greeting);
  else body.appendChild(renderGreeting(data));
  renderActiveTabInto(body, data);
}

function renderActiveTabInto(body, data) {
  if (dashState.activeTab === 'tasks') body.appendChild(renderTasksTab(data));
  else if (dashState.activeTab === 'calendar') body.appendChild(renderCalendarTab());
  else if (dashState.activeTab === 'history') renderHistoryTabAsync(body);
}

function switchDashTab(id) {
  if (dashState.activeTab === id) return;
  dashState.activeTab = id;
  renderActiveTabOnly();
}

/* ── Greeting ── */
function randomBearImg(size, round) {
  const s = size || 80;
  const r = round !== undefined ? round : s;
  const pool = window.BEAR_GIFS || FALLBACK_BEARS;
  if (!pool.length) return '';
  const src = pool[Math.floor(Math.random() * pool.length)];
  return '<img class="bear-img" src="' + src + '" alt="" style="width:' + s + 'px;height:' + s + 'px;border-radius:' + r + 'px;object-fit:cover;display:block">';
}
var FALLBACK_BEARS = [
  "https://media.tenor.com/4bMDX6ox1JgAAAAj/joke-bear-jokebear.gif",
  "https://media.tenor.com/eJcxJf7gjkYAAAAj/joke-bear-jokebear.gif",
  "https://media.tenor.com/MiVO5ntD6JEAAAAM/jokebear.gif"
];

function renderGreeting(data) {
  const el = document.createElement('div');
  el.className = 'oa-greeting';
  const dt = dashState.selectedDate.split('-');
  const d = new Date(+dt[0], +dt[1] - 1, +dt[2]);
  const weekday = WEEKDAY_LABELS[d.getDay()];
  const prog = data.progress || { checked: 0, total: 0 };
  const pct = prog.total > 0 ? Math.round(prog.checked / prog.total * 100) : 0;
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (pct / 100) * circumference;
  el.innerHTML =
    '<div class="oa-greeting-text">' +
    '  <div class="oa-greeting-sub">' + dt[0] + '年' + (+dt[1]) + '月' + (+dt[2]) + '日 · 星期' + weekday + (data.is_today ? ' · 今天' : '') + '</div>' +
    '  <div class="oa-greeting-title">' + escapeHtml(data.title || '工作面板') + '</div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' +
    '  <div class="bear-wrap">' + randomBearImg(52, 12) + '</div>' +
    '  <svg class="oa-greeting-ring" viewBox="0 0 52 52">' +
    '    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3"/>' +
    '    <circle cx="26" cy="26" r="22" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" transform="rotate(-90 26 26)"/>' +
    '    <text x="26" y="26" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="12" font-weight="600" font-family="Inter,sans-serif">' + pct + '%</text>' +
    '  </svg>' +
    '</div>';
  return el;
}

/* ── Add Task UI helper ── */
function createAddTaskUI(container, onAdd) {
  const fab = document.createElement('div');
  fab.className = 'oa-trello-add-fab';
  fab.innerHTML = '<span class="oa-trello-add-icon">＋</span><span class="oa-trello-add-label">添加任务</span>';

  const card = document.createElement('div');
  card.className = 'oa-trello-add-card';

  const row = document.createElement('div');
  row.className = 'oa-trello-add-row';

  const input = document.createElement('input');
  input.className = 'oa-trello-add-input-el';
  input.type = 'text';
  input.placeholder = '输入自定义任务…';
  input.maxLength = 200;

  const counter = document.createElement('span');
  counter.className = 'oa-trello-add-counter';
  counter.textContent = '0/200';

  input.addEventListener('input', () => {
    const len = input.value.length;
    counter.textContent = len + '/200';
    counter.classList.toggle('warn', len > 180);
    confirmBtn.disabled = !input.value.trim();
  });

  row.appendChild(input);
  row.appendChild(counter);

  const actions = document.createElement('div');
  actions.className = 'oa-trello-add-actions';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'oa-trello-add-confirm';
  confirmBtn.type = 'button';
  confirmBtn.textContent = '添加';
  confirmBtn.disabled = true;

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'oa-trello-add-cancel';
  cancelBtn.type = 'button';
  cancelBtn.textContent = '✕';

  actions.appendChild(confirmBtn);
  actions.appendChild(cancelBtn);
  card.appendChild(row);
  card.appendChild(actions);
  container.appendChild(fab);
  container.appendChild(card);

  function expand() {
    fab.classList.add('hide');
    card.classList.add('open');
    input.value = '';
    counter.textContent = '0/200';
    counter.classList.remove('warn');
    confirmBtn.disabled = true;
    input.focus();
  }
  function collapse() {
    fab.classList.remove('hide');
    card.classList.remove('open');
    input.blur();
  }

  fab.addEventListener('click', expand);
  cancelBtn.addEventListener('click', collapse);
  confirmBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) return;
    onAdd(val);
    collapse();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') collapse();
    else if (e.key === 'Enter' && !confirmBtn.disabled) confirmBtn.click();
  });
}

/* ══════ Trello Board ══════ */
function renderTasksTab(data) {
  const allItems = data.items || [];
  const carried = allItems.filter(i => i.is_carried);
  const items = allItems.filter(i => !i.is_carried);

  if (allItems.length === 0) {
    const el = document.createElement('div');
    el.className = 'oa-trello';
    const col = document.createElement('div');
    col.className = 'oa-trello-col';
    const header = document.createElement('div');
    header.className = 'oa-trello-header';
    header.innerHTML = '<span class="oa-trello-header-label">📋 未完成</span><span class="oa-trello-count">0</span>';
    col.appendChild(header);
    const list = document.createElement('div');
    list.className = 'oa-trello-list';
    createAddTaskUI(col, (label) => addCustomItem(label));
    const empty = document.createElement('div');
    empty.className = 'oa-trello-empty';
    empty.textContent = '该日期没有工作任务安排';
    list.appendChild(empty);
    col.appendChild(list);
    el.appendChild(col);
    return el;
  }

  const wrap = document.createElement('div');

  // Carried-over block (yesterday's unfinished tasks) — above the board
  const carryBlock = renderCarryBlock(carried);
  if (carryBlock) wrap.appendChild(carryBlock);

  // Normalize statuses
  for (const item of items) {
    if (!item.status) item.status = item.checked ? 'done' : 'todo';
  }

  const columns = [
    { key: 'todo', label: '📋 未完成' },
    { key: 'in_progress', label: '🔄 完成中' },
    { key: 'done', label: '✅ 已完成' },
  ];

  const board = document.createElement('div');
  board.className = 'oa-trello';

  for (const col of columns) {
    const colItems = items.filter(i => i.status === col.key);
    const section = document.createElement('div');
    section.className = 'oa-trello-col';

    const header = document.createElement('div');
    header.className = 'oa-trello-header';
    header.innerHTML = '<span class="oa-trello-header-label">' + col.label + '</span><span class="oa-trello-count">' + colItems.length + '</span>';
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'oa-trello-list';

    /* Add custom task button (only in todo column) */
    if (col.key === 'todo') {
      createAddTaskUI(section, (label) => addCustomItem(label));
    }

    for (const item of colItems) {
      list.appendChild(renderTaskCard(item));
    }

    if (colItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'oa-trello-empty';
      empty.textContent = '暂无';
      list.appendChild(empty);
    }

    section.appendChild(list);
    board.appendChild(section);
  }

  wrap.appendChild(board);

  // Summarize section
  const sumWrap = document.createElement('div');
  sumWrap.className = 'oa-summarize-wrap';
  const sumBtn = document.createElement('button');
  sumBtn.className = 'oa-btn';
  sumBtn.type = 'button';
  sumBtn.textContent = dashState.summarizing ? 'AI 正在总结…' : '总结今天任务完成';
  sumBtn.disabled = dashState.summarizing;
  sumBtn.addEventListener('click', onSummarize);
  sumWrap.appendChild(sumBtn);
  wrap.appendChild(sumWrap);

  if (data.summary) {
    const card = document.createElement('div');
    card.className = 'oa-summary';
    card.innerHTML = '<strong style="display:block;margin-bottom:6px">🤖 AI 工作总结</strong>' + formatSummary(data.summary);
    wrap.appendChild(card);
  }

  return wrap;
}

/* Render a single task card (shared by board columns and carry block). */
function renderTaskCard(item) {
  const card = document.createElement('div');
  card.className = 'oa-trello-card status-' + item.status;
  card.dataset.itemId = item.id;

  const labelEl = document.createElement('div');
  labelEl.className = 'oa-trello-label';
  labelEl.textContent = item.label;
  card.appendChild(labelEl);

  const actions = document.createElement('div');
  actions.className = 'oa-trello-actions';

  // Note button
  const noteBtn = document.createElement('button');
  noteBtn.className = 'oa-trello-note-btn';
  noteBtn.type = 'button';
  noteBtn.textContent = '📝';
  noteBtn.title = item.note ? '编辑备注' : '添加备注';
  actions.appendChild(noteBtn);

  // Advance status button
  const advBtn = document.createElement('button');
  advBtn.className = 'oa-trello-adv-btn';
  advBtn.type = 'button';
  if (item.status === 'todo') {
    advBtn.textContent = '→ 完成中';
    advBtn.title = '标记为完成中';
  } else if (item.status === 'in_progress') {
    advBtn.textContent = '→ 已完成';
    advBtn.title = '标记为已完成';
  } else {
    advBtn.textContent = '↩ 重开';
    advBtn.title = '重新打开';
  }
  advBtn.addEventListener('click', () => advanceStatus(item, card));
  actions.appendChild(advBtn);

  card.appendChild(actions);

  /* Delete button for custom & carried items */
  if (item.is_custom || item.is_carried) {
    const delBtn = document.createElement('button');
    delBtn.className = 'oa-trello-del-btn';
    delBtn.type = 'button';
    delBtn.textContent = '🗑';
    delBtn.title = '删除任务';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('删除「' + item.label + '」？')) {
        dashState.data.items = dashState.data.items.filter(i => i.id !== item.id);
        saveChecklist();
        renderActiveTabOnly();
      }
    });
    actions.appendChild(delBtn);
  }

  // Note editor
  const noteWrap = document.createElement('div');
  noteWrap.className = 'oa-trello-note-wrap';
  noteWrap.style.display = item.note ? 'block' : 'none';
  const noteInput = document.createElement('textarea');
  noteInput.className = 'oa-trello-note';
  noteInput.placeholder = '备注…';
  noteInput.value = item.note || '';
  noteInput.addEventListener('blur', () => {
    if (noteInput.value !== (item.note || '')) { item.note = noteInput.value; saveChecklist(); }
  });
  noteWrap.appendChild(noteInput);
  card.appendChild(noteWrap);

  noteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    noteWrap.style.display = noteWrap.style.display === 'none' ? 'block' : 'none';
    if (noteWrap.style.display === 'block') noteInput.focus();
  });

  return card;
}

/* Render the "carried over from previous day" block. Returns null if empty. */
function renderCarryBlock(carried) {
  if (!carried || carried.length === 0) return null;

  // Group by source date (carried_from), newest first
  const groups = {};
  for (const item of carried) {
    if (!item.status) item.status = item.checked ? 'done' : 'todo';
    const key = item.carried_from || '';
    (groups[key] = groups[key] || []).push(item);
  }

  const block = document.createElement('div');
  block.className = 'oa-carry-block';

  const header = document.createElement('div');
  header.className = 'oa-carry-header';
  header.innerHTML = '<span class="oa-carry-title">📌 昨日未完成</span>' +
    '<span class="oa-carry-count">' + carried.length + '</span>';
  block.appendChild(header);

  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  for (const d of dates) {
    const group = document.createElement('div');
    group.className = 'oa-carry-group';
    if (d) {
      const dLabel = document.createElement('div');
      dLabel.className = 'oa-carry-group-date';
      dLabel.textContent = '结转自 ' + carryDateLabel(d);
      group.appendChild(dLabel);
    }
    const list = document.createElement('div');
    list.className = 'oa-trello-list';
    for (const item of groups[d]) {
      list.appendChild(renderTaskCard(item));
    }
    group.appendChild(list);
    block.appendChild(group);
  }

  return block;
}

function carryDateLabel(dateStr) {
  const p = (dateStr || '').split('-');
  if (p.length !== 3) return dateStr;
  return (+p[1]) + '/' + (+p[2]);
}

function advanceStatus(item, cardEl) {
  if (item.status === 'todo') {
    item.status = 'in_progress';
    item.checked = false;
  } else if (item.status === 'in_progress') {
    item.status = 'done';
    item.checked = true;
  } else {
    item.status = 'todo';
    item.checked = false;
  }
  saveChecklist();
  renderActiveTabOnly();
}

function addCustomItem(label) {
  const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const newItem = {
    id, label, checked: false, status: 'todo', note: '',
  };
  dashState.data.items.push(newItem);
  saveChecklist();
  renderActiveTabOnly();
  showDashNotice('✅ 已添加：' + label, 'success');
}

/* ══════ Calendar ══════ */
function renderCalendarTab() {
  const d = new Date(dashState.viewDate);
  const cal = document.createElement('div');
  cal.className = 'oa-calendar';
  const nav = document.createElement('div');
  nav.className = 'oa-cal-month';
  const prev = document.createElement('button');
  prev.className = 'oa-cal-nav'; prev.textContent = '◀';
  prev.addEventListener('click', () => { dashState.viewDate.setMonth(dashState.viewDate.getMonth() - 1); renderActiveTabOnly(); });
  const month = document.createElement('h3');
  month.textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
  const next = document.createElement('button');
  next.className = 'oa-cal-nav'; next.textContent = '▶';
  next.addEventListener('click', () => { dashState.viewDate.setMonth(dashState.viewDate.getMonth() + 1); renderActiveTabOnly(); });
  nav.appendChild(prev); nav.appendChild(month); nav.appendChild(next);
  cal.appendChild(nav);
  const wk = document.createElement('div');
  wk.className = 'oa-cal-weekdays';
  for (const wd of WEEKDAY_LABELS) { const c = document.createElement('div'); c.className = 'oa-cal-weekday'; c.textContent = wd; wk.appendChild(c); }
  cal.appendChild(wk);
  const grid = document.createElement('div');
  grid.className = 'oa-cal-days';
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const today = dashDateStr(new Date());
  const selected = dashState.selectedDate;
  const historySet = new Set(dashState.historyDates);
  for (let i = 0; i < firstDay.getDay(); i++) { const e = document.createElement('div'); e.className = 'oa-cal-day other'; grid.appendChild(e); }
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const cell = document.createElement('div');
    cell.className = 'oa-cal-day';
    if (dateStr === today) cell.classList.add('today');
    if (dateStr === selected) cell.classList.add('selected');
    if (historySet.has(dateStr)) cell.classList.add('has-data');
    cell.innerHTML = '<span class="oa-cal-num">' + day + '</span>';
    cell.addEventListener('click', () => { dashState.selectedDate = dateStr; dashState.activeTab = 'tasks'; loadDashboard(); });
    grid.appendChild(cell);
  }
  cal.appendChild(grid);
  // Legend & usage guide
  const guide = document.createElement('div');
  guide.className = 'oa-cal-guide';
  guide.innerHTML =
    '<div class="oa-cal-legend">' +
      '<span class="oa-cal-legend-item"><span class="oa-cal-legend-dot today"></span> 今天</span>' +
      '<span class="oa-cal-legend-item"><span class="oa-cal-legend-dot selected"></span> 当前选择</span>' +
      '<span class="oa-cal-legend-item"><span class="oa-cal-legend-dot has-data"></span> 有任务/总结</span>' +
    '</div>' +
    '<div class="oa-cal-howto">' +
      '<strong>如何使用</strong>' +
      '<span>← → 切换月份 · 点击任意日期查看该日任务 · 带 <em>●</em> 标记的日期已有任务记录或每日总结</span>' +
    '</div>';
  cal.appendChild(guide);
  return cal;
}

/* ══════ History ══════ */
async function renderHistoryTabAsync(body) {
  const container = document.createElement('div');
  container.innerHTML = '<div class="dash-loading">加载中…</div>';
  body.appendChild(container);
  if (dashState.historyDates.length === 0) { container.innerHTML = '<div class="panel-empty" style="padding:60px 0;flex-direction:column;gap:12px">' + randomBearImg(48, 10) + '<span>暂无每日总结</span></div>'; return; }
  const summaries = [];
  for (const date of dashState.historyDates) {
    try {
      const resp = await fetch(dashUrl('/v1/checklist?date=' + date), { headers: dashHeaders() });
      if (resp.ok) { const d = await resp.json(); if (d.summary) summaries.push({ date, title: d.title, summary: d.summary }); }
    } catch (_) {}
  }
  if (summaries.length === 0) { container.innerHTML = '<div class="panel-empty" style="padding:60px 0">暂无每日总结</div>'; return; }
  summaries.sort((a, b) => b.date.localeCompare(a.date));
  const list = document.createElement('div');
  list.className = 'oa-history-list';
  for (const s of summaries) {
    const dt = s.date.split('-');
    const d = new Date(+dt[0], +dt[1] - 1, +dt[2]);
    const wd = WEEKDAY_LABELS[d.getDay()];
    const item = document.createElement('div');
    item.className = 'oa-history-item';
    item.innerHTML = '<div class="oa-history-date">📅 ' + s.date + ' · 星期' + wd + '</div>' + (s.title ? '<div style="font-weight:600;font-size:13px;margin-bottom:6px">' + escapeHtml(s.title) + '</div>' : '') + '<div class="oa-history-body">' + formatSummary(s.summary) + '</div>';
    item.addEventListener('click', () => { dashState.selectedDate = s.date; dashState.activeTab = 'tasks'; loadDashboard(); });
    list.appendChild(item);
  }
  container.innerHTML = '';
  container.appendChild(list);
}

/* ── Actions ── */
function onCheckChange(itemId, checked) {
  if (!dashState.data || !dashState.data.items) return;
  const item = dashState.data.items.find(i => i.id === itemId);
  if (!item) return;
  item.checked = checked;
  saveChecklist();
}
let _saveTimer = null;
function saveChecklist() {
  if (!dashState.data) return;
  cacheSave(dashState.selectedDate);
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(doSaveChecklist, 300);
}
async function doSaveChecklist() {
  if (!dashState.data || dashState.saving) return;
  dashState.saving = true;
  const items = dashState.data.items.map(i => ({ id: i.id, checked: i.checked, status: i.status || (i.checked ? 'done' : 'todo'), note: i.note || '', label: i.label || '', is_custom: i.is_custom || false, is_carried: i.is_carried || false, carried_from: i.carried_from || '' }));
  try {
    const resp = await fetch(dashUrl('/v1/checklist'), { method: 'POST', headers: { ...dashHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ date: dashState.selectedDate, items }) });
    if (resp.ok) {
      cacheClear(dashState.selectedDate);
      const chkResp = await fetch(dashUrl('/v1/checklist?date=' + dashState.selectedDate), { headers: dashHeaders() });
      if (chkResp.ok) {
        const fresh = await chkResp.json();
        dashState.data.progress = fresh.progress;
        if (fresh.items) {
          const serverMap = {};
          for (const si of fresh.items) serverMap[si.id] = si;
          for (const item of dashState.data.items) {
            const sv = serverMap[item.id];
            if (sv) {
              item.checked = sv.checked;
              item.is_custom = sv.is_custom || false;
              if (sv.label) item.label = sv.label;
              if (!item.note) item.note = sv.note || '';
            }
          }
        }
      }
      updateProgressRing();
    } else {
      const errData = await resp.json().catch(() => ({}));
      console.warn('Save rejected:', errData);
      showDashNotice('保存失败，已暂存本地', 'error');
    }
  } catch (e) {
    console.warn('Save network error:', e);
    showDashNotice('网络异常，数据已保存在本地', 'warn');
  } finally { dashState.saving = false; }
}
function updateProgressRing() {
  const prog = dashState.data?.progress || { checked: 0, total: 0 };
  const pct = prog.total > 0 ? Math.round(prog.checked / prog.total * 100) : 0;
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (pct / 100) * circumference;
  const ring = document.querySelector('.oa-greeting-ring');
  if (ring) {
    const circle = ring.querySelector('circle:last-of-type');
    const text = ring.querySelector('text');
    if (circle) circle.setAttribute('stroke-dashoffset', offset);
    if (text) text.textContent = pct + '%';
  }
  // Full re-render Trello board after save
  renderActiveTabOnly();
}
async function onSummarize() {
  if (dashState.summarizing) return;
  if (!dashState.selectedDate) return;
  dashState.summarizing = true;
  renderActiveTabOnly();
  try {
    const resp = await fetch(dashUrl('/v1/checklist/summarize'), { method: 'POST', headers: { ...dashHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ date: dashState.selectedDate }) });
    if (!resp.ok) return;
    const data = await resp.json();
    dashState.data.summary = data.summary;
    if (!dashState.historyDates.includes(dashState.selectedDate)) dashState.historyDates.push(dashState.selectedDate);
  } catch (e) { console.error('AI 总结出错：' + e.message);
  } finally { dashState.summarizing = false; renderActiveTabOnly(); }
}
/* ── Toast notice ── */
function showDashNotice(msg, type) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:6px;font-size:13px;z-index:999;animation:fadeSlide .25s ease;max-width:400px;text-align:center';
  el.style.background = type === 'error' ? '#fef2f2' : type === 'warn' ? '#fffbeb' : '#f0fdf4';
  el.style.border = '1px solid ' + (type === 'error' ? '#fca5a5' : type === 'warn' ? '#fcd34d' : '#86efac');
  el.style.color = type === 'error' ? '#991b1b' : type === 'warn' ? '#92400e' : '#166534';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

function formatSummary(text) {
  if (!text) return '';
  return escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
