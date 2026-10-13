import { stages } from './replay-data.js?v=0e39dfe868d9';

export function setupReplay() {
  const $ = id => document.getElementById(id);
  const video = $('replay-video');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = [...document.querySelectorAll('[data-stage]')];
  const dialogs = [...document.querySelectorAll('dialog')];
  let playing = !reduceMotion.matches;
  let inView = false;
  let ready = false;
  let currentStage = 0;
  let renderedStage = -1;
  let animation = null;
  let failed = false;
  let playAttempt = null;
  let visible = true;

  function text(id, value) {
    if ($(id).textContent !== value) $(id).textContent = value;
  }
  function active() {
    return visible && ready && !video.seeking && playing && inView && !document.hidden &&
      !dialogs.some(dialog => dialog.open);
  }
  function render() {
    const stageDuration = stages[currentStage].duration;
    const localTime = ready ? Math.max(0, Math.min(stageDuration, video.currentTime)) : 0;
    if (currentStage !== renderedStage) {
      renderedStage = currentStage;
      const stage = stages[currentStage];
      text('replay-index', `${String(currentStage + 1).padStart(2, '0')} / ${String(stages.length).padStart(2, '0')}`);
      text('replay-label', stage.description);
      text('replay-turn', `Example · step ${stage.textStep}`);
      text('replay-thinking', stage.thinking);
      text('replay-action', stage.action);
      chapters.forEach((button, i) => button.setAttribute('aria-pressed', String(i === currentStage)));
    }
    chapters.forEach((button, i) => {
      const progress = i < currentStage ? 1 : i > currentStage ? 0 : localTime / stageDuration;
      button.style.setProperty('--chapter-progress', `${progress * 100}%`);
    });
  }
  function stopAnimation() {
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
  }
  function tick() {
    animation = null;
    render();
    if (active() && !video.paused) animation = requestAnimationFrame(tick);
  }
  function pausePlayback() {
    playAttempt = null;
    video.pause();
  }
  function syncPlayback() {
    stopAnimation();
    if (active()) {
      if (video.paused && playAttempt === null) {
        const attempt = {};
        playAttempt = attempt;
        Promise.resolve(video.play()).then(() => {
          if (playAttempt !== attempt) return;
          playAttempt = null;
          render();
        }, error => {
          if (playAttempt !== attempt) return;
          playAttempt = null;
          if (error.name !== 'AbortError' && active()) playing = false;
          render();
        });
      }
      if (!video.paused) animation = requestAnimationFrame(tick);
    } else {
      pausePlayback();
    }
    render();
  }
  function selectStage(index) {
    const stage = stages[index];
    const sameSource = video.getAttribute('src') === stage.video;
    const reuseSource = sameSource && !failed && video.readyState >= 1;
    if (index === currentStage && sameSource && !failed && !video.ended) {
      syncPlayback();
      return;
    }
    stopAnimation();
    pausePlayback();
    currentStage = index;
    failed = false;
    video.poster = stage.poster;
    if (reuseSource) {
      video.currentTime = 0;
      ready = video.readyState >= 2;
      syncPlayback();
    } else {
      ready = false;
      video.src = stage.video;
      video.load();
      render();
    }
  }

  chapters.forEach(button => button.addEventListener('click', () => {
    playing = true;
    selectStage(Number(button.dataset.stage));
  }));
  video.addEventListener('loadeddata', () => {
    ready = true;
    failed = false;
    video.playbackRate = 1;
    syncPlayback();
  });
  video.addEventListener('timeupdate', render);
  video.addEventListener('seeked', syncPlayback);
  video.addEventListener('ended', () => {
    if (visible && playing && ready && video.ended) selectStage((currentStage + 1) % stages.length);
    else render();
  });
  video.addEventListener('playing', () => {
    stopAnimation();
    if (active()) animation = requestAnimationFrame(tick);
    else pausePlayback();
    render();
  });
  video.addEventListener('error', () => {
    failed = true;
    playing = false;
    stopAnimation();
    pausePlayback();
    render();
  });
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncPlayback();
  }, {threshold: .1}).observe($('agent'));
  document.addEventListener('visibilitychange', syncPlayback);
  const dialogObserver = new MutationObserver(syncPlayback);
  dialogs.forEach(dialog => dialogObserver.observe(dialog, {attributes: true, attributeFilter: ['open']}));
  reduceMotion.addEventListener('change', event => {
    if (event.matches) {
      playing = false;
      syncPlayback();
    }
  });
  window.addEventListener('pagehide', () => {
    stopAnimation();
    pausePlayback();
  });
  window.addEventListener('pageshow', syncPlayback);
  video.muted = true;
  video.loop = false;
  if (video.getAttribute('src') !== stages[0].video) selectStage(0);
  else ready = video.readyState >= 2;
  render();
  syncPlayback();
  return {
    setVisible(value) {
      visible = value;
      syncPlayback();
    },
  };
}
