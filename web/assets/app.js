/* CC 工作助手 — GitHub Pages 前端 */

const STORAGE_KEY = 'cc-web-state';
const DEFAULT_API_BASE = (window.CC_CONFIG && window.CC_CONFIG.apiBase) || 'https://api.sz-hrhb.com';
const DEFAULT_APP_TOKEN = (window.CC_CONFIG && window.CC_CONFIG.appToken) || '';

let meta = { conversation_starters: [] };
let state = { settings: null, conversations: [], activeId: null, isStreaming: false };

const DAY_REMINDERS = {
  1: '**周一提醒**：今天要更新 CFC/厦门/墨西哥出运资料，准备好了吗？',
  2: '**周二提醒**：今天要做 Gap Crasher 缺料检查，还要发墨西哥下周出运装箱单。',
  3: '**周三提醒**：今天要更新 Order Pattern 并下单，还要发厦门当周出运装箱单。',
  4: '**周四提醒**：今天工作最多——处理墨西哥和厦门新订单、分析越南波动、分析厦门预测趋势、删除上周 SAP PIR。',
  5: '**周五提醒**：今天要完成当周 PIR 上传 SAP，还要检查报关资料。',
};
const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

async function loadMeta() {
  try {
    const res = await fetch('assets/cc-meta.json');
    if (res.ok) meta = await res.json();
  } catch (e) {
    console.warn('cc-meta.json load failed', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.settings = saved.settings || null;
    state.conversations = saved.conversations || [];
    state.activeId = saved.activeId || null;
    state.lastReminded = saved.lastReminded || null;
  } catch (e) {
    /* ignore */
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings: state.settings,
      conversations: state.conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: c.messages,
      })),
      activeId: state.activeId,
      lastReminded: state.lastReminded,
    })
  );
}

function showStatus(msg, type) {
  const el = document.getElementById('settings-status');
  el.textContent = msg;
  el.className = 'settings-status ' + type;
  el.style.display = 'block';
}

function showSettings() {
  document.getElementById('chat-screen').classList.remove('active');
  document.getElementById('settings-screen').classList.add('active');
  const s = state.settings || {};
  document.getElementById('api-base').value = s.apiBase || DEFAULT_API_BASE;
  document.getElementById('app-token').value = s.appToken || DEFAULT_APP_TOKEN;
  // Reminder settings
  const r = s.reminder || {};
  document.getElementById('reminder-enabled').checked = r.enabled !== false;
  document.getElementById('reminder-time').value = r.time || '09:00';
  document.getElementById('reminder-browser').checked = r.browser !== false;
}

function saveSettings() {
  const apiBase = document.getElementById('api-base').value.trim().replace(/\/+$/, '');
  const appToken = document.getElementById('app-token').value.trim();
  if (!apiBase || !appToken) {
    showStatus('请填写 API 地址和访问令牌', 'error');
    return;
  }
  state.settings = {
    apiBase,
    appToken,
    reminder: {
      enabled: document.getElementById('reminder-enabled').checked,
      time: document.getElementById('reminder-time').value || '09:00',
      browser: document.getElementById('reminder-browser').checked,
    },
  };
  saveState();
  showStatus('设置已保存', 'success');
  setTimeout(startChat, 500);
}

function startChat() {
  document.getElementById('settings-screen').classList.remove('active');
  document.getElementById('chat-screen').classList.add('active');
  renderConversationList();
  renderMessages();
  renderStarters();
  if (state.conversations.length === 0) newConversation();
  document.getElementById('chat-input').focus();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen = sidebar.classList.toggle('open');
  overlay.classList.toggle('active', isOpen);
}

