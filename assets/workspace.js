/* A quiet, single workspace. Navigation state stays independent of server data. */
(function () {
  'use strict';
  const pages = {
    dashboard: { label: '工作面板', tabs: [['tasks', '今日任务'], ['calendar', '工作日历'], ['history', '每日总结']] },
    memo: { label: '备忘录', hint: '留住每一个值得记下的想法' },
    board: { label: '留言板', hint: '沟通、记录，让协作有迹可循' },
    toolbox: { label: '工具箱', hint: '少一点重复，多一点效率' },
    analysis: { label: '数据分析', hint: '从数据到洞察，从洞察到行动' },
    agnes: { label: 'Agnes 创作室', hint: '为想象，留一点空间' }
  };

  function syncNavigation() {
    const nav = document.querySelector('.nav-bar');
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    nav.inert = mobile ? !document.body.classList.contains('sidebar-open') : document.body.classList.contains('workspace-focused');
    if (mobile && nav.inert && nav.contains(document.activeElement)) document.getElementById('mobile-menu-btn').focus();
    if (!mobile && document.body.classList.contains('sidebar-open')) toggleMobileMenu(false);
  }

  function sync(panel, tab) {
    const page = pages[panel] || pages.dashboard;
    document.getElementById('workspace-current').textContent = page.label;
    document.title = page.label + ' · CC 工作台';
    const nav = document.getElementById('workspace-tabs');
    nav.replaceChildren();
    nav.setAttribute('aria-label', page.label + '分区');
    if (page.tabs) {
      page.tabs.forEach(([id, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'workspace-tab';
        button.textContent = label;
        const active = id === (tab || 'tasks');
        button.classList.toggle('active', active);
        if (active) button.setAttribute('aria-current', 'page');
        button.addEventListener('click', () => switchPanel(panel, id));
        nav.appendChild(button);
      });
    } else {
      const hint = document.createElement('span');
      hint.className = 'workspace-tab-hint';
      hint.textContent = page.hint;
      nav.appendChild(hint);
    }
    document.querySelectorAll('.nav-item').forEach(button => {
      if (button.dataset.panel === panel) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function initWorkspace() {
    // Migrate both former layouts into one spacious, responsive shell.
    document.documentElement.setAttribute('data-layout', 'workspace');
    const focus = document.getElementById('focus-toggle');
    focus.addEventListener('click', () => {
      const focused = document.body.classList.toggle('workspace-focused');
      focus.setAttribute('aria-pressed', String(focused));
      focus.querySelector('span').textContent = focused ? '显示侧栏' : '专注模式';
      syncNavigation();
    });
    document.querySelector('.nav-brand').addEventListener('click', event => {
      event.preventDefault();
      switchPanel('dashboard', 'tasks');
      toggleMobileMenu(false);
    });
    function updateDate() {
      document.getElementById('workspace-date').textContent = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    }
    updateDate();
    setInterval(updateDate, 60000);
    window.matchMedia('(max-width: 767px)').addEventListener('change', syncNavigation);
    syncNavigation();
    const active = document.querySelector('.panel.active');
    sync(active ? active.id.replace('panel-', '') : 'dashboard');

    document.addEventListener('keydown', event => {
      if (locked) {
        if (event.key === 'Tab') { event.preventDefault(); document.querySelector('.lock-bear').focus(); }
        return;
      }
      if (event.key === 'Escape') {
        const theme = document.getElementById('theme-panel');
        if (theme && theme.classList.contains('open')) {
          theme.classList.remove('open');
          document.getElementById('theme-btn').setAttribute('aria-expanded', 'false');
          document.getElementById('theme-btn').focus();
        }
        document.querySelectorAll('.memo-modal.open').forEach(modal => modal.classList.remove('open'));
      }
      if (event.key === 'Tab' && document.body.classList.contains('sidebar-open') && window.innerWidth < 768) {
        const controls = [document.getElementById('mobile-menu-btn'), ...document.querySelectorAll('.nav-bar a, .nav-bar button:not([disabled])')].filter(el => el.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      if (!event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
      const panel = ['dashboard', 'memo', 'board', 'toolbox', 'analysis', 'agnes'][Number(event.code.replace('Digit', '')) - 1];
      if (panel && !locked) { event.preventDefault(); switchPanel(panel); }
    });
  }
  window.CCWorkspace = { sync, syncNavigation };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWorkspace);
  else initWorkspace();
})();
