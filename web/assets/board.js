/* CC 工作台 — 留言板 */

var _boardMsgs = [];
var _boardLoading = false;

function boardApiUrl() {
  return apiUrl('/v1/board');
}

function boardHeaders() {
  return apiHeaders();
}

function loadBoardMessages() {
  if (_boardLoading) return;
  _boardLoading = true;
  var body = document.getElementById('board-body');
  if (body) body.querySelector('.board-list') && (body.querySelector('.board-list').innerHTML = '<div class="dash-loading" style="padding:40px 0">加载中…</div>');
  fetch(boardApiUrl(), { headers: boardHeaders() })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('加载失败')); })
    .then(function (data) {
      _boardMsgs = data.messages || [];
      renderBoardList();
    })
    .catch(function () {
      var el = document.getElementById('board-list');
      if (el) el.innerHTML = '<div class="board-empty" style="padding:40px 0;color:var(--terracotta)">加载失败</div>';
    })
    .then(function () { _boardLoading = false; });
}

function renderBoard() {
  var body = document.getElementById('board-body');
  if (!body) return;

  body.innerHTML =
    '<div class="board-wrap">' +
      '<div class="board-header">' +
        '<h2 class="board-title">留言板</h2>' +
        '<p class="board-sub">记录想法、备注、待办事项</p>' +
      '</div>' +
      '<form class="board-form" id="board-form">' +
        '<textarea class="board-input" id="board-input" placeholder="写点什么…" rows="3" maxlength="1000"></textarea>' +
        '<div class="board-form-foot">' +
          '<span class="board-count" id="board-count">0/1000</span>' +
          '<button class="board-btn" type="submit" id="board-submit">发布</button>' +
        '</div>' +
      '</form>' +
      '<div class="board-list" id="board-list">' +
        '<div class="dash-loading" style="padding:40px 0">加载中…</div>' +
      '</div>' +
    '</div>';

  document.getElementById('board-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = document.getElementById('board-input');
    var text = input.value.trim();
    if (!text) return;
    var btn = document.getElementById('board-submit');
    btn.disabled = true;
    btn.textContent = '发布中…';
    fetch(boardApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': boardHeaders()['Authorization'] },
      body: JSON.stringify({ text: text, author: 'CC' })
    })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('发布失败')); })
    .then(function () {
      input.value = '';
      document.getElementById('board-count').textContent = '0/1000';
      loadBoardMessages();
    })
    .catch(function () {
      alert('发布失败，请重试');
    })
    .then(function () {
      btn.disabled = false;
      btn.textContent = '发布';
    });
  });

  var input = document.getElementById('board-input');
  if (input) {
    input.addEventListener('input', function () {
      var count = document.getElementById('board-count');
      if (count) count.textContent = input.value.length + '/1000';
    });
  }

  loadBoardMessages();
}

