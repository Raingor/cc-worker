/* CC 工作台 — 布局切换器 (Classic ↔ macOS) */
;(function () {
  var LAYOUT_KEY = 'cc-layout';

  var DOCK_ITEMS = [
    { panel: 'dashboard', icon: '📋', label: '工作面板' },
    { panel: 'toolbox',   icon: '🧰', label: '工具箱' },
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

  function setLayout(mode) {
    localStorage.setItem(LAYOUT_KEY, mode);
    applyLayout(mode);
  }

  function applyLayout(mode) {
    var root = document.documentElement;
    root.setAttribute('data-layout', mode);

    // Update toggle button
    var btn = document.querySelector('.layout-toggle');
    if (btn) {
      var isMac = mode === 'mac';
      btn.innerHTML =
        '<span class="layout-toggle-icon">' + (isMac ? '☰' : '🖥') + '</span>' +
        (isMac ? '经典' : '桌面');
    }

    // Show/hide dock
    var dock = document.getElementById('mac-dock');
    if (dock) {
      dock.style.display = mode === 'mac' ? 'flex' : 'none';
    }

    // Update dock active state
    updateDockActive();
  }

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
    });

    wrap.appendChild(btn);
    return wrap;
  }

  // Observe panel switches to keep dock in sync
  function observePanels() {
    var main = document.querySelector('.app-main');
    if (!main) return;
    var observer = new MutationObserver(function () {
      if (getLayout() === 'mac') updateDockActive();
    });
    observer.observe(main, { attributes: true, attributeFilter: ['class'], subtree: true });
  }

  function init() {
    var saved = getLayout();
    var dock = createDock();
    var toggle = createToggle();

    document.body.appendChild(dock);
    document.body.appendChild(toggle);

    applyLayout(saved);
    observePanels();

    // Also listen for nav clicks to sync dock
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
