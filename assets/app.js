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
  if (name === 'analysis') {
    if (tab) setAnalysisTab(tab); else setAnalysisTab('analyze');
    initAnalysis();
  }
  const group = document.querySelector(`.nav-item[data-panel="${name}"]`)?.closest('.nav-group');
  if (group && document.documentElement.getAttribute('data-layout') !== 'mac') group.classList.add('open');
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
function setAnalysisTab(tab) {
  document.querySelectorAll('.nav-sub[data-tab="analyze"]').forEach(s => s.classList.toggle('active', s.dataset.tab === tab));
}
function initAnalysis() {
  if (typeof initAnalysisPanel === 'function') {
    initAnalysisPanel();
  } else {
    console.warn('analysis-init: analysis.js not loaded');
  }
}

function bindUi() {
  document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', e => {
    // Desktop mode separates the two intentions:
    // label/icon switches workspace; the small chevron only opens its submenu.
    if (document.documentElement.getAttribute('data-layout') === 'mac' && e.target.closest('.nav-chevron')) return;
    document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('open'));
    switchPanel(n.dataset.panel);
  }));
  document.querySelectorAll('.nav-sub').forEach(s => {
    s.addEventListener('click', () => {
      const panel = s.closest('.nav-group').querySelector('.nav-item').dataset.panel;
      const tab = s.dataset.tab || s.dataset.tool;
      switchPanel(panel, tab);
    });
  });
}

/* ── Lock Screen ── */
let locked = false;
function toggleLock() {
  const screen = document.getElementById('lock-screen');
  locked = !locked;
  screen.classList.toggle('active', locked);
  document.getElementById('lock-btn').textContent = locked ? '🔓' : '🔒';
}
async function init() {
  bindUi();
  document.getElementById('lock-btn').addEventListener('click', toggleLock);
  document.getElementById('lock-screen').querySelector('.lock-bear').addEventListener('click', toggleLock);
  await loadMeta();
  loadState();
  if (!state.settings) { state.settings = getDefaultSettings(); saveState(); }
  startReminderTimer();
  switchPanel('dashboard', 'tasks');
}

/* ── Mobile Sidebar Toggle ── */
function toggleMobileMenu(force) {
  var body = document.body;
  var overlay = document.getElementById('nav-overlay');
  var btn = document.getElementById('mobile-menu-btn');
  if (!overlay || !btn) return;
  var isOpen = typeof force === 'boolean' ? force : body.classList.contains('sidebar-open');
  if (isOpen) {
    body.classList.remove('sidebar-open');
    btn.textContent = '☰';
    overlay.classList.remove('open');
  } else {
    body.classList.add('sidebar-open');
    btn.textContent = '✕';
    overlay.classList.add('open');
  }
}

/* Close mobile sidebar when a nav link is clicked */
document.addEventListener('click', function (e) {
  if (e.target.closest('.nav-item') || e.target.closest('.nav-sub')) {
    if (window.innerWidth < 768) {
      setTimeout(function () { toggleMobileMenu(false); }, 200);
    }
  }
});

/* Close sidebar on overlay click */
document.getElementById('nav-overlay')?.addEventListener('click', function () {
  toggleMobileMenu(false);
});

/* Hamburger button toggle */
document.getElementById('mobile-menu-btn')?.addEventListener('click', function () {
  toggleMobileMenu();
});

/* Close sidebar on Escape */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
    toggleMobileMenu(false);
  }
});

document.addEventListener('DOMContentLoaded', init);
