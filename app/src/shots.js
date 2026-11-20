// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the
// size the query names; ?shot=editor shows the editor with photos loaded.
// `photo` and `photo2` pick the sample photos, `caption` and `sub` the words,
// `layout`, `grade`, `pos` and `ink` the look. window.__shotReady is set by
// main.js once the scene has painted.

/** Reads one scene out of the page's query string. */
export function shotScene(query) {
  const get = (key, fallback) => query.get(key) ?? fallback;
  const shot = query.get('shot');
  return {
    coverMode: shot === 'cover',
    w: Number(query.get('w')) || 1080,
    h: Number(query.get('h')) || 1080,
    layout: get('layout', 'diagonal'),
    grade: get('grade', 'sunset'),
    title: get('caption', 'Vice Nights'),
    sub: get('sub', 'Leonida'),
    pos: get('pos', 'bottom'),
    ink: get('ink', 'white'),
    photoNames: [get('photo', 'boulevard'), get('photo2', 'pier')].filter(Boolean),
  };
}
