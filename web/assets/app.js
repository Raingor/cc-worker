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

/* ── Panel Switching ── */
function switchPanel(name) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.panel === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
  if (name === 'dashboard') initDashboard();
  if (name === 'toolbox') initToolbox();
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
  if (!state.settings) { state.settings = getDefaultSettings(); saveState(); }
  startReminderTimer();
  setTimeout(initDashboard, 100);
  initToolbox();
}

document.addEventListener('DOMContentLoaded', init);
