# ISRS Tech Portal (isrstechportal.com)

Plain static site: HTML, CSS and vanilla JS. No build step.

- `index.html` home, `tools/etsy-print-size-checker/` main tool
- `assets/js/print-calc.js` pure print-size math (browser + Node), `assets/js/print-checker.js` UI
- Test the math: `node tests/print-calc.test.js`
- Local preview: `python3 -m http.server 8000` then open http://localhost:8000/

## Deploy (Render static site)
Publish directory `.`, build command empty (or use `render.yaml`). Add the custom domain
isrstechportal.com and www in Render, then point DNS at Bluehost to the records Render shows.
