/* A self-contained, character-drawn alpine day. No images or runtime dependencies. */
(function () {
  'use strict';

  var COLS = 128, ROWS = 48, CYCLE = 96, FPS = 12;
  var TAU = Math.PI * 2;
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var mix = function (a, b, t) { return a + (b - a) * t; };
  function smooth(a, b, v) {
    var t = clamp((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  }
  function hash(x, y) {
    var n = Math.imul(x | 0, 1597334677) ^ Math.imul(y | 0, 3812015801);
    n = Math.imul(n ^ (n >>> 16), 2246822507);
    return ((n ^ (n >>> 13)) >>> 0) / 4294967296;
  }
  function noise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var u = smooth(0, 1, x - ix), v = smooth(0, 1, y - iy);
    return mix(mix(hash(ix, iy), hash(ix + 1, iy), u),
      mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
  }
  function color(a, b, t) {
    return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
  }

  // Asymmetric pyramids give the range knife-edge ridges and broad glacial faces.
  // The first two values place each summit within the character grid.
  var peaks = [
    [0.08, 0.43, 8.8, 1.25, -0.3], [0.24, 0.30, 9.5, 1.1, 0.3],
    [0.43, 0.18, 8.4, 1.0, -0.2], [0.58, 0.37, 6.8, 0.9, 0.5],
    [0.70, 0.27, 11.0, 1.15, -0.25], [0.88, 0.42, 8.0, 1.15, 0.2],
    [0.52, 0.36, 14.5, 0.95, 0.4], [0.98, 0.48, 12, 1.1, -0.1]
  ].map(function (p) {
    var height = 0.6 + (0.66 - p[1]) * 0.72 * p[2];
    return {x: (p[0] - 0.5) * 1.4 * p[2], z: p[2], height: height,
      width: height * p[3], cos: Math.cos(p[4]), sin: Math.sin(p[4])};
  });

  function terrain(x, z) {
    var h = 0;
    for (var i = 0; i < peaks.length; i++) {
      var p = peaks[i], dx = x - p.x, dz = z - p.z;
      var rx = dx * p.cos - dz * p.sin, rz = dx * p.sin + dz * p.cos;
      h = Math.max(h, p.height * (1 - (Math.abs(rx) + Math.abs(rz) * 0.78) / p.width));
    }
    var detail = (noise(x * 4.1, z * 4.1) - 0.5) * 0.24
      + (noise(x * 10.3, z * 10.3) - 0.5) * 0.09;
    var moraine = 0.08 + noise(x * 0.8, z * 0.8) * 0.21;
    return Math.max(moraine, h + detail * smooth(0.15, 0.8, h));
  }

  function createScene() {
    var cells = new Array(COLS * ROWS);
    // Geometry is fixed. Trace it once; animation only changes light and atmosphere.
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var u = ((x + 0.5) / COLS - 0.5) * 1.4;
        var v = (0.66 - (y + 0.5) / ROWS) * 0.72;
        var cell = {x: x, y: y, grain: hash(x * 3, y * 7), sky: true};
        for (var z = 2; z < 21; z += 0.055 + z * 0.003) {
          var py = 0.6 + v * z;
          if (py > terrain(u * z, z)) continue;
          var px = u * z, e = 0.025;
          var hx = (terrain(px + e, z) - terrain(px - e, z)) / (2 * e);
          var hz = (terrain(px, z + e) - terrain(px, z - e)) / (2 * e);
          var len = Math.hypot(hx, 1, hz);
          cell.sky = false;
          cell.height = py;
          cell.depth = z;
          cell.normal = [-hx / len, 1 / len, -hz / len];
          // Snow remains on high faces; rock ribs and gullies cut through it.
          var channel = Math.abs(Math.sin(px * 9 + py * 3.2 + noise(px * 3, z * 3) * 3));
          cell.snow = smooth(0.45, 1.7, py + (noise(px * 7, z * 7) - 0.5) * 0.6)
            * (0.70 + 0.30 * smooth(0.16, 0.55, cell.normal[1]))
            * (0.45 + 0.55 * smooth(0.10, 0.40, channel));
          cell.east = 0;
          cell.west = 0;
          for (var d = 0.12; d < 4; d *= 1.45) {
            cell.east = Math.max(cell.east, (terrain(px - d, z - d * 0.35) - py - 0.04) / d);
            cell.west = Math.max(cell.west, (terrain(px + d, z - d * 0.35) - py - 0.04) / d);
          }
          break;
        }
        cells[y * COLS + x] = cell;
      }
    }
    // A skyline rim catches the first and last sunlight.
    cells.forEach(function (c, i) {
      c.rim = !c.sky && (i < COLS || cells[i - COLS].sky);
    });
    var crests = new Array(COLS);
    for (var cx = 0; cx < COLS; cx++) {
      crests[cx] = cells.find(function (c) { return c.x === cx && !c.sky; });
    }

    function frame(phase, seconds) {
      phase = ((phase % 1) + 1) % 1;
      var angle = phase * TAU;
      var altitude = Math.sin(angle);
      var daylight = smooth(-0.16, 0.22, altitude);
      var warm = Math.exp(-Math.pow(altitude / 0.32, 2)) * daylight;
      var alpenglow = smooth(0.08, 0.60, warm);
      var stars = 1 - smooth(-0.12, 0.12, altitude);
      var night = phase >= 0.5;
      var progress = night ? (phase - 0.5) * 2 : phase * 2;
      var orbX = COLS * (0.01 + 0.98 * progress);
      var orbY = ROWS * (0.58 - 0.49 * Math.sin(progress * Math.PI));
      var lx = -Math.cos(angle), ly = Math.max(0.025, altitude * 1.7), lz = -0.35;
      var length = Math.hypot(lx, ly, lz);
      lx /= length; ly /= length; lz /= length;
      var moonAngle = (phase - 0.5) * TAU;
      var mx = -Math.cos(moonAngle), my = Math.max(0, Math.sin(moonAngle)) * 1.4;
      var ml = Math.hypot(mx, my, -0.35);
      // Keep cool shadows saturated so warm faces read as rose and gold,
      // rather than washing both sides of the range toward grey.
      var top = color([25, 29, 82], [42, 113, 180], daylight);
      top = color(top, [66, 48, 130], alpenglow * 0.65);
      var horizon = color([66, 60, 128], [115, 194, 224], daylight);
      horizon = color(horizon, [244, 133, 162], alpenglow * 0.90);
      var litSnow = color([215, 243, 255], [255, 137, 114], alpenglow);
      var out = new Array(cells.length);
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i], x = c.x, y = c.y;
        var sky = color(top, horizon, Math.pow(clamp(y / (ROWS * 0.69)), 1.8));
        var rgb, glyph;
        if (c.sky) {
          var dx = (x - orbX) * 0.73, dy = y - orbY;
          var radius = Math.hypot(dx, dy);
          var halo = Math.exp(-radius / (night ? 7 : 13)) * (night ? 0.38 : 0.80);
          rgb = color(sky, night ? [119, 176, 239] : [255, 190, 108], halo);
          // Thin cirrus drifts horizontally instead of changing randomly each frame.
          var cloud = smooth(0.58, 0.78, noise(x * 0.036 - seconds * 0.007, y * 0.23))
            * smooth(1, 5, y) * (1 - smooth(15, 21, y));
          var cloudColor = color([93, 81, 157], [183, 219, 250], daylight);
          cloudColor = color(cloudColor, [255, 162, 154], alpenglow);
          rgb = color(rgb, cloudColor, cloud * 0.80);
          glyph = c.grain > 0.86 ? ':' : '.';
          if (cloud > 0.3) glyph = c.grain > 0.5 ? '-' : '~';
          var crest = crests[x];
          if (crest && crest.snow > 0.3 && crest.y - y < 3 && crest.y - y > 0) {
            var plume = smooth(0.52, 0.82, noise(x * 0.18 - seconds * 0.14, y * 0.6))
              * (1 - (crest.y - y) / 3);
            rgb = color(rgb, color([117, 154, 234], litSnow, daylight), plume * 0.6);
            if (plume > 0.24) glyph = '-';
          }
          // Soft crepuscular rays fan from the low sun through the upper sky.
          if (!night && warm > 0.18 && radius > 3.5) {
            var ray = Math.pow(Math.max(0, Math.cos(Math.atan2(dy, dx) * 11 + 0.4)), 26)
              * Math.exp(-radius / 32) * warm;
            rgb = color(rgb, [255, 215, 132], ray);
            if (ray > 0.10) glyph = dx * dy > 0 ? '\\' : '/';
          }
          if (stars > 0 && hash(x * 11 + 31, y * 17) > 0.985) {
            var twinkle = 0.63 + Math.sin(seconds * (0.7 + c.grain) + x * 1.8) * 0.22;
            rgb = color(rgb, [212, 225, 240], stars * twinkle);
            glyph = c.grain > 0.7 ? '+' : '*';
          }
          if (night && stars > 0.7) {
            var band = Math.exp(-Math.pow((x - (106 - y * 1.8)) / 12, 2));
            if (c.grain > 0.72) rgb = color(rgb, [171, 128, 222], band * 0.40);
          }
          if (radius < (night ? 2.3 : 2.7)) {
            if (night) {
              // A gibbous moon, with a shaded limb and stippled craters.
              var limb = smooth(-2.1, -0.3, dx);
              rgb = color(rgb, color([114, 137, 161], [225, 232, 223], limb), 0.95);
              glyph = c.grain > 0.55 ? 'o' : ':';
            } else {
              rgb = [255, 226 + c.grain * 20, 167 + c.grain * 48];
              glyph = c.grain > 0.45 ? '@' : 'O';
            }
          }
        } else {
          var n = c.normal;
          var diffuse = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
          var obstruction = lx < 0 ? c.east : c.west;
          var shadow = smooth(obstruction - 0.05, obstruction + 0.16, ly / Math.max(0.05, Math.abs(lx)));
          var sunlight = diffuse * shadow * smooth(-0.02, 0.10, altitude);
          var moonlight = Math.max(0, n[0] * mx / ml + n[1] * my / ml - n[2] * 0.35 / ml) * stars * 0.45;
          var snow = color([48, 76, 164], [66, 125, 225], daylight);
          snow = color(snow, litSnow, smooth(0, 0.65, sunlight));
          snow = color(snow, [156, 201, 255], moonlight);
          var rock = color([24, 29, 66], [53, 69, 110], daylight);
          rock = color(rock, color([154, 164, 192], [222, 107, 93], alpenglow), sunlight * 0.78);
          rgb = color(rock, snow, c.snow);
          // Distance separates the ridges; wind-blown spindrift lifts off the crests.
          var haze = smooth(5, 20, c.depth) * (0.10 + warm * 0.13);
          rgb = color(rgb, sky, haze);
          if (c.rim) {
            var rimColor = color(litSnow, [255, 223, 163], alpenglow * 0.85);
            rgb = color(rgb, rimColor, sunlight * 0.85 * c.snow);
          }
          var brightness = (rgb[0] + rgb[1] + rgb[2]) / 765;
          var density = clamp(brightness * 1.6 + (c.grain - 0.5) * 0.38);
          glyph = '.:-=+*#%'[Math.min(7, Math.floor(density * 8))];
          if (c.snow < 0.5 && c.grain > 0.55) glyph = n[0] > 0 ? '/' : '\\';
          // Small, slow glints only on snow actually receiving direct sunlight.
          var glint = Math.pow(Math.max(0, Math.sin(seconds * 1.8 + c.grain * 180)), 24);
          if (c.snow > 0.48 && sunlight > 0.28 && c.grain > 0.89 && glint > 0.38) {
            rgb = color(rgb, [255, 249, 203], glint * sunlight);
            glyph = '+';
          }
          if (c.height < 0.5 && c.depth > 5) {
            var mist = smooth(0.45, 0.80, noise(x * 0.043 + seconds * 0.009, y * 0.23));
            rgb = color(rgb, sky, mist * (0.18 + warm * 0.15));
          }
        }
        // An unobtrusive fade lets the panorama sit in the page's dark background.
        var fade = 1 - smooth(ROWS - 7, ROWS + 1, y) * 0.62;
        out[i] = {glyph: glyph, rgb: rgb.map(function (v) { return Math.round(v * fade); })};
      }
      return out;
    }
    return {frame: frame, cells: cells};
  }

  // Export the deterministic renderer for local checks without needing a browser.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {createScene: createScene, cols: COLS, rows: ROWS, cycle: CYCLE};
    return;
  }

  var canvas = document.getElementById('plate');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var scene = createScene();
  var controls = document.querySelector('.alpine-controls');
  var play = document.getElementById('alpine-play');
  var phases = Array.from(document.querySelectorAll('[data-phase]'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var playing = !reduced.matches, visible = true;
  var phase = 0.04, seconds = 0, previous = null, request = null, lastPaint = -Infinity;
  controls.hidden = false;

  function draw() {
    var frame = scene.frame(phase, seconds);
    ctx.fillStyle = '#0C0D0C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < frame.length; i++) {
      var c = frame[i];
      // Quantize inks to keep canvas state changes and the palette modest.
      var average = (c.rgb[0] + c.rgb[1] + c.rgb[2]) / 3;
      var rgb = c.rgb.map(function (v) {
        var saturated = clamp((v + (v - average) * 0.18) / 255);
        return Math.min(255, Math.round(Math.pow(saturated, 0.88) * 292 / 8) * 8);
      });
      ctx.fillStyle = 'rgb(' + rgb.join(',') + ')';
      ctx.fillText(c.glyph, (i % COLS) * 8 + 4, Math.floor(i / COLS) * 11 + 5.5);
    }
    canvas.dataset.phase = phase.toFixed(4);
    var active = phase < 0.12 || phase >= 0.96 ? 0 : phase < 0.39 ? 1 : phase < 0.54 ? 2 : 3;
    phases.forEach(function (button, i) { button.setAttribute('aria-pressed', String(i === active)); });
  }
  function syncPlay() {
    play.textContent = playing ? '[pause]' : '[play]';
    play.setAttribute('aria-label', playing ? 'Pause alpine animation' : 'Play alpine animation');
  }
  function tick(now) {
    request = null;
    if (!playing || !visible || document.hidden) { previous = null; return; }
    if (previous !== null) {
      var elapsed = Math.min((now - previous) / 1000, 0.25);
      phase = (phase + elapsed / CYCLE) % 1;
      seconds += elapsed;
    }
    previous = now;
    if (now - lastPaint >= 1000 / FPS) { draw(); lastPaint = now; }
    request = window.requestAnimationFrame(tick);
  }
  function schedule() {
    previous = null;
    if (request !== null) window.cancelAnimationFrame(request);
    request = null;
    if (playing && visible && !document.hidden) request = window.requestAnimationFrame(tick);
  }
  play.addEventListener('click', function () {
    playing = !playing;
    syncPlay(); schedule();
  });
  phases.forEach(function (button) {
    button.addEventListener('click', function () {
      phase = Number(button.dataset.phase);
      seconds = phase * CYCLE;
      // Phase selection holds the view so details can be inspected.
      playing = false;
      draw(); syncPlay(); schedule();
    });
  });
  reduced.addEventListener('change', function (event) {
    if (event.matches) { playing = false; syncPlay(); schedule(); }
  });
  document.addEventListener('visibilitychange', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      schedule();
    }).observe(canvas);
  }
  draw(); syncPlay(); schedule();
})();