function genId() {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function newConversation() {
  const conv = {
    id: genId(),
    title: '新对话',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  state.conversations.push(conv);
  state.activeId = conv.id;
  saveState();
  renderConversationList();
  renderMessages();
  renderStarters();
  updateChatTitle();
  if (window.innerWidth < 1024) toggleSidebar();
  document.getElementById('chat-input').focus();
}

function switchConversation(id) {
  state.activeId = id;
  saveState();
  renderConversationList();
  renderMessages();
  renderStarters();
  updateChatTitle();
  if (window.innerWidth < 1024) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
  }
}

function deleteConversation(id, e) {
  e.stopPropagation();
  if (!confirm('删除此对话？')) return;
  state.conversations = state.conversations.filter((c) => c.id !== id);
  if (state.activeId === id) {
    state.activeId = state.conversations.length ? state.conversations[0].id : null;
  }
  saveState();
  renderConversationList();
  renderMessages();
  renderStarters();
  updateChatTitle();
}

function getActiveConv() {
  return state.conversations.find((c) => c.id === state.activeId) || null;
}

function updateChatTitle() {
  const conv = getActiveConv();
  document.getElementById('chat-title').textContent = conv ? conv.title : 'CC 工作助手';
}

function autoTitle(conv) {
  if (conv.messages.length > 0 && conv.title === '新对话') {
    const first = conv.messages[0].content;
    conv.title = first.length > 30 ? first.slice(0, 30) + '…' : first;
  }
}

function renderConversationList() {
  const el = document.getElementById('conversation-list');
  if (state.conversations.length === 0) {
    el.innerHTML =
      '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">暂无对话</div>';
    return;
  }
  el.innerHTML = state.conversations
    .map(
      (c) =>
        `<div class="conv-item${c.id === state.activeId ? ' active' : ''}" data-id="${escapeAttr(c.id)}">
      <span class="conv-title">${escapeHtml(c.title)}</span>
      <button class="conv-del" type="button" data-del="${escapeAttr(c.id)}" title="删除">✕</button>
    </div>`
    )
    .join('');
  el.querySelectorAll('.conv-item').forEach((item) => {
    item.addEventListener('click', () => switchConversation(item.dataset.id));
  });
  el.querySelectorAll('.conv-del').forEach((btn) => {
    btn.addEventListener('click', (e) => deleteConversation(btn.dataset.del, e));
  });
}

function renderMessages() {
  const el = document.getElementById('message-list');
  const conv = getActiveConv();
  const emptyEl = document.getElementById('empty-state');
  el.querySelectorAll('.message').forEach((m) => m.remove());
  if (!conv || conv.messages.length === 0) {
    emptyEl.style.display = 'flex';
    return;
  }
  emptyEl.style.display = 'none';
  conv.messages.forEach((msg) => {
    el.insertBefore(createMessageElement(msg.role, msg.content), emptyEl);
  });
  scrollToBottom();
}

function renderStarters() {
  const el = document.getElementById('starters');
  const starters = meta.conversation_starters || [];
  el.innerHTML = starters
    .map(
      (s) =>
        `<button type="button" data-text="${escapeAttr(s.text)}">${escapeHtml(s.title)}</button>`
    )
    .join('');
  el.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('chat-input').value = btn.dataset.text;
      sendMessage();
    });
  });
}

