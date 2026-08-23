/* CC 工作台 — 布局切换器 (Classic ↔ macOS) + 背景上传 + 菜单栏toggle */
;(function () {
  var LAYOUT_KEY = 'cc-layout';
  var WALLPAPER_KEY = 'cc-wallpaper';

  var DOCK_ITEMS = [
    { panel: 'dashboard', icon: '✓', label: '工作面板', key: '1' },
    { panel: 'toolbox',   icon: '◇', label: '工具箱', key: '2' },
    { panel: 'board',     icon: '✦', label: '留言板', key: '3' },
    { panel: 'memo',      icon: '✎', label: '备忘录', key: '4' },
    { panel: 'analysis',  icon: '↗', label: '数据分析', key: '5' }
  ];

  var DOCK_COLORS = [
    'linear-gradient(145deg, #2bc7b6, #119f94)',
    'linear-gradient(145deg, #f0bd58, #dd8f42)',
    'linear-gradient(145deg, #70a7df, #597fc0)',
    'linear-gradient(145deg, #e7909b, #c96778)',
    'linear-gradient(145deg, #8f85cf, #665da9)'
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
        '<span class="layout-toggle-icon">' + (isMac ? '☰' : '▦') + '</span>' +
        '<span>' + (isMac ? '经典视图' : '桌面视图') + '</span>';
      btn.setAttribute('aria-label', isMac ? '切换到经典视图' : '切换到桌面视图');
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
    btn.innerHTML = '<span aria-hidden="true">▧</span><span>壁纸</span>';
    btn.title = '更换桌面壁纸';
    btn.type = 'button';
    btn.setAttribute('aria-label', '更换桌面壁纸');

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
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'mac-dock-item';
        el.dataset.panel = item.panel;
        el.title = item.label + '（Alt+' + item.key + '）';
        el.setAttribute('aria-label', item.label);

        var icon = document.createElement('span');
        icon.className = 'mac-dock-icon';
        icon.textContent = item.icon;
        icon.style.background = DOCK_COLORS[idx];

        var label = document.createElement('span');
        label.className = 'mac-dock-label';
        label.textContent = item.label;

        var shortcut = document.createElement('span');
        shortcut.className = 'mac-dock-shortcut';
        shortcut.textContent = item.key;

        el.appendChild(icon);
        el.appendChild(label);
        el.appendChild(shortcut);

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
      items[i].classList.toggle('active', isActive);
      items[i].setAttribute('aria-current', isActive ? 'page' : 'false');
      if (icon) icon.classList.toggle('active', isActive);
    }

    var item = DOCK_ITEMS.find(function (entry) { return entry.panel === panelId; });
    var activeSub = document.querySelector('.nav-sub.active');
    var panelTitle = item ? item.label : 'CC 工作台';
    if (activeSub && activeSub.textContent.trim() && activeSub.closest('.nav-group')?.querySelector('.nav-item')?.dataset.panel === panelId) {
      panelTitle += ' · ' + activeSub.textContent.trim();
    }
    activePanel.dataset.macTitle = panelTitle;
    activePanel.dataset.macEyebrow = 'CC WORKSPACE';
    var activeBody = activePanel.querySelector('.panel-body');
    if (activeBody) activeBody.dataset.macEyebrow = 'CC WORKSPACE';
  }

  function createMacStatus() {
    var status = document.createElement('div');
    status.id = 'mac-status';
    status.setAttribute('aria-label', '当前时间');
    status.innerHTML = '<span class="mac-status-dot"></span><span id="mac-status-date"></span><strong id="mac-status-time"></strong>';

    function update() {
      var now = new Date();
      var date = document.getElementById('mac-status-date');
      var time = document.getElementById('mac-status-time');
      if (date) date.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日 周' + '日一二三四五六'[now.getDay()];
      if (time) time.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }
    update();
    setInterval(update, 30000);
    return status;
  }

  function applyDockShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (getLayout() !== 'mac' || !e.altKey || e.metaKey || e.ctrlKey) return;
      var pressedKey = e.code && e.code.indexOf('Digit') === 0 ? e.code.replace('Digit', '') : e.key;
      var item = DOCK_ITEMS.find(function (entry) { return entry.key === pressedKey; });
      if (!item) return;
      var target = e.target;
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      e.preventDefault();
      if (typeof switchPanel === 'function') switchPanel(item.panel);
      updateDockActive();
    });
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

      // Only the chevron toggles a submenu. Clicking the label/icon is reserved
      // for switching workspace, so a dropdown never opens unexpectedly.
      var chevron = e.target.closest('.nav-chevron');
      if (chevron) {
        var item = chevron.closest('.nav-item');
        var group = item && item.closest('.nav-group');
        if (!group) return;
        var wasOpen = group.classList.contains('open');
        document.querySelectorAll('.nav-group').forEach(function (g) { g.classList.remove('open'); });
        if (!wasOpen) group.classList.add('open');
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      // A main menu click switches workspace through app.js and keeps menus closed.
      if (e.target.closest('.nav-item')) {
        document.querySelectorAll('.nav-group').forEach(function (g) { g.classList.remove('open'); });
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
    btn.type = 'button';
    btn.innerHTML = '<span class="layout-toggle-icon">▦</span><span>桌面视图</span>';
    btn.title = '切换桌面 / 经典视图';

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

    var nav = document.querySelector('.nav-bar');
    if (nav) nav.appendChild(createMacStatus());

    applyLayout(saved);
    applyMacMenuBehavior();
    applyDockShortcuts();
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
