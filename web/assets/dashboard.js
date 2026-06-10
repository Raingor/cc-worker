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
  "https://media.tenor.com/IIWFOaA_TfoAAAAj/joke-bear.gif",
  "https://media.tenor.com/5nzLdhWL7GoAAAAj/sad-bear-joke-bear-sad.gif",
  "https://media.tenor.com/N-rSTqzfCOEAAAAj/bear-so-cute-funny-point-flower-so-cute.gif",
  "https://media.tenor.com/pjH4YkUVZTcAAAAj/joke-bear.gif",
  "https://media.tenor.com/m33QT3rELicAAAAj/joke-bear.gif"
];

function renderGreeting(data) {
  const el = document.createElement('div');
  el.className = 'oa-greeting';
  const dt = dashState.selectedDate.split('-');
  const d = new Date(+dt[0], +dt[1] - 1, +dt[2]);
  const weekday = WEEKDAY_LABELS[d.getDay()];
  const prog = data.progress || { checked: 0, total: 0 };
  const pct = prog.total > 0 ? Math.round(prog.checked / prog.total * 100) : 0;
  el.innerHTML =
    '<div class="oa-greeting-text">' +
    '  <div class="oa-greeting-date">' + dt[0] + '年' + (+dt[1]) + '月' + (+dt[2]) + '日' + (data.is_today ? ' · 今天' : '') + '</div>' +
    '  <div class="oa-greeting-week"><span class="oa-weekday-badge">星期' + weekday + '</span><span class="oa-greeting-title">' + escapeHtml(data.title || '工作面板') + '</span></div>' +
    '</div>' +
    '<div class="oa-greeting-progress">' +
    '  <div class="oa-progress-track"><div class="oa-progress-fill" style="width:' + pct + '%"></div></div>' +
    '  <span class="oa-progress-label">' + pct + '%</span>' +
    '</div>' +
    '<div class="bear-wrap">' + randomBearImg(40, 10) + '</div>';
  return el;
}

/* ══════ Tasks Tab ══════ */
function renderTasksTab(data) {
  const el = document.createElement('div');
  if (!data.items || data.items.length === 0) {
    el.innerHTML = '<div class="panel-empty" style="padding:60px 0;flex-direction:column;gap:12px">' + randomBearImg(48, 10) + '<span>该日期没有工作任务安排</span></div>';
    return el;
  }
  const morning = data.items.filter(i => i.period === 'morning');
  if (morning.length > 0) el.appendChild(renderSection('上午 · 重点工作', morning, 'morning'));
  const afternoon = data.items.filter(i => i.period === 'afternoon');
  if (afternoon.length > 0) el.appendChild(renderSection('下午 · 核准事项', afternoon, 'afternoon'));

  const sumWrap = document.createElement('div');
  sumWrap.className = 'oa-summarize-wrap';
  const sumBtn = document.createElement('button');
  sumBtn.className = 'oa-btn';
  sumBtn.type = 'button';
  sumBtn.textContent = dashState.summarizing ? 'AI 正在总结…' : '总结今天任务完成';
  sumBtn.disabled = dashState.summarizing;
  sumBtn.addEventListener('click', onSummarize);
  sumWrap.appendChild(sumBtn);
  el.appendChild(sumWrap);

  if (data.summary) {
    const card = document.createElement('div');
    card.className = 'oa-summary';
    card.innerHTML = '<strong style="display:block;margin-bottom:6px">🤖 AI 工作总结</strong>' + formatSummary(data.summary);
    el.appendChild(card);
  }
  return el;
}

function renderSection(label, items, period) {
  const section = document.createElement('div');
  section.className = 'oa-dash-section';
  const header = document.createElement('div');
  header.className = 'oa-section-header';
  header.innerHTML = '  <span class="oa-section-dot ' + period + '"></span><span class="oa-section-label">' + label + '</span>' + (period === 'morning' ? '<span class="bear-dot" style="margin-left:auto">' + randomBearImg(18, 4) + '</span>' : '');
  section.appendChild(header);
  const list = document.createElement('div');
  list.className = 'oa-task-grid';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'oa-task' + (item.checked ? ' done' : '');
    row.dataset.itemId = item.id;
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
    body.appendChild(labelEl);
    const noteInput = document.createElement('textarea');
    noteInput.className = 'oa-task-note';
    noteInput.placeholder = '备注…';
    noteInput.value = item.note || '';
    noteInput.addEventListener('blur', () => {
      if (noteInput.value !== (item.note || '')) { item.note = noteInput.value; saveChecklist(); }
    });
    noteInput.style.display = item.note ? 'block' : 'none';
    body.appendChild(noteInput);
    row.appendChild(body);
    const noteBtn = document.createElement('button');
    noteBtn.className = 'oa-note-btn';
    noteBtn.type = 'button';
    noteBtn.textContent = '📝';
    noteBtn.title = item.note ? '编辑备注' : '添加备注';
    noteBtn.addEventListener('click', () => {
      const ni = row.querySelector('.oa-task-note');
      if (ni) { ni.style.display = ni.style.display === 'none' ? 'block' : 'none'; if (ni.style.display === 'block') ni.focus(); }
    });
    row.appendChild(noteBtn);
    list.appendChild(row);
  }
  section.appendChild(list);
  return section;
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
  const items = dashState.data.items.map(i => ({ id: i.id, checked: i.checked, note: i.note || '' }));
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
  const fill = document.querySelector('.oa-progress-fill');
  const label = document.querySelector('.oa-progress-label');
  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = pct + '%';
  // Update task visual state without full re-render
  const body = document.getElementById('dash-body');
  if (body) {
    for (const item of (dashState.data?.items || [])) {
      const row = body.querySelector('.oa-task[data-item-id="' + item.id + '"]');
      if (row) {
        row.classList.toggle('done', !!item.checked);
        const cb = row.querySelector('.oa-cb');
        if (cb) cb.checked = !!item.checked;
        const ni = row.querySelector('.oa-task-note');
        if (ni) {
          ni.value = item.note || '';
          ni.style.display = item.note ? 'block' : 'none';
        }
      }
    }
  }
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