function createMessageElement(role, content) {
  const div = document.createElement('div');
  div.className = 'message ' + role;
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? 'CC' : '🤖';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (role === 'user') {
    bubble.textContent = content;
  } else {
    try {
      bubble.innerHTML = marked.parse(content, { breaks: true, gfm: true });
    } catch (e) {
      bubble.textContent = content;
    }
  }
  div.appendChild(avatar);
  div.appendChild(bubble);
  return div;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || state.isStreaming) return;
  if (!state.settings) {
    showSettings();
    return;
  }

  let conv = getActiveConv();
  if (!conv) {
    newConversation();
    conv = getActiveConv();
  }

  input.value = '';
  autoResize(input);
  document.getElementById('send-btn').disabled = true;
  document.getElementById('empty-state').style.display = 'none';

  const userMsg = { role: 'user', content: text };
  conv.messages.push(userMsg);
  const msgList = document.getElementById('message-list');
  msgList.appendChild(createMessageElement('user', text));
  scrollToBottom();

  const assistantMsg = { role: 'assistant', content: '' };
  conv.messages.push(assistantMsg);
  const assistantEl = createMessageElement('assistant', '');
  assistantEl.classList.add('typing');
  msgList.appendChild(assistantEl);
  scrollToBottom();

  state.isStreaming = true;
  const apiUrl = state.settings.apiBase.replace(/\/+$/, '') + '/v1/chat/completions';

  try {
    const apiMessages = conv.messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + state.settings.appToken,
      },
      body: JSON.stringify({ messages: apiMessages, stream: true }),
    });

    if (!response.ok) {
      let errMsg = '请求失败 (' + response.status + ')';
      try {
        const err = await response.json();
        errMsg = err.error?.message || err.message || errMsg;
      } catch (e) {
        /* ignore */
      }
      throw new Error(errMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    assistantEl.classList.remove('typing');
    const bubble = assistantEl.querySelector('.bubble');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            assistantMsg.content = fullContent;
            try {
              bubble.innerHTML = marked.parse(fullContent, { breaks: true, gfm: true });
            } catch (e) {
              bubble.textContent = fullContent;
            }
            scrollToBottom();
          }
        } catch (e) {
          /* skip */
        }
      }
    }
  } catch (err) {
    const bubble = assistantEl.querySelector('.bubble');
    bubble.innerHTML =
      '<div class="error-badge">⚠️ ' +
      escapeHtml(err.message) +
      '</div><p style="margin-top:8px;color:var(--text-secondary);font-size:13px;">请检查 API 地址与访问令牌，或联系管理员。</p>';
    assistantEl.classList.remove('typing');
    conv.messages.pop();
  }

  state.isStreaming = false;
  autoTitle(conv);
  saveState();
  renderConversationList();
  document.getElementById('send-btn').disabled = false;
  document.getElementById('chat-input').focus();
}

function scrollToBottom() {
  const el = document.getElementById('message-list');
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight;
  });
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  document.getElementById('send-btn').disabled = !el.value.trim() || state.isStreaming;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ===== Daily Reminders ===== */

function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  Notification.requestPermission();
  return false;
}

function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getDayReminder(jsDay) {
  return DAY_REMINDERS[jsDay] || null;
}

function checkReminder() {
  const r = state.settings?.reminder;
  if (!r || !r.enabled) return;

  const now = new Date();
  const jsDay = now.getDay(); // 0=Sun, 1=Mon...
  const reminderText = getDayReminder(jsDay);
  if (!reminderText) return; // weekend, no reminder

  // Parse reminder time
  const [hour, min] = (r.time || '09:00').split(':').map(Number);
  const reminderTime = new Date(now);
  reminderTime.setHours(hour, min, 0, 0);

  // Check if it's past reminder time
  if (now < reminderTime) return;

  // Check if already reminded today
  const today = getTodayStr();
  if (state.lastReminded === today) return;

  // Send notification
  if (r.browser !== false && 'Notification' in window && Notification.permission === 'granted') {
    const weekdayName = WEEKDAY_CN[jsDay];
    const title = '⏰ CC 工作助手 - 周' + weekdayName + '提醒';
    const body = reminderText.replace(/\*\*/g, '');
    sendBrowserNotification(title, body);
  }

  state.lastReminded = today;
  saveState();
}

