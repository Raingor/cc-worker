/* CC 工作助手 — GitHub Pages 前端 */

const STORAGE_KEY = 'cc-web-settings';
const DEFAULT_API_BASE = (window.CC_CONFIG && window.CC_CONFIG.apiBase) || 'https://api.sz-hrhb.com';
const DEFAULT_APP_TOKEN = (window.CC_CONFIG && window.CC_CONFIG.appToken) || '';

let meta = { conversation_starters: [], day_reminders: {} };
let state = { settings: null, conversations: [], activeId: null, isStreaming: false };

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
      lastReminded: state.lastReminded,
    })
  );
}

function apiUrl(path) {
  if (!state.settings) return '';
  return state.settings.apiBase.replace(/\/+$/, '') + path;
}

function apiHeaders() {
  return { Authorization: 'Bearer ' + (state.settings?.appToken || '') };
}

async function fetchConversations() {
  if (!state.settings) return;
  try {
    const resp = await fetch(apiUrl('/v1/conversations'), { headers: apiHeaders() });
    if (resp.ok) {
      const list = await resp.json();
      state.conversations = list;
      // Load active conversation's messages
      if (state.activeId) {
        const detailResp = await fetch(apiUrl('/v1/conversations/' + state.activeId), { headers: apiHeaders() });
        if (detailResp.ok) {
          const detail = await detailResp.json();
          const idx = state.conversations.findIndex(c => c.id === state.activeId);
          if (idx >= 0) state.conversations[idx].messages = detail.messages || [];
          return;
        }
      }
      // No active conv or fetch failed → load first conv messages
      if (list.length > 0 && !state.activeId) {
        state.activeId = list[0].id;
        const detailResp = await fetch(apiUrl('/v1/conversations/' + list[0].id), { headers: apiHeaders() });
        if (detailResp.ok) {
          const detail = await detailResp.json();
          state.conversations[0].messages = detail.messages || [];
        }
      }
    }
  } catch (e) {
    showToast('无法连接到服务器，请检查 API 地址', 'error');
  }
}

async function syncConversation(convId) {
  if (!state.settings || !convId) return;
  const conv = state.conversations.find(c => c.id === convId);
  if (!conv) return;
  try {
    await fetch(apiUrl('/v1/conversations'), {
      method: 'POST',
      headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: conv.id,
        title: conv.title,
        messages: conv.messages,
      }),
    });
  } catch (e) {
    // silent — sync is non-critical
  }
}

async function deleteConversationFromServer(convId) {
  if (!state.settings) return;
  try {
    await fetch(apiUrl('/v1/conversations/' + convId), {
      method: 'DELETE',
      headers: apiHeaders(),
    });
  } catch (e) {
    showToast('删除失败，请稍后重试', 'error');
  }
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
  setTimeout(() => startChat().then(fetchConversations), 500);
}

