/* CC 工作台 — 备忘录 */

var _memoGroups = [];
var _memoLoading = false;

function memoApiUrl() {
  return apiUrl('/v1/memos');
}

function memoHeaders() {
  return apiHeaders();
}

function loadMemos() {
  if (_memoLoading) return;
  _memoLoading = true;
  var list = document.getElementById('memo-list');
  if (list) list.innerHTML = '<div class="dash-loading" style="padding:40px 0">加载中…</div>';
  fetch(memoApiUrl(), { headers: memoHeaders() })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('加载失败')); })
    .then(function (data) {
      _memoGroups = data.groups || [];
      renderMemoList();
    })
    .catch(function () {
      var el = document.getElementById('memo-list');
      if (el) el.innerHTML = '<div class="board-empty" style="padding:40px 0;color:var(--terracotta)">加载失败</div>';
    })
    .then(function () { _memoLoading = false; });
}

function renderMemo() {
  var body = document.getElementById('memo-body');
  if (!body) return;

  body.innerHTML =
    '<div class="memo-wrap">' +
      '<div class="memo-header">' +
        '<h2 class="memo-title">备忘录</h2>' +
        '<p class="memo-sub">随手记，按日期分组</p>' +
      '</div>' +
      '<button class="memo-add-btn" id="memo-add-btn">+ 新建备忘</button>' +
      '<div class="memo-list" id="memo-list">' +
        '<div class="dash-loading" style="padding:40px 0">加载中…</div>' +
      '</div>' +
    '</div>';

  // Modal for add/edit
  var modal = document.createElement('div');
  modal.className = 'memo-modal';
  modal.id = 'memo-modal';
  modal.innerHTML =
    '<div class="memo-modal-overlay"></div>' +
    '<div class="memo-modal-content">' +
      '<button class="memo-modal-close">✕</button>' +
      '<h3 class="memo-modal-title" id="memo-modal-title">新建备忘</h3>' +
      '<input class="memo-modal-input" id="memo-modal-input" placeholder="标题（可选）" maxlength="200">' +
      '<textarea class="memo-modal-text" id="memo-modal-text" placeholder="写点什么…" rows="6" maxlength="5000"></textarea>' +
      '<div class="memo-modal-foot">' +
        '<button class="memo-modal-cancel">取消</button>' +
        '<button class="memo-modal-save" id="memo-modal-save">保存</button>' +
      '</div>' +
    '</div>';
  body.appendChild(modal);

  document.getElementById('memo-add-btn').addEventListener('click', function () {
    document.getElementById('memo-modal-title').textContent = '新建备忘';
    document.getElementById('memo-modal-input').value = '';
    document.getElementById('memo-modal-text').value = '';
    document.getElementById('memo-modal-save').dataset.id = '';
    modal.classList.add('open');
    setTimeout(function () { document.getElementById('memo-modal-text').focus(); }, 200);
  });

  modal.querySelector('.memo-modal-overlay').addEventListener('click', function () { modal.classList.remove('open'); });
  modal.querySelector('.memo-modal-close').addEventListener('click', function () { modal.classList.remove('open'); });
  modal.querySelector('.memo-modal-cancel').addEventListener('click', function () { modal.classList.remove('open'); });

  document.getElementById('memo-modal-save').addEventListener('click', function () {
    var mid = this.dataset.id;
    var title = document.getElementById('memo-modal-input').value.trim();
    var content = document.getElementById('memo-modal-text').value.trim();
    if (!content) return;
    var btn = this;
    btn.disabled = true;
    btn.textContent = '保存中…';
    var url = memoApiUrl();
    var method = 'POST';
    if (mid) { url += '/' + mid; method = 'PUT'; }
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': memoHeaders()['Authorization'] },
      body: JSON.stringify({ title: title, content: content })
    })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('保存失败')); })
    .then(function () {
      modal.classList.remove('open');
      loadMemos();
    })
    .catch(function () { alert('保存失败'); })
    .then(function () { btn.disabled = false; btn.textContent = '保存'; });
  });

  loadMemos();
}

function renderMemoList() {
  var el = document.getElementById('memo-list');
  if (!el) return;
  if (_memoGroups.length === 0) {
    el.innerHTML = '<div class="board-empty">' + randomBearImg(48, 10) + '<span style="margin-top:12px">还没有备忘，新建一条吧</span></div>';
    return;
  }
  el.innerHTML = _memoGroups.map(function (g) {
    var dateLabel = g.date;
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    if (g.date === todayStr) dateLabel = '今天';
    else if (g.date === yesterdayStr) dateLabel = '昨天';
    else {
      var d = g.date.split('-');
      dateLabel = parseInt(d[1]) + '月' + parseInt(d[2]) + '日';
    }
    return '<div class="memo-group">' +
      '<div class="memo-group-date">' + dateLabel + ' <span class="memo-group-sub">' + g.date + '</span></div>' +
      '<div class="memo-group-list">' +
        g.memos.map(function (m) {
          return '<div class="memo-item" data-id="' + m.id + '">' +
            '<div class="memo-item-head">' +
              (m.title ? '<div class="memo-item-title">' + escapeHtml(m.title) + '</div>' : '') +
              '<span class="memo-item-time">' + m.time.slice(11, 16) + '</span>' +
              '<button class="memo-item-del" data-id="' + m.id + '">✕</button>' +
            '</div>' +
            '<div class="memo-item-body">' + escapeHtml(m.content) + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }).join('');

  // Click memo to edit
  document.querySelectorAll('.memo-item').forEach(function (item) {
    item.addEventListener('click', function (e) {
      if (e.target.closest('.memo-item-del')) return;
      var mid = parseInt(this.dataset.id);
      var memo;
      for (var i = 0; i < _memoGroups.length; i++) {
        for (var j = 0; j < _memoGroups[i].memos.length; j++) {
          if (_memoGroups[i].memos[j].id === mid) { memo = _memoGroups[i].memos[j]; break; }
        }
        if (memo) break;
      }
      if (!memo) return;
      document.getElementById('memo-modal-title').textContent = '编辑备忘';
      document.getElementById('memo-modal-input').value = memo.title || '';
      document.getElementById('memo-modal-text').value = memo.content;
      document.getElementById('memo-modal-save').dataset.id = mid;
      document.getElementById('memo-modal').classList.add('open');
    });
  });

  // Delete memo
  document.querySelectorAll('.memo-item-del').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var id = parseInt(this.dataset.id);
      if (!confirm('确定删除这条备忘？')) return;
      fetch(memoApiUrl() + '/' + id, {
        method: 'DELETE',
        headers: memoHeaders()
      })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('删除失败')); })
      .then(function () { loadMemos(); })
      .catch(function () { alert('删除失败'); });
    });
  });
}
