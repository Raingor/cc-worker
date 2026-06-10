/* CC 工作台 — 留言板 */

var BOARD_STORAGE_KEY = 'cc-board-messages';

function getBoardMessages() {
  try {
    var raw = localStorage.getItem(BOARD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveBoardMessages(msgs) {
  try { localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(msgs)); } catch (e) {}
}

function renderBoard() {
  var body = document.getElementById('board-body');
  if (!body) return;
  var msgs = getBoardMessages();

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
          '<button class="board-btn" type="submit">发布</button>' +
        '</div>' +
      '</form>' +
      '<div class="board-list" id="board-list">' +
        (msgs.length === 0
          ? '<div class="board-empty">' + randomBearImg(48, 10) + '<span style="margin-top:12px">还没有留言，写一条吧</span></div>'
          : msgs.map(function (m, i) {
              return '<div class="board-item">' +
                '<div class="board-item-head">' +
                  '<span class="board-item-author">' + escapeHtml(m.author || 'CC') + '</span>' +
                  '<span class="board-item-time">' + m.time + '</span>' +
                  '<button class="board-item-del" data-idx="' + i + '">✕</button>' +
                '</div>' +
                '<div class="board-item-body">' + escapeHtml(m.text) + '</div>' +
              '</div>';
            }).join('')) +
      '</div>' +
    '</div>';

  document.getElementById('board-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = document.getElementById('board-input');
    var text = input.value.trim();
    if (!text) return;
    var msgs = getBoardMessages();
    var now = new Date();
    var time = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    msgs.unshift({ text: text, time: time, author: 'CC' });
    saveBoardMessages(msgs);
    renderBoard();
  });

  var input = document.getElementById('board-input');
  if (input) {
    input.addEventListener('input', function () {
      var count = document.getElementById('board-count');
      if (count) count.textContent = input.value.length + '/1000';
    });
  }

  document.querySelectorAll('.board-item-del').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(this.dataset.idx);
      var msgs = getBoardMessages();
      msgs.splice(idx, 1);
      saveBoardMessages(msgs);
      renderBoard();
    });
  });
}