async function startChat() {
  document.getElementById('settings-screen').classList.remove('active');
  document.getElementById('chat-screen').classList.add('active');
  state.conversations = [];
  state.activeId = null;
  await fetchConversations();
  renderConversationList();
  renderMessages(true);
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

async function newConversation() {
  const conv = {
    id: genId(),
    title: '新对话',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  state.conversations.push(conv);
  state.activeId = conv.id;
  await syncConversation(conv.id);
  renderConversationList();
  renderMessages(true);
  renderStarters();
  updateChatTitle();
  if (window.innerWidth < 1024) toggleSidebar();
  document.getElementById('chat-input').focus();
}

async function switchConversation(id) {
  state.activeId = id;
  // Show loading state
  const msgList = document.getElementById('message-list');
  const emptyEl = document.getElementById('empty-state');
  emptyEl.style.display = 'none';
  msgList.querySelectorAll('.message').forEach(m => m.remove());
  const loadEl = document.createElement('div');
  loadEl.className = 'conv-loading';
  loadEl.textContent = '加载中…';
  msgList.appendChild(loadEl);
  // Fetch full conversation with messages
  if (state.settings) {
    try {
      const resp = await fetch(apiUrl('/v1/conversations/' + id), { headers: apiHeaders() });
      if (resp.ok) {
        const detail = await resp.json();
        const idx = state.conversations.findIndex(c => c.id === id);
        if (idx >= 0) {
          state.conversations[idx].messages = detail.messages || [];
        }
      }
    } catch (e) {
      showToast('加载对话失败', 'error');
    }
  }
  renderConversationList();
  renderMessages(true);
  renderStarters();
  updateChatTitle();
  if (window.innerWidth < 1024) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
  }
}

async function deleteConversation(id, e) {
  e.stopPropagation();
  if (!confirm('删除此对话？')) return;
  await deleteConversationFromServer(id);
  state.conversations = state.conversations.filter((c) => c.id !== id);
  if (state.activeId === id) {
    state.activeId = state.conversations.length ? state.conversations[0].id : null;
  }
  renderConversationList();
  renderMessages(true);
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

let convSearchQuery = '';

function renderConversationList() {
  const el = document.getElementById('conversation-list');
  const filtered = convSearchQuery
    ? state.conversations.filter(c => c.title.toLowerCase().includes(convSearchQuery.toLowerCase()))
    : state.conversations;
  if (filtered.length === 0) {
    const emptyMsg = convSearchQuery ? '无匹配对话' : '暂无对话';
    el.innerHTML =
      '<div style="text-align:center;padding:24px;color:var(--text-dim);font-size:13px;">' + emptyMsg + '</div>';
    return;
  }
  el.innerHTML = filtered
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

function renderMessages(force) {
  const el = document.getElementById('message-list');
  const conv = getActiveConv();
  const emptyEl = document.getElementById('empty-state');
  if (force) {
    el.querySelectorAll('.message').forEach((m) => m.remove());
  }
  if (!conv || conv.messages.length === 0) {
    emptyEl.style.display = 'flex';
    return;
  }
  emptyEl.style.display = 'none';
  // Incremental append — only render new messages
  const renderedCount = el.querySelectorAll('.message').length;
  const newMessages = conv.messages.slice(renderedCount);
  for (const msg of newMessages) {
    el.insertBefore(createMessageElement(msg.role, msg.content), emptyEl);
  }
  if (newMessages.length > 0) scrollToBottom();
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
  const col = document.createElement('div');
  col.className = 'msg-col';
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
  col.appendChild(bubble);
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = '📋';
  copyBtn.title = '复制';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = '✅';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = orig;
        copyBtn.classList.remove('copied');
      }, 1500);
    }).catch(() => {
      showToast('复制失败', 'error');
    });
  });
  col.appendChild(copyBtn);
  div.appendChild(avatar);
  div.appendChild(col);
  return div;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '未知';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function buildEmailAnalysisContent(data) {
  let attachmentsInfo = data.attachments_count + ' 个';
  if (data.results && data.results.length > 0) {
    const sizes = data.results.map(r => r.size != null ? formatFileSize(r.size) : null).filter(Boolean);
    if (sizes.length > 0) attachmentsInfo += '（' + sizes.join(', ') + '）';
  }
  let content = `## 📧 邮件分析结果\n\n**来自**: ${data.sender}\n**主题**: ${data.subject}\n**附件**: ${attachmentsInfo}\n\n`;
  for (const r of data.results) {
    if (r.analysis) {
      content += r.analysis.summary + '\n\n';
      for (const t of (r.analysis.tables || [])) {
        content += '### ' + t.title + '\n\n';
        if (t.headers && t.rows && t.rows.length > 0) {
          content += buildMarkdownTable(t.headers, t.rows) + '\n\n';
        }
      }
    } else if (r.error) {
      content += '❌ ' + r.filename + ': ' + r.error + '\n\n';
    }
  }
  return content;
}

