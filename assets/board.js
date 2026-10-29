/* CC 工作台 — 留言板 */

var _boardMsgs = [];
var _boardLoading = false;

function boardApiUrl() {
  return apiUrl('/v1/board');
}

function boardHeaders() {
  return apiHeaders();
}

function boardAuthorField(id) {
  return '<label class="board-name-field" for="' + id + '">' +
    '<span>你的名称 <span class="board-name-required">必填</span></span>' +
    '<input class="board-author-input" id="' + id + '" name="author" type="text" placeholder="请输入你的名称" maxlength="50" autocomplete="off" required>' +
    '</label>';
}

function bindBoardValidation(form) {
  form.querySelectorAll('input, textarea').forEach(function (input) {
    input.addEventListener('input', function () { input.setCustomValidity(''); });
  });
}

function boardSubmission(form) {
  var authorInput = form.querySelector('[name="author"]');
  var textInput = form.querySelector('textarea');
  var author = authorInput.value.trim();
  var text = textInput.value.trim();
  authorInput.setCustomValidity(author ? '' : '请先填写你的名称');
  textInput.setCustomValidity(text ? '' : '请先填写内容');
  if (!form.reportValidity()) return null;
  return { text: text, author: author };
}

function resetBoardForm(form) {
  form.reset();
  form.querySelectorAll('input, textarea').forEach(function (input) { input.setCustomValidity(''); });
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
        boardAuthorField('board-author') +
        '<textarea class="board-input" id="board-input" aria-label="留言内容" placeholder="写点什么…" rows="3" maxlength="1000" required></textarea>' +
        '<div class="board-form-foot">' +
          '<span class="board-count" id="board-count">0/1000</span>' +
          '<button class="board-btn" type="submit" id="board-submit">发布</button>' +
        '</div>' +
      '</form>' +
      '<div class="board-list" id="board-list">' +
        '<div class="dash-loading" style="padding:40px 0">加载中…</div>' +
      '</div>' +
    '</div>';

  var postForm = document.getElementById('board-form');
  bindBoardValidation(postForm);
  postForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('board-submit');
    if (btn.disabled) return;
    var submission = boardSubmission(postForm);
    if (!submission) return;
    btn.disabled = true;
    btn.textContent = '发布中…';
    fetch(boardApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': boardHeaders()['Authorization'] },
      body: JSON.stringify(submission)
    })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('发布失败')); })
    .then(function () {
      resetBoardForm(postForm);
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
        '<button class="board-reply-toggle" aria-expanded="false" aria-controls="brf-' + m.id + '" data-id="' + m.id + '">💬 回复</button>' +
      '</div>' +
      repliesHtml +
      '<form class="board-reply-form" id="brf-' + m.id + '" data-id="' + m.id + '" style="display:none">' +
        boardAuthorField('board-reply-author-' + m.id) +
        '<textarea class="board-reply-input" aria-label="回复内容" placeholder="写下回复…" rows="2" maxlength="500" required></textarea>' +
        '<div class="board-reply-foot">' +
          '<button class="board-reply-cancel" type="button" data-id="' + m.id + '">取消</button>' +
          '<button class="board-reply-submit" type="submit" data-id="' + m.id + '">回复</button>' +
        '</div>' +
      '</form>' +
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
      if (form) {
        var open = form.style.display === 'none';
        form.style.display = open ? 'block' : 'none';
        btn.setAttribute('aria-expanded', String(open));
        if (open) form.querySelector('[name="author"]').focus();
      }
    });
  });

  // Cancel reply
  document.querySelectorAll('.board-reply-cancel').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = parseInt(this.dataset.id);
      var form = document.getElementById('brf-' + id);
      if (form) {
        form.style.display = 'none';
        resetBoardForm(form);
        var toggle = document.querySelector('.board-reply-toggle[data-id="' + id + '"]');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  });

  // Submit reply
  document.querySelectorAll('.board-reply-form').forEach(function (form) {
    bindBoardValidation(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = parseInt(form.dataset.id);
      var btn = form.querySelector('.board-reply-submit');
      if (btn.disabled) return;
      var submission = boardSubmission(form);
      if (!submission) return;
      btn.disabled = true;
      btn.textContent = '发送中…';
      fetch(boardApiUrl() + '/' + id + '/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': boardHeaders()['Authorization'] },
        body: JSON.stringify(submission)
      })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('回复失败')); })
      .then(function () {
        resetBoardForm(form);
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
