export function setupShowcase(replay) {
  const root = document.getElementById('agent');
  const tabs = [...root.querySelectorAll('[data-showcase-view]')];
  const intro = document.getElementById('introduction-video');
  const playButton = document.getElementById('play-introduction');
  const dialogs = [...document.querySelectorAll('dialog')];
  let selectedView = null;
  let inView = false;
  let started = false;
  let playAttempt = null;
  let autoplayPending = false;
  let countdown = null;
  const autoplayDelay = 3000;
  playButton.style.setProperty('--intro-countdown-duration', `${autoplayDelay}ms`);

  function cancelCountdown() {
    clearTimeout(countdown);
    countdown = null;
    playButton.classList.remove('is-counting-down');
    playButton.removeAttribute('aria-label');
  }

  function pauseIntroduction() {
    cancelCountdown();
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
    autoplayPending = view === 'introduction';
    replay.setVisible(view === 'gameplay');
    syncIntroduction();
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

  async function playIntroduction(automatic = false) {
    if (!canPlayIntroduction() || playAttempt) return;
    cancelCountdown();
    autoplayPending = false;
    const attempt = {};
    playAttempt = attempt;
    playButton.disabled = true;
    intro.controls = true;
    if (intro.error) intro.load();
    try {
      try {
        await intro.play();
      } catch (error) {
        if (!automatic || error.name !== 'NotAllowedError' || playAttempt !== attempt || !canPlayIntroduction()) {
          throw error;
        }
        intro.muted = true;
        await intro.play();
      }
    } catch {
      if (playAttempt !== attempt) return;
      intro.controls = started;
      playButton.hidden = false;
    } finally {
      if (playAttempt !== attempt) return;
      playAttempt = null;
      playButton.disabled = false;
    }
  }
  playButton.addEventListener('click', () => playIntroduction());
  intro.addEventListener('playing', () => {
    if (!canPlayIntroduction()) {
      pauseIntroduction();
      return;
    }
    started = true;
    autoplayPending = false;
    cancelCountdown();
    intro.controls = true;
    playButton.hidden = true;
  });
  intro.addEventListener('error', () => {
    autoplayPending = false;
    pauseIntroduction();
    playButton.hidden = false;
  });

  function syncIntroduction() {
    if (!canPlayIntroduction()) {
      pauseIntroduction();
    } else if (autoplayPending && countdown === null && !playAttempt) {
      playButton.hidden = false;
      playButton.classList.add('is-counting-down');
      playButton.setAttribute('aria-label', 'Watch introduction. Automatically plays in 3 seconds.');
      countdown = setTimeout(() => playIntroduction(true), autoplayDelay);
    }
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
