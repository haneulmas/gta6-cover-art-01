// Colour grades for Vice Panels: presets plus the per-photo filter built from
// the editor sliders. Everything here is pure data and string building — the
// actual painting happens in cover.js. No library, no network, no fonts.

/** The four grade presets. Each carries the photo filter it adds on top of
 *  the sliders, the wash colours painted over the photo, and its accent. */
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.25) contrast(1.06)',
    washTop: 'rgba(255, 140, 60, 0.16)',
    washBottom: 'rgba(190, 30, 110, 0.30)',
    blend: 'overlay',
    accent: '#ff9a3d',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.4) contrast(1.12) hue-rotate(-12deg)',
    washTop: 'rgba(60, 220, 255, 0.14)',
    washBottom: 'rgba(200, 30, 190, 0.34)',
    blend: 'soft-light',
    accent: '#37e6ff',
  },
  dusk: {
    label: 'Palm Dusk',
    filter: 'sepia(0.28) saturate(1.2) contrast(1.04)',
    washTop: 'rgba(255, 190, 80, 0.20)',
    washBottom: 'rgba(120, 40, 20, 0.26)',
    blend: 'overlay',
    accent: '#ffc95e',
  },
  noir: {
    label: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.28) brightness(1.04)',
    washTop: 'rgba(255, 255, 255, 0.06)',
    washBottom: 'rgba(0, 0, 0, 0.30)',
    blend: 'overlay',
    accent: '#e8e8e8',
  },
};

/** Builds the canvas 2D filter string for one photo from the slider state.
 *  exposure 0.7..1.3, contrast 0.7..1.4, saturation 0..2, warmth 0..1. */
export function photoFilter(state, preset) {
  const parts = [];
  parts.push(`brightness(${state.exposure.toFixed(2)})`);
  parts.push(`contrast(${state.contrast.toFixed(2)})`);
  parts.push(`saturate(${state.saturation.toFixed(2)})`);
  if (state.warmth > 0.01) {
    parts.push(`sepia(${(state.warmth * 0.45).toFixed(2)})`);
    parts.push(`hue-rotate(${(-state.warmth * 10).toFixed(1)}deg)`);
  }
  if (preset && preset.filter) parts.push(preset.filter);
  return parts.join(' ');
}

/** Caption ink choices shown as swatches in the editor. */
export const INKS = {
  white: { label: 'White', top: '#ffffff', bottom: '#ffd9a0' },
  gold: { label: 'Sun Gold', top: '#fff3b0', bottom: '#ff9a3d' },
  pink: { label: 'Hot Pink', top: '#ffd6f2', bottom: '#ff3fa4' },
  cyan: { label: 'Neon Cyan', top: '#d8fbff', bottom: '#37e6ff' },
  lime: { label: 'Palm Lime', top: '#f2ffd6', bottom: '#a8e63f' },
};
