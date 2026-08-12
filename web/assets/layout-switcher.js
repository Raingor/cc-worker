/* CC 工作台 — 布局切换器 (Classic ↔ macOS) + 背景上传 + 菜单栏toggle */
;(function () {
  var LAYOUT_KEY = 'cc-layout';
  var WALLPAPER_KEY = 'cc-wallpaper';

  var DOCK_ITEMS = [
    { panel: 'dashboard', icon: '📋', label: '工作面板' },
    { panel: 'board',     icon: '💬', label: '留言板' },
    { panel: 'memo',      icon: '📝', label: '备忘录' }
  ];

  var DOCK_COLORS = [
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  ];

  function getLayout() {
    return localStorage.getItem(LAYOUT_KEY) || 'classic';
  }
  function getWallpaper() {
    return localStorage.getItem(WALLPAPER_KEY) || '';
  }

  function setLayout(mode) {
    localStorage.setItem(LAYOUT_KEY, mode);
    applyLayout(mode);
  }

  function applyLayout(mode) {
    var root = document.documentElement;
    root.setAttribute('data-layout', mode);

    var btn = document.querySelector('.layout-toggle');
    if (btn) {
      var isMac = mode === 'mac';
      btn.innerHTML =
        '<span class="layout-toggle-icon">' + (isMac ? '☰' : '🖥') + '</span>' +
        (isMac ? '经典' : '桌面');
    }

    var dock = document.getElementById('mac-dock');
    if (dock) dock.style.display = mode === 'mac' ? 'flex' : 'none';

    var wb = document.getElementById('wallpaper-btn');
    if (wb) wb.style.display = mode === 'mac' ? 'flex' : 'none';

    applyWallpaper();
    updateDockActive();
  }

  function applyWallpaper() {
    var data = getWallpaper();
    var main = document.querySelector('.app-main');
    if (main) {
      if (data) {
        main.style.backgroundImage = 'url(' + data + ')';
        main.style.backgroundSize = 'cover';
        main.style.backgroundPosition = 'center';
      } else {
        main.style.backgroundImage = '';
        main.style.backgroundSize = '';
        main.style.backgroundPosition = '';
      }
    }
  }

  /* ── Wallpaper upload ── */
  function createWallpaperBtn() {
    var wrap = document.createElement('div');
    wrap.id = 'wallpaper-btn';
    wrap.style.display = 'none';

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    var btn = document.createElement('button');
    btn.className = 'wallpaper-toggle';
    btn.innerHTML = '壁纸';
    btn.title = '更换壁纸';

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var has = getWallpaper();
      if (has) {
        // Toggle: show menu with set/remove
        var menu = document.getElementById('wallpaper-menu');
        if (menu) {
          menu.classList.toggle('open');
          return;
        }
        var m = document.createElement('div');
        m.id = 'wallpaper-menu';
        m.className = 'wallpaper-menu';
        m.innerHTML =
          '<div class="wallpaper-menu-item" id="wp-change">更换壁纸</div>' +
          '<div class="wallpaper-menu-item" id="wp-remove">移除壁纸</div>';
        wrap.appendChild(m);

        document.getElementById('wp-change').addEventListener('click', function () {
          input.click();
          m.classList.remove('open');
        });
        document.getElementById('wp-remove').addEventListener('click', function () {
          localStorage.removeItem(WALLPAPER_KEY);
          applyWallpaper();
          m.classList.remove('open');
        });

        document.addEventListener('click', function closeWp(e) {
          if (!e.target.closest('#wallpaper-btn')) {
            var mm = document.getElementById('wallpaper-menu');
            if (mm) mm.classList.remove('open');
            document.removeEventListener('click', closeWp);
          }
        });

        setTimeout(function () { m.classList.add('open'); }, 10);
      } else {
        input.click();
      }
    });

    input.addEventListener('change', function () {
      if (!this.files || !this.files[0]) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        localStorage.setItem(WALLPAPER_KEY, e.target.result);
        applyWallpaper();
      };
      reader.readAsDataURL(this.files[0]);
    });

    wrap.appendChild(btn);
    wrap.appendChild(input);
    return wrap;
  }

  /* ── Dock ── */
  function createDock() {
    var dock = document.createElement('div');
    dock.id = 'mac-dock';
    dock.className = 'mac-dock';
    dock.style.display = 'none';

    for (var i = 0; i < DOCK_ITEMS.length; i++) {
      (function (item, idx) {
        var el = document.createElement('div');
        el.className = 'mac-dock-item';
        el.dataset.panel = item.panel;

        var icon = document.createElement('div');
        icon.className = 'mac-dock-icon';
        icon.textContent = item.icon;
        icon.style.background = DOCK_COLORS[idx];

        var label = document.createElement('span');
        label.className = 'mac-dock-label';
        label.textContent = item.label;

        el.appendChild(icon);
        el.appendChild(label);

        el.addEventListener('click', function () {
          if (typeof switchPanel === 'function') {
            switchPanel(item.panel);
          }
          updateDockActive();
        });

        dock.appendChild(el);
      })(DOCK_ITEMS[i], i);
    }

    return dock;
  }

  function updateDockActive() {
    var activePanel = document.querySelector('.panel.active');
    if (!activePanel) return;
    var panelId = activePanel.id.replace('panel-', '');
    var items = document.querySelectorAll('.mac-dock-item');
    for (var i = 0; i < items.length; i++) {
      var icon = items[i].querySelector('.mac-dock-icon');
      var isActive = items[i].dataset.panel === panelId;
      if (icon) icon.classList.toggle('active', isActive);
    }
  }

  function observePanels() {
    var main = document.querySelector('.app-main');
    if (!main) return;
    var observer = new MutationObserver(function () {
      if (getLayout() === 'mac') updateDockActive();
    });
    observer.observe(main, { attributes: true, attributeFilter: ['class'], subtree: true });
  }

  /* ── macOS 菜单栏: click to toggle dropdown ── */
  function applyMacMenuBehavior() {
    document.addEventListener('click', function (e) {
      if (getLayout() !== 'mac') return;

      // Toggle nav-group dropdown on nav-item click
      var item = e.target.closest('.nav-item');
      if (item) {
        var group = item.closest('.nav-group');
        if (!group) return;
        var wasOpen = group.classList.contains('open');
        // Close all
        document.querySelectorAll('.nav-group').forEach(function (g) { g.classList.remove('open'); });
        if (!wasOpen) group.classList.add('open');
        e.stopPropagation();
        return;
      }

      // Click inside dropdown: don't close
      if (e.target.closest('.nav-dropdown')) return;

      // Click anywhere else: close all
      document.querySelectorAll('.nav-group').forEach(function (g) { g.classList.remove('open'); });
    });
  }

  /* ── Toggle button ── */
  function createToggle() {
    var wrap = document.createElement('div');
    wrap.id = 'layout-switcher';

    var btn = document.createElement('button');
    btn.className = 'layout-toggle';
    btn.innerHTML = '<span class="layout-toggle-icon">🖥</span> 桌面';

    btn.addEventListener('click', function () {
      var current = getLayout();
      var next = current === 'mac' ? 'classic' : 'mac';
      setLayout(next);
      // Close all dropdowns when switching
      document.querySelectorAll('.nav-group').forEach(function (g) { g.classList.remove('open'); });
    });

    wrap.appendChild(btn);
    return wrap;
  }

  function init() {
    var saved = getLayout();
    var dock = createDock();
    var toggle = createToggle();
    var wpBtn = createWallpaperBtn();

    document.body.appendChild(dock);
    document.body.appendChild(toggle);
    document.body.appendChild(wpBtn);

    applyLayout(saved);
    applyMacMenuBehavior();
    observePanels();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-item') || e.target.closest('.nav-sub')) {
        setTimeout(updateDockActive, 50);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
