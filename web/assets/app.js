/* CC 工作台 — 后端工作面板 */

const STORAGE_KEY = 'cc-web-settings';
const DEFAULT_API_BASE = (window.CC_CONFIG && window.CC_CONFIG.apiBase) || 'https://api.sz-hrhb.com';
const DEFAULT_APP_TOKEN = (window.CC_CONFIG && window.CC_CONFIG.appToken) || '';

let meta = { conversation_starters: [], day_reminders: {} };
let state = { settings: null };

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
  return {
    apiBase: DEFAULT_API_BASE,
    appToken: DEFAULT_APP_TOKEN,
    reminderEnabled: true,
    reminderTime: '09:00',
    notifEnabled: true,
  };
}

/* ── Panel switching ── */
function switchPanel(name) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.panel === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
  if (name === 'dashboard') initDashboard();
  if (name === 'toolbox') initToolbox();
  if (name === 'stats') fetchStats().then(renderStatsPanel);
  if (name === 'settings') {
    const s = state.settings;
    if (s) {
      document.getElementById('api-base').value = s.apiBase || '';
      document.getElementById('app-token').value = s.appToken || '';
      document.getElementById('reminder-enabled').checked = s.reminderEnabled !== false;
      document.getElementById('reminder-time').value = s.reminderTime || '09:00';
      document.getElementById('notif-enabled').checked = s.notifEnabled !== false;
    }
  }
}

/* ── Settings ── */
function saveSettings() {
  const apiBase = (document.getElementById('api-base').value || DEFAULT_API_BASE).replace(/\/+$/, '');
  const appToken = document.getElementById('app-token').value || DEFAULT_APP_TOKEN;
  if (!apiBase || !appToken) { alert('请填写 API 地址和访问令牌'); return; }
  state.settings = {
    apiBase, appToken,
    reminderEnabled: document.getElementById('reminder-enabled').checked,
    reminderTime: document.getElementById('reminder-time').value || '09:00',
    notifEnabled: document.getElementById('notif-enabled').checked,
  };
  saveState();
  startReminderTimer();
  initDashboard();
  initToolbox();
}

/* ── Stats ── */
async function fetchStats() {
  if (!state.settings) return null;
  try {
    const res = await fetch(apiUrl('/v1/stats'), { headers: apiHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}
function renderStatsPanel(data) {
  const el = document.getElementById('stats-body');
  if (!data) { el.innerHTML = '<div class="panel-empty">无法加载用量数据</div>'; return; }
  el.innerHTML = `<div class="stats-grid">
    <div class="stats-card"><h3>Provider</h3><div class="val" style="font-size:18px">${data.provider || '-'}</div></div>
    <div class="stats-card"><h3>Model</h3><div class="val" style="font-size:18px">${data.model || '-'}</div></div>
    <div class="stats-card"><h3>累计</h3><div class="val">${(data.total_tokens || 0).toLocaleString()}</div><div class="sub">Prompt: ${(data.total_prompt_tokens || 0).toLocaleString()} · Completion: ${(data.total_completion_tokens || 0).toLocaleString()}</div></div>
    <div class="stats-card"><h3>今日</h3><div class="val">${(data.today_tokens || 0).toLocaleString()}</div><div class="sub">Prompt: ${(data.today_prompt_tokens || 0).toLocaleString()} · Completion: ${(data.today_completion_tokens || 0).toLocaleString()}</div></div>
  </div>`;
}

/* ── Reminder ── */
function checkReminder() {
  if (!state.settings?.reminderEnabled) return;
  if (!state.settings?.notifEnabled) return;
  if (Notification.permission !== 'granted') return;
  const now = new Date();
  const today = now.toDateString();
  if (state.lastReminded === today) return;
  const [h, m] = (state.settings.reminderTime || '09:00').split(':').map(Number);
  if (now.getHours() < h || (now.getHours() === h && now.getMinutes() < m)) return;
  state.lastReminded = today;
  saveState();
  try { new Notification('CC 工作助手', { body: '查看今天的工作安排', icon: '/favicon.ico' }); } catch (e) {}
}
function startReminderTimer() {
  if (!state.settings?.reminderEnabled) return;
  if (state.settings.notifEnabled && Notification.permission === 'default') Notification.requestPermission();
  setInterval(checkReminder, 60000);
  setTimeout(checkReminder, 5000);
}

/* ── Init ── */
function initDashboard() {
  if (typeof dashState === 'undefined' || typeof loadDashboard !== 'function') return;
  if (!state.settings) return;
  dashState.viewDate = new Date();
  dashState.selectedDate = dashDateStr(new Date());
  dashState.activeTab = 'tasks';
  loadDashboard();
}
function initToolbox() {
  if (typeof renderToolbox === 'function') renderToolbox();
}

function bindUi() {
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => switchPanel(n.dataset.panel)));
  document.querySelectorAll('#panel-dashboard .panel-tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('#panel-dashboard .panel-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    if (typeof switchDashTab === 'function') switchDashTab(t.dataset.tab);
  }));
  document.querySelectorAll('#panel-toolbox .panel-tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('#panel-toolbox .panel-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    if (typeof switchToolboxTab === 'function') switchToolboxTab(t.dataset.tool);
  }));
}

async function init() {
  bindUi();
  await loadMeta();
  loadState();
  if (!state.settings) {
    state.settings = getDefaultSettings();
    saveState();
  }
  startReminderTimer();
  setTimeout(initDashboard, 100);
  initToolbox();
}

document.addEventListener('DOMContentLoaded', init);
