/* CC 工作台 — quiet accent palettes */

var THEMES = [
  { id: 'default', label: '鼠尾草 · Sage', swatch: '#456655' },
  { id: 'sakura', label: '玫瑰陶 · Rose', swatch: '#965d68' },
  { id: 'meadow', label: '橄榄绿 · Olive', swatch: '#65713f' },
  { id: 'sunset', label: '赤陶橙 · Clay', swatch: '#a46140' },
  { id: 'lagoon', label: '雾海蓝 · Ocean', swatch: '#4c6f8b' },
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
  btn.innerHTML = '<span class="appearance-dot" aria-hidden="true"></span><span>外观配色</span><span class="appearance-chevron" aria-hidden="true">⌃</span>';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'theme-panel');

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
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
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
    btn.setAttribute('aria-expanded', String(panel.classList.contains('open')));
  });

  document.addEventListener('click', function () {
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  });

  panel.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  (document.getElementById('sidebar-preferences') || document.querySelector('.nav-bar')).appendChild(wrap);
  setTheme(saved);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}
