// Run: node tests/print-calc.test.js
const assert = require('assert');
const C = require('../assets/js/print-calc.js');
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const row = (r, gid, name) => r.groups.find(g => g.id === gid).rows.find(x => x.name === name);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('7200x10800 => 24x36 in at 300 DPI', () => {
  const r = C.analyze(7200, 10800);
  near(r.max300.wIn, 24); near(r.max300.hIn, 36);
  near(r.max300.wCm, 60.96); near(r.max300.hCm, 91.44);
  near(r.max150.wIn, 48); near(r.max150.hIn, 72);
  assert.deepStrictEqual(r.ratio, { a: 2, b: 3 });
  assert.strictEqual(r.nearest.id, '2:3'); assert.ok(r.nearest.matches);
  const x = row(r, '2:3', '24 x 36 in');
  near(x.effectiveDpi, 300); assert.strictEqual(x.badge, 'pass'); assert.ok(x.ratioMatches);
  assert.deepStrictEqual(x.pxNeeded300, { w: 7200, h: 10800 });
  near(row(r, '2:3', '4 x 6 in').effectiveDpi, 1800);
});
t('2:3 image on 8x10 (4:5) needs crop of 1/6 of height', () => {
  const x = row(C.analyze(7200, 10800), '4:5', '8 x 10 in');
  near(x.effectiveDpi, 900); assert.ok(!x.ratioMatches);
  near(x.cropPercent, 100 / 6, 1e-9); assert.strictEqual(x.cropSide, 'height');
});
t('3000x4500 => 250 DPI at 12x18, 125 DPI at 24x36', () => {
  const r = C.analyze(3000, 4500);
  const a = row(r, '2:3', '12 x 18 in'), b = row(r, '2:3', '24 x 36 in');
  near(a.effectiveDpi, 250); assert.strictEqual(a.badge, 'warn');
  near(b.effectiveDpi, 125); assert.strictEqual(b.badge, 'fail');
});
t('landscape image rotates print sizes', () => {
  const r = C.analyze(10800, 7200);
  assert.strictEqual(r.orientation, 'landscape');
  const x = row(r, '2:3', '24 x 36 in');
  near(x.printWIn, 36); near(x.printHIn, 24); near(x.effectiveDpi, 300); assert.ok(x.ratioMatches);
});
t('A-series: 7016x9933 is ~300 DPI at A1 and matches ISO', () => {
  const r = C.analyze(7016, 9933);
  assert.strictEqual(r.nearest.id, 'ISO');
  const x = row(r, 'ISO', 'A1');
  assert.ok(x.ratioMatches); assert.strictEqual(x.badge, 'pass'); assert.ok(Math.abs(x.effectiveDpi - 300) < 0.05, x.effectiveDpi);
  assert.deepStrictEqual(x.pxNeeded300, { w: 7016, h: 9933 });
  near(x.printWCm, 59.4); near(x.printHCm, 84.1);
});
t('table pixel figures used in the guide', () => {
  const need = (g, n) => row(C.analyze(1000, 1000), g, n).pxNeeded300;
  assert.deepStrictEqual(need('3:4', '18 x 24 in'), { w: 5400, h: 7200 });
  assert.deepStrictEqual(need('4:5', '24 x 30 in'), { w: 7200, h: 9000 });
  assert.deepStrictEqual(need('5:7', '20 x 28 in'), { w: 6000, h: 8400 });
  assert.deepStrictEqual(need('11:14', '22 x 28 in'), { w: 6600, h: 8400 });
  assert.deepStrictEqual(need('11:14', '11 x 14 in'), { w: 3300, h: 4200 });
});
t('square image: cover DPI and crop', () => {
  const x = row(C.analyze(1000, 1000), '2:3', '4 x 6 in');
  near(x.effectiveDpi, 1000 / 6); near(x.cropPercent, 100 / 3, 1e-9); assert.strictEqual(x.cropSide, 'width');
});
t('badge thresholds', () => {
  assert.strictEqual(C.badgeFor(300), 'pass'); assert.strictEqual(C.badgeFor(299.99), 'pass'); assert.strictEqual(C.badgeFor(299.4), 'warn');
  assert.strictEqual(C.badgeFor(150), 'warn'); assert.strictEqual(C.badgeFor(149.4), 'fail');
});
t('validation', () => {
  assert.ok(!C.validatePixels(0, 10)); assert.ok(!C.validatePixels(10.5, 10));
  assert.ok(!C.validatePixels(NaN, 10)); assert.throws(() => C.analyze(-1, 5));
});
console.log(`\nAll ${n} tests passed.`);
