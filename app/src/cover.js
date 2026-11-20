// The cover renderer for Vice Panels: draws one multi-panel GTA-style cover
// onto any canvas, at the canvas's own pixel size, from a plain state object.
// Everything is canvas 2D — photos, colour washes, a drawn skyline with palm
// silhouettes, grain, and bold poster lettering. All artwork is drawn here by
// hand; no image, logo or font from any game is used anywhere.

import { GRADES, INKS, photoFilter } from './grades.js';
import { LAYOUTS, panelGap } from './layouts.js';

/** A fresh, empty render state. `photos` holds loaded images (or null). */
export function blankState() {
  return {
    layout: 'diagonal',
    grade: 'sunset',
    exposure: 1.0,
    contrast: 1.05,
    saturation: 1.15,
    warmth: 0.45,
    vignette: 0.55,
    title: 'Vice Nights',
    sub: 'Leonida',
    captionPos: 'bottom',
    ink: 'white',
    previewSize: 'square',
    // One entry per panel: which photo it shows, its zoom and its pan.
    panels: [],
    photos: [],
  };
}

/** Panel slots for the current layout, filled with the state's photos in turn.
 *  A panel keeps its own zoom/pan when the layout changes if it still exists.
 *  A fresh panel gets a vertical bias toward the top of its photo when the
 *  panel is wider than the photo (a wide crop of a portrait photo usually
 *  holds a face near the top, and centring would cut it off at the chin). */
export function syncPanels(state, w, h) {
  const rects = LAYOUTS[state.layout].panels(w, h);
  const next = rects.map((rect, i) => {
    const old = state.panels[i];
    const photo = state.photos.length ? i % state.photos.length : 0;
    let oy = old && old.oy ? old.oy : 0;
    if (!old) {
      const img = state.photos[photo];
      // A wide crop of a portrait photo: slide the photo down so its top
      // (usually the face) stays in frame instead of being centred out.
      // oy = +1 aligns the photo's top with the panel's top.
      if (img && rect.w / rect.h > img.naturalWidth / img.naturalHeight) oy = 0.4;
    }
    return {
      rect,
      photo: old && typeof old.photo === 'number' ? old.photo : photo,
      zoom: old && old.zoom ? old.zoom : 1,
      ox: old && old.ox ? old.ox : 0,
      oy,
    };
  });
  state.panels = next;
  return next;
}