async function handleEmailCheck(conv) {
  // Show checking status
  conv.messages.push({ role: 'assistant', content: '📧 正在检查 Sylvia 的最新邮件…' });
  renderMessages(true);

  try {
    const resp = await fetch(apiUrl('/v1/email/check'), {
      method: 'POST',
      headers: apiHeaders(),
    });
    const data = await resp.json();

    // Remove status message
    conv.messages.pop();

    let content;
    if (data.success) {
      content = buildEmailAnalysisContent(data);
    } else {
      content = '❌ ' + (data.error || '检查邮件失败，请稍后重试。');
    }
    conv.messages.push({ role: 'assistant', content });
    renderMessages(true);
  } catch (err) {
    conv.messages.pop();
    conv.messages.push({ role: 'assistant', content: '❌ 检查邮件时出错: ' + err.message });
    renderMessages(true);
  }

  syncConversation(conv.id);
  state.isStreaming = false;
  autoTitle(conv);
  renderConversationList();
  updateChatTitle();
  document.getElementById('send-btn').disabled = false;
  document.getElementById('chat-input').focus();
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

  // Check if this is an email analysis request
  const emailKeywords = ['检查邮件', '查看邮件', '邮件分析', '分析邮件', 'check email'];
  const sylviaEmailPattern = /sylvia/i.test(text) && /(邮件|邮箱|信|mail|email|附件?|check|发来?|收到)/i.test(text);
  const isEmailRequest = emailKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase())) || sylviaEmailPattern;

  if (isEmailRequest) {
    await handleEmailCheck(conv);
    return;
  }

  const assistantMsg = { role: 'assistant', content: '' };
  conv.messages.push(assistantMsg);
  const assistantEl = createMessageElement('assistant', '');
  assistantEl.classList.add('typing');
  msgList.appendChild(assistantEl);
  scrollToBottom();

  state.isStreaming = true;
  // Sync user message to server
  syncConversation(conv.id);
  const chatApiUrl = apiUrl('/v1/chat/completions');

  try {
    const apiMessages = conv.messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch(chatApiUrl, {
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
    // Sync rollback to server
    fetch(chatApiUrl.replace('/v1/chat/completions', '/v1/conversations/' + conv.id + '/pop'), { method: 'POST', headers: apiHeaders() }).catch(() => {});
  }

  state.isStreaming = false;
  autoTitle(conv);
  syncConversation(conv.id);
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

/* ===== Utilities ===== */

function buildMarkdownTable(headers, rows) {
  const lines = [];
  lines.push('| ' + headers.join(' | ') + ' |');
  lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');
  for (const r of rows) {
    lines.push('| ' + headers.map(h => String(r[h] ?? '')).join(' | ') + ' |');
  }
  return lines.join('\n');
}

function showToast(msg, type) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast ' + (type || 'error');
  toast.style.display = 'block';
  clearTimeout(toast._hide);
  toast._hide = setTimeout(() => { toast.style.display = 'none'; }, 4000);
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
  const entry = (meta.day_reminders || {})[String(jsDay)];
  return entry ? entry.short : null;
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
      if (t.headers && t.rows && t.rows.length > 0) {
        lines.push(buildMarkdownTable(t.headers, t.rows));
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
  syncConversation(conv.id);

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
    '<div class="stat-card">' +
    '<div class="stat-section"><div class="stat-label">Provider</div><div class="stat-value">' + (s.provider || '-') + '</div></div>' +
    '<div class="stat-section"><div class="stat-label">Model</div><div class="stat-value">' + (s.model || '-') + '</div></div>' +
    '<div class="stat-section" style="margin-top:4px"><div class="stat-label">总请求</div><div class="stat-num">' + s.request_count + '</div></div>' +
    '</div>' +
    '<div class="stat-group-title">📈 累计</div>' +
    '<div class="stat-card">' +
    row('输入 Token', formatNumber(s.total.prompt)) +
    row('输出 Token', formatNumber(s.total.completion)) +
    row('缓存 Token', formatNumber(s.total.cached || 0)) +
    row('总 Token', formatNumber(s.total.total)) +
    '</div>' +
    '<div class="stat-group-title">📅 今日</div>' +
    '<div class="stat-card">' +
    row('输入 Token', formatNumber(s.today.prompt)) +
    row('输出 Token', formatNumber(s.today.completion)) +
    row('缓存 Token', formatNumber(s.today.cached || 0)) +
    row('总 Token', formatNumber(s.today.total)) +
    '</div>';
}

function row(label, val) {
  return '<div class="stat-row"><span class="stat-label">' + label + '</span><span class="stat-num">' + val + '</span></div>';
}

function toggleStats() {
  const panel = document.getElementById('stats-panel');
  const overlay = document.getElementById('stats-overlay');
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  overlay.style.display = visible ? 'none' : 'block';
  if (!visible) {
    fetchStats().then(renderStatsPanel);
  }
}

function bindUi() {
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('settings-btn').addEventListener('click', showSettings);
  document.getElementById('stats-btn').addEventListener('click', toggleStats);
  document.getElementById('stats-close').addEventListener('click', toggleStats);
  document.getElementById('stats-overlay').addEventListener('click', toggleStats);
  document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
  document.getElementById('close-sidebar-btn').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar);
  document.getElementById('new-conv-btn').addEventListener('click', newConversation);
  const convSearch = document.getElementById('conv-search');
  if (convSearch) {
    convSearch.addEventListener('input', () => {
      convSearchQuery = convSearch.value.trim();
      renderConversationList();
    });
  }
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
  if (state.settings) await startChat();
  else showSettings();
}

document.addEventListener('DOMContentLoaded', init);
