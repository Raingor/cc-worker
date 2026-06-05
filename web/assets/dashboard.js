/* CC 工作助手 — Dashboard (Calendar + Checklist + AI Summary) */

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

let dashState = {
  viewDate: new Date(),       // current month being viewed
  selectedDate: null,         // "2026-06-05" highlighted
  data: null,                 // loaded checklist data
  loading: false,
  saving: false,
  summarizing: false,
  historyDates: [],           // dates with data this month
};

function dashUrl(path) {
  if (!state.settings) return '';
  return state.settings.apiBase.replace(/\/+$/, '') + path;
}

function dashHeaders() {
  return { Authorization: 'Bearer ' + (state.settings?.appToken || '') };
}

function dashDateStr(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function toggleDashboard() {
  const panel = document.getElementById('dash-panel');
  const overlay = document.getElementById('dash-overlay');
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  overlay.style.display = visible ? 'none' : 'block';
  if (!visible) {
    dashState.viewDate = new Date();
    dashState.selectedDate = dashDateStr(new Date());
    loadDashboard();
  }
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

  const dt = dashState.selectedDate.split('-');
  const d = new Date(+dt[0], +dt[1] - 1, +dt[2]);

  body.innerHTML = '';

  // === Calendar ===
  body.appendChild(renderCalendar(d));

  // === Checklist ===
  const checklistEl = document.createElement('div');
  checklistEl.className = 'dash-checklist';

  // Title
  const titleEl = document.createElement('div');
  titleEl.className = 'dash-date-title';
  const weekday = WEEKDAY_LABELS[d.getDay()];
  titleEl.innerHTML = '<span class="dash-date-num">' + dt[1] + '/' + dt[2] + '</span> <span class="dash-date-weekday">星期' + weekday + '</span>' +
    (data.is_today ? ' <span class="dash-today-badge">今天</span>' : '');
  checklistEl.appendChild(titleEl);

  if (data.title) {
    const subt = document.createElement('div');
    subt.className = 'dash-subtitle';
    subt.textContent = data.title;
    checklistEl.appendChild(subt);
  }

  if (!data.items || data.items.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'dash-empty-msg';
    emptyMsg.textContent = '该日期没有工作任务安排。';
    checklistEl.appendChild(emptyMsg);
    body.appendChild(checklistEl);
    return;
  }

  // Progress bar
  const prog = data.progress || { checked: 0, total: 0 };
  const pct = prog.total > 0 ? Math.round(prog.checked / prog.total * 100) : 0;
  const progressEl = document.createElement('div');
  progressEl.className = 'dash-progress';
  progressEl.innerHTML =
    '<div class="dash-progress-bar"><div class="dash-progress-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="dash-progress-text">' + prog.checked + '/' + prog.total + ' (' + pct + '%)</div>';
  checklistEl.appendChild(progressEl);

  // Morning section
  const morningItems = data.items.filter(i => i.period === 'morning');
  if (morningItems.length > 0) {
    checklistEl.appendChild(renderSection('上午', morningItems));
  }

  // Afternoon section
  const afternoonItems = data.items.filter(i => i.period === 'afternoon');
  if (afternoonItems.length > 0) {
    checklistEl.appendChild(renderSection('下午（核准）', afternoonItems));
  }

  // Summarize button
  const summaryBtn = document.createElement('button');
  summaryBtn.className = 'dash-summarize-btn';
  summaryBtn.type = 'button';
  summaryBtn.textContent = '🤖 总结今天任务完成';
  summaryBtn.addEventListener('click', onSummarize);
  if (dashState.summarizing) {
    summaryBtn.disabled = true;
    summaryBtn.textContent = '⏳ AI 正在总结…';
  }
  checklistEl.appendChild(summaryBtn);

  // Summary display
  if (data.summary) {
    const summaryEl = document.createElement('div');
    summaryEl.className = 'dash-summary';
    summaryEl.innerHTML = '<div class="dash-summary-title">📋 AI 工作总结</div><div class="dash-summary-body">' + escapeHtml(data.summary).replace(/\n/g, '<br>') + '</div>';
    checklistEl.appendChild(summaryEl);
  }

  body.appendChild(checklistEl);
}

function renderSection(label, items) {
  const section = document.createElement('div');
  section.className = 'dash-section';

  const header = document.createElement('div');
  header.className = 'dash-section-header';
  header.textContent = '☐ ' + label;
  section.appendChild(header);

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'dash-item' + (item.checked ? ' done' : '');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'dash-cb';
    cb.checked = item.checked;
    cb.addEventListener('change', () => onCheckChange(item.id, cb.checked));

    const labelEl = document.createElement('span');
    labelEl.className = 'dash-item-label';
    labelEl.textContent = item.label;
    if (item.checked) labelEl.style.textDecoration = 'line-through';

    row.appendChild(cb);
    row.appendChild(labelEl);

    // Note toggle
    const noteToggle = document.createElement('button');
    noteToggle.className = 'dash-note-toggle';
    noteToggle.type = 'button';
    noteToggle.textContent = '📝';
    noteToggle.title = '添加备注';
    noteToggle.addEventListener('click', () => toggleNote(row, item.id));
    row.appendChild(noteToggle);

    // Note input (hidden)
    const noteInput = document.createElement('textarea');
    noteInput.className = 'dash-note-input';
    noteInput.placeholder = '备注（选填）…';
    noteInput.value = item.note || '';
    noteInput.addEventListener('blur', () => {
      if (noteInput.value !== (item.note || '')) {
        item.note = noteInput.value;
        saveChecklist();
      }
    });
    noteInput.style.display = 'none';
    noteInput.dataset.itemId = item.id;
    if (item.note) {
      noteInput.style.display = 'block';
    }
    row.appendChild(noteInput);

    section.appendChild(row);
  }

  return section;
}