function sendBrowserNotification(title, body) {
  try {
    const n = new Notification(title, {
      body: body,
      icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🤖</text></svg>',
      tag: 'cc-worker-reminder',
      requireInteraction: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    setTimeout(() => n.close(), 15000);
  } catch (e) {
    console.warn('Notification failed:', e);
  }
}

function startReminderTimer() {
  requestNotificationPermission();
  checkReminder();
  setInterval(checkReminder, 60000); // check every minute
}

/* ===== File Upload & Analysis ===== */

function showUploadStatus(msg, type) {
  const el = document.getElementById('upload-status');
  el.innerHTML = type === 'loading' ? '<span class="spinner"></span> ' + msg : msg;
  el.className = 'upload-status ' + type;
  el.style.display = 'flex';
}

function hideUploadStatus() {
  document.getElementById('upload-status').style.display = 'none';
}

async function handleFileUpload(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    showUploadStatus('不支持的文件类型：.' + ext + '（支持 .xlsx, .xls, .csv）', 'error');
    return;
  }

  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    showUploadStatus('文件过大（' + (file.size / 1024 / 1024).toFixed(1) + 'MB），最大 20MB', 'error');
    return;
  }

  if (!state.settings) {
    showSettings();
    return;
  }

  showUploadStatus('正在分析 ' + file.name + ' …', 'loading');

  const formData = new FormData();
  formData.append('file', file);

  try {
    const resp = await fetch(
      state.settings.apiBase.replace(/\/+$/, '') + '/v1/chat/upload',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + state.settings.appToken },
        body: formData,
      }
    );

    if (!resp.ok) {
      let errMsg = '上传失败 (' + resp.status + ')';
      try {
        const err = await resp.json();
        errMsg = err.error?.message || err.message || errMsg;
      } catch (e) { /* ignore */ }
      throw new Error(errMsg);
    }

    const data = await resp.json();
    hideUploadStatus();
    if (data.success && data.analysis) {
      renderAnalysisMessage(data.analysis);
    } else {
      throw new Error(data.error?.message || '分析异常');
    }
  } catch (err) {
    showUploadStatus(err.message, 'error');
    setTimeout(hideUploadStatus, 5000);
  }
}

function renderAnalysisMessage(analysis) {
  const conv = getActiveConv();
  if (!conv) return;

  // Build analysis content text
  let lines = [];
  lines.push('## 📊 数据分析结果');
  lines.push('');
  lines.push(analysis.summary || '文件：' + analysis.filename);
  lines.push('');

  // Tables
  if (analysis.tables && analysis.tables.length > 0) {
    for (const t of analysis.tables) {
      lines.push('### ' + t.title);
      lines.push('');
      // Build markdown table
      if (t.headers && t.rows && t.rows.length > 0) {
        lines.push('| ' + t.headers.join(' | ') + ' |');
        lines.push('| ' + t.headers.map(() => '---').join(' | ') + ' |');
        for (const r of t.rows) {
          const vals = t.headers.map(h => String(r[h] ?? ''));
          lines.push('| ' + vals.join(' | ') + ' |');
        }
        lines.push('');
      }
    }
  }

  // Overview stats
  if (analysis.overview && analysis.overview.total_skus != null) {
    lines.push('**概要**：' + analysis.overview.total_skus + ' 个 SKU，总数量 '
      + (analysis.overview.total_quantity || 0).toLocaleString()
      + '，总金额 ' + (analysis.overview.total_amount || 0).toLocaleString());
    lines.push('');
  }

  // Monthly Demand summary
  const md = analysis.details?.monthly_demand;
  if (md && md.total_skus != null) {
    lines.push('**Monthly Demand**：' + md.total_skus + ' 个 SKU（有效 '
      + md.skus_with_data + '），月总需求 ' + (md.total_monthly_demand || 0).toLocaleString());
    lines.push('');
  }

  const content = lines.join('\n');

  // Add as an assistant message
  const msg = { role: 'assistant', content };
  conv.messages.push(msg);
  saveState();

  // Render in UI
  const msgList = document.getElementById('message-list');
  document.getElementById('empty-state').style.display = 'none';
  msgList.appendChild(createMessageElement('assistant', content));
  scrollToBottom();
  updateChatTitle();
}

