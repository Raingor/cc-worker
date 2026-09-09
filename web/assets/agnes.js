/* CC 工作台 — Agnes 生图 / 生视频 */

var _agnesReady = false;
var _agnesConfig = null;
var _agnesTab = 'image';
var _agnesVideoTimer = null;
var AGNES_IMAGE_MODELS = ['agnes-image-2.5-flash', 'agnes-image-2.1-flash'];
var AGNES_VIDEO_MODELS = ['agnes-video-2.5-flash', 'agnes-video-2.5'];
var AGNES_IMAGE_SIZES = ['1K', '2K', '3K', '4K'];
var AGNES_IMAGE_RATIOS = ['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9'];
var AGNES_VIDEO_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
var AGNES_DOCS = 'https://agnes-ai.com/zh-Hans/docs/agnes-30-flash.md';

function agnesEscape(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
  });
}
function agnesLines(value) {
  return String(value || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
}
function agnesJson(path, options) {
  options = options || {};
  options.headers = Object.assign({}, apiHeaders(), options.headers || {});
  return fetch(apiUrl(path), options).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (!res.ok) {
        var error = new Error(data.message || data.error?.message || ('服务器错误 (' + res.status + ')'));
        error.status = res.status;
        error.retryable = !!data.retryable;
        throw error;
      }
      return data;
    });
  });
}
function agnesConfigLabel() {
  var key = _agnesConfig && _agnesConfig.hasKey;
  return key ? '<span class="agnes-key-status ready">' + agnesEscape(_agnesConfig.maskedKey) + '</span>' : '<span class="agnes-key-status">未配置</span>';
}
function agnesField(label, input) {
  return '<label class="agnes-field"><span>' + label + '</span>' + input + '</label>';
}
function agnesSelect(id, values, selected, labels) {
  return '<select id="' + id + '" class="agnes-input">' + values.map(function (v) {
    return '<option value="' + agnesEscape(v) + '"' + (v === selected ? ' selected' : '') + '>' + agnesEscape(labels && labels[v] || v) + '</option>';
  }).join('') + '</select>';
}

function initAgnesPanel() {
  var body = document.getElementById('agnes-generate-body');
  if (!body) return;
  if (!_agnesReady) {
    _agnesReady = true;
    renderAgnesPanel(body);
    loadAgnesConfig();
  }
  setAgnesTab(_agnesTab);
}

