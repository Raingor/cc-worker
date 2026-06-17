/* CC 工作台 — 邮箱数据分析 */

var _analysisRunning = false;
var _analysisRecords = [];
var _analysisLoading = false;

/* ── API helpers ── */
function analysisApiUrl(path) {
  if (!state || !state.settings) return '';
  return state.settings.apiBase.replace(/\/+$/, '') + path;
}
function analysisHeaders() {
  return { Authorization: 'Bearer ' + (state.settings?.appToken || '') };
}

/* ── Init: load records on panel show ── */
function initAnalysisPanel() {
  if (typeof state === 'undefined' || !state || !state.settings) return;
  closeAnalysisResult();
  // Auto-open guide if no records yet, else let user toggle freely
  var guide = document.getElementById('analysis-guide');
  if (guide) {
    var saved = localStorage.getItem('analysis_guide_open');
    if (saved === 'true') guide.setAttribute('open', '');
    else if (saved === 'false') guide.removeAttribute('open');
    guide.addEventListener('toggle', function () {
      localStorage.setItem('analysis_guide_open', this.open);
    });
  }
  loadAnalysisRecords();
}

/* ── After records loaded, auto-open guide if empty ── */
function afterAnalysisRecords() {
  if (_analysisRecords.length === 0) {
    var guide = document.getElementById('analysis-guide');
    if (guide && !guide.open) {
      guide.setAttribute('open', '');
    }
  }
}

function loadAnalysisRecords() {
  if (_analysisLoading) return;
  _analysisLoading = true;

  var listEl = document.getElementById('analysis-records-list');
  if (!listEl) { _analysisLoading = false; return; }
  listEl.innerHTML = '<div class="analysis-loading">加载历史记录…</div>';

  fetch(analysisApiUrl('/v1/analysis'), { headers: analysisHeaders() })
    .then(function (r) {
      if (!r.ok) return Promise.reject(new Error('加载失败'));
      return r.json();
    })
    .then(function (data) {
      _analysisRecords = data.records || [];
      renderAnalysisRecords();
    })
    .catch(function () {
      var listEl = document.getElementById('analysis-records-list');
      if (listEl) listEl.innerHTML = '<div class="analysis-empty">暂无分析记录</div>';
    })
    .then(function () { _analysisLoading = false; });
}

/* ── Render records as cards ── */
function renderAnalysisRecords() {
  var listEl = document.getElementById('analysis-records-list');
  if (!listEl) return;

  if (!_analysisRecords || _analysisRecords.length === 0) {
    listEl.innerHTML = '<div class="analysis-empty">暂无分析记录</div>';
    afterAnalysisRecords();
    return;
  }

  var html = '';
  for (var i = 0; i < _analysisRecords.length; i++) {
    var r = _analysisRecords[i];
    html += renderRecordCard(r);
  }
  listEl.innerHTML = html;
  afterAnalysisRecords();
}

function renderRecordCard(r) {
  var timeStr = formatTime(r.created_at);
  var subject = r.email_subject || '(无主题)';
  var sender = r.email_sender || '';
  var preview = r.ai_response_preview || '';
  var previewShort = preview.length > 120 ? preview.substring(0, 120) + '…' : preview;

  // Status badges
  var badges = '';
  badges += statusBadge(r.has_pdf, 'PDF', 'pdf', r.id);
  badges += statusBadge(r.has_xlsx, 'XLSX', 'xlsx', r.id);
  badges += statusBadge(r.has_replied, '已回复', 'replied', r.id);

  return (
    '<div class="analysis-card" data-id="' + escHtml(r.id) + '">' +
      '<div class="analysis-card-head">' +
        '<div class="analysis-card-time">' + escHtml(timeStr) + '</div>' +
        '<button class="analysis-card-del" onclick="deleteAnalysisRecord(\'' + escHtml(r.id) + '\')" title="删除">✕</button>' +
      '</div>' +
      '<div class="analysis-card-subject" title="' + escHtml(subject) + '">📧 ' + escHtml(subject) + '</div>' +
      (sender ? '<div class="analysis-card-sender">' + escHtml(sender) + '</div>' : '') +
      '<div class="analysis-card-preview">' + escHtml(previewShort) + '</div>' +
      '<div class="analysis-card-badges">' + badges + '</div>' +
      '<div class="analysis-card-actions">' +
        '<button class="analysis-action-btn" onclick="toggleAnalysisDetail(\'' + escHtml(r.id) + '\')">查看详情</button>' +
        '<button class="analysis-action-btn" onclick="setAnalysisFlag(\'' + escHtml(r.id) + '\', \'has_pdf\')"' + (r.has_pdf ? ' disabled' : '') + '>📄 标记 PDF</button>' +
        '<button class="analysis-action-btn" onclick="setAnalysisFlag(\'' + escHtml(r.id) + '\', \'has_xlsx\')"' + (r.has_xlsx ? ' disabled' : '') + '>📊 标记 XLSX</button>' +
        '<button class="analysis-action-btn" onclick="setAnalysisFlag(\'' + escHtml(r.id) + '\', \'has_replied\')"' + (r.has_replied ? ' disabled' : '') + '>📬 已回复邮件</button>' +
      '</div>' +
      '<div class="analysis-card-detail" id="analysis-detail-' + escHtml(r.id) + '" style="display:none">' +
        '<div class="analysis-card-detail-body"></div>' +
      '</div>' +
    '</div>'
  );
}

