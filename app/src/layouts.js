// Panel layouts for Vice Panels. A layout is a list of panels; each panel is
// a rectangle in fractions of the cover (x, y, w, h) plus, for the diagonal
// layout, a clip polygon in the same fractions. Every layout is computed from
// the cover size alone, so the same state renders identically at 1080x1080,
// 1080x1350 and 1920x1080.

/** The gap between panels, in pixels, for a cover of width w and height h. */
export function panelGap(w, h) {
  return Math.max(4, Math.round(Math.min(w, h) * 0.014));
}

/** Splits a rectangle into `n` vertical strips, leaving `gap` between them. */
function vSplit(x, y, w, h, n, gap) {
  const each = (w - gap * (n - 1)) / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: x + i * (each + gap), y, w: each, h });
  return out;
}

/** Splits a rectangle into `n` horizontal strips, leaving `gap` between them. */
function hSplit(x, y, w, h, n, gap) {
  const each = (h - gap * (n - 1)) / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x, y: y + i * (each + gap), w, h: each });
  return out;
}

export const LAYOUTS = {
  hero: {
    label: 'Hero',
    hint: 'One photo, full bleed',
    panels(w, h) {
      const g = panelGap(w, h);
      return [{ x: g, y: g, w: w - 2 * g, h: h - 2 * g }];
    },
  },
  duo: {
    label: 'Duo',
    hint: 'Two tall panels',
    panels(w, h) {
      const g = panelGap(w, h);
      return vSplit(g, g, w - 2 * g, h - 2 * g, 2, g);
    },
  },
  trio: {
    label: 'Trio',
    hint: 'Hero left, two stacked right',
    panels(w, h) {
      const g = panelGap(w, h);
      const leftW = (w - 2 * g) * 0.6;
      const rightX = g + leftW + g;
      const rightW = w - g - rightX;
      const right = hSplit(rightX, g, rightW, h - 2 * g, 2, g);
      return [{ x: g, y: g, w: leftW, h: h - 2 * g }, ...right];
    },
  },
  quad: {
    label: 'Quad',
    hint: 'Four-panel grid',
    panels(w, h) {
      const g = panelGap(w, h);
      const rows = hSplit(g, g, w - 2 * g, h - 2 * g, 2, g);
      const out = [];
      for (const row of rows) out.push(...vSplit(row.x, row.y, row.w, row.h, 2, g));
      return out;
    },
  },
  six: {
    label: 'Mosaic',
    hint: 'Six-panel mosaic',
    panels(w, h) {
      const g = panelGap(w, h);
      const rows = hSplit(g, g, w - 2 * g, h - 2 * g, 2, g);
      const out = [];
      for (const row of rows) out.push(...vSplit(row.x, row.y, row.w, row.h, 3, g));
      return out;
    },
  },
  diagonal: {
    label: 'Diagonal',
    hint: 'Slanted hero, two stacked',
    panels(w, h) {
      const g = panelGap(w, h);
      const cut = 0.14; // how far the diagonal leans, as a share of height
      const leftW = (w - 2 * g) * 0.62;
      const rightX = g + leftW + g;
      const rightW = w - g - rightX;
      const lean = h * cut;
      const hero = {
        x: g, y: g, w: leftW, h: h - 2 * g,
        clip: [
          [g, g],
          [g + leftW, g],
          [g + leftW - lean, h - g],
          [g, h - g],
        ],
      };
      const right = hSplit(rightX, g, rightW, h - 2 * g, 2, g);
      return [hero, ...right];
    },
  },
};

/** How many panels a layout has (used to size the panel controls). */
export function panelCount(layout) {
  return LAYOUTS[layout].panels(100, 100).length;
}
