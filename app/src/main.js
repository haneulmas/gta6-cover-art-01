// Vice Panels editor: wires the controls to the cover renderer. Photos come
// from the user's machine (file input or drag-and-drop) or from the two free
// sample photos; they are never uploaded anywhere. A `?shot=` query sets up
// a fixed scene for a screenshot instead (./shots.js).

import { blankState, drawCover, renderExport, syncPanels } from './cover.js';
import { GRADES, INKS } from './grades.js';
import { LAYOUTS } from './layouts.js';
import { shotScene } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = blankState();
let activePhoto = 0; // which tray photo a panel click assigns
let selectedPanel = 0; // which panel the zoom/pan sliders move
let drag = null; // an in-progress pan drag on the canvas, or null

const $ = (id) => document.getElementById(id);

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, state);
}

/** Sizes the preview canvas for the chosen aspect and redraws. */
function applyPreviewSize() {
  const sizes = {
    square: [1080, 1080],
    portrait: [1080, 1350],
    wide: [1920, 1080],
  };
  const [w, h] = sizes[state.previewSize] || sizes.square;
  canvas.width = w;
  canvas.height = h;
  redraw();
}

/** Rebuilds the photo tray from state.photos. */
function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot' + (state.photos[i] ? '' : ' empty') + (i === activePhoto ? ' active' : '');
    slot.setAttribute('aria-label', state.photos[i] ? `Photo ${i + 1}` : `Empty photo slot ${i + 1}`);
    if (state.photos[i]) {
      slot.style.backgroundImage = `url("${state.photos[i].dataset.thumb}")`;
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = `Photo ${i + 1}`;
      slot.appendChild(tag);
    }
    slot.addEventListener('click', () => {
      activePhoto = i;
      renderTray();
    });
    tray.appendChild(slot);
  }
}

/** Rebuilds the layout and grade pickers, marking the active choices. */
function renderPickers() {
  const layoutPicker = $('layoutPicker');
  layoutPicker.innerHTML = '';
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = key === state.layout ? 'active' : '';
    btn.textContent = layout.label;
    const hint = document.createElement('small');
    hint.textContent = layout.hint;
    btn.appendChild(hint);
    btn.addEventListener('click', () => {
      state.layout = key;
      selectedPanel = 0;
      syncPanels(state, canvas.width, canvas.height);
      renderPickers();
      updatePanelHint();
      redraw();
    });
    layoutPicker.appendChild(btn);
  }
  const gradePicker = $('gradePicker');
  gradePicker.innerHTML = '';
  for (const [key, grade] of Object.entries(GRADES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = key === state.grade ? 'active' : '';
    btn.textContent = grade.label;
    btn.addEventListener('click', () => {
      state.grade = key;
      renderPickers();
      redraw();
    });
    gradePicker.appendChild(btn);
  }
  const inkPicker = $('inkPicker');
  inkPicker.querySelectorAll('.swatches').forEach((el) => el.remove());
  const swatches = document.createElement('div');
  swatches.className = 'swatches';
  for (const [key, ink] of Object.entries(INKS)) {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch' + (key === state.ink ? ' active' : '');
    sw.title = ink.label;
    sw.setAttribute('aria-label', `${ink.label} ink`);
    sw.style.background = `linear-gradient(135deg, ${ink.top}, ${ink.bottom})`;
    sw.addEventListener('click', () => {
      state.ink = key;
      renderPickers();
      redraw();
    });
    swatches.appendChild(sw);
  }
  inkPicker.appendChild(swatches);
}

/** Keeps the panel sliders and hint in step with the selected panel. */
function updatePanelHint() {
  const panel = state.panels[selectedPanel];
  const hint = $('panelHint');
  if (!panel) {
    hint.textContent = 'No panel selected.';
    return;
  }
  hint.textContent = `Panel ${selectedPanel + 1} of ${state.panels.length} selected — showing Photo ${(panel.photo % Math.max(1, state.photos.length)) + 1}.`;
  $('zoom').value = panel.zoom;
  $('panX').value = panel.ox;
  $('panY').value = panel.oy;
}

/** Puts the control values back in step with the state (after a shot scene
 *  or a random shuffle changes it from outside the inputs). */
function syncControlsFromState() {
  $('title').value = state.title;
  $('sub').value = state.sub;
  $('captionPos').value = state.captionPos;
  $('previewSize').value = state.previewSize;
  $('exposure').value = state.exposure;
  $('contrast').value = state.contrast;
  $('saturation').value = state.saturation;
  $('warmth').value = state.warmth;
  $('vignette').value = state.vignette;
  renderPickers();
  renderTray();
  updatePanelHint();
}

/** Adds image files to the tray (at most four photos in all). */
async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (state.photos.length >= 4) break;
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      img.dataset.thumb = url;
      state.photos.push(img);
      added++;
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  if (added) {
    syncPanels(state, canvas.width, canvas.height);
    renderTray();
    updatePanelHint();
    redraw();
    status.textContent = `${added} photo${added > 1 ? 's' : ''} loaded — click a panel to place one.`;
  }
  return added;
}

/** Loads the two free sample photos so the app shows a cover at once. */
async function loadSamples() {
  for (const name of ['boulevard', 'pier']) {
    if (state.photos.length >= 4) break;
    const img = await loadImage(`samples/${name}.jpg`);
    img.dataset.thumb = `samples/${name}.jpg`;
    state.photos.push(img);
  }
  syncPanels(state, canvas.width, canvas.height);
  renderTray();
  updatePanelHint();
  redraw();
}