function renderBoardList() {
  var el = document.getElementById('board-list');
  if (!el) return;
  if (_boardMsgs.length === 0) {
    el.innerHTML = '<div class="board-empty">' + randomBearImg(48, 10) + '<span style="margin-top:12px">还没有留言，写一条吧</span></div>';
    return;
  }
  el.innerHTML = _boardMsgs.map(function (m) {
    var repliesHtml = '';
    if (m.replies && m.replies.length > 0) {
      repliesHtml = '<div class="board-replies">' +
        m.replies.map(function (r) {
          return '<div class="board-reply">' +
            '<span class="board-reply-author">↳ ' + escapeHtml(r.author || 'CC') + '</span>' +
            '<span class="board-reply-time">' + r.time + '</span>' +
            '<button class="board-reply-del" data-rid="' + r.id + '">✕</button>' +
            '<div class="board-reply-text">' + escapeHtml(r.text) + '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    }
    return '<div class="board-item" id="bi-' + m.id + '">' +
      '<div class="board-item-head">' +
        '<span class="board-item-author">' + escapeHtml(m.author || 'CC') + '</span>' +
        '<span class="board-item-time">' + m.time + '</span>' +
        '<button class="board-item-del" data-id="' + m.id + '">✕</button>' +
      '</div>' +
      '<div class="board-item-body">' + escapeHtml(m.text) + '</div>' +
      '<div class="board-item-actions">' +
        '<button class="board-like-btn' + (m.liked ? ' liked' : '') + '" data-id="' + m.id + '">' +
          (m.liked ? '❤' : '♡') + ' <span class="board-like-cnt">' + (m.likes || 0) + '</span>' +
        '</button>' +
        '<button class="board-reply-toggle" data-id="' + m.id + '">💬 回复</button>' +
      '</div>' +
      repliesHtml +
      '<div class="board-reply-form" id="brf-' + m.id + '" style="display:none">' +
        '<textarea class="board-reply-input" placeholder="写下回复…" rows="2" maxlength="500"></textarea>' +
        '<div class="board-reply-foot">' +
          '<button class="board-reply-cancel" data-id="' + m.id + '">取消</button>' +
          '<button class="board-reply-submit" data-id="' + m.id + '">回复</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  bindBoardEvents();
}

function bindBoardEvents() {
  // Delete message
  document.querySelectorAll('.board-item-del').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(this.dataset.id);
      if (!confirm('确定删除这条留言？')) return;
      fetch(boardApiUrl() + '/' + id, {
        method: 'DELETE',
        headers: boardHeaders()
      })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('删除失败')); })
      .then(function () { loadBoardMessages(); })
      .catch(function () { alert('删除失败'); });
    });
  });

  // Like toggle
  document.querySelectorAll('.board-like-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(this.dataset.id);
      var isLiked = this.classList.contains('liked');
      fetch(boardApiUrl() + '/' + id + '/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': boardHeaders()['Authorization'] },
        body: JSON.stringify({ action: isLiked ? 'unlike' : 'like' })
      })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('操作失败')); })
      .then(function (data) {
        var msg = _boardMsgs.find(function (m) { return m.id === id; });
        if (msg) {
          msg.likes = data.likes;
          msg.liked = !isLiked;
          renderBoardList();
        }
      })
      .catch(function () { alert('操作失败'); });
    });
  });

  // Toggle reply form
  document.querySelectorAll('.board-reply-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(this.dataset.id);
      var form = document.getElementById('brf-' + id);
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  });

  // Cancel reply
  document.querySelectorAll('.board-reply-cancel').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(this.dataset.id);
      var form = document.getElementById('brf-' + id);
      if (form) { form.style.display = 'none'; form.querySelector('textarea').value = ''; }
    });
  });

  // Submit reply
  document.querySelectorAll('.board-reply-submit').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(this.dataset.id);
      var form = document.getElementById('brf-' + id);
      var input = form.querySelector('textarea');
      var text = input.value.trim();
      if (!text) return;
      btn.disabled = true;
      btn.textContent = '发送中…';
      fetch(boardApiUrl() + '/' + id + '/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': boardHeaders()['Authorization'] },
        body: JSON.stringify({ text: text, author: 'CC' })
      })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('回复失败')); })
      .then(function () {
        input.value = '';
        form.style.display = 'none';
        loadBoardMessages();
      })
      .catch(function () { alert('回复失败'); })
      .then(function () { btn.disabled = false; btn.textContent = '回复'; });
    });
  });

  // Delete reply
  document.querySelectorAll('.board-reply-del').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var rid = parseInt(this.dataset.rid);
      if (!confirm('确定删除这条回复？')) return;
      fetch(boardApiUrl() + '/reply/' + rid, {
        method: 'DELETE',
        headers: boardHeaders()
      })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('删除失败')); })
      .then(function () { loadBoardMessages(); })
      .catch(function () { alert('删除失败'); });
    });
  });
}