function toggleNote(row, itemId) {
  const noteInput = row.querySelector('.dash-note-input');
  if (noteInput) {
    noteInput.style.display = noteInput.style.display === 'none' ? 'block' : 'none';
    if (noteInput.style.display === 'block') noteInput.focus();
  }
}

function renderCalendar(d) {
  const cal = document.createElement('div');
  cal.className = 'dash-calendar';

  // Month navigation
  const nav = document.createElement('div');
  nav.className = 'dash-cal-nav';
  const prevBtn = document.createElement('button');
  prevBtn.className = 'dash-cal-nav-btn';
  prevBtn.textContent = '◀';
  prevBtn.addEventListener('click', () => changeMonth(-1));

  const monthLabel = document.createElement('span');
  monthLabel.className = 'dash-cal-month';
  monthLabel.textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'dash-cal-nav-btn';
  nextBtn.textContent = '▶';
  nextBtn.addEventListener('click', () => changeMonth(1));

  nav.appendChild(prevBtn);
  nav.appendChild(monthLabel);
  nav.appendChild(nextBtn);
  cal.appendChild(nav);

  // Weekday headers
  const headerRow = document.createElement('div');
  headerRow.className = 'dash-cal-row dash-cal-header';
  for (const wd of WEEKDAY_LABELS) {
    const cell = document.createElement('span');
    cell.className = 'dash-cal-cell dash-cal-wd';
    cell.textContent = wd;
    headerRow.appendChild(cell);
  }
  cal.appendChild(headerRow);

  // Day cells
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sun

  let dayCells = [];
  for (let i = 0; i < startOffset; i++) {
    dayCells.push(null); // empty cells
  }
  for (let day = 1; day <= lastDay.getDate(); day++) {
    dayCells.push(day);
  }

  const today = dashDateStr(new Date());
  const selected = dashState.selectedDate;
  const historySet = new Set(dashState.historyDates);

  let week = document.createElement('div');
  week.className = 'dash-cal-row';

  for (let i = 0; i < dayCells.length; i++) {
    if (i > 0 && i % 7 === 0) {
      cal.appendChild(week);
      week = document.createElement('div');
      week.className = 'dash-cal-row';
    }

    const cell = document.createElement('span');
    cell.className = 'dash-cal-cell';

    if (dayCells[i] === null) {
      cell.classList.add('dash-cal-empty');
    } else {
      const day = dayCells[i];
      const dateStr = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(day).padStart(2, '0');

      cell.textContent = String(day);
      cell.dataset.date = dateStr;
      cell.classList.add('dash-cal-day');
      cell.addEventListener('click', () => onDateSelect(dateStr));

      if (dateStr === today) cell.classList.add('dash-cal-today');
      if (dateStr === selected) cell.classList.add('dash-cal-selected');
      if (historySet.has(dateStr)) cell.classList.add('dash-cal-has-data');
    }

    week.appendChild(cell);
  }
  // Fill remaining cells
  const remaining = 7 - (dayCells.length % 7);
  if (remaining < 7) {
    for (let i = 0; i < remaining; i++) {
      const cell = document.createElement('span');
      cell.className = 'dash-cal-cell dash-cal-empty';
      week.appendChild(cell);
    }
  }
  cal.appendChild(week);

  return cal;
}

function changeMonth(delta) {
  dashState.viewDate = new Date(dashState.viewDate.getFullYear(), dashState.viewDate.getMonth() + delta, 1);
  loadDashboard();
}

function onDateSelect(dateStr) {
  if (dashState.selectedDate === dateStr) return;
  dashState.selectedDate = dateStr;
  loadDashboard();
}

async function onCheckChange(itemId, checked) {
  if (!dashState.data || !dashState.data.items) return;
  const item = dashState.data.items.find(i => i.id === itemId);
  if (!item) return;
  item.checked = checked;
  await saveChecklist();
}

async function saveChecklist() {
  if (!dashState.data || dashState.saving) return;
  dashState.saving = true;

  const items = dashState.data.items.map(i => ({
    id: i.id,
    checked: i.checked,
    note: i.note || '',
  }));

  try {
    const resp = await fetch(dashUrl('/v1/checklist'), {
      method: 'POST',
      headers: { ...dashHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dashState.selectedDate, items }),
    });
    if (resp.ok) {
      // Refresh to update progress bar
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

    // Also add to history set
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

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* ===== Bind dashboard UI ===== */
document.addEventListener('DOMContentLoaded', () => {
  const dashBtn = document.getElementById('dash-btn');
  const dashClose = document.getElementById('dash-close');
  const dashOverlay = document.getElementById('dash-overlay');

  if (dashBtn) dashBtn.addEventListener('click', toggleDashboard);
  if (dashClose) dashClose.addEventListener('click', toggleDashboard);
  if (dashOverlay) dashOverlay.addEventListener('click', toggleDashboard);
});
