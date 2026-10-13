/* Site-owned adapter: retain the game's pure presentation reader before boot. */
(() => {
  'use strict';
  const original = window.GameShell;
  let read = null;
  window.GameShell = Object.freeze({
    ...original,
    create(game, config) {
      read = config.read;
      return original.create(game, config);
    },
  });
  window.Player1Embed = Object.freeze({
    get ready() { return !!(read && window.gameAPI && !window.__gameGymLoadError); },
    read() { return read ? read() : null; },
    perturb() {
      if (!read) return null;
      for (const type of ['keydown', 'keyup']) {
        document.dispatchEvent(new KeyboardEvent(type, {
          key: '\\', code: 'Backslash', bubbles: true, cancelable: true,
        }));
      }
      return read();
    },
  });
  // F changes the game's layout; the project page owns the embedded viewport.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyF' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (event.code === 'Escape') window.gameAPI?.pause();
  }, true);
})();