/** Draws one photo into one panel rect, cover-fit, with zoom and pan. */
function drawPanelPhoto(ctx, img, panel, filter) {
  const { x, y, w, h } = panel.rect;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const slackX = Math.max(0, dw - w);
  const slackY = Math.max(0, dh - h);
  const dx = x + (w - dw) / 2 + panel.ox * slackX * 0.5;
  const dy = y + (h - dh) / 2 + panel.oy * slackY * 0.5;
  ctx.save();
  if (panel.rect.clip) {
    ctx.beginPath();
    panel.rect.clip.forEach(([cx, cy], i) => {
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.closePath();
    ctx.clip();
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
  }
  ctx.filter = filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** Paints the preset's colour wash over one panel rect. */
function washPanel(ctx, rect, preset) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const wash = ctx.createLinearGradient(0, y, 0, y + h);
  wash.addColorStop(0, preset.washTop);
  wash.addColorStop(1, preset.washBottom);
  ctx.globalCompositeOperation = preset.blend;
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** A deterministic speck of film grain, the same on every render. */
function grainTile(size) {
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(size, size);
  let seed = 20261120;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(next() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  return tile;
}

let grainCache = null;

/** Draws a dark skyline with two palm silhouettes along the cover's foot.
 *  The palms stay short and in the corners so they frame the caption rather
 *  than crossing it; the skyline carries a few lit windows so it reads. */
function drawSkyline(ctx, w, h, accent) {
  const base = h * 0.965;
  const strip = h * 0.085;
  ctx.save();
  ctx.fillStyle = 'rgba(14, 5, 28, 0.9)';
  ctx.beginPath();
  ctx.moveTo(0, base);
  // A jagged little skyline, left to right.
  const roofs = [0.5, 0.82, 0.62, 1.0, 0.72, 0.9, 0.58, 0.78, 0.66, 0.94, 0.6];
  const step = w / roofs.length;
  roofs.forEach((r, i) => {
    ctx.lineTo(i * step, base - strip * r);
    ctx.lineTo((i + 1) * step, base - strip * r);
  });
  ctx.lineTo(w, base);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  // A few lit windows in the skyline, placed by a fixed seed.
  let seed = 77;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.fillStyle = 'rgba(255, 190, 90, 0.5)';
  for (let i = 0; i < 26; i++) {
    const wx = next() * w;
    const wy = base - strip * (0.15 + next() * 0.7);
    ctx.fillRect(wx, wy, Math.max(2, w * 0.004), Math.max(2, h * 0.006));
  }
  // Two palm silhouettes: a leaning trunk and seven fronds that arch up and
  // droop only at their tips.
  const palm = (px, lean, size) => {
    ctx.strokeStyle = 'rgba(12, 4, 24, 0.95)';
    ctx.fillStyle = 'rgba(12, 4, 24, 0.95)';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, base);
    ctx.quadraticCurveTo(px + lean * size, base - size * 0.55, px + lean * size * 1.15, base - size);
    ctx.stroke();
    const topX = px + lean * size * 1.15;
    const topY = base - size;
    for (let i = 0; i < 7; i++) {
      const a = (-Math.PI * 0.06) - (i * Math.PI) / 7.6;
      const len = size * (0.42 + 0.08 * Math.sin(i * 2.1));
      const ex = topX + Math.cos(a) * len;
      const ey = topY + Math.sin(a) * len * 0.6 + size * 0.1;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(
        topX + Math.cos(a) * len * 0.55,
        topY + Math.sin(a) * len * 0.55 - size * 0.16,
        ex,
        ey,
      );
      ctx.stroke();
    }
  };
  palm(w * 0.045, 0.3, strip * 1.9);
  palm(w * 0.955, -0.3, strip * 1.7);
  // A thin neon horizon line above the skyline.
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, h * 0.002);
  ctx.beginPath();
  ctx.moveTo(0, base);
  ctx.lineTo(w, base);
  ctx.stroke();
  ctx.restore();
}

/** Wraps words into lines that fit maxWidth at the given font. */
function wrapLines(ctx, words, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws the title and sub-caption, fitted so they never overflow.
 *  Bottom captions sit above the skyline strip; the sub-caption rides on
 *  the strip itself. Top captions start just under the top frame. */
function drawCaption(ctx, w, h, state, preset) {
  const title = state.title.trim().toUpperCase();
  const sub = state.sub.trim().toUpperCase();
  if (!title && !sub) return;
  const ink = INKS[state.ink] || INKS.white;
  const bottom = state.captionPos === 'bottom';
  const bandH = h * (bottom ? 0.36 : 0.32);
  const bandY = bottom ? h - bandH : 0;

  // A soft scrim behind the lettering so it reads over any photo.
  const scrim = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (bottom) {
    scrim.addColorStop(0, 'rgba(10, 3, 20, 0)');
    scrim.addColorStop(1, 'rgba(10, 3, 20, 0.6)');
  } else {
    scrim.addColorStop(0, 'rgba(10, 3, 20, 0.6)');
    scrim.addColorStop(1, 'rgba(10, 3, 20, 0)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY, w, bandH);

  const maxW = w * 0.9;
  const cx = w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  let size = Math.min(w, h) * 0.115;
  let lines = [];
  if (title) {
    for (;;) {
      ctx.font = `italic 900 ${Math.round(size)}px "Arial Black", Arial, sans-serif`;
      lines = wrapLines(ctx, title.split(/\s+/), maxW);
      const totalH = lines.length * size * 1.02;
      if ((totalH <= bandH * 0.8 && lines.length <= 3) || size <= 14) break;
      size -= 2;
    }
    const grad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    grad.addColorStop(0, ink.top);
    grad.addColorStop(1, ink.bottom);
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(16, 4, 28, 0.92)';
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.045;
    const blockH = lines.length * size * 1.02;
    // Last title baseline: above the skyline when at the bottom, or just
    // under the top frame when at the top (leaving room for the sub).
    const lastBaseline = bottom
      ? h * (sub ? 0.855 : 0.885)
      : bandY + h * 0.055 + blockH;
    const firstBaseline = lastBaseline - (lines.length - 1) * size * 1.02;
    lines.forEach((lineText, i) => {
      const y = firstBaseline + i * size * 1.02;
      ctx.strokeText(lineText, cx, y);
      ctx.fillText(lineText, cx, y);
    });
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (sub) {
    const subSize = Math.max(12, Math.round(Math.min(w, h) * 0.028));
    ctx.font = `700 ${subSize}px Arial, sans-serif`;
    ctx.fillStyle = preset.accent;
    // Letter-spaced caps, drawn one character at a time.
    const chars = [...sub];
    const gap = subSize * 0.42;
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
    let sx = cx - total / 2;
    const sy = bottom
      ? h * 0.925
      : bandY + h * 0.055 + (title ? lines.length * size * 1.02 : 0) + subSize * 1.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.3;
    chars.forEach((c, i) => {
      ctx.fillText(c, sx + widths[i] / 2, sy);
      sx += widths[i] + gap;
    });
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    // A short accent rule under the sub-caption.
    const ruleW = Math.min(w * 0.22, total * 0.6);
    ctx.fillStyle = preset.accent;
    ctx.fillRect(cx - ruleW / 2, sy + subSize * 0.55, ruleW, Math.max(2, subSize * 0.12));
  }
}

/** Draws the whole cover onto `canvas` from `state`. Pure function of state
 *  and canvas size: the same state at the same size always paints the same
 *  pixels (the grain tile is seeded, never random). */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const preset = GRADES[state.grade] || GRADES.sunset;
  const gap = panelGap(w, h);

  ctx.fillStyle = '#12081c';
  ctx.fillRect(0, 0, w, h);

  const panels = syncPanels(state, w, h);
  panels.forEach((panel) => {
    const img = state.photos[panel.photo];
    if (img) {
      drawPanelPhoto(ctx, img, panel, photoFilter(state, preset));
      washPanel(ctx, panel.rect, preset);
    } else {
      // An empty panel: a sunset gradient placeholder with its number.
      const grad = ctx.createLinearGradient(panel.rect.x, panel.rect.y, panel.rect.x, panel.rect.y + panel.rect.h);
      grad.addColorStop(0, '#3d1a4d');
      grad.addColorStop(1, '#12081c');
      ctx.fillStyle = grad;
      ctx.fillRect(panel.rect.x, panel.rect.y, panel.rect.w, panel.rect.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = `700 ${Math.round(Math.min(w, h) * 0.03)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        'ADD A PHOTO',
        panel.rect.x + panel.rect.w / 2,
        panel.rect.y + panel.rect.h / 2,
      );
    }
    // A hairline edge around each panel.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panel.rect.x + 0.5, panel.rect.y + 0.5, panel.rect.w - 1, panel.rect.h - 1);
  });

  // The dark frame around the whole cover.
  ctx.strokeStyle = '#12081c';
  ctx.lineWidth = gap;
  ctx.strokeRect(gap / 2, gap / 2, w - gap, h - gap);

  drawSkyline(ctx, w, h, preset.accent);

  // Film grain over the whole cover.
  if (!grainCache) grainCache = grainTile(140);
  const pattern = ctx.createPattern(grainCache, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Vignette.
  if (state.vignette > 0.01) {
    const vig = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.72,
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, `rgba(0, 0, 0, ${0.5 * state.vignette})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  drawCaption(ctx, w, h, state, preset);
}

/** Renders the cover at an exact export size and returns the canvas. */
export function renderExport(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}
