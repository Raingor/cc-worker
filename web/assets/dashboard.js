/* CC 工作助手 — OA Work Panel */

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

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

function showDashboard() {
  document.getElementById('chat-screen').classList.remove('active');
  document.getElementById('dashboard-screen').classList.add('active');
  dashState.viewDate = new Date();
  dashState.selectedDate = dashDateStr(new Date());
  dashState.activeTab = 'tasks';
  loadDashboard();
}

function hideDashboard() {
  document.getElementById('dashboard-screen').classList.remove('active');
  document.getElementById('chat-screen').classList.add('active');
}

async function loadDashboard() {
  const body = document.getElementById('dash-body');
  body.innerHTML = '<div class="dash-loading">加载中…</div>';
  dashState.loading = true;
  try {
    const [checklistResp, historyResp] = await Promise.all([
      fetch(dashUrl('/v1/checklist?date=' + dashState.selectedDate), { headers: dashHeaders() }),
      fetch(dashUrl('/v1/checklist/history?year=' + dashState.viewDate.getFullYear() + '&month=' + (dashState.viewDate.getMonth() + 1)), { headers: dashHeaders() }),
    ]);
    if (!checklistResp.ok) {
      const errData = await checklistResp.json().catch(() => ({}));
      body.innerHTML = '<div class="dash-error">加载失败：' + (errData.error?.message || checklistResp.statusText) + '</div>';
      return;
    }
    dashState.data = await checklistResp.json();
    if (historyResp.ok) {
      const h = await historyResp.json();
      dashState.historyDates = h.dates || [];
    }
    renderDashboard();
  } catch (e) {
    body.innerHTML = '<div class="dash-error">网络错误：' + e.message + '</div>';
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
  body.appendChild(renderTabs());
  body.appendChild(renderTabContent(data));
}

/* ── Greeting Card ── */
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
    '<div class="oa-greeting-row">' +
    '  <div class="oa-greeting-icon">📋</div>' +
    '  <div class="oa-greeting-text">' +
    '    <div class="oa-greeting-date">' + dt[0] + '年' + (+dt[1]) + '月' + (+dt[2]) + '日 · 星期' + weekday + (data.is_today ? ' · 今天' : '') + '</div>' +
    '    <div class="oa-greeting-title">' + escapeHtml(data.title || '工作面板') + '</div>' +
    '  </div>' +
    '  <div class="oa-greeting-progress">' +
    '    <svg width="52" height="52" viewBox="0 0 52 52">' +
    '      <circle class="oa-greeting-progress-bg" cx="26" cy="26" r="22"/>' +
    '      <circle class="oa-greeting-progress-fill" cx="26" cy="26" r="22" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/>' +
    '    </svg>' +
    '    <span class="oa-greeting-progress-text">' + pct + '%</span>' +
    '  </div>' +
    '</div>';
  return el;
}

/* ── Tabs ── */
function renderTabs() {
  const tabs = [
    { id: 'tasks', label: '今日任务' },
    { id: 'calendar', label: '工作日历' },
    { id: 'history', label: '每日总结' },
  ];
  const el = document.createElement('div');
  el.className = 'oa-tabs';
  for (const t of tabs) {
    const btn = document.createElement('button');
    btn.className = 'oa-tab' + (dashState.activeTab === t.id ? ' active' : '');
    btn.textContent = t.label;
    btn.addEventListener('click', () => switchTab(t.id));
    el.appendChild(btn);
  }
  return el;
}

function switchTab(id) {
  if (dashState.activeTab === id) return;
  dashState.activeTab = id;
  renderDashboard();
}

/* ── Tab Content Router ── */
function renderTabContent(data) {
  const wrap = document.createElement('div');
  if (dashState.activeTab === 'tasks') {
    wrap.appendChild(renderTasksTab(data));
  } else if (dashState.activeTab === 'calendar') {
    wrap.appendChild(renderCalendarTab());
  } else if (dashState.activeTab === 'history') {
    wrap.appendChild(renderHistoryTab());
  }
  return wrap;
}

