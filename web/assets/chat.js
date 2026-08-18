/* CC 工作台 — AI 实时对话 */
/* Talks to /v1/chat/completions (SSE streaming) via the apiBase from config. */

var _chatMessages = [];
var _chatBusy = false;
var _chatAbort = null;

function chatApiUrl() {
  return apiUrl('/v1/chat/completions');
}

function chatHeaders() {
  return apiHeaders();
}

/* Tiny markdown renderer: bold, inline code, code blocks, lists, newlines. */
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderChatMarkdown(txt) {
  var out = escapeHtml(txt);
  // code blocks first
  out = out.replace(/```([\s\S]*?)```/g, function (m, code) {
    return '<pre class="chat-code">' + code + '</pre>';
  });
  // inline code
  out = out.replace(/`([^`]+)`/g, '<code class="chat-code-inline">$1</code>');
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // newlines
  out = out.replace(/\n/g, '<br>');
  return out;
}

function appendChatMessage(role, content) {
  var wrap = document.getElementById('chat-messages');
  var el = document.createElement('div');
  el.className = 'chat-msg chat-msg--' + role;
  var label = role === 'user' ? '你' : 'AI';
  el.innerHTML =
    '<div class="chat-msg-role">' + label + '</div>' +
    '<div class="chat-msg-body">' + renderChatMarkdown(content) + '</div>';
  wrap.appendChild(el);
  scrollChatBottom();
  return el;
}

function scrollChatBottom() {
  var wrap = document.getElementById('chat-messages');
  if (wrap) wrap.scrollTop = wrap.scrollHeight;
}

function chatInputDisabled(disabled) {
  var input = document.getElementById('chat-input');
  var send = document.getElementById('chat-send');
  if (input) input.disabled = disabled;
  if (send) send.disabled = disabled;
  if (send) send.textContent = disabled ? '思考中…' : '发送';
}

function sendChat() {
  if (_chatBusy) return;
  var input = document.getElementById('chat-input');
  var text = (input.value || '').trim();
  if (!text) return;
  input.value = '';
  autoResizeChatInput();

  _chatMessages.push({ role: 'user', content: text });
  appendChatMessage('user', text);

  var aiEl = appendChatMessage('assistant', '…');
  var aiBody = aiEl.querySelector('.chat-msg-body');
  var acc = '';
  _chatBusy = true;
  chatInputDisabled(true);

  var ctrl = new AbortController();
  _chatAbort = ctrl;

  fetch(chatApiUrl(), {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, chatHeaders()),
    body: JSON.stringify({ messages: _chatMessages, stream: true }),
    signal: ctrl.signal
  })
  .then(function (r) {
    if (!r.ok) {
      return r.text().then(function (t) { throw new Error('请求失败 (' + r.status + '): ' + t.slice(0, 200)); });
    }
    var reader = r.body.getReader();
    var decoder = new TextDecoder();
    function pump() {
      return reader.read().then(function (res) {
        if (res.done) { finish(true); return; }
        var chunk = decoder.decode(res.value, { stream: true });
        var lines = chunk.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line || line === 'data: [DONE]') continue;
          if (line.indexOf('data: ') === 0) {
            var data = line.slice(6);
            try {
              var obj = JSON.parse(data);
              var delta = obj.choices && obj.choices[0] && obj.choices[0].delta;
              var piece = (delta && (delta.content || delta.reasoning)) || '';
              if (piece) {
                acc += piece;
                aiBody.innerHTML = renderChatMarkdown(acc);
                scrollChatBottom();
              }
            } catch (e) { /* partial JSON lines are ignored */ }
          }
        }
        return pump();
      });
    }
    return pump();
  })
  .catch(function (err) {
    if (err.name === 'AbortError') return;
    aiBody.innerHTML = '<span class="chat-error">出错：' + escapeHtml(err.message) + '</span>';
  })
  .then(function () { finish(false); });

  function finish(pushed) {
    if (!_chatBusy) return;
    _chatBusy = false;
    chatInputDisabled(false);
    if (pushed && acc.trim()) {
      _chatMessages.push({ role: 'assistant', content: acc });
    }
    _chatAbort = null;
    input.focus();
  }
}

function autoResizeChatInput() {
  var input = document.getElementById('chat-input');
  if (!input) return;
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
}

function clearChat() {
  if (!confirm('确定清空当前对话？')) return;
  _chatMessages = [];
  var wrap = document.getElementById('chat-messages');
  if (wrap) wrap.innerHTML = '<div class="chat-empty">开始一段新对话吧 👋</div>';
}

function initChatPanel() {
  var body = document.getElementById('chat-body');
  if (!body) return;

  body.innerHTML =
    '<div class="chat-wrap">' +
      '<div class="chat-header">' +
        '<div class="ai-title ai-title--app-teal" style="display:inline-flex;margin-bottom:0">' +
          '<span class="ai-title__back ai-title__back--left"></span>' +
          '<span class="ai-title__back ai-title__back--right"></span>' +
          '<span class="ai-title__fold ai-title__fold--left"></span>' +
          '<span class="ai-title__fold ai-title__fold--right"></span>' +
          '<span class="ai-title__front"><span class="ai-title__text">AI 对话</span></span>' +
        '</div>' +
        '<p class="chat-sub">实时与 AI 助手交互</p>' +
      '</div>' +
      '<div class="chat-messages" id="chat-messages"><div class="chat-empty">开始一段新对话吧 👋</div></div>' +
      '<div class="chat-inputbar">' +
        '<textarea class="chat-input" id="chat-input" placeholder="输入你的问题…" rows="1"></textarea>' +
        '<button class="chat-send" id="chat-send" type="button">发送</button>' +
      '</div>' +
      '<button class="chat-clear" id="chat-clear" type="button">🗑 清空对话</button>' +
    '</div>';

  var input = document.getElementById('chat-input');
  var send = document.getElementById('chat-send');
  var clear = document.getElementById('chat-clear');

  send.addEventListener('click', sendChat);
  input.addEventListener('input', autoResizeChatInput);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
  clear.addEventListener('click', clearChat);
}