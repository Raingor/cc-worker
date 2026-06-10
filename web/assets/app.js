/* CC 工作台 */

const STORAGE_KEY = 'cc-web-settings';
const DEFAULT_API_BASE = (window.CC_CONFIG && window.CC_CONFIG.apiBase) || 'https://api.sz-hrhb.com';
const DEFAULT_APP_TOKEN = (window.CC_CONFIG && window.CC_CONFIG.appToken) || '';

let state = { settings: null };
let meta = { day_reminders: {} };

function loadMeta() {
  return fetch('assets/cc-meta.json').then(r => r.ok ? r.json() : {}).then(d => { meta = d; }).catch(() => {});
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.settings = saved.settings || null;
    state.lastReminded = saved.lastReminded || null;
  } catch (e) {}
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: state.settings, lastReminded: state.lastReminded }));
}
function apiUrl(path) {
  if (!state.settings) return '';
  return state.settings.apiBase.replace(/\/+$/, '') + path;
}
function apiHeaders() {
  return { Authorization: 'Bearer ' + (state.settings?.appToken || '') };
}
function getDefaultSettings() {
  return { apiBase: DEFAULT_API_BASE, appToken: DEFAULT_APP_TOKEN, reminderEnabled: true, reminderTime: '09:00', notifEnabled: true };
}

/* ── Nav / Panel ── */
function switchPanel(name, tab) {
  document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('open'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.panel === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
  document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('active'));
  if (name === 'dashboard') {
    if (tab) setDashTab(tab); else setDashTab('tasks');
  }
  if (name === 'toolbox') {
    if (tab) setToolboxTab(tab); else setToolboxTab('pdf-to-excel');
  }
  if (name === 'board') {
    if (tab) setBoardTab(tab); else setBoardTab('board-list');
  }
  if (name === 'memo') {
    if (tab) setMemoTab(tab); else setMemoTab('memo-list');
  }
  const group = document.querySelector(`.nav-item[data-panel="${name}"]`)?.closest('.nav-group');
  if (group) group.classList.add('open');
}

function setDashTab(tab) {
  document.querySelectorAll('.nav-sub[data-tab]').forEach(s => s.classList.toggle('active', s.dataset.tab === tab));
  initDashboard(tab);
}

function setToolboxTab(tab) {
  document.querySelectorAll('.nav-sub[data-tool]').forEach(s => s.classList.toggle('active', s.dataset.tool === tab));
  initToolbox(tab);
}

/* ── Reminder ── */
function checkReminder() {
  if (!state.settings?.reminderEnabled || !state.settings?.notifEnabled) return;
  if (Notification.permission !== 'granted') return;
  const now = new Date();
  if (state.lastReminded === now.toDateString()) return;
  const [h, m] = (state.settings.reminderTime || '09:00').split(':').map(Number);
  if (now.getHours() < h || (now.getHours() === h && now.getMinutes() < m)) return;
  state.lastReminded = now.toDateString();
  saveState();
  try { new Notification('CC 工作助手', { body: '查看今天的工作安排' }); } catch (e) {}
}
function startReminderTimer() {
  if (!state.settings?.reminderEnabled) return;
  if (state.settings.notifEnabled && Notification.permission === 'default') Notification.requestPermission();
  setInterval(checkReminder, 60000);
  setTimeout(checkReminder, 5000);
}

/* ── Init ── */
function initDashboard(tab) {
  if (typeof dashState === 'undefined' || typeof loadDashboard !== 'function') { console.warn('dash-init: dashboard.js not loaded'); return; }
  if (!state || !state.settings) { console.warn('dash-init: settings missing'); return; }
  dashState.viewDate = new Date();
  dashState.selectedDate = dashDateStr(new Date());
  dashState.activeTab = tab || 'tasks';
  loadDashboard();
}
function initToolbox(tab) {
  if (typeof switchToolboxTab === 'function') switchToolboxTab(tab || 'pdf-to-excel');
}
function setBoardTab(tab) {
  document.querySelectorAll('.nav-sub[data-tab="board-list"]').forEach(s => s.classList.toggle('active', s.dataset.tab === tab));
  initBoard();
}
function initBoard() {
  if (typeof renderBoard !== 'function') { console.warn('board-init: board.js not loaded'); return; }
  if (!state || !state.settings) { console.warn('board-init: settings missing'); return; }
  renderBoard();
}
function setMemoTab(tab) {
  document.querySelectorAll('.nav-sub[data-tab="memo-list"]').forEach(s => s.classList.toggle('active', s.dataset.tab === tab));
  initMemo();
}
function initMemo() {
  if (typeof renderMemo !== 'function') { console.warn('memo-init: memo.js not loaded'); return; }
  if (!state || !state.settings) { console.warn('memo-init: settings missing'); return; }
  renderMemo();
}

function bindUi() {
  document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => {
    const group = n.closest('.nav-group');
    const isOpen = group?.classList.contains('open');
    document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('open'));
    if (!isOpen) {
      switchPanel(n.dataset.panel);
    } else {
      // clicking same already-open item — just switch panel
      switchPanel(n.dataset.panel);
    }
  }));
  document.querySelectorAll('.nav-sub').forEach(s => {
    s.addEventListener('click', () => {
      const panel = s.closest('.nav-group').querySelector('.nav-item').dataset.panel;
      const tab = s.dataset.tab || s.dataset.tool;
      switchPanel(panel, tab);
    });
  });
}

/* ── Clock ── */
const WEEKDAY_CN = ['日','一','二','三','四','五','六'];
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  document.getElementById('header-time').textContent = h + ':' + m + ':' + s;
  document.getElementById('header-date').textContent =
    now.getFullYear() + '年' + (now.getMonth()+1) + '月' + now.getDate() + '日 星期' + WEEKDAY_CN[now.getDay()];
}

async function init() {
  updateClock();
  setInterval(updateClock, 1000);
  bindUi();
  await loadMeta();
  loadState();
  if (!state.settings) { state.settings = getDefaultSettings(); saveState(); }
  startReminderTimer();
  switchPanel('dashboard', 'tasks');
}

document.addEventListener('DOMContentLoaded', init);