/* ══════ Tasks Tab ══════ */
function renderTasksTab(data) {
  const el = document.createElement('div');

  if (!data.items || data.items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'oa-empty-message';
    empty.textContent = '该日期没有工作任务安排。';
    el.appendChild(empty);
    return el;
  }

  // Compact progress bar
  const prog = data.progress || { checked: 0, total: 0 };
  const pct = prog.total > 0 ? Math.round(prog.checked / prog.total * 100) : 0;
  const pbar = document.createElement('div');
  pbar.className = 'oa-progress-compact';
  pbar.innerHTML =
    '<div class="oa-progress-compact-bar"><div class="oa-progress-compact-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="oa-progress-compact-text">' + prog.checked + '/' + prog.total + '</div>';
  el.appendChild(pbar);

  // Morning
  const morning = data.items.filter(i => i.period === 'morning');
  if (morning.length > 0) {
    el.appendChild(renderSection('上午 · 重点工作', morning, 'morning'));
  }

  // Afternoon
  const afternoon = data.items.filter(i => i.period === 'afternoon');
  if (afternoon.length > 0) {
    el.appendChild(renderSection('下午 · 核准事项', afternoon, 'afternoon'));
  }

  // Summarize
  const sumWrap = document.createElement('div');
  sumWrap.className = 'oa-summarize';
  const sumBtn = document.createElement('button');
  sumBtn.className = 'oa-summarize-btn' + (dashState.summarizing ? ' loading' : '');
  sumBtn.type = 'button';
  sumBtn.textContent = dashState.summarizing ? '⏳ AI 正在总结…' : '🤖 总结今天任务完成';
  sumBtn.disabled = dashState.summarizing;
  sumBtn.addEventListener('click', onSummarize);
  sumWrap.appendChild(sumBtn);
  el.appendChild(sumWrap);

  // Summary
  if (data.summary) {
    const card = document.createElement('div');
    card.className = 'oa-summary-card';
    card.innerHTML =
      '<div class="oa-summary-card-header"><span class="oa-summary-card-icon">🤖</span><span class="oa-summary-card-title">AI 工作总结</span></div>' +
      '<div class="oa-summary-card-body">' + formatSummary(data.summary) + '</div>';
    el.appendChild(card);
  }

  return el;
}

function renderSection(label, items, period) {
  const section = document.createElement('div');
  section.className = 'oa-section';
  const header = document.createElement('div');
  header.className = 'oa-section-header';
  header.innerHTML = '<span class="oa-section-dot ' + period + '"></span><span class="oa-section-label">' + label + '</span>';
  section.appendChild(header);

  const list = document.createElement('div');
  list.className = 'oa-task-grid';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'oa-task' + (item.checked ? ' done' : '');

    const cbWrap = document.createElement('div');
    cbWrap.className = 'oa-cb-wrap';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'oa-cb';
    cb.checked = item.checked;
    cb.addEventListener('change', () => onCheckChange(item.id, cb.checked));
    cbWrap.appendChild(cb);
    row.appendChild(cbWrap);

    const body = document.createElement('div');
    body.className = 'oa-task-body';
    const labelEl = document.createElement('div');
    labelEl.className = 'oa-task-label';
    labelEl.textContent = item.label;
    if (item.checked) labelEl.style.textDecoration = 'line-through';
    body.appendChild(labelEl);

    const noteInput = document.createElement('textarea');
    noteInput.className = 'oa-task-note';
    noteInput.placeholder = '备注（选填）…';
    noteInput.value = item.note || '';
    noteInput.addEventListener('blur', () => {
      if (noteInput.value !== (item.note || '')) {
        item.note = noteInput.value;
        saveChecklist();
      }
    });
    noteInput.style.display = item.note ? 'block' : 'none';
    body.appendChild(noteInput);
    row.appendChild(body);

    const noteBtn = document.createElement('button');
    noteBtn.className = 'oa-note-btn' + (item.note ? ' active' : '');
    noteBtn.type = 'button';
    noteBtn.textContent = '📝';
    noteBtn.title = item.note ? '编辑备注' : '添加备注';
    noteBtn.addEventListener('click', () => {
      const ni = row.querySelector('.oa-task-note');
      if (ni) {
        ni.style.display = ni.style.display === 'none' ? 'block' : 'none';
        if (ni.style.display === 'block') ni.focus();
      }
    });
    row.appendChild(noteBtn);

    list.appendChild(row);
  }
  section.appendChild(list);
  return section;
}

/* ══════ Calendar Tab ══════ */
function renderCalendarTab() {
  const d = new Date(dashState.viewDate);
  const cal = document.createElement('div');
  cal.className = 'oa-cal';

  const nav = document.createElement('div');
  nav.className = 'oa-cal-nav';
  const prev = document.createElement('button');
  prev.className = 'oa-cal-nav-btn'; prev.textContent = '◀';
  prev.addEventListener('click', () => { dashState.viewDate.setMonth(dashState.viewDate.getMonth() - 1); renderDashboard(); });
  const month = document.createElement('span');
  month.className = 'oa-cal-month';
  month.textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
  const next = document.createElement('button');
  next.className = 'oa-cal-nav-btn'; next.textContent = '▶';
  next.addEventListener('click', () => { dashState.viewDate.setMonth(dashState.viewDate.getMonth() + 1); renderDashboard(); });
  nav.appendChild(prev); nav.appendChild(month); nav.appendChild(next);
  cal.appendChild(nav);

  const grid = document.createElement('div');
  grid.className = 'oa-cal-grid';

  // Weekday headers
  for (const wd of WEEKDAY_LABELS) {
    const cell = document.createElement('div');
    cell.className = 'oa-cal-cell oa-cal-wd';
    cell.textContent = wd;
    grid.appendChild(cell);
  }

  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const today = dashDateStr(new Date());
  const selected = dashState.selectedDate;
  const historySet = new Set(dashState.historyDates);

  for (let i = 0; i < firstDay.getDay(); i++) {
    const empty = document.createElement('div');
    empty.className = 'oa-cal-cell oa-cal-empty';
    grid.appendChild(empty);
  }
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const cell = document.createElement('div');
    cell.className = 'oa-cal-cell oa-cal-day';
    if (dateStr === today) cell.classList.add('oa-cal-today');
    if (dateStr === selected) cell.classList.add('oa-cal-selected');
    if (historySet.has(dateStr)) cell.classList.add('oa-cal-has-data');
    cell.textContent = String(day);
    cell.addEventListener('click', () => {
      dashState.selectedDate = dateStr;
      dashState.activeTab = 'tasks';
      loadDashboard();
    });
    grid.appendChild(cell);
  }
  cal.appendChild(grid);
  return cal;
}