function statusBadge(active, label, type, recordId) {
  if (active) {
    return '<span class="analysis-badge active badge-' + type + '">✅ ' + escHtml(label) + '</span>';
  }
  return '';
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  try {
    var d = new Date(isoStr);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
           pad(d.getHours()) + ':' + pad(d.getMinutes());
  } catch (e) {
    return isoStr;
  }
}

/* ── Start analysis ── */
function startEmailAnalysis() {
  if (_analysisRunning) return;
  if (!state || !state.settings) {
    showAnalysisStatus('请先配置 API 地址', 'error');
    return;
  }

  var btn = document.getElementById('btn-check-email');
  var status = document.getElementById('analysis-status');
  var result = document.getElementById('analysis-result');

  result.style.display = 'none';
  closeAnalysisResult();

  _analysisRunning = true;
  btn.disabled = true;
  btn.classList.add('loading');
  btn.querySelector('.analysis-btn-text').textContent = '正在检查邮件…';

  showAnalysisStatus('正在连接邮箱，获取 sylvia 的最新邮件…', 'info');

  fetch(analysisApiUrl('/v1/email/ai-analyze'), {
    method: 'POST',
    headers: analysisHeaders(),
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
      status.style.display = 'none';
      renderAnalysisResult(data);
      result.style.display = 'block';
      // Refresh records list
      loadAnalysisRecords();
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

/* ── Analysis result detail ── */
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

    var formatted = escHtml(trimmed);

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

    if (inList) { html += '</ul>'; inList = false; }
    html += '<p style="margin-bottom:6px">' + formatted + '</p>';
  }

  if (inList) html += '</ul>';
  return html;
}

/* ── Card detail / actions ── */
function toggleAnalysisDetail(recordId) {
  var detailEl = document.getElementById('analysis-detail-' + recordId);
  if (!detailEl) return;

  if (detailEl.style.display !== 'none') {
    detailEl.style.display = 'none';
    return;
  }

  // Find the record
  var record = null;
  for (var i = 0; i < _analysisRecords.length; i++) {
    if (_analysisRecords[i].id === recordId) { record = _analysisRecords[i]; break; }
  }
  if (!record) return;

  var bodyEl = detailEl.querySelector('.analysis-card-detail-body');
  if (!bodyEl) return;

  var html = '<div class="analysis-email-meta" style="margin-bottom:12px">';
  html += '  <div><span class="label">主题：</span><strong>' + escHtml(record.email_subject || '') + '</strong></div>';
  if (record.email_sender) {
    html += '  <div><span class="label">发件人：</span>' + escHtml(record.email_sender) + '</div>';
  }
  if (record.email_date) {
    html += '  <div><span class="label">日期：</span>' + escHtml(record.email_date) + '</div>';
  }
  if (record.email_body_preview) {
    html += '  <div style="margin-top:6px"><span class="label">摘要：</span><br>' + escHtml(record.email_body_preview) + '</div>';
  }
  if (record.attachment_files && record.attachment_files.length > 0) {
    html += '  <div class="analysis-attach-info" style="margin-top:8px">📎 ' +
      record.attachment_files.map(function (a) { return escHtml(a.filename); }).join('、') +
    '</div>';
  }
  html += '</div>';

  html += '<div class="analysis-ai-response">' + formatAIResponse(record.ai_response || '') + '</div>';

  bodyEl.innerHTML = html;
  detailEl.style.display = 'block';
  detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setAnalysisFlag(recordId, flag) {
  fetch(analysisApiUrl('/v1/analysis/' + recordId + '/flag'), {
    method: 'POST',
    headers: analysisHeaders(),
    body: JSON.stringify({ flag: flag }),
  })
    .then(function (r) {
      if (!r.ok) return Promise.reject(new Error('操作失败'));
      return r.json();
    })
    .then(function (data) {
      if (data.success) {
        // Update local record
        for (var i = 0; i < _analysisRecords.length; i++) {
          if (_analysisRecords[i].id === recordId) {
            _analysisRecords[i][flag] = true;
            break;
          }
        }
        renderAnalysisRecords();
      }
    })
    .catch(function (err) {
      alert('操作失败: ' + err.message);
    });
}

function deleteAnalysisRecord(recordId) {
  if (!confirm('确定删除这条分析记录？')) return;

  fetch(analysisApiUrl('/v1/analysis/' + recordId), {
    method: 'DELETE',
    headers: analysisHeaders(),
  })
    .then(function (r) {
      if (!r.ok) return Promise.reject(new Error('删除失败'));
      return r.json();
    })
    .then(function () {
      // Remove from local list
      _analysisRecords = _analysisRecords.filter(function (r) { return r.id !== recordId; });
      renderAnalysisRecords();
    })
    .catch(function (err) {
      alert('删除失败: ' + err.message);
    });
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
