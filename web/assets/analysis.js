/* CC 工作台 — 邮箱数据分析 */

var _analysisRunning = false;

function startEmailAnalysis() {
  if (_analysisRunning) return;
  if (!state || !state.settings) {
    showAnalysisStatus('请先配置 API 地址', 'error');
    return;
  }

  var btn = document.getElementById('btn-check-email');
  var status = document.getElementById('analysis-status');
  var result = document.getElementById('analysis-result');

  // Hide previous result
  result.style.display = 'none';
  closeAnalysisResult();

  // Button: loading state
  _analysisRunning = true;
  btn.disabled = true;
  btn.classList.add('loading');
  btn.querySelector('.analysis-btn-text').textContent = '正在检查邮件…';

  showAnalysisStatus('正在连接邮箱，获取 sylvia 的最新邮件…', 'info');

  var url = (state.settings.apiBase.replace(/\/+$/, '') + '/v1/email/ai-analyze');
  var headers = {
    Authorization: 'Bearer ' + (state.settings.appToken || ''),
    'Content-Type': 'application/json',
  };

  fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({}),
  })
    .then(function (r) {
      if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || d.message || '请求失败 (' + r.status + ')'); });
      return r.json();
    })
    .then(function (data) {
      if (!data.success) {
        throw new Error(data.error || '分析失败');
      }

      // Hide status, show result
      status.style.display = 'none';

      // Render result
      renderAnalysisResult(data);
      result.style.display = 'block';
    })
    .catch(function (err) {
      showAnalysisStatus('❌ ' + err.message, 'error');
    })
    .then(function () {
      _analysisRunning = false;
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.querySelector('.analysis-btn-text').textContent = '检查邮件并分析';
    });
}

function showAnalysisStatus(msg, type) {
  var el = document.getElementById('analysis-status');
  if (!el) return;
  el.style.display = 'block';
  el.className = 'analysis-status ' + (type || 'info');
  el.textContent = msg;
}

function closeAnalysisResult() {
  var result = document.getElementById('analysis-result');
  var body = document.getElementById('analysis-result-body');
  if (result) result.style.display = 'none';
  if (body) body.innerHTML = '';
}

function renderAnalysisResult(data) {
  var body = document.getElementById('analysis-result-body');
  if (!body) return;

  var html = '';

  // Email metadata
  var email = data.email || {};
  html += '<div class="analysis-email-meta">';
  html += '  <div><span class="label">发件人：</span><strong>' + escHtml(email.sender || '') + '</strong></div>';
  html += '  <div><span class="label">主题：</span><strong>' + escHtml(email.subject || '') + '</strong></div>';
  if (email.date) {
    html += '  <div><span class="label">日期：</span>' + escHtml(email.date) + '</div>';
  }
  if (email.body_preview) {
    html += '  <div style="margin-top:8px"><span class="label">邮件摘要：</span><br>' + escHtml(email.body_preview.substring(0, 300)) + '</div>';
  }

  // Attachment info
  var attachments = data.attachments || [];
  if (attachments.length > 0) {
    html += '  <div class="analysis-attach-info">📎 ' + attachments.length + ' 个附件：';
    html += attachments.map(function (a) {
      var sizeStr = a.size > 1024 ? (a.size / 1024).toFixed(1) + 'KB' : a.size + 'B';
      return escHtml(a.filename) + ' (' + sizeStr + ')';
    }).join('、');
    html += '</div>';
  }
  html += '</div>';

  // AI Response
  var aiResponse = data.ai_response || '';
  if (aiResponse) {
    html += '<div class="analysis-ai-response">' + formatAIResponse(aiResponse) + '</div>';
  } else if (data.ai_error) {
    html += '<div style="color:var(--terracotta)">⚠️ AI 响应异常：' + escHtml(data.ai_error) + '</div>';
  }

  body.innerHTML = html;
}

function formatAIResponse(text) {
  // Simple markdown-ish formatting
  // Wrap in a div with proper line breaks
  var lines = text.split('\n');
  var html = '';
  var inList = false;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();

    if (!trimmed) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<br>';
      continue;
    }

    // Headings
    if (/^#{1,3}\s/.test(trimmed)) {
      if (inList) { html += '</ul>'; inList = false; }
      var level = trimmed.match(/^#+/)[0].length;
      var headingText = trimmed.replace(/^#+\s*/, '');
      if (level <= 2) {
        html += '<h4 style="font-family:var(--font-head);font-size:15px;font-weight:700;color:var(--ink);margin:16px 0 8px">' + escHtml(headingText) + '</h4>';
      } else {
        html += '<h5 style="font-family:var(--font-head);font-size:14px;font-weight:600;color:var(--ink);margin:12px 0 6px">' + escHtml(headingText) + '</h5>';
      }
      continue;
    }

    // Bold markers
    var formatted = escHtml(trimmed);

    // List items
    if (/^[-*]\s/.test(formatted)) {
      if (!inList) { html += '<ul style="padding-left:20px;margin:6px 0">'; inList = true; }
      html += '<li style="margin-bottom:4px">' + formatted.replace(/^[-*]\s/, '') + '</li>';
      continue;
    }

    if (/^\d+[.)]\s/.test(formatted)) {
      if (!inList) { html += '<ol style="padding-left:20px;margin:6px 0">'; inList = true; }
      html += '<li style="margin-bottom:4px">' + formatted.replace(/^\d+[.)]\s/, '') + '</li>';
      continue;
    }

    // Regular paragraph
    if (inList) { html += '</ul>'; inList = false; }
    html += '<p style="margin-bottom:6px">' + formatted + '</p>';
  }

  if (inList) html += '</ul>';

  return html;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