/* ══════ History Tab ══════ */
async function renderHistoryTab() {
  const el = document.createElement('div');
  el.className = 'oa-history';

  if (dashState.historyDates.length === 0) {
    el.innerHTML = '<div class="oa-history-empty">暂无每日总结记录<br>完成今日任务后，点击"总结今天任务完成"生成</div>';
    return el;
  }

  // Load summaries for all dates with data
  const summaries = [];
  for (const date of dashState.historyDates) {
    try {
      const resp = await fetch(dashUrl('/v1/checklist?date=' + date), { headers: dashHeaders() });
      if (resp.ok) {
        const d = await resp.json();
        if (d.summary) {
          summaries.push({ date, title: d.title, summary: d.summary });
        }
      }
    } catch (_) {}
  }

  if (summaries.length === 0) {
    el.innerHTML = '<div class="oa-history-empty">暂无每日总结</div>';
    return el;
  }

  const grid = document.createElement('div');
  grid.className = 'oa-history-grid';
  el.appendChild(grid);

  summaries.sort((a, b) => b.date.localeCompare(a.date));
  for (const s of summaries) {
    const dt = s.date.split('-');
    const d = new Date(+dt[0], +dt[1] - 1, +dt[2]);
    const wd = WEEKDAY_LABELS[d.getDay()];
    const item = document.createElement('div');
    item.className = 'oa-history-item';
    item.innerHTML =
      '<div class="oa-history-date">📅 ' + s.date + ' · 星期' + wd + '</div>' +
      '<div class="oa-history-title">' + escapeHtml(s.title || '') + '</div>' +
      '<div class="oa-history-preview">' + escapeHtml(s.summary).slice(0, 200) + '…</div>';
    item.addEventListener('click', () => {
      dashState.selectedDate = s.date;
      dashState.activeTab = 'tasks';
      loadDashboard();
    });
    grid.appendChild(item);
  }
  return el;
}

/* ── Actions ── */
function onCheckChange(itemId, checked) {
  if (!dashState.data || !dashState.data.items) return;
  const item = dashState.data.items.find(i => i.id === itemId);
  if (!item) return;
  item.checked = checked;
  saveChecklist();
}

async function saveChecklist() {
  if (!dashState.data || dashState.saving) return;
  dashState.saving = true;
  const items = dashState.data.items.map(i => ({ id: i.id, checked: i.checked, note: i.note || '' }));
  try {
    const resp = await fetch(dashUrl('/v1/checklist'), {
      method: 'POST',
      headers: { ...dashHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dashState.selectedDate, items }),
    });
    if (resp.ok) {
      const chkResp = await fetch(dashUrl('/v1/checklist?date=' + dashState.selectedDate), { headers: dashHeaders() });
      if (chkResp.ok) {
        const fresh = await chkResp.json();
        dashState.data.progress = fresh.progress;
      }
      renderDashboard();
    }
  } catch (e) {
    showToast('保存失败', 'error');
  } finally {
    dashState.saving = false;
  }
}

async function onSummarize() {
  if (dashState.summarizing) return;
  if (!dashState.selectedDate) return;
  dashState.summarizing = true;
  renderDashboard();
  try {
    const resp = await fetch(dashUrl('/v1/checklist/summarize'), {
      method: 'POST',
      headers: { ...dashHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dashState.selectedDate }),
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      showToast(errData.error?.message || 'AI 总结失败', 'error');
      return;
    }
    const data = await resp.json();
    dashState.data.summary = data.summary;
    if (!dashState.historyDates.includes(dashState.selectedDate)) {
      dashState.historyDates.push(dashState.selectedDate);
    }
    showToast('总结完成 ✓', 'success');
  } catch (e) {
    showToast('AI 总结出错：' + e.message, 'error');
  } finally {
    dashState.summarizing = false;
    renderDashboard();
  }
}

function formatSummary(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* ── Bind ── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dash-btn')?.addEventListener('click', showDashboard);
  document.getElementById('dash-back-btn')?.addEventListener('click', hideDashboard);
  document.getElementById('stats-btn2')?.addEventListener('click', () => { hideDashboard(); setTimeout(toggleStats, 100); });
  document.getElementById('settings-btn2')?.addEventListener('click', () => { hideDashboard(); setTimeout(showSettings, 100); });
});