// --- Control wiring -------------------------------------------------------

$('photoFiles').addEventListener('change', (e) => {
  addFiles([...e.target.files]);
  e.target.value = '';
});
$('loadSamples').addEventListener('click', async () => {
  if (!state.photos.length) {
    await loadSamples();
    status.textContent = 'Samples loaded — add your own photos to begin.';
  }
});

const bindSlider = (id, key) => {
  $(id).addEventListener('input', (e) => {
    state[key] = Number(e.target.value);
    redraw();
  });
};
bindSlider('exposure', 'exposure');
bindSlider('contrast', 'contrast');
bindSlider('saturation', 'saturation');
bindSlider('warmth', 'warmth');
bindSlider('vignette', 'vignette');

$('zoom').addEventListener('input', (e) => {
  const panel = state.panels[selectedPanel];
  if (panel) {
    panel.zoom = Number(e.target.value);
    redraw();
  }
});
$('panX').addEventListener('input', (e) => {
  const panel = state.panels[selectedPanel];
  if (panel) {
    panel.ox = Number(e.target.value);
    redraw();
  }
});
$('panY').addEventListener('input', (e) => {
  const panel = state.panels[selectedPanel];
  if (panel) {
    panel.oy = Number(e.target.value);
    redraw();
  }
});
$('fitPanel').addEventListener('click', () => {
  const panel = state.panels[selectedPanel];
  if (panel) {
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
    updatePanelHint();
    redraw();
  }
});

$('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
$('sub').addEventListener('input', (e) => {
  state.sub = e.target.value;
  redraw();
});
$('captionPos').addEventListener('change', (e) => {
  state.captionPos = e.target.value;
  redraw();
});
$('previewSize').addEventListener('change', (e) => {
  state.previewSize = e.target.value;
  applyPreviewSize();
});

$('surprise').addEventListener('click', () => {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  const inks = Object.keys(INKS);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(layouts);
  state.grade = pick(grades);
  state.ink = pick(inks);
  state.captionPos = Math.random() < 0.7 ? 'bottom' : 'top';
  syncPanels(state, canvas.width, canvas.height);
  syncControlsFromState();
  redraw();
  status.textContent = 'Shuffled — export it if you like it.';
});

// --- Export ---------------------------------------------------------------

function exportCover(width, height, label) {
  const out = renderExport(state, width, height);
  out.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${label}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-panels-${label}.png (${width} × ${height}).`;
  }, 'image/png');
}
$('exportSquare').addEventListener('click', () => exportCover(1080, 1080, '1080x1080'));
$('exportPortrait').addEventListener('click', () => exportCover(1080, 1350, '1080x1350'));
$('exportWide').addEventListener('click', () => exportCover(1920, 1080, '1920x1080'));

// --- Canvas picking and panning -------------------------------------------

/** Which panel, if any, holds canvas point (px, py) in canvas pixels. */
function panelAt(px, py) {
  return state.panels.findIndex((panel) => {
    const r = panel.rect;
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  });
}

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const idx = panelAt(px, py);
  if (idx < 0) return;
  canvas.setPointerCapture(e.pointerId);
  drag = { idx, startX: e.clientX, startY: e.clientY, moved: false, ox: state.panels[idx].ox, oy: state.panels[idx].oy };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
  if (!drag.moved) return;
  const panel = state.panels[drag.idx];
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const slackX = Math.max(1, panel.rect.w * 0.4);
  const slackY = Math.max(1, panel.rect.h * 0.4);
  panel.ox = Math.max(-1, Math.min(1, drag.ox + (dx * scaleX) / slackX));
  panel.oy = Math.max(-1, Math.min(1, drag.oy + (dy * scaleY) / slackY));
  redraw();
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const wasDrag = drag.moved;
  const idx = drag.idx;
  drag = null;
  if (wasDrag) {
    updatePanelHint();
    return;
  }
  // A plain click: put the active tray photo in this panel and select it.
  selectedPanel = idx;
  const panel = state.panels[idx];
  if (state.photos[activePhoto]) panel.photo = activePhoto;
  updatePanelHint();
  redraw();
});

// Drag-and-drop photos onto the stage.
const stage = document.querySelector('.stage');
stage.addEventListener('dragover', (e) => e.preventDefault());
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.files.length) addFiles([...e.dataTransfer.files]);
});

// --- Start ----------------------------------------------------------------

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  // A fixed screenshot scene: load the named samples, apply the scene, paint.
  const scene = shotScene(query);
  if (scene.coverMode) document.body.classList.add('shot-cover');
  else document.body.classList.add('shot-editor');
  canvas.width = scene.w;
  canvas.height = scene.h;
  (async () => {
    for (const name of scene.photoNames) {
      const img = await loadImage(`samples/${name}.jpg`);
      img.dataset.thumb = `samples/${name}.jpg`;
      state.photos.push(img);
    }
    Object.assign(state, {
      layout: scene.layout,
      grade: scene.grade,
      title: scene.title,
      sub: scene.sub,
      captionPos: scene.pos,
      ink: scene.ink,
    });
    syncPanels(state, canvas.width, canvas.height);
    syncControlsFromState();
    redraw();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
    }));
  })();
} else {
  renderPickers();
  renderTray();
  applyPreviewSize();
  loadSamples().then(() => {
    status.textContent = 'Samples loaded — add your own photos to begin.';
  });
}
