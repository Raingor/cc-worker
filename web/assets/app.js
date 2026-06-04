/* CC 工作助手 — GitHub Pages 前端 */

const STORAGE_KEY = 'cc-web-state';
const DEFAULT_API_BASE = (window.CC_CONFIG && window.CC_CONFIG.apiBase) || 'https://api.sz-hrhb.com';
const DEFAULT_APP_TOKEN = (window.CC_CONFIG && window.CC_CONFIG.appToken) || '';

let meta = { conversation_starters: [] };
let state = { settings: null, conversations: [], activeId: null, isStreaming: false };

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
}

function saveSettings() {
  const apiBase = document.getElementById('api-base').value.trim().replace(/\/+$/, '');
  const appToken = document.getElementById('app-token').value.trim();
  if (!apiBase || !appToken) {
    showStatus('请填写 API 地址和访问令牌', 'error');
    return;
  }
  state.settings = { apiBase, appToken };
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

function bindUi() {
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('settings-btn').addEventListener('click', showSettings);
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
  await loadMeta();
  loadState();
  if (!state.settings && DEFAULT_APP_TOKEN) {
    state.settings = { apiBase: DEFAULT_API_BASE, appToken: DEFAULT_APP_TOKEN };
    saveState();
  }
  if (state.settings) startChat();
  else showSettings();
}

document.addEventListener('DOMContentLoaded', init);
