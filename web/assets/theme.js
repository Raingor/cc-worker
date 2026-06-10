/* CC 工作台 — 皮肤切换 */

var THEMES = [
  { id: 'default',  label: '暖白木色', swatch: '#f2efe8' },
  { id: 'midnight', label: '极夜暗黑', swatch: '#0f1117' },
  { id: 'sakura',   label: '樱花粉',   swatch: '#fdf0f0' },
  { id: 'neon',     label: '赛博霓虹', swatch: '#0b0a1a' },
  { id: 'caramel',  label: '黄油奶糖', swatch: '#faf3e0' },
];

function getTheme() {
  return localStorage.getItem('cc-theme') || 'default';
}

function setTheme(id) {
  document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem('cc-theme', id);
  var opts = document.querySelectorAll('.theme-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('active', opts[i].dataset.theme === id);
  }
}

function initTheme() {
  setTheme(getTheme());

  var btn = document.createElement('button');
  btn.id = 'theme-btn';
  btn.innerHTML = '<span style="font-size:14px;line-height:1">🎨</span> 主题';

  var panel = document.createElement('div');
  panel.id = 'theme-panel';

  for (var i = 0; i < THEMES.length; i++) {
    var t = THEMES[i];
    var opt = document.createElement('button');
    opt.className = 'theme-opt';
    opt.dataset.theme = t.id;
    opt.innerHTML =
      '<span class="theme-swatch" style="background:' + t.swatch + '"></span>' +
      '<span class="theme-opt-label">' + t.label + '</span>' +
      '<span class="theme-opt-check">✓</span>';
    opt.addEventListener('click', function (id) {
      return function () {
        setTheme(id);
        panel.classList.remove('open');
      };
    }(t.id));
    panel.appendChild(opt);
  }

  var wrap = document.createElement('div');
  wrap.id = 'theme-switcher';
  wrap.appendChild(btn);
  wrap.appendChild(panel);

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.classList.toggle('open');
  });

  document.addEventListener('click', function () {
    panel.classList.remove('open');
  });

  panel.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  document.body.appendChild(wrap);

  setTheme(getTheme());
}

document.addEventListener('DOMContentLoaded', initTheme);
