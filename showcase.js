export function setupShowcase(replay) {
  const root = document.getElementById('agent');
  const tabs = [...root.querySelectorAll('[data-showcase-view]')];
  const intro = document.getElementById('introduction-video');
  const playButton = document.getElementById('play-introduction');
  const dialogs = [...document.querySelectorAll('dialog')];
  let selectedView = null;
  let inView = true;
  let started = false;
  let playAttempt = null;

  function pauseIntroduction() {
    playAttempt = null;
    playButton.disabled = false;
    intro.pause();
    if (!started) intro.controls = false;
  }

  function canPlayIntroduction() {
    return selectedView === 'introduction' && inView && !document.hidden &&
      !dialogs.some(dialog => dialog.open);
  }

  function selectView(view) {
    if (selectedView === view) return;
    selectedView = view;
    for (const tab of tabs) {
      const selected = tab.dataset.showcaseView === view;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    }
    if (view === 'introduction' && !intro.hasAttribute('src')) {
      intro.poster = intro.dataset.poster;
      intro.src = intro.dataset.src;
    }
    if (view !== 'introduction') pauseIntroduction();
    replay.setVisible(view === 'gameplay');
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => selectView(tab.dataset.showcaseView));
    tab.addEventListener('keydown', event => {
      const index = tabs.indexOf(tab);
      const next = {ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        Home: 0, End: tabs.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectView(tabs[next].dataset.showcaseView);
      tabs[next].focus();
    });
  }

  playButton.addEventListener('click', () => {
    if (!canPlayIntroduction() || playAttempt) return;
    const attempt = {};
    playAttempt = attempt;
    playButton.disabled = true;
    intro.controls = true;
    Promise.resolve(intro.play()).then(() => {
      if (playAttempt !== attempt) return;
      playAttempt = null;
      playButton.disabled = false;
    }, () => {
      if (playAttempt !== attempt) return;
      playAttempt = null;
      playButton.disabled = false;
      intro.controls = started;
    });
  });
  intro.addEventListener('playing', () => {
    if (!canPlayIntroduction()) {
      pauseIntroduction();
      return;
    }
    started = true;
    intro.controls = true;
    playButton.hidden = true;
  });
  intro.addEventListener('error', () => {
    pauseIntroduction();
    playButton.hidden = false;
  });

  function syncIntroduction() {
    if (!canPlayIntroduction()) pauseIntroduction();
  }
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncIntroduction();
  }, {threshold: .1}).observe(root);
  document.addEventListener('visibilitychange', syncIntroduction);
  const observer = new MutationObserver(syncIntroduction);
  dialogs.forEach(dialog => observer.observe(dialog, {attributes: true, attributeFilter: ['open']}));
  window.addEventListener('pagehide', pauseIntroduction);
  selectView('gameplay');
}
