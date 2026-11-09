/* ISRS Tech Portal - Print Size & DPI Checker UI. Images are read locally only. */
(function () {
  'use strict';
  var C = window.PrintCalc;
  var $ = function (id) { return document.getElementById(id); };
  var fileInput = $('file-input'), dropzone = $('dropzone'), errorEl = $('error'),
      results = $('results'), statsEl = $('stats'), groupsEl = $('groups'), preview = $('preview');
  var currentUrl = null;

  function fmt(n, d) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 }); }
  function fix(n, d) { return Number(n).toFixed(d); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function showError(msg) { errorEl.textContent = msg; errorEl.classList.remove('hidden'); }
  function clearError() { errorEl.textContent = ''; errorEl.classList.add('hidden'); }

  /* Tabs */
  var tabs = [$('tab-upload'), $('tab-manual')];
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).classList.toggle('hidden', !on);
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        selectTab(next); next.focus();
      }
    });
  });

  /* Upload */
  function handleFile(file) {
    clearError();
    if (!file) return;
    if (!/^image\//.test(file.type)) { showError('That file is not an image. Please choose a JPG, PNG, WebP, GIF or AVIF file.'); return; }
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) { showError('Could not read the dimensions of this image.'); return; }
      preview.textContent = '';
      img.alt = 'Preview of ' + file.name;
      preview.appendChild(img);
      render(w, h, file.name, file.size);
    };
    img.onerror = function () {
      showError('Your browser could not open this image (TIFF and PSD files are not supported). Export a JPG or PNG, or use "Enter pixels" instead.');
    };
    img.src = currentUrl;
  }
  fileInput.addEventListener('change', function () { handleFile(fileInput.files[0]); });
  ['dragenter', 'dragover'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('drag'); });
  });
  dropzone.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  dropzone.tabIndex = 0;

  /* Manual */
  $('manual-form').addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();
    var w = Number($('px-w').value), h = Number($('px-h').value);
    if (!C.validatePixels(w, h)) { showError('Enter a whole number of pixels (1 or more) for both width and height.'); return; }
    if (w > 200000 || h > 200000) { showError('Please enter dimensions of 200,000 pixels or less.'); return; }
    preview.textContent = '';
    preview.appendChild(el('span', null, w + ' \u00d7 ' + h + ' px'));
    render(w, h);
    if (history.replaceState) history.replaceState(null, '', '?w=' + w + '&h=' + h);
  });

  function stat(k, v, s) {
    var d = el('div', 'stat');
    d.appendChild(el('div', 'k', k));
    d.appendChild(el('div', 'v', v));
    if (s) d.appendChild(el('div', 's', s));
    return d;
  }
  function sizeText(m) { return fix(m.wIn, 2) + ' \u00d7 ' + fix(m.hIn, 2) + ' in'; }
  function sizeCm(m) { return fix(m.wCm, 1) + ' \u00d7 ' + fix(m.hCm, 1) + ' cm'; }
  var BADGE = { pass: 'Pass', warn: 'Warn', fail: 'Fail' };

  function render(w, h, name, bytes) {
    var r = C.analyze(w, h);
    statsEl.textContent = '';
    statsEl.appendChild(stat('Dimensions', fmt(w) + ' \u00d7 ' + fmt(h) + ' px',
      (name ? name + (bytes ? ' \u00b7 ' + (bytes >= 1048576 ? fmt(bytes / 1048576, 1) + ' MB' : fmt(Math.max(1, Math.round(bytes / 1024)), 0) + ' KB') : '') : fix(r.megapixels, 1) + ' megapixels')));
    statsEl.appendChild(stat('Aspect ratio', r.ratio.a + ':' + r.ratio.b,
      r.orientation + ' \u00b7 ' + fix(r.ratioDecimal, 3) + ' : 1'));
    statsEl.appendChild(stat('Closest standard ratio', r.nearest.label.replace(' ratio', ''),
      r.nearest.matches ? 'Matches exactly' : 'Off by ' + fix(r.nearest.diff * 100, 1) + '%'));
    statsEl.appendChild(stat('Max size at 300 DPI', sizeText(r.max300), sizeCm(r.max300)));
    statsEl.appendChild(stat('Max size at 150 DPI', sizeText(r.max150), sizeCm(r.max150)));
    statsEl.appendChild(stat('Megapixels', fix(r.megapixels, 1) + ' MP'));

    groupsEl.textContent = '';
    r.groups.forEach(function (g) {
      var wrap = el('section', 'group');
      var head = el('div', 'group-head');
      head.appendChild(el('h3', null, g.label));
      head.appendChild(el('span', 'note', g.note));
      head.appendChild(el('span', g.ratioMatches ? 'tag' : 'tag muted', g.ratioMatches ? 'Your ratio' : 'Needs cropping'));
      wrap.appendChild(head);
      var tw = el('div', 'table-wrap');
      var t = el('table');
      var thead = el('thead'), tr = el('tr');
      ['Print size', 'Pixels for 300 DPI', 'Effective DPI', 'Quality', 'Ratio fit'].forEach(function (c) {
        var th = el('th', null, c); th.scope = 'col'; tr.appendChild(th);
      });
      thead.appendChild(tr); t.appendChild(thead);
      var tb = el('tbody');
      g.rows.forEach(function (row) {
        var tr2 = el('tr');
        var c1 = el('td');
        var title = row.mm ? row.name : fix(row.printWIn, 0) + ' \u00d7 ' + fix(row.printHIn, 0) + ' in';
        c1.appendChild(el('strong', null, title));
        c1.appendChild(el('span', 'sub', row.mm
          ? row.mm[0] + ' \u00d7 ' + row.mm[1] + ' mm \u00b7 ' + fix(row.printWIn, 2) + ' \u00d7 ' + fix(row.printHIn, 2) + ' in'
          : fix(row.printWCm, 1) + ' \u00d7 ' + fix(row.printHCm, 1) + ' cm'));
        tr2.appendChild(c1);
        tr2.appendChild(el('td', null, fmt(row.pxNeeded300.w) + ' \u00d7 ' + fmt(row.pxNeeded300.h)));
        tr2.appendChild(el('td', null, fmt(Math.round(row.effectiveDpi), 0)));
        var c4 = el('td'); c4.appendChild(el('span', 'badge ' + row.badge, BADGE[row.badge])); tr2.appendChild(c4);
        var c5 = el('td');
        if (row.ratioMatches) c5.appendChild(el('span', 'match', '\u2713 Matches'));
        else {
          c5.appendChild(el('span', 'crop', 'Crop ' + fix(row.cropPercent, 1) + '%'));
          c5.appendChild(el('span', 'sub', 'trims ' + row.cropSide));
        }
        tr2.appendChild(c5);
        tb.appendChild(tr2);
      });
      t.appendChild(tb); tw.appendChild(t); wrap.appendChild(tw);
      groupsEl.appendChild(wrap);
    });
    results.classList.remove('hidden');
  }

  /* Support links like ?w=7200&h=10800 */
  var q = new URLSearchParams(location.search);
  var qw = Number(q.get('w')), qh = Number(q.get('h'));
  if (C.validatePixels(qw, qh) && qw <= 200000 && qh <= 200000) {
    $('px-w').value = qw; $('px-h').value = qh;
    selectTab($('tab-manual'));
    preview.textContent = '';
    preview.appendChild(el('span', null, qw + ' \u00d7 ' + qh + ' px'));
    render(qw, qh);
  }
})();
