/* CC 工作台 — 岛屿主题切换 */

var THEMES = [
  { id: 'default', label: '薄荷青（默认）', swatch: '#19c8b9' },
  { id: 'sakura', label: '樱花粉', swatch: '#f8a6b2' },
  { id: 'meadow', label: '草地绿', swatch: '#8ac68a' },
  { id: 'sunset', label: '夕阳橙', swatch: '#e59266' },
  { id: 'lagoon', label: '湖水蓝', swatch: '#889df0' },
];

function getTheme() {
  var saved = localStorage.getItem('cc-theme');
  if (saved === 'midnight' || saved === 'neon' || saved === 'caramel') return 'default';
  return saved || 'default';
}

function setTheme(id) {
  if (id === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', id);
  }
  localStorage.setItem('cc-theme', id);
  var opts = document.querySelectorAll('.theme-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('active', opts[i].dataset.theme === id);
  }
}

function initTheme() {
  var saved = getTheme();

  var wrap = document.createElement('div');
  wrap.id = 'theme-switcher-wrap';

  var btn = document.createElement('button');
  btn.id = 'theme-btn';
  btn.type = 'button';
  btn.innerHTML = '<span style="font-size:14px;line-height:1">🍃</span> 岛屿主题';

  var panel = document.createElement('div');
  panel.id = 'theme-panel';

  for (var i = 0; i < THEMES.length; i++) {
    var t = THEMES[i];
    var opt = document.createElement('button');
    opt.type = 'button';
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

  var sw = document.createElement('div');
  sw.id = 'theme-switcher';
  sw.appendChild(btn);
  sw.appendChild(panel);
  wrap.appendChild(sw);

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

  document.querySelector('.nav-bar').appendChild(wrap);
  setTheme(saved);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}