function renderAgnesPanel(body) {
  body.innerHTML = '<div class="agnes-wrap ai-pattern-default">' +
    '<header class="agnes-header"><div class="agnes-mark">✦</div><div><div class="agnes-kicker">AGNES GENERATION</div><h2>Agnes 生图生视频</h2><p>把想法变成画面，也可以用 Agnes 3.0 Flash 继续完善创意。</p></div></header>' +
    '<div class="agnes-tabs"><button class="agnes-tab" data-agnes-tab="image" type="button">▧ 图片</button><button class="agnes-tab" data-agnes-tab="video" type="button">▶ 视频</button><button class="agnes-tab" data-agnes-tab="chat" type="button">◎ Agnes 3.0</button></div>' +
    '<div class="agnes-view" data-agnes-view="image"><div id="agnes-image-view"></div></div>' +
    '<div class="agnes-view" data-agnes-view="video"><div id="agnes-video-view"></div></div>' +
    '<div class="agnes-view" data-agnes-view="chat"><div id="agnes-chat-view"></div></div>' +
    '</div>';
  renderImageView();
  renderVideoView();
  renderChatView();
  body.querySelectorAll('[data-agnes-tab]').forEach(function (button) {
    button.addEventListener('click', function () { setAgnesTab(button.dataset.agnesTab); });
  });
}
function setAgnesTab(tab) {
  _agnesTab = tab || 'image';
  document.querySelectorAll('[data-agnes-tab]').forEach(function (button) { button.classList.toggle('active', button.dataset.agnesTab === _agnesTab); });
  document.querySelectorAll('[data-agnes-view]').forEach(function (view) { view.classList.toggle('active', view.dataset.agnesView === _agnesTab); });
}
function loadAgnesConfig() {
  agnesJson('/v1/agnes/config').then(function (data) {
    _agnesConfig = data;
    var badge = document.getElementById('agnes-key-badge');
    if (badge) badge.innerHTML = agnesConfigLabel();
  }).catch(function () {
    _agnesConfig = { hasKey: false, maskedKey: '' };
  });
}
function saveAgnesKey() {
  var input = document.getElementById('agnes-key-input');
  var button = document.getElementById('agnes-save-key');
  var error = document.getElementById('agnes-key-error');
  var key = input.value.trim();
  if (!key) return;
  button.disabled = true;
  button.textContent = '保存中…';
  error.hidden = true;
  agnesJson('/v1/agnes/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key }) })
    .then(function () { input.value = ''; button.textContent = '已保存 ✓'; return loadAgnesConfig(); })
    .catch(function (e) { error.textContent = e.message || '保存失败'; error.hidden = false; button.textContent = '保存 Key'; })
    .finally(function () { button.disabled = false; if (button.textContent === '已保存 ✓') setTimeout(function () { button.textContent = '保存 Key'; }, 1800); });
}
function agnesNeedsKey() { return !_agnesConfig || !_agnesConfig.hasKey; }
function agnesError(result) { return '<div class="agnes-result error">生成失败' + (result.status ? '（HTTP ' + result.status + '）' : '') + '：' + agnesEscape(result.message || '请求失败') + '</div>'; }

function renderImageView() {
  var el = document.getElementById('agnes-image-view');
  if (!el) return;
  el.innerHTML = '<div class="agnes-form-card"><div class="agnes-grid two">' +
    agnesField('模型', '<input id="agnes-image-model" class="agnes-input agnes-mono" list="agnes-image-models" value="' + AGNES_IMAGE_MODELS[0] + '"><datalist id="agnes-image-models">' + AGNES_IMAGE_MODELS.map(function (m) { return '<option value="' + m + '">'; }).join('') + '</datalist>') +
    agnesField('返回格式', agnesSelect('agnes-image-format', ['url', 'b64_json'], 'url', { url: '图片 URL', b64_json: 'Base64' })) + '</div>' +
    agnesField('提示词', '<textarea id="agnes-image-prompt" class="agnes-input" rows="3" placeholder="主体 + 场景 / 风格 + 光照 + 构图 + 质量要求"></textarea>') +
    '<div class="agnes-grid two">' + agnesField('尺寸档位', agnesSelect('agnes-image-size', AGNES_IMAGE_SIZES, '1K')) + agnesField('宽高比', agnesSelect('agnes-image-ratio', AGNES_IMAGE_RATIOS, '1:1')) + '</div>' +
    agnesField('参考图（可选，支持上传或 URL）', '<div class="agnes-reference-box"><textarea id="agnes-image-refs" class="agnes-input agnes-mono" rows="2" placeholder="填写 URL 或 data URI；多张则为多图合成"></textarea><div class="agnes-reference-tools"><input id="agnes-image-upload" class="agnes-file-input" type="file" accept="image/*" multiple><button id="agnes-image-upload-btn" class="agnes-upload-btn" type="button">⌑ 上传图片</button><span>支持 JPG、PNG、WebP</span></div><div id="agnes-image-upload-list" class="agnes-upload-list"></div></div>') +
    '<button id="agnes-image-run" class="agnes-btn agnes-btn-primary" type="button">✧ 生成图片</button><div id="agnes-image-result"></div></div>';
  document.getElementById('agnes-image-run').addEventListener('click', runAgnesImage);
  var uploadInput = document.getElementById('agnes-image-upload');
  var uploadButton = document.getElementById('agnes-image-upload-btn');
  var uploadList = document.getElementById('agnes-image-upload-list');
  var refsInput = document.getElementById('agnes-image-refs');
  uploadButton.addEventListener('click', function () { uploadInput.click(); });
  uploadInput.addEventListener('change', function () {
    var files = Array.from(uploadInput.files || []);
    if (!files.length) return;
    var validFiles = files.filter(function (file) { return file.type.indexOf('image/') === 0 && file.size <= 15 * 1024 * 1024; });
    if (validFiles.length !== files.length) uploadList.innerHTML = '<span class="agnes-upload-error">仅支持图片，且单张不超过 15MB</span>';
    Promise.all(validFiles.map(function (file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve({ name: file.name, data: reader.result }); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    })).then(function (items) {
      var refs = agnesLines(refsInput.value);
      items.forEach(function (item) { refs.push(item.data); });
      refsInput.value = refs.join('\n');
      uploadList.innerHTML = items.map(function (item) { return '<span class="agnes-upload-item">✓ ' + agnesEscape(item.name) + '</span>'; }).join('');
      uploadInput.value = '';
    }).catch(function () { uploadList.innerHTML = '<span class="agnes-upload-error">图片读取失败，请重试</span>'; });
  });
}
function runAgnesImage() {
  var prompt = document.getElementById('agnes-image-prompt').value.trim();
  var button = document.getElementById('agnes-image-run');
  var result = document.getElementById('agnes-image-result');
  if (!prompt) { result.innerHTML = '<div class="agnes-result error">请先填写提示词</div>'; return; }
  if (agnesNeedsKey()) { result.innerHTML = '<div class="agnes-result error">请先保存 Agnes API Key</div>'; return; }
  button.disabled = true; button.textContent = '生成中…（可能需要数十秒）'; result.innerHTML = '<div class="agnes-progress">正在创作画面…</div>';
  agnesJson('/v1/agnes/image-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    model: document.getElementById('agnes-image-model').value.trim(), prompt: prompt,
    size: document.getElementById('agnes-image-size').value, ratio: document.getElementById('agnes-image-ratio').value,
    responseFormat: document.getElementById('agnes-image-format').value, image: agnesLines(document.getElementById('agnes-image-refs').value)
  }) }).then(function (data) {
    result.innerHTML = '<div class="agnes-result-meta">生成成功 · ' + (data.images || []).length + ' 张</div><div class="agnes-result-grid">' + (data.images || []).map(function (src, i) {
      return '<figure><img src="' + agnesEscape(src) + '" alt="生成结果 ' + (i + 1) + '"><figcaption><span>' + agnesEscape(src.slice(0, 42)) + '…</span><a href="' + agnesEscape(src) + '" target="_blank" rel="noreferrer" download>打开 ↗</a></figcaption></figure>';
    }).join('') + '</div>';
  }).catch(function (e) { result.innerHTML = agnesError({ message: e.message }); }).finally(function () { button.disabled = false; button.textContent = '✧ 生成图片'; });
}

