/* ISRS Tech Portal - print size math (pure functions, no DOM).
   Works in the browser (window.PrintCalc) and in Node (module.exports). */
(function (root) {
  'use strict';

  var MM_PER_IN = 25.4;
  var PASS_DPI = 300;
  var WARN_DPI = 150;
  var RATIO_TOLERANCE = 0.01; // 1% difference counts as the same ratio

  // Print sizes are stored portrait (short side first), in inches.
  var GROUPS = [
    { id: '2:3', label: '2:3 ratio', note: 'Classic 35mm photo shape', sizes: [
      { name: '4 x 6 in', w: 4, h: 6 }, { name: '8 x 12 in', w: 8, h: 12 },
      { name: '12 x 18 in', w: 12, h: 18 }, { name: '16 x 24 in', w: 16, h: 24 },
      { name: '20 x 30 in', w: 20, h: 30 }, { name: '24 x 36 in', w: 24, h: 36 } ] },
    { id: '3:4', label: '3:4 ratio', note: 'Common for posters and phone photos', sizes: [
      { name: '6 x 8 in', w: 6, h: 8 }, { name: '9 x 12 in', w: 9, h: 12 },
      { name: '12 x 16 in', w: 12, h: 16 }, { name: '18 x 24 in', w: 18, h: 24 } ] },
    { id: '4:5', label: '4:5 ratio', note: 'Popular frame sizes', sizes: [
      { name: '4 x 5 in', w: 4, h: 5 }, { name: '8 x 10 in', w: 8, h: 10 },
      { name: '16 x 20 in', w: 16, h: 20 }, { name: '24 x 30 in', w: 24, h: 30 } ] },
    { id: '5:7', label: '5:7 ratio', note: 'Greeting card and small frame size', sizes: [
      { name: '5 x 7 in', w: 5, h: 7 }, { name: '10 x 14 in', w: 10, h: 14 },
      { name: '20 x 28 in', w: 20, h: 28 } ] },
    { id: '11:14', label: '11:14 ratio', note: 'Standard frame size of its own', sizes: [
      { name: '11 x 14 in', w: 11, h: 14 }, { name: '22 x 28 in', w: 22, h: 28 } ] },
    { id: 'ISO', label: 'ISO A-series (1:\u221A2)', note: 'International paper sizes', sizes: [
      { name: 'A5', w: 148 / MM_PER_IN, h: 210 / MM_PER_IN, mm: [148, 210] },
      { name: 'A4', w: 210 / MM_PER_IN, h: 297 / MM_PER_IN, mm: [210, 297] },
      { name: 'A3', w: 297 / MM_PER_IN, h: 420 / MM_PER_IN, mm: [297, 420] },
      { name: 'A2', w: 420 / MM_PER_IN, h: 594 / MM_PER_IN, mm: [420, 594] },
      { name: 'A1', w: 594 / MM_PER_IN, h: 841 / MM_PER_IN, mm: [594, 841] } ] }
  ];

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a; }

  function simplifyRatio(w, h) {
    var g = gcd(Math.round(w), Math.round(h)) || 1;
    return { a: Math.round(w) / g, b: Math.round(h) / g };
  }

  // Ratio expressed as long side / short side (>= 1).
  function longShort(w, h) { return Math.max(w, h) / Math.min(w, h); }

  function ratioDiff(r1, r2) { return Math.abs(r1 - r2) / r2; }

  function validatePixels(w, h) {
    return Number.isFinite(w) && Number.isFinite(h) && w >= 1 && h >= 1 &&
      Math.floor(w) === w && Math.floor(h) === h;
  }

  function orientation(w, h) { return w > h ? 'landscape' : (w < h ? 'portrait' : 'square'); }

  function maxPrintSize(pxW, pxH, dpi) {
    var wi = pxW / dpi, hi = pxH / dpi;
    return { wIn: wi, hIn: hi, wCm: wi * 2.54, hCm: hi * 2.54 };
  }

  function badgeFor(dpi) {
    // Compare whole-number DPI (as displayed), so 7016 x 9933 px counts as
    // 300 DPI at A1 (299.998) and float noise never flips a badge.
    var d = Math.round(dpi);
    if (d >= PASS_DPI) return 'pass';
    if (d >= WARN_DPI) return 'warn';
    return 'fail';
  }

  /* Evaluate one print size for an image.
     The print is rotated to match the image orientation (a landscape image
     is checked against 6 x 4, not 4 x 6). Effective DPI assumes the image is
     scaled to completely fill the print (full bleed), cropping any overflow:
     DPI = min(pxW / printW, pxH / printH). */
  function evaluateSize(pxW, pxH, size) {
    var landscape = pxW > pxH;
    var pw = landscape ? size.h : size.w;
    var ph = landscape ? size.w : size.h;
    var dpiX = pxW / pw, dpiY = pxH / ph;
    var dpi = Math.min(dpiX, dpiY);
    var imgRatio = longShort(pxW, pxH);
    var printRatio = longShort(size.w, size.h);
    var diff = ratioDiff(imgRatio, printRatio);
    var matches = diff <= RATIO_TOLERANCE;
    // Share of the image's pixels cut off when filling the print.
    var usedPx = (pw * dpi) * (ph * dpi);
    var cropPct = Math.max(0, (1 - usedPx / (pxW * pxH)) * 100);
    var cropSide = null;
    if (!matches) cropSide = dpiX > dpiY ? 'width' : 'height';
    return {
      name: size.name,
      printWIn: pw, printHIn: ph,
      printWCm: pw * 2.54, printHCm: ph * 2.54,
      mm: size.mm ? (landscape ? [size.mm[1], size.mm[0]] : size.mm.slice()) : null,
      effectiveDpi: dpi,
      badge: badgeFor(dpi),
      ratioMatches: matches,
      cropPercent: matches ? 0 : cropPct,
      cropSide: cropSide,
      pxNeeded300: { w: Math.round(pw * 300), h: Math.round(ph * 300) }
    };
  }

  function nearestGroup(pxW, pxH) {
    var r = longShort(pxW, pxH), best = null;
    GROUPS.forEach(function (g) {
      var s = g.sizes[0];
      var d = ratioDiff(r, longShort(s.w, s.h));
      if (!best || d < best.diff) best = { id: g.id, label: g.label, diff: d };
    });
    best.matches = best.diff <= RATIO_TOLERANCE;
    return best;
  }

  function analyze(pxW, pxH) {
    if (!validatePixels(pxW, pxH)) throw new Error('Width and height must be whole numbers of at least 1 pixel.');
    var simple = simplifyRatio(pxW, pxH);
    return {
      width: pxW, height: pxH,
      megapixels: (pxW * pxH) / 1e6,
      orientation: orientation(pxW, pxH),
      ratio: simple,
      ratioDecimal: longShort(pxW, pxH),
      nearest: nearestGroup(pxW, pxH),
      max300: maxPrintSize(pxW, pxH, 300),
      max150: maxPrintSize(pxW, pxH, 150),
      groups: GROUPS.map(function (g) {
        var rows = g.sizes.map(function (s) { return evaluateSize(pxW, pxH, s); });
        return { id: g.id, label: g.label, note: g.note,
          ratioMatches: rows[0].ratioMatches, rows: rows };
      })
    };
  }

  var api = { GROUPS: GROUPS, PASS_DPI: PASS_DPI, WARN_DPI: WARN_DPI,
    analyze: analyze, evaluateSize: evaluateSize, maxPrintSize: maxPrintSize,
    simplifyRatio: simplifyRatio, badgeFor: badgeFor, nearestGroup: nearestGroup,
    validatePixels: validatePixels };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PrintCalc = api;
})(typeof window !== 'undefined' ? window : this);
