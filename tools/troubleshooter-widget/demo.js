// Demo page controller for the Guided Troubleshooter Widget
(function () {
  'use strict';
  var BASE = '/tools/troubleshooter-widget/templates/';
  var host = document.getElementById('demoWidget');
  var tabs = [].slice.call(document.querySelectorAll('[data-template]'));
  var current = 'slow-computer', floating = null;
  function render() {
    var dark = document.getElementById('optDark').checked, isFloat = document.getElementById('optFloat').checked;
    var opts = { tree: BASE + current + '.json', theme: dark ? 'dark' : 'light' };
    if (current === 'hebrew-sample-legacy-format') { opts.lang = 'he'; opts.title = 'פותר בעיות מחשב'; }
    if (floating) { floating.remove(); floating = null; }
    if (isFloat) {
      host.innerHTML = ''; if (host._gt) host._gt.destroy();
      floating = document.createElement('div'); document.body.appendChild(floating);
      opts.mode = 'floating'; GuidedTroubleshooter.mount(floating, opts);
    } else GuidedTroubleshooter.mount(host, opts);
    host.classList.toggle('hidden', isFloat);
    document.getElementById('floatNote').classList.toggle('hidden', !isFloat);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); select(n); }
    });
  });
  function select(t) {
    tabs.forEach(function (x) { x.setAttribute('aria-selected', String(x === t)); x.tabIndex = x === t ? 0 : -1; });
    current = t.dataset.template; render();
  }
  document.getElementById('optDark').addEventListener('change', render);
  document.getElementById('optFloat').addEventListener('change', render);
  render();
})();