function renderVideoView() {
  var el = document.getElementById('agnes-video-view');
  if (!el) return;
  el.innerHTML = '<div class="agnes-form-card"><div class="agnes-grid two">' +
    agnesField('模型', '<input id="agnes-video-model" class="agnes-input agnes-mono" list="agnes-video-models" value="' + AGNES_VIDEO_MODELS[0] + '"><datalist id="agnes-video-models">' + AGNES_VIDEO_MODELS.map(function (m) { return '<option value="' + m + '">'; }).join('') + '</datalist>') +
    agnesField('生成模式', agnesSelect('agnes-video-mode', ['text', 'keyframe', 'reference'], 'text', { text: '文生视频', keyframe: '首尾帧控制', reference: '图片 / 音频参考' })) + '</div>' +
    agnesField('提示词', '<textarea id="agnes-video-prompt" class="agnes-input" rows="3" placeholder="画面内容、镜头运动、光照氛围"></textarea>') +
    '<div class="agnes-grid three">' + agnesField('时长（秒）', agnesSelect('agnes-video-seconds', ['4','5','6','7','8','9','10','11','12'], '5')) + agnesField('宽高比', agnesSelect('agnes-video-ratio', AGNES_VIDEO_RATIOS, '16:9')) + agnesField('分辨率', '<input class="agnes-input" value="720P" readonly>') + '</div>' +
    '<div id="agnes-video-extra"></div><button id="agnes-video-run" class="agnes-btn agnes-btn-primary" type="button">▶ 创建视频任务</button><div id="agnes-video-result"></div></div>';
  document.getElementById('agnes-video-mode').addEventListener('change', renderVideoExtra);
  document.getElementById('agnes-video-run').addEventListener('click', runAgnesVideo);
  renderVideoExtra();
}
function renderVideoExtra() {
  var mode = document.getElementById('agnes-video-mode').value;
  var el = document.getElementById('agnes-video-extra');
  if (mode === 'keyframe') el.innerHTML = '<div class="agnes-grid two">' + agnesField('首帧图片 URL', '<input id="agnes-first-frame" class="agnes-input">') + agnesField('尾帧图片 URL', '<input id="agnes-last-frame" class="agnes-input">') + '</div>';
  else if (mode === 'reference') el.innerHTML = '<div class="agnes-grid two">' + agnesField('参考图片（一行一个，最多 5 张）', '<textarea id="agnes-video-images" class="agnes-input agnes-mono" rows="3"></textarea>') + agnesField('参考音频（一行一个，最多 3 段）', '<textarea id="agnes-video-audios" class="agnes-input agnes-mono" rows="3"></textarea>') + '</div>';
  else el.innerHTML = '';
}
function runAgnesVideo() {
  var prompt = document.getElementById('agnes-video-prompt').value.trim();
  var mode = document.getElementById('agnes-video-mode').value;
  var button = document.getElementById('agnes-video-run');
  var result = document.getElementById('agnes-video-result');
  if (!prompt) { result.innerHTML = '<div class="agnes-result error">请先填写提示词</div>'; return; }
  if (agnesNeedsKey()) { result.innerHTML = '<div class="agnes-result error">请先保存 Agnes API Key</div>'; return; }
  if (_agnesVideoTimer) clearTimeout(_agnesVideoTimer);
  button.disabled = true; button.textContent = '创建中…'; result.innerHTML = '<div class="agnes-progress">正在提交视频任务…</div>';
  var payload = { model: document.getElementById('agnes-video-model').value.trim(), prompt: prompt, mode: mode, seconds: document.getElementById('agnes-video-seconds').value, aspectRatio: document.getElementById('agnes-video-ratio').value };
  if (mode === 'keyframe') { payload.firstFrame = document.getElementById('agnes-first-frame').value.trim(); payload.lastFrame = document.getElementById('agnes-last-frame').value.trim(); }
  if (mode === 'reference') { payload.images = agnesLines(document.getElementById('agnes-video-images').value); payload.audios = agnesLines(document.getElementById('agnes-video-audios').value); }
  startAgnesVideoCreate(payload, button, result, 0);
}
function startAgnesVideoCreate(payload, button, result, retryCount) {
  agnesJson('/v1/agnes/video-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(function (data) {
    renderVideoResult(data, true);
    if (data.videoId) pollAgnesVideo(data.videoId, payload.model);
    else button.disabled = false;
  }).catch(function (e) {
    var queueBusy = e.retryable || e.status === 429 || e.status >= 500 || /queue is full|retry later/i.test(e.message || '');
    if (queueBusy && retryCount < 3) {
      var waitSeconds = 15 * (retryCount + 1);
      result.innerHTML = '<div class="agnes-progress">视频队列繁忙，' + waitSeconds + ' 秒后自动重试（' + (retryCount + 1) + '/3）…</div>';
      _agnesVideoTimer = setTimeout(function () { startAgnesVideoCreate(payload, button, result, retryCount + 1); }, waitSeconds * 1000);
      return;
    }
    result.innerHTML = agnesError(e);
    button.disabled = false;
  });
}
function renderVideoResult(data, busy) {
  var result = document.getElementById('agnes-video-result');
  if (!data.success && !data.retryable) { result.innerHTML = agnesError(data); return; }
  var progress = typeof data.progress === 'number' ? data.progress : 5;
  result.innerHTML = '<div class="agnes-video-meta">任务：<code>' + agnesEscape(data.videoId || '已提交') + '</code>　状态：' + agnesEscape(data.taskStatus || '排队中') + (typeof data.progress === 'number' ? '　' + data.progress + '%' : '') + '</div>' + (busy ? '<div class="agnes-progress-bar"><i style="width:' + Math.max(progress, 5) + '%"></i></div>' : '') + (data.videoUrl ? '<video src="' + agnesEscape(data.videoUrl) + '" controls></video><a class="agnes-download" href="' + agnesEscape(data.videoUrl) + '" target="_blank" rel="noreferrer" download>下载视频 ↗</a>' : '');
}
function pollAgnesVideo(videoId, model) {
  _agnesVideoTimer = setTimeout(function () {
    agnesJson('/v1/agnes/video-status?videoId=' + encodeURIComponent(videoId) + '&model=' + encodeURIComponent(model)).then(function (data) {
      renderVideoResult(data, true);
      var status = String(data.taskStatus || '').toLowerCase();
      if (data.videoUrl || !data.success && !data.retryable || /^(completed|succeeded|success|failed|error|cancelled|canceled)$/.test(status)) {
        document.getElementById('agnes-video-run').disabled = false; return;
      }
      pollAgnesVideo(videoId, model);
    }).catch(function () { pollAgnesVideo(videoId, model); });
  }, 8000);
}

