export function setupRandomization() {
  const panel = document.getElementById('gym-randomization');
  if (!panel) return;
  const images = [...panel.querySelectorAll('img[data-gif]')];
  const visible = new Set();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 761px)');
  const dialogs = [...document.querySelectorAll('dialog')];
  let summaryVisible = false;
  let autoOpenDone = false;
  let autoOpenTimer = null;
  let expansion = null;

  function cancelAutoOpen() {
    clearTimeout(autoOpenTimer);
    autoOpenTimer = null;
  }

  function updateAutoOpen() {
    const eligible = !autoOpenDone && !panel.open && desktop.matches && summaryVisible
      && !document.hidden && !dialogs.some(dialog => dialog.open);
    if (!eligible) {
      cancelAutoOpen();
      return;
    }
    if (autoOpenTimer !== null) return;
    autoOpenTimer = setTimeout(() => {
      autoOpenTimer = null;
      autoOpenDone = true;
      revealObserver.disconnect();
      const collapsedHeight = panel.getBoundingClientRect().height;
      panel.open = true;
      if (!reduceMotion.matches) {
        expansion = panel.animate([
          {height: `${collapsedHeight}px`, overflow: 'hidden'},
          {height: `${panel.getBoundingClientRect().height}px`, overflow: 'hidden'},
        ], {duration: 600, easing: 'cubic-bezier(.22, 1, .36, 1)'});
        expansion.addEventListener('finish', () => { expansion = null; }, {once: true});
      }
      refresh();
    }, 500);
  }

  function show(image, source) {
    if (image.getAttribute('src') === source) return;
    image.classList.remove('is-ready');
    image.src = source;
  }

  function refresh() {
    updateAutoOpen();
    if (expansion && (!panel.open || !desktop.matches || reduceMotion.matches)) {
      expansion.cancel();
      expansion = null;
    }
    const playing = !document.hidden && !reduceMotion.matches && !dialogs.some(dialog => dialog.open);
    for (const image of images) {
      if (panel.open && visible.has(image) && !document.hidden) {
        image.parentElement.style.backgroundImage = `url("${image.dataset.poster}")`;
        show(image, playing ? image.dataset.gif : image.dataset.poster);
      } else if (image.hasAttribute('src')) {
        show(image, image.dataset.poster);
      }
    }
  }

  const summary = panel.querySelector('summary');
  const revealObserver = new IntersectionObserver(([entry]) => {
    summaryVisible = entry.isIntersecting && entry.intersectionRatio >= .75;
    updateAutoOpen();
  }, {rootMargin: '0px 0px -64px 0px', threshold: .75});
  revealObserver.observe(summary);
  summary.addEventListener('click', () => {
    autoOpenDone = true;
    cancelAutoOpen();
    revealObserver.disconnect();
    if (expansion) {
      expansion.cancel();
      expansion = null;
    }
  });

  for (const image of images) {
    image.addEventListener('load', () => image.classList.add('is-ready'));
    image.addEventListener('error', () => {
      if (image.getAttribute('src') === image.dataset.gif) show(image, image.dataset.poster);
    });
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio > 0) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    refresh();
  }, {rootMargin: '100px', threshold: .01});
  images.forEach(image => observer.observe(image));
  panel.addEventListener('toggle', refresh);
  document.addEventListener('visibilitychange', refresh);
  reduceMotion.addEventListener('change', refresh);
  desktop.addEventListener('change', refresh);
  const dialogObserver = new MutationObserver(refresh);
  dialogs.forEach(dialog => dialogObserver.observe(dialog, {attributes: true, attributeFilter: ['open']}));
}