function setupFileUpload() {
  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('file-input');
  const dropOverlay = document.getElementById('drop-overlay');
  const msgList = document.getElementById('message-list');

  // Click upload button → open file picker
  uploadBtn.addEventListener('click', () => fileInput.click());

  // File selected
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileUpload(fileInput.files[0]);
      fileInput.value = '';
    }
  });

  // Drag over message list
  msgList.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropOverlay.style.display = 'flex';
  });

  msgList.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropOverlay.style.display = 'none';
  });

  // Drop
  dropOverlay.addEventListener('dragover', (e) => { e.preventDefault(); });
  dropOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    dropOverlay.style.display = 'none';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  });

  // Also handle drop on body (fallback)
  document.addEventListener('dragover', (e) => { e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    if (dropOverlay.style.display === 'flex') {
      e.preventDefault();
      dropOverlay.style.display = 'none';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    }
  });
}

/* ===== Usage Stats ===== */

let statsCache = null;

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

async function fetchStats() {
  if (!state.settings) return;
  const apiUrl = state.settings.apiBase.replace(/\/+$/, '') + '/v1/stats';
  try {
    const resp = await fetch(apiUrl, {
      headers: { Authorization: 'Bearer ' + state.settings.appToken },
    });
    if (!resp.ok) return;
    statsCache = await resp.json();
  } catch (e) {
    /* ignore */
  }
}

function renderStatsPanel() {
  const body = document.getElementById('stats-body');
  if (!statsCache) {
    body.innerHTML = '<div class="stat-loading">暂无数据，发送一条消息后查看</div>';
    return;
  }
  const s = statsCache;
  body.innerHTML =
    '<div class="stat-section"><div class="stat-label">Provider</div><div class="stat-value">' +
    (s.provider || '-') +
    '</div></div>' +
    '<div class="stat-section"><div class="stat-label">Model</div><div class="stat-value">' +
    (s.model || '-') +
    '</div></div>' +
    '<div class="stat-section"><div class="stat-label">总请求数</div><div class="stat-value">' +
    s.request_count +
    '</div></div>' +
    '<div class="stat-divider"></div>' +
    '<div class="stat-group-title">📈 累计</div>' +
    row('输入 Token', formatNumber(s.total.prompt)) +
    row('输出 Token', formatNumber(s.total.completion)) +
    row('缓存 Token', formatNumber(s.total.cached || 0)) +
    row('总 Token', formatNumber(s.total.total)) +
    '<div class="stat-divider"></div>' +
    '<div class="stat-group-title">📅 今日</div>' +
    row('输入 Token', formatNumber(s.today.prompt)) +
    row('输出 Token', formatNumber(s.today.completion)) +
    row('缓存 Token', formatNumber(s.today.cached || 0)) +
    row('总 Token', formatNumber(s.today.total));
}

function row(label, val) {
  return '<div class="stat-row"><span>' + label + '</span><span class="stat-num">' + val + '</span></div>';
}

function toggleStats() {
  const panel = document.getElementById('stats-panel');
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'flex';
  if (!visible) {
    fetchStats().then(renderStatsPanel);
  }
}

function bindUi() {
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('settings-btn').addEventListener('click', showSettings);
  document.getElementById('stats-btn').addEventListener('click', toggleStats);
  document.getElementById('stats-close').addEventListener('click', toggleStats);
  document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
  document.getElementById('close-sidebar-btn').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar);
  document.getElementById('new-conv-btn').addEventListener('click', newConversation);
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.querySelector('[data-toggle-token]').addEventListener('click', () => {
    const el = document.getElementById('app-token');
    el.type = el.type === 'password' ? 'text' : 'password';
  });
  const chatInput = document.getElementById('chat-input');
  chatInput.addEventListener('input', () => autoResize(chatInput));
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

async function init() {
  bindUi();
  setupFileUpload();
  await loadMeta();
  loadState();
  if (state.settings) {
    startReminderTimer();
  }
  if (!state.settings && DEFAULT_APP_TOKEN) {
    state.settings = { apiBase: DEFAULT_API_BASE, appToken: DEFAULT_APP_TOKEN };
    saveState();
  }
  if (state.settings) startChat();
  else showSettings();
}

document.addEventListener('DOMContentLoaded', init);