function renderChatView() {
  var el = document.getElementById('agnes-chat-view');
  if (!el) return;
  el.innerHTML = '<div class="agnes-form-card agnes-chat-card"><div class="agnes-chat-heading"><div><strong>◎ Agnes 3.0 Flash</strong><small>文本、图像 URL输入 · 512K 上下文</small></div><a href="' + AGNES_DOCS + '" target="_blank" rel="noreferrer">查看文档 ↗</a></div><div id="agnes-chat-messages" class="agnes-chat-messages"><div class="agnes-chat-empty">◎<br><span>输入任务，开始与 Agnes 3.0 Flash 对话</span></div></div>' +
    agnesField('提示词', '<textarea id="agnes-chat-prompt" class="agnes-input" rows="3" placeholder="描述任务或问题……（⌘/Ctrl + Enter 发送）"></textarea>') +
    '<div class="agnes-grid three">' + agnesField('系统提示词（可选）', '<input id="agnes-chat-system" class="agnes-input" placeholder="定义助手角色">') + agnesField('图像 URL（可选）', '<input id="agnes-chat-image" class="agnes-input agnes-mono" placeholder="https://…">') + '<div class="agnes-grid two">' + agnesField('最大输出', '<input id="agnes-chat-tokens" class="agnes-input" type="number" min="1" max="65536" value="1024">') + agnesField('温度', '<input id="agnes-chat-temp" class="agnes-input" type="number" min="0" max="2" step="0.1" value="0.7">') + '</div></div>' +
    '<div class="agnes-chat-footer"><button id="agnes-chat-clear" class="agnes-link-btn" type="button">清空对话</button><button id="agnes-chat-send" class="agnes-btn agnes-btn-primary" type="button">发送给 Agnes 3.0</button></div><p id="agnes-chat-error" class="agnes-error" hidden></p></div>';
  var prompt = document.getElementById('agnes-chat-prompt');
  prompt.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendAgnesChat(); });
  document.getElementById('agnes-chat-send').addEventListener('click', sendAgnesChat);
  document.getElementById('agnes-chat-clear').addEventListener('click', function () { window._agnesMessages = []; renderAgnesMessages(); });
  window._agnesMessages = [];
}
function renderAgnesMessages(busy) {
  var el = document.getElementById('agnes-chat-messages');
  if (!el) return;
  var messages = window._agnesMessages || [];
  el.innerHTML = messages.length ? messages.map(function (m) { return '<div class="agnes-message ' + m.role + '"><small>' + (m.role === 'user' ? 'YOU' : 'AGNES 3.0') + '</small><p>' + agnesEscape(m.text) + '</p>' + (m.image ? '<em>图片：' + agnesEscape(m.image) + '</em>' : '') + '</div>'; }).join('') : '<div class="agnes-chat-empty">◎<br><span>输入任务，开始与 Agnes 3.0 Flash 对话</span></div>';
  if (busy) el.innerHTML += '<div class="agnes-message assistant"><small>AGNES 3.0</small><p>正在思考…</p></div>';
  el.scrollTop = el.scrollHeight;
}
function sendAgnesChat() {
  var prompt = document.getElementById('agnes-chat-prompt');
  var text = prompt.value.trim();
  var send = document.getElementById('agnes-chat-send');
  var error = document.getElementById('agnes-chat-error');
  if (!text || send.disabled) return;
  if (agnesNeedsKey()) { error.textContent = '请先保存 Agnes API Key'; error.hidden = false; return; }
  error.hidden = true;
  var image = document.getElementById('agnes-chat-image').value.trim();
  var content = image ? [{ type: 'text', text: text }, { type: 'image_url', image_url: { url: image } }] : text;
  var history = (window._agnesMessages || []).map(function (m) { return { role: m.role, content: m.content || m.text }; });
  var system = document.getElementById('agnes-chat-system').value.trim();
  if (system) history.unshift({ role: 'system', content: system });
  history.push({ role: 'user', content: content });
  window._agnesMessages.push({ role: 'user', text: text, content: content, image: image });
  prompt.value = ''; document.getElementById('agnes-chat-image').value = ''; send.disabled = true; send.textContent = '生成中…'; renderAgnesMessages(true);
  agnesJson('/v1/agnes/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'agnes-3.0-flash', messages: history, maxTokens: Number(document.getElementById('agnes-chat-tokens').value) || 1024, temperature: Number(document.getElementById('agnes-chat-temp').value) }) }).then(function (data) {
    window._agnesMessages.push({ role: 'assistant', text: data.reply || '', content: data.reply || '' }); renderAgnesMessages(false);
  }).catch(function (e) { window._agnesMessages.pop(); renderAgnesMessages(false); error.textContent = e.message || '请求失败'; error.hidden = false; }).finally(function () { send.disabled = false; send.textContent = '发送给 Agnes 3.0'; });
}
